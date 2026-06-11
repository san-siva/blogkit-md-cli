import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { humanAge, tilde } from '../cli/output.ts';

test('tilde: collapses the home directory prefix', () => {
	const home = os.homedir();
	assert.equal(tilde(path.join(home, 'posts')), '~' + path.sep + 'posts');
	assert.equal(tilde('/var/www'), '/var/www');
});

test('humanAge: formats seconds/minutes/hours/days', () => {
	const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
	assert.equal(humanAge(ago(5_000)), '5s');
	assert.equal(humanAge(ago(120_000)), '2m');
	assert.equal(humanAge(ago(3 * 3600_000)), '3h');
	assert.equal(humanAge(ago(2 * 86400_000)), '2d');
	assert.equal(humanAge('not-a-date'), '—');
});
