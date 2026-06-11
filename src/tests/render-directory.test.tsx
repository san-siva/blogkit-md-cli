import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RenderDirectory } from '../components/RenderDirectory';
import { render } from './render.tsx';

test('RenderDirectory: renders a link per entry and the file count', () => {
	const html = render(
		<RenderDirectory
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

test('RenderDirectory: warns when the directory has no markdown files', () => {
	const html = render(<RenderDirectory title="empty" links={[]} />);
	assert.match(html, /No markdown files found/);
});
