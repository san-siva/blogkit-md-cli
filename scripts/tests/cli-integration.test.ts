import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { registryFile, writeRegistry } from '../cli/registry.ts';
import { runCli, sampleInstance, spawnStandIn, tmpDir, waitForExit } from './helpers.ts';

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
	assert.match(r.stdout, /localhost:6790\/sub\//);

	const reg = JSON.parse(readFileSync(registryFile(), 'utf8'));
	assert.equal(reg.length, 1);
	assert.equal(reg[0].pid, pid);

	standIn.kill('SIGKILL');
	await waitForExit(pid);
});

test('cli: unknown flags error and show help', async () => {
	const r = await runCli(['-b', './some-path']);
	assert.equal(r.code, 1);
	assert.match(r.stdout, /Unknown flag: -b/);
	assert.match(r.stdout, /Usage/);
});
