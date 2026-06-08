import assert from 'node:assert/strict';
import { type ChildProcess,spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync,rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach,beforeEach, test } from 'node:test';

import {
	addInstance,
	findByDir,
	humanAge,
	type Instance,
	isAlive,
	killInstance,
	parseArgs as parseArguments,
	pruneRegistry,
	readRegistry,
	registryFile,
	removeInstance,
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
	assert.equal(a.wantBackground, false);
	assert.equal(a.wantList, false);
	assert.equal(a.wantTear, false);
	assert.equal(a.wantHelp, false);
});

test('parseArgs: long and short flags both resolve', () => {
	assert.equal(parseArguments(['--background']).wantBackground, true);
	assert.equal(parseArguments(['-b']).wantBackground, true);
	assert.equal(parseArguments(['--tear']).wantTear, true);
	assert.equal(parseArguments(['-t']).wantTear, true);
	assert.equal(parseArguments(['--list']).wantList, true);
	assert.equal(parseArguments(['-l']).wantList, true);
	assert.equal(parseArguments(['--help']).wantHelp, true);
	assert.equal(parseArguments(['-h']).wantHelp, true);
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
	const a = parseArguments(['-b', './posts', '--port=4000', '-t']);
	assert.equal(a.inputArg, './posts');
	assert.equal(a.wantBackground, true);
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
