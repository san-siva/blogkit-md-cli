import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import { resolveDirectory, resolveSafePath } from '../../src/lib/resolve-path.ts';

let dir = '';

beforeEach(() => {
	dir = mkdtempSync(path.join(os.tmpdir(), 'blogkit-md-resolve-'));
	mkdirSync(path.join(dir, 'sub'));
	writeFileSync(path.join(dir, 'a.md'), '# a\n');
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

test('resolveSafePath: resolves a slug inside the served dir', () => {
	assert.equal(resolveSafePath(['sub', 'post'], dir), path.join(dir, 'sub', 'post'));
});

test('resolveSafePath: decodes URL-encoded segments', () => {
	assert.equal(resolveSafePath(['my%20file'], dir), path.join(dir, 'my file'));
});

test('resolveSafePath: rejects .. traversal segments', () => {
	assert.equal(resolveSafePath(['..'], dir), null);
	assert.equal(resolveSafePath(['..', 'secrets'], dir), null);
	assert.equal(resolveSafePath(['sub', '..', '..', 'secrets'], dir), null);
});

test('resolveSafePath: rejects separators smuggled inside a segment', () => {
	assert.equal(resolveSafePath(['sub/child'], dir), null);
	assert.equal(resolveSafePath(['sub\\child'], dir), null);
	// URL-encoded slash decodes to '../' inside one segment
	assert.equal(resolveSafePath(['..%2Fsecrets'], dir), null);
});

test('resolveSafePath: rejects empty segments', () => {
	assert.equal(resolveSafePath([''], dir), null);
});

test('resolveSafePath: allows children whose own name starts with dots', () => {
	assert.equal(resolveSafePath(['..drafts'], dir), path.join(dir, '..drafts'));
});

test('resolveSafePath: returns null without a served dir', () => {
	assert.equal(resolveSafePath(['a'], undefined), null);
});

test('resolveDirectory: returns the path for an existing directory', async () => {
	assert.equal(await resolveDirectory(['sub'], dir), path.join(dir, 'sub'));
});

test('resolveDirectory: returns null for a file or a missing path', async () => {
	assert.equal(await resolveDirectory(['a.md'], dir), null); // a.md is a file
	assert.equal(await resolveDirectory(['gone'], dir), null);
});

test('resolveDirectory: rejects traversal before touching the filesystem', async () => {
	assert.equal(await resolveDirectory(['..'], dir), null);
});
