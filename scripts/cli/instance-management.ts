import path from 'node:path';

import { banner, c, line, tilde, tree } from './output.ts';
import { killInstance, pruneRegistry, type Instance } from './registry.ts';

export { killInstance } from './registry.ts';

/**
 * True when `child` lives strictly inside `parent`. Checks `..` as a whole
 * path segment — a bare startsWith('..') would wrongly reject children whose
 * own name begins with dots (e.g. `parent/..drafts/a.md` → relative
 * `..drafts/a.md`). The absolute check catches cross-drive paths on Windows.
 */
const isInside = (parent: string, child: string): boolean => {
	const relative = path.relative(parent, child);
	return (
		relative !== '' &&
		relative !== '..' &&
		!relative.startsWith('..' + path.sep) &&
		!path.isAbsolute(relative)
	);
};

/**
 * Find a running directory instance that already serves `filePath`. When several
 * nested directory instances contain the file they all lie on the same ancestor
 * chain, so the longest dir string is the deepest (most specific) and wins.
 */
export function findContainingDir(filePath: string): Instance | undefined {
	return pruneRegistry()
		.filter(i => i.isDirectory && isInside(i.dir, filePath))
		.toSorted((a, b) => b.dir.length - a.dir.length)[0];
}

/** Running instances whose served path lives strictly inside `dir`. */
export function findInstancesUnder(dir: string): Instance[] {
	return pruneRegistry().filter(i => isInside(dir, i.dir));
}

/**
 * URL path a directory instance serves `filePath` at — mirrors the href the
 * Next.js directory index builds: strip `.md`, encode each segment, join with /.
 */
export function fileUrlPath(dir: string, filePath: string): string {
	const relative = path.relative(dir, filePath);
	return (
		'/' +
		relative
			.replace(/\.md$/, '')
			.split(path.sep)
			.map(encodeURIComponent)
			.join('/')
	);
}

/**
 * Stop any narrower instances running inside `dir` so the folder server owns
 * the tree, and return one of their ports so the new server can reuse it.
 */
export async function supersedeNarrowerInstances(
	dir: string
): Promise<number | undefined> {
	const contained = findInstancesUnder(dir);
	if (contained.length === 0) return undefined;
	banner();
	line(c.yellow('Stopping narrower instances inside this folder'));
	for (const inst of contained) {
		killInstance(inst);
		tree(`${c.green('localhost:' + inst.port)}  ${c.dim(tilde(inst.dir))}`);
	}
	const reusedPort = contained[0].port;
	line(c.gray(`Reusing port ${reusedPort} for ${tilde(dir)}`));
	line();
	await new Promise(r => setTimeout(r, 400));
	return reusedPort;
}
