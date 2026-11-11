import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createExcludeMatcher } from '../lib/exclude.ts';

test('createExcludeMatcher: bare name matches any segment at any depth', () => {
	const m = createExcludeMatcher(['node_modules']);
	assert.equal(m('node_modules'), true);
	assert.equal(m('a/node_modules/b.md'), true);
	assert.equal(m('a/my_node_modules/b.md'), false);
});

test('createExcludeMatcher: wildcards stay within a segment', () => {
	const m = createExcludeMatcher(['*.draft.md']);
	assert.equal(m('x/post.draft.md'), true);
	assert.equal(m('x/post.md'), false);
});

test('createExcludeMatcher: patterns with a slash match the relative path', () => {
	const m = createExcludeMatcher(['drafts/**', 'a/*.md']);
	assert.equal(m('drafts/x/y.md'), true);
	assert.equal(m('other/drafts/y.md'), false);
	assert.equal(m('a/b.md'), true);
	assert.equal(m('a/b/c.md'), false);
});

test('createExcludeMatcher: no patterns excludes nothing', () => {
	assert.equal(createExcludeMatcher([])('anything'), false);
});
