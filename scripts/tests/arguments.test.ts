import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseArgs } from '../cli/arguments.ts';

test('parseArgs: bare path is the input, no flags set', () => {
	const a = parseArgs(['./posts']);
	assert.equal(a.inputArg, './posts');
	assert.equal(a.requestedPort, 0);
	assert.equal(a.wantList, false);
	assert.equal(a.wantTear, false);
	assert.equal(a.wantHelp, false);
	assert.equal(a.isPortReused, false);
	assert.deepEqual(a.unknownFlags, []);
});

test('parseArgs: long and short flags both resolve', () => {
	assert.equal(parseArgs(['--tear']).wantTear, true);
	assert.equal(parseArgs(['-t']).wantTear, true);
	assert.equal(parseArgs(['--list']).wantList, true);
	assert.equal(parseArgs(['-l']).wantList, true);
	assert.equal(parseArgs(['--help']).wantHelp, true);
	assert.equal(parseArgs(['-h']).wantHelp, true);
	assert.equal(parseArgs(['--no-open']).wantNoOpen, true);
	assert.equal(parseArgs(['-n']).wantNoOpen, true);
	assert.equal(parseArgs(['--stop']).wantStop, true);
	assert.equal(parseArgs(['-s']).wantStop, true);
	assert.equal(parseArgs(['--stop-all']).wantStopAll, true);
	assert.equal(parseArgs(['-S']).wantStopAll, true);
	assert.equal(parseArgs(['--non-interactive']).wantNonInteractive, true);
	assert.equal(parseArgs(['--__port-reused']).isPortReused, true);
});

test('parseArgs: unknown flags are collected', () => {
	assert.deepEqual(parseArgs(['-b', './posts']).unknownFlags, ['-b']);
	assert.deepEqual(parseArgs(['--foo', '--bar']).unknownFlags, ['--foo', '--bar']);
	assert.deepEqual(parseArgs(['./posts']).unknownFlags, []);
});

test('parseArgs: --list-instances is still accepted (legacy alias)', () => {
	assert.equal(parseArgs(['--list-instances']).wantList, true);
});

test('parseArgs: single-dash flags are not mistaken for the input path', () => {
	const a = parseArgs(['-h']);
	assert.equal(a.inputArg, undefined);
	assert.equal(a.wantHelp, true);
});

test('parseArgs: --port is parsed; junk falls back to 0', () => {
	assert.equal(parseArgs(['./p', '--port=3001']).requestedPort, 3001);
	assert.equal(parseArgs(['./p', '--port=nope']).requestedPort, 0);
});

test('parseArgs: flags and path combine in any order', () => {
	const a = parseArgs(['-n', './posts', '--port=4000', '-t']);
	assert.equal(a.inputArg, './posts');
	assert.equal(a.wantNoOpen, true);
	assert.equal(a.wantTear, true);
	assert.equal(a.requestedPort, 4000);
});
