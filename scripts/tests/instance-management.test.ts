import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	fileUrlPath,
	findContainingDir,
	findInstancesUnder,
	supersedeNarrowerInstances,
} from '../cli/instance-management.ts';
import { isAlive, writeRegistry } from '../cli/registry.ts';
import { sampleInstance, spawnStandIn, waitForExit } from './helpers.ts';

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

test('findContainingDir: a sibling sharing a name prefix is not a parent', () => {
	writeRegistry([
		sampleInstance({ pid: process.pid, dir: '/tmp/posts', isDirectory: true, port: 7010 }),
	]);
	// /tmp/posts-archive is a sibling of /tmp/posts, not a child of it.
	assert.equal(findContainingDir('/tmp/posts-archive/a.md'), undefined);
});

test('findContainingDir: matches children whose own name starts with dots', () => {
	writeRegistry([
		sampleInstance({ pid: process.pid, dir: '/tmp/posts', isDirectory: true, port: 7011 }),
	]);
	// path.relative gives '..drafts/a.md' here — a bare startsWith('..') check
	// would wrongly reject it as an ancestor.
	assert.equal(findContainingDir('/tmp/posts/..drafts/a.md')?.port, 7011);
});

test('findInstancesUnder: excludes prefix-named siblings, includes dot-named children', () => {
	writeRegistry([
		sampleInstance({ pid: process.pid, dir: '/tmp/posts-archive', isDirectory: true, port: 8010 }),
		sampleInstance({ pid: process.pid, dir: '/tmp/posts/..drafts', isDirectory: true, port: 8011 }),
	]);
	assert.deepEqual(findInstancesUnder('/tmp/posts').map(i => i.port), [8011]);
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
		.map(i => i.port)
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

	const reused = await supersedeNarrowerInstances('/tmp/dir1');
	assert.equal(reused, 6543, 'should reuse the stopped nested instance port');
	assert.ok(await waitForExit(nestedPid), 'nested instance should be stopped');
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
