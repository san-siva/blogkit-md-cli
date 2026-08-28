import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import { readMarkdownFile } from '@san-siva/blogkit-md';

import { RenderContent } from '../components/RenderContent';
import { render } from './render.tsx';

const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'blogkit-md-render-content-'));
after(() => rmSync(tmpDir, { recursive: true, force: true }));

test('RenderContent: renders title and markdown content on success', async () => {
	const file = path.join(tmpDir, 'post.md');
	writeFileSync(file, '# My Post\n\nhello *world*\n');
	const result = await readMarkdownFile(file);

	const html = render(<RenderContent kind="file" result={result} />);
	assert.match(html, /My Post/);
	assert.match(html, /hello/);
});

test('RenderContent: falls back to the provided title when the file has none', async () => {
	const file = path.join(tmpDir, 'untitled.md');
	writeFileSync(file, 'just text, no heading\n');
	const result = await readMarkdownFile(file);

	const html = render(
		<RenderContent kind="file" result={result} fallbackTitle="fallback title" />
	);
	assert.match(html, /just text/);
});

test('RenderContent: renders the error in a callout when reading fails', async () => {
	const result = await readMarkdownFile(path.join(tmpDir, 'missing.md'));
	assert.equal(result.success, false);

	const html = render(<RenderContent kind="file" result={result} />);
	assert.match(html, /Could not read file/);
});

test('RenderContent: renders a link per entry and the file count', () => {
	const html = render(
		<RenderContent
			kind="directory"
			title="notes"
			links={[
				{ href: '/a', label: 'a' },
				{ href: '/sub/b', label: 'sub / b' },
			]}
		/>
	);
	assert.match(html, /notes/);
	assert.match(html, /2 markdown files/);
	assert.match(html, /href="\/a"/);
	assert.match(html, /href="\/sub\/b"/);
});

test('RenderContent: warns when the directory has no markdown files', () => {
	const html = render(
		<RenderContent kind="directory" title="empty" links={[]} />
	);
	assert.match(html, /No markdown files found/);
});
