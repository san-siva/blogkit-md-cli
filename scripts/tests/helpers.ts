import { type ChildProcess, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach } from 'node:test';

import { isAlive, type Instance, writeRegistry } from '../cli.ts';

export const BIN = path.resolve(import.meta.dirname, '../..', 'bin', 'blogkit-md.js');

export let tmpDir = '';

beforeEach(() => {
	tmpDir = mkdtempSync(path.join(os.tmpdir(), 'blogkit-md-test-'));
	process.env.BLOGKIT_MD_DIR = tmpDir;
});

afterEach(() => {
	delete process.env.BLOGKIT_MD_DIR;
	rmSync(tmpDir, { recursive: true, force: true });
});

export const sampleInstance = (over: Partial<Instance> = {}): Instance => ({
	pid: process.pid,
	port: 3001,
	ssePort: 40001,
	dir: '/tmp/posts',
	isDirectory: true,
	background: true,
	startedAt: new Date().toISOString(),
	...over,
});

export function spawnStandIn(): ChildProcess {
	return spawn(process.execPath, ['-e', 'setInterval(() => {}, 1 << 30)'], {
		stdio: 'ignore',
	});
}

export function waitForExit(pid: number, timeoutMs = 2000): Promise<boolean> {
	const start = Date.now();
	return new Promise(resolve => {
		const tick = () => {
			if (!isAlive(pid)) return resolve(true);
			if (Date.now() - start > timeoutMs) return resolve(false);
			setTimeout(tick, 25);
		};
		tick();
	});
}

export interface RunResult {
	code: number | null;
	stdout: string;
	stderr: string;
}

export function runCli(argv: string[], environment: Record<string, string> = {}): Promise<RunResult> {
	return new Promise(resolve => {
		const child = spawn(process.execPath, [BIN, ...argv], {
			env: {
				...process.env,
				BLOGKIT_MD_DIR: tmpDir,
				BLOGKIT_MD_NO_OPEN: '1',
				NO_COLOR: '1',
				...environment,
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (d: Buffer) => (stdout += d));
		child.stderr.on('data', (d: Buffer) => (stderr += d));
		child.on('close', (code: number | null) => resolve({ code, stdout, stderr }));
	});
}

export { writeRegistry };
