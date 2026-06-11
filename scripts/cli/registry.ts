import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface Instance {
	pid: number;
	port: number;
	ssePort: number;
	dir: string;
	isDirectory: boolean;
	background: boolean;
	startedAt: string;
}

export const registryDir = (): string =>
	process.env.BLOGKIT_MD_DIR || path.join(os.homedir(), '.blogkit-md');
export const registryFile = (): string =>
	path.join(registryDir(), 'instances.json');
export const logDir = (): string => path.join(registryDir(), 'logs');

export const isAlive = (pid: number): boolean => {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
};

export function readRegistry(): Instance[] {
	try {
		const raw = JSON.parse(readFileSync(registryFile(), 'utf8'));
		return Array.isArray(raw) ? (raw as Instance[]) : [];
	} catch {
		return [];
	}
}

export function writeRegistry(list: Instance[]): void {
	try {
		mkdirSync(registryDir(), { recursive: true });
		writeFileSync(registryFile(), JSON.stringify(list, null, 2));
	} catch {
		/* registry is best-effort — never crash the CLI over it */
	}
}

export function pruneRegistry(): Instance[] {
	const all = readRegistry();
	const live = all.filter(i => isAlive(i.pid));
	if (live.length !== all.length) writeRegistry(live);
	return live;
}

export function addInstance(inst: Instance): void {
	const list = pruneRegistry().filter(i => i.pid !== inst.pid);
	list.push(inst);
	writeRegistry(list);
}

export function removeInstance(pid: number): void {
	writeRegistry(readRegistry().filter(i => i.pid !== pid));
}

export function findByDir(dir: string): Instance | undefined {
	return pruneRegistry().find(i => i.dir === dir);
}

export function killInstance(inst: Instance): void {
	try {
		process.kill(inst.pid, 'SIGTERM');
	} catch {
		/* already gone */
	}
	removeInstance(inst.pid);
}
