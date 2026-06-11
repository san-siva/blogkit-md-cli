import assert from 'node:assert/strict';
import { type ChildProcess,spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync,rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach,beforeEach, test } from 'node:test';

import {
	addInstance,
	fileUrlPath,
	findByDir,
	findContainingDir,
	findInstancesUnder,
	humanAge,
	type Instance,
	isAlive,
	killInstance,
	parseArgs as parseArguments,
	pruneRegistry,
	readRegistry,
	registryFile,
	removeInstance,
	supersedeNarrowerInstances,
	tilde,
	writeRegistry,
} from './cli.ts';

const BIN = path.resolve(import.meta.dirname, '..', 'bin', 'blogkit-md.js');

/* ----------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

let tmpDir = '';

beforeEach(() => {
	tmpDir = mkdtempSync(path.join(os.tmpdir(), 'blogkit-md-test-'));
	process.env.BLOGKIT_MD_DIR = tmpDir;
});

afterEach(() => {
	delete process.env.BLOGKIT_MD_DIR;
	rmSync(tmpDir, { recursive: true, force: true });
});

const sampleInstance = (over: Partial<Instance> = {}): Instance => ({
	pid: process.pid,
	port: 3001,
	ssePort: 40001,
	dir: '/tmp/posts',
	isDirectory: true,
	background: true,
	startedAt: new Date().toISOString(),
	...over,
});

/** Spawn a harmless long-lived process and resolve once it's running. */
function spawnStandIn(): ChildProcess {
	return spawn(process.execPath, ['-e', 'setInterval(() => {}, 1 << 30)'], {
		stdio: 'ignore',
	});
}

function waitForExit(pid: number, timeoutMs = 2000): Promise<boolean> {
	const start = Date.now();
	return new Promise(resolve => {
		const tick = () => {
			if (!isAlive(pid)) return resolve(true);
			if (Date.now() - start > timeoutMs) return resolve(false);
			setTimeout(tick, 25);
		};
		tick();
	});
}

interface RunResult {
	code: number | null;
	stdout: string;
	stderr: string;
}

