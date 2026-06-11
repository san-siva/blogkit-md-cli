import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import NotePage, { generateMetadata } from '../app/[...slug]/page';
import { render } from './render.tsx';

// One fixture tree for every test; MARKDOWN_DIR points at it for the whole
// file (the page modules read it per request, but react cache() memoizes by
// slug, so each test uses distinct slugs rather than re-pointing the env).
const dir = mkdtempSync(path.join(os.tmpdir(), 'blogkit-md-pages-'));
mkdirSync(path.join(dir, 'secure_assets'));
writeFileSync(path.join(dir, 'a.md'), '# Root Note\n\nroot body\n');
writeFileSync(
	path.join(dir, 'secure_assets', 'dashboard.md'),
	'# Dashboard\n\ndash body\n'
);
process.env.MARKDOWN_DIR = dir;

after(() => {
	delete process.env.MARKDOWN_DIR;
	rmSync(dir, { recursive: true, force: true });
});

const props = (...slug: string[]) => ({ params: Promise.resolve({ slug }) });

test('NotePage: renders a markdown file for its slug', async () => {
	const html = render(await NotePage(props('a')));
	assert.match(html, /Root Note/);
	assert.match(html, /root body/);
});

test('NotePage: renders a nested file', async () => {
	const html = render(await NotePage(props('secure_assets', 'dashboard')));
	assert.match(html, /Dashboard/);
	assert.match(html, /dash body/);
});

test('NotePage: a directory slug renders a scoped index, not a file error', async () => {
	const html = render(await NotePage(props('secure_assets')));
	assert.match(html, /secure_assets/);
	assert.match(html, /1 markdown file/);
	assert.match(html, /href="\/secure_assets\/dashboard"/);
	assert.doesNotMatch(html, /Could not read file/);
});

test('NotePage: a missing slug renders the read error', async () => {
	const html = render(await NotePage(props('nope')));
	assert.match(html, /Could not read file/);
});

test('NotePage: traversal slugs are rejected', async () => {
	// resolveSafePath returns null → loadFile/loadDirectory both null → notFound()
	await assert.rejects(async () => render(await NotePage(props('..'))));
});

test('generateMetadata: uses the markdown title for a file slug', async () => {
	const meta = await generateMetadata(props('a'));
	assert.equal(meta.title, 'Root Note');
});

test('generateMetadata: uses the folder name for a directory slug', async () => {
	const meta = await generateMetadata(props('secure_assets'));
	assert.equal(meta.title, 'secure_assets');
});

test('generateMetadata: empty for a missing slug', async () => {
	const meta = await generateMetadata(props('missing'));
	assert.deepEqual(meta, {});
});
