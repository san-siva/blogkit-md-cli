import { stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * Resolve a URL slug to a path inside `dir`, rejecting traversal attempts:
 * `..` segments, separators smuggled inside a segment (also via URL encoding),
 * and anything that resolves outside `dir`.
 */
export const resolveSafePath = (
	slug: string[],
	dir: string | undefined
): string | null => {
	if (!dir) return null;

	const safeSlug = slug
		.map(part => decodeURIComponent(part))
		.filter(p => p && p !== '..' && !p.includes('/') && !p.includes('\\'));
	if (safeSlug.length !== slug.length) return null;

	const target = path.resolve(dir, safeSlug.join(path.sep));
	// Defense-in-depth: check '..' as a whole segment so children whose own
	// name starts with dots (e.g. '..drafts') aren't mistaken for traversal.
	const relative = path.relative(dir, target);
	if (
		relative === '..' ||
		relative.startsWith('..' + path.sep) ||
		path.isAbsolute(relative)
	) {
		return null;
	}
	return target;
};

/** When the slug names an existing directory inside `dir`, return its path; else null. */
export const resolveDirectory = async (
	slug: string[],
	dir: string | undefined
): Promise<string | null> => {
	const target = resolveSafePath(slug, dir);
	if (!target) return null;
	try {
		const stats = await stat(target);
		return stats.isDirectory() ? target : null;
	} catch {
		return null;
	}
};

/**
 * Links between docs are usually written against the file ('other.md'), so the
 * URL slug can carry the extension. Drop it from the last segment so the page
 * resolves 'other.md' and 'other' to the same file.
 */
export const stripMarkdownExtension = (slug: string[]): string[] => {
	if (slug.length === 0) return slug;
	const last = decodeURIComponent(slug[slug.length - 1]);
	return /\.md$/i.test(last) && last.length > 3
		? [...slug.slice(0, -1), last.replace(/\.md$/i, '')]
		: slug;
};
