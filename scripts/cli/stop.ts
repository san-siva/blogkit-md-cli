import { banner, c, line, tilde, tree } from './output.ts';
import { findByDir, killInstance, pruneRegistry } from './registry.ts';

export function stopAllAndExit(): never {
	banner();
	const instances = pruneRegistry();
	if (instances.length === 0) {
		line(c.yellow('No running instances'));
	} else {
		for (const inst of instances) {
			killInstance(inst);
			line(c.green(`✓ Stopped localhost:${inst.port}`));
			tree(c.dim(tilde(inst.dir)));
		}
	}
	line();
	process.exit(0);
}

export function stopAndExit(inputPath: string): never {
	banner();
	const existing = findByDir(inputPath);
	if (existing) {
		killInstance(existing);
		line(c.green(`✓ Stopped localhost:${existing.port}`));
		tree(c.dim(tilde(existing.dir)));
	} else {
		line(c.yellow('No running instance for that path'));
		tree(c.dim(tilde(inputPath)));
	}
	line();
	process.exit(0);
}
