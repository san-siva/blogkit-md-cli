import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import { collectMarkdownLinks } from '../../src/lib/markdown-links.ts';

let root = '';

beforeEach(() => {
	root = mkdtempSync(path.join(os.tmpdir(), 'blogkit-md-links-'));
	mkdirSync(path.join(root, 'sub', 'nested'), { recursive: true });
	writeFileSync(path.join(root, 'a.md'), '# a\n');
	writeFileSync(path.join(root, 'sub', 'b.md'), '# b\n');
	writeFileSync(path.join(root, 'sub', 'nested', 'c.md'), '# c\n');
	writeFileSync(path.join(root, 'sub', 'not-markdown.txt'), 'skip\n');
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

test('collectMarkdownLinks: root listing — hrefs and labels relative to the root', async () => {
	const links = await collectMarkdownLinks(root, root);
	assert.deepEqual(links, [
		{ href: '/a', label: 'a' },
		{ href: '/sub/b', label: 'sub / b' },
		{ href: '/sub/nested/c', label: 'sub / nested / c' },
	]);
});

test('collectMarkdownLinks: subdirectory listing — hrefs keep the base prefix, labels drop it', async () => {
	const links = await collectMarkdownLinks(path.join(root, 'sub'), root);
	assert.deepEqual(links, [
		{ href: '/sub/b', label: 'b' },
		{ href: '/sub/nested/c', label: 'nested / c' },
	]);
});

test('collectMarkdownLinks: non-markdown files are skipped', async () => {
	const links = await collectMarkdownLinks(root, root);
	assert.ok(links.every(l => !l.href.includes('not-markdown')));
});

test('collectMarkdownLinks: href segments are URL-encoded, labels stay readable', async () => {
	writeFileSync(path.join(root, 'sub', 'my file.md'), '# hi\n');
	const links = await collectMarkdownLinks(root, root);
	const entry = links.find(l => l.label === 'sub / my file');
	assert.equal(entry?.href, '/sub/my%20file');
});

test('collectMarkdownLinks: links are sorted by label', async () => {
	const labels = (await collectMarkdownLinks(root, root)).map(l => l.label);
	assert.deepEqual(labels, [...labels].toSorted((a, b) => a.localeCompare(b)));
});

test('collectMarkdownLinks: a missing directory yields an empty list', async () => {
	const links = await collectMarkdownLinks(path.join(root, 'gone'), root);
	assert.deepEqual(links, []);
});
