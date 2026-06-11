import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { registryFile, writeRegistry } from '../cli/registry.ts';
import { runCli, sampleInstance, spawnStandIn, tmpDir, waitForExit } from './helpers.ts';

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

test('cli --stop-all: kills all running instances', async () => {
	const a = spawnStandIn();
	const b = spawnStandIn();

	writeRegistry([
		sampleInstance({ pid: a.pid!, dir: '/tmp/a', port: 7100, isDirectory: true }),
		sampleInstance({ pid: b.pid!, dir: '/tmp/b', port: 7101, isDirectory: true }),
	]);

	const r = await runCli(['--stop-all']);
	assert.equal(r.code, 0);
	assert.match(r.stdout, /Stopped localhost:7100/);
	assert.match(r.stdout, /Stopped localhost:7101/);

	assert.ok(await waitForExit(a.pid!));
	assert.ok(await waitForExit(b.pid!));
	assert.equal(JSON.parse(readFileSync(registryFile(), 'utf8')).length, 0);
});

test('cli --stop-all: reports when nothing is running', async () => {
	const r = await runCli(['--stop-all']);
	assert.equal(r.code, 0);
	assert.match(r.stdout, /No running instances/);
});

test('cli -S: short alias for --stop-all', async () => {
	const r = await runCli(['-S']);
	assert.equal(r.code, 0);
	assert.match(r.stdout, /No running instances/);
});
