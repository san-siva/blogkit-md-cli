import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { test } from 'node:test';

import {
	addInstance,
	findByDir,
	killInstance,
	pruneRegistry,
	readRegistry,
	registryFile,
	removeInstance,
	writeRegistry,
} from '../cli/registry.ts';
import { sampleInstance, spawnStandIn, waitForExit } from './helpers.ts';

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
