import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import { readMarkdownFile } from '@san-siva/blogkit-md';

import { RenderFile } from '../components/RenderFile';
import { render } from './render.tsx';

const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'blogkit-md-render-file-'));
after(() => rmSync(tmpDir, { recursive: true, force: true }));

test('RenderFile: renders title and markdown content on success', async () => {
	const file = path.join(tmpDir, 'post.md');
	writeFileSync(file, '# My Post\n\nhello *world*\n');
	const result = await readMarkdownFile(file);

	const html = render(<RenderFile result={result} />);
	assert.match(html, /My Post/);
	assert.match(html, /hello/);
});

test('RenderFile: falls back to the provided title when the file has none', async () => {
	const file = path.join(tmpDir, 'untitled.md');
	writeFileSync(file, 'just text, no heading\n');
	const result = await readMarkdownFile(file);

	const html = render(
		<RenderFile result={result} fallbackTitle="fallback title" />
	);
	assert.match(html, /just text/);
});

test('RenderFile: renders the error in a callout when reading fails', async () => {
	const result = await readMarkdownFile(path.join(tmpDir, 'missing.md'));
	assert.equal(result.success, false);

	const html = render(<RenderFile result={result} />);
	assert.match(html, /Could not read file/);
});
