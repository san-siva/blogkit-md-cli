import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { instanceLabel } from '../cli/list.ts';
import { sampleInstance } from './helpers.ts';

test('instanceLabel: directory instance shows 📁 and bg', () => {
	const inst = sampleInstance({ port: 3001, isDirectory: true, background: true, dir: '/tmp/posts', pid: 42 });
	const label = instanceLabel(inst);
	assert.match(label, /localhost:3001/);
	assert.match(label, /📁/);
	assert.match(label, /bg/);
	assert.match(label, /pid 42/);
});

test('instanceLabel: file instance shows 📄 and fg', () => {
	const inst = sampleInstance({ isDirectory: false, background: false });
	const label = instanceLabel(inst);
	assert.match(label, /📄/);
	assert.match(label, /fg/);
});

test('instanceLabel: home directory is tilde-collapsed', () => {
	const home = os.homedir();
	const inst = sampleInstance({ dir: path.join(home, 'posts') });
	assert.match(instanceLabel(inst), /~.*posts/);
});