/** Run the built CLI as a subprocess with an isolated registry + no browser. */
function runCli(argv: string[], environment: Record<string, string> = {}): Promise<RunResult> {
	return new Promise(resolve => {
		const child = spawn(process.execPath, [BIN, ...argv], {
			env: {
				...process.env,
				BLOGKIT_MD_DIR: tmpDir,
				BLOGKIT_MD_NO_OPEN: '1',
				NO_COLOR: '1',
				...environment,
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', d => (stdout += d));
		child.stderr.on('data', d => (stderr += d));
		child.on('close', code => resolve({ code, stdout, stderr }));
	});
}

/* ----------------------------------------------------------------------------
 * Unit — argument parsing
 * ------------------------------------------------------------------------- */

test('parseArgs: bare path is the input, no flags set', () => {
	const a = parseArguments(['./posts']);
	assert.equal(a.inputArg, './posts');
	assert.equal(a.requestedPort, 0);
	assert.equal(a.wantList, false);
	assert.equal(a.wantTear, false);
	assert.equal(a.wantHelp, false);
	assert.equal(a.isPortReused, false);
});

test('parseArgs: long and short flags both resolve', () => {
	assert.equal(parseArguments(['--tear']).wantTear, true);
	assert.equal(parseArguments(['-t']).wantTear, true);
	assert.equal(parseArguments(['--list']).wantList, true);
	assert.equal(parseArguments(['-l']).wantList, true);
	assert.equal(parseArguments(['--help']).wantHelp, true);
	assert.equal(parseArguments(['-h']).wantHelp, true);
	assert.equal(parseArguments(['--no-open']).wantNoOpen, true);
	assert.equal(parseArguments(['-n']).wantNoOpen, true);
	assert.equal(parseArguments(['--stop']).wantStop, true);
	assert.equal(parseArguments(['-s']).wantStop, true);
	assert.equal(parseArguments(['--non-interactive']).wantNonInteractive, true);
	assert.equal(parseArguments(['--__port-reused']).isPortReused, true);
});

test('parseArgs: --list-instances is still accepted (legacy alias)', () => {
	assert.equal(parseArguments(['--list-instances']).wantList, true);
});

test('parseArgs: single-dash flags are not mistaken for the input path', () => {
	const a = parseArguments(['-h']);
	assert.equal(a.inputArg, undefined);
	assert.equal(a.wantHelp, true);
});

test('parseArgs: --port is parsed; junk falls back to 0', () => {
	assert.equal(parseArguments(['./p', '--port=3001']).requestedPort, 3001);
	assert.equal(parseArguments(['./p', '--port=nope']).requestedPort, 0);
});

test('parseArgs: flags and path combine in any order', () => {
	const a = parseArguments(['-n', './posts', '--port=4000', '-t']);
	assert.equal(a.inputArg, './posts');
	assert.equal(a.wantNoOpen, true);
	assert.equal(a.wantTear, true);
	assert.equal(a.requestedPort, 4000);
});

/* ----------------------------------------------------------------------------
 * Unit — formatting helpers
 * ------------------------------------------------------------------------- */

test('tilde: collapses the home directory prefix', () => {
	const home = os.homedir();
	assert.equal(tilde(path.join(home, 'posts')), '~' + path.sep + 'posts');
	assert.equal(tilde('/var/www'), '/var/www');
});

test('humanAge: formats seconds/minutes/hours/days', () => {
	const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
	assert.equal(humanAge(ago(5_000)), '5s');
	assert.equal(humanAge(ago(120_000)), '2m');
	assert.equal(humanAge(ago(3 * 3600_000)), '3h');
	assert.equal(humanAge(ago(2 * 86400_000)), '2d');
	assert.equal(humanAge('not-a-date'), '—');
});

/* ----------------------------------------------------------------------------
 * Unit — registry
 * ------------------------------------------------------------------------- */

test('registry: read returns [] when the file is missing', () => {
	assert.deepEqual(readRegistry(), []);
});

test('registry: add / find / remove round-trip', () => {
	const inst = sampleInstance({ dir: '/tmp/posts', pid: process.pid });
	addInstance(inst);

	assert.equal(readRegistry().length, 1);
	assert.deepEqual(findByDir('/tmp/posts')?.port, 3001);
	assert.equal(findByDir('/tmp/missing'), undefined);

	removeInstance(inst.pid);
	assert.deepEqual(readRegistry(), []);
});

test('registry: read tolerates a corrupt file', () => {
	writeFileSync(registryFile(), 'not json{{', 'utf8');
	assert.deepEqual(readRegistry(), []);
});

test('registry: pruneRegistry drops entries for dead pids', async () => {
	const standIn = spawnStandIn();
	const alivePid = standIn.pid!;

	const deadProc = spawnStandIn();
	const deadPid = deadProc.pid!;
	deadProc.kill('SIGKILL');
	await waitForExit(deadPid);

	writeRegistry([
		sampleInstance({ pid: alivePid, dir: '/tmp/alive', port: 5001 }),
		sampleInstance({ pid: deadPid, dir: '/tmp/dead', port: 5002 }),
	]);

	const live = pruneRegistry();
	assert.equal(live.length, 1);
	assert.equal(live[0].pid, alivePid);
	// The dead entry should have been written out of the file too.
	assert.equal(readRegistry().length, 1);

	standIn.kill('SIGKILL');
	await waitForExit(alivePid);
});

test('killInstance: terminates the process and removes it from the registry', async () => {
	const standIn = spawnStandIn();
	const pid = standIn.pid!;
	const inst = sampleInstance({ pid, dir: '/tmp/kill-me', port: 5050 });
	addInstance(inst);

	killInstance(inst);

	assert.equal(await waitForExit(pid), true, 'process should be terminated');
	assert.equal(findByDir('/tmp/kill-me'), undefined);
});

/* ----------------------------------------------------------------------------
 * Unit — path containment helpers
 * ------------------------------------------------------------------------- */

test('findContainingDir: finds the directory instance serving a file', () => {
	writeRegistry([
		sampleInstance({ pid: process.pid, dir: '/tmp/posts', isDirectory: true, port: 7001 }),
	]);
	assert.equal(findContainingDir('/tmp/posts/sub/file.md')?.port, 7001);
	assert.equal(findContainingDir('/tmp/elsewhere/file.md'), undefined);
});

test('findContainingDir: ignores file instances and prefers the deepest folder', () => {
	writeRegistry([
		sampleInstance({ pid: process.pid, dir: '/tmp/posts', isDirectory: true, port: 7001 }),
		sampleInstance({ pid: process.pid, dir: '/tmp/posts/blog', isDirectory: true, port: 7002 }),
		sampleInstance({ pid: process.pid, dir: '/tmp/posts/blog/a.md', isDirectory: false, port: 7003 }),
	]);
	assert.equal(findContainingDir('/tmp/posts/blog/a.md')?.port, 7002);
});

test('fileUrlPath: strips .md and URL-encodes each segment', () => {
	assert.equal(fileUrlPath('/tmp/posts', '/tmp/posts/sub/my file.md'), '/sub/my%20file');
	assert.equal(fileUrlPath('/tmp/posts', '/tmp/posts/index.md'), '/index');
});

test('findInstancesUnder: returns only instances strictly inside the folder', () => {
	writeRegistry([
		sampleInstance({ pid: process.pid, dir: '/tmp/posts', isDirectory: true, port: 8000 }),
		sampleInstance({ pid: process.pid, dir: '/tmp/posts/a.md', isDirectory: false, port: 8001 }),
		sampleInstance({ pid: process.pid, dir: '/tmp/posts/sub/b.md', isDirectory: false, port: 8002 }),
		sampleInstance({ pid: process.pid, dir: '/tmp/other/c.md', isDirectory: false, port: 8003 }),
	]);
	const ports = findInstancesUnder('/tmp/posts')
		.map(index => index.port)
		.toSorted((a, b) => a - b);
	assert.deepEqual(ports, [8001, 8002]);
});

test('supersedeNarrowerInstances: stops nested instances and hands back a port to reuse', async () => {
	const nested = spawnStandIn();
	const unrelated = spawnStandIn();
	const nestedPid = nested.pid!;
	const unrelatedPid = unrelated.pid!;

	writeRegistry([
		sampleInstance({ pid: nestedPid, dir: '/tmp/dir1/dir2', port: 6543, isDirectory: true }),
		sampleInstance({ pid: unrelatedPid, dir: '/tmp/other', port: 6544, isDirectory: true }),
	]);

	// Serving the parent /tmp/dir1 supersedes the nested /tmp/dir1/dir2 ...
	const reused = await supersedeNarrowerInstances('/tmp/dir1');
	assert.equal(reused, 6543, 'should reuse the stopped nested instance port');
	assert.ok(await waitForExit(nestedPid), 'nested instance should be stopped');
	// ... but leaves unrelated instances alone.
	assert.equal(isAlive(unrelatedPid), true);

	unrelated.kill('SIGKILL');
	await waitForExit(unrelatedPid);
});

test('supersedeNarrowerInstances: returns undefined when nothing is nested', async () => {
	writeRegistry([
		sampleInstance({ pid: process.pid, dir: '/tmp/elsewhere', port: 6545, isDirectory: true }),
	]);
	assert.equal(await supersedeNarrowerInstances('/tmp/dir1'), undefined);
});

/* ----------------------------------------------------------------------------
 * CLI smoke tests (subprocess against the built bin)
 * ------------------------------------------------------------------------- */

test('cli --help: prints usage and exits 0', async () => {
	const r = await runCli(['--help']);
	assert.equal(r.code, 0);
	assert.match(r.stdout, /Usage/);
	assert.match(r.stdout, /--tear/);
	assert.match(r.stdout, /--list/);
});

test('cli with no args: prints help and exits 1', async () => {
	const r = await runCli([]);
	assert.equal(r.code, 1);
	assert.match(r.stdout, /Usage/);
});

test('cli --list: reports nothing running on an empty registry', async () => {
	const r = await runCli(['--list']);
	assert.equal(r.code, 0);
	assert.match(r.stdout, /No running blogkit-md instances/);
});

test('cli --list: shows a registered instance', async () => {
	writeRegistry([sampleInstance({ pid: process.pid, dir: '/tmp/posts', port: 6001 })]);
	const r = await runCli(['--list']);
	assert.equal(r.code, 0);
	assert.match(r.stdout, /localhost:6001/);
});

test('cli --list --non-interactive: prints a bare port+path list, no banner', async () => {
	writeRegistry([
		sampleInstance({ pid: process.pid, dir: '/tmp/posts', port: 6001 }),
		sampleInstance({ pid: process.pid, dir: '/tmp/notes', port: 6002 }),
	]);
	const r = await runCli(['--list', '--non-interactive']);
	assert.equal(r.code, 0);
	assert.equal(r.stdout, '6001\t/tmp/posts\n6002\t/tmp/notes\n');
	assert.doesNotMatch(r.stdout, /blogkit-md|Running instances/);
});

test('cli --list --non-interactive: empty registry prints nothing', async () => {
	const r = await runCli(['--list', '--non-interactive']);
	assert.equal(r.code, 0);
	assert.equal(r.stdout, '');
});

test('cli on a missing path: errors and exits 1', async () => {
	const r = await runCli([path.join(tmpDir, 'does-not-exist')]);
	assert.equal(r.code, 1);
	assert.match(r.stdout, /Path does not exist/);
});

test('cli default: reopens an already-served path without starting a new server', async () => {
	const standIn = spawnStandIn();
	const pid = standIn.pid!;
	const served = path.join(tmpDir, 'served');
	mkdirSync(served, { recursive: true });
	writeFileSync(path.join(served, 'post.md'), '# hi\n');

	writeRegistry([sampleInstance({ pid, dir: served, port: 6789, isDirectory: true })]);

	const r = await runCli([served]);
	assert.equal(r.code, 0);
	assert.match(r.stdout, /Already running/);
	assert.match(r.stdout, /localhost:6789/);

	// It must NOT have started a new instance — registry is unchanged.
	const reg = JSON.parse(readFileSync(registryFile(), 'utf8'));
	assert.equal(reg.length, 1);
	assert.equal(reg[0].pid, pid);

	standIn.kill('SIGKILL');
	await waitForExit(pid);
});

test('cli: a file under an already-served folder reuses its port', async () => {
	const standIn = spawnStandIn();
	const pid = standIn.pid!;
	const served = path.join(tmpDir, 'served');
	mkdirSync(path.join(served, 'sub'), { recursive: true });
	const file = path.join(served, 'sub', 'post.md');
	writeFileSync(file, '# hi\n');

	writeRegistry([sampleInstance({ pid, dir: served, port: 6789, isDirectory: true })]);

	const r = await runCli([file]);
	assert.equal(r.code, 0);
	assert.match(r.stdout, /Already serving this folder/);
	assert.match(r.stdout, /localhost:6789\/sub\/post/);

	// It must NOT have started a new instance — registry is unchanged.
	const reg = JSON.parse(readFileSync(registryFile(), 'utf8'));
	assert.equal(reg.length, 1);
	assert.equal(reg[0].pid, pid);

	standIn.kill('SIGKILL');
	await waitForExit(pid);
});

test('cli: a sub-folder under an already-served folder reuses the parent server', async () => {
	const standIn = spawnStandIn();
	const pid = standIn.pid!;
	const parentDir = path.join(tmpDir, 'parent');
	const subDir = path.join(parentDir, 'sub');
	mkdirSync(subDir, { recursive: true });
	writeFileSync(path.join(subDir, 'a.md'), '# hi\n');

	writeRegistry([sampleInstance({ pid, dir: parentDir, port: 6790, isDirectory: true })]);

	const r = await runCli([subDir]);
	assert.equal(r.code, 0);
	assert.match(r.stdout, /Already serving a parent folder/);
	assert.match(r.stdout, /localhost:6790\/sub/);

	// It must NOT have started a new instance — the parent is untouched.
	const reg = JSON.parse(readFileSync(registryFile(), 'utf8'));
	assert.equal(reg.length, 1);
	assert.equal(reg[0].pid, pid);

	standIn.kill('SIGKILL');
	await waitForExit(pid);
});

test('cli --stop: kills the instance serving a path and drops it from the registry', async () => {
	const standIn = spawnStandIn();
	const pid = standIn.pid!;
	const served = path.join(tmpDir, 'stop-me');
	mkdirSync(served, { recursive: true });
	writeFileSync(path.join(served, 'post.md'), '# hi\n');

	writeRegistry([sampleInstance({ pid, dir: served, port: 6790, isDirectory: true })]);

	const r = await runCli(['--stop', served]);
	assert.equal(r.code, 0);
	assert.match(r.stdout, /Stopped localhost:6790/);

	assert.ok(await waitForExit(pid), 'the served process should have been killed');
	assert.equal(JSON.parse(readFileSync(registryFile(), 'utf8')).length, 0);
});

test('cli --stop: reports when nothing is serving the path', async () => {
	const r = await runCli(['--stop', path.join(tmpDir, 'never-served')]);
	assert.equal(r.code, 0);
	assert.match(r.stdout, /No running instance/);
});

test('cli --stop: errors without a path', async () => {
	const r = await runCli(['--stop']);
	assert.equal(r.code, 1);
	assert.match(r.stdout, /Missing path/);
});
