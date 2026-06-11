import { readdir } from 'node:fs/promises';
import path from 'node:path';

export type LinkItem = { href: string; label: string };

/**
 * Recursively collect a link for every .md file under `root`. Hrefs are built
 * relative to `base` (the served MARKDOWN_DIR) so they stay valid no matter
 * which subdirectory is being listed; labels are relative to `root` so a
 * subdirectory listing isn't prefixed with its own name on every line.
 */
export async function collectMarkdownLinks(
	root: string,
	base: string
): Promise<LinkItem[]> {
	const links: LinkItem[] = [];

	const walk = async (current: string) => {
		let entries;
		try {
			entries = await readdir(current, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const fullPath = path.join(current, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
			} else if (entry.name.endsWith('.md')) {
				const href =
					'/' +
					path
						.relative(base, fullPath)
						.replace(/\.md$/, '')
						.split(path.sep)
						.map(encodeURIComponent)
						.join('/');
				const label = path
					.relative(root, fullPath)
					.replace(/\.md$/, '')
					.split(path.sep)
					.join(' / ');
				links.push({ href, label });
			}
		}
	};

	await walk(root);
	links.sort((a, b) => a.label.localeCompare(b.label));
	return links;
}
