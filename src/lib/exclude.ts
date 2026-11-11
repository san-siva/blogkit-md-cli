/**
 * Exclude patterns for directory mode. A pattern without a '/' (e.g.
 * 'node_modules', '*.draft.md') matches any single path segment at any depth;
 * a pattern containing '/' (e.g. 'drafts/**', 'a/*.md') matches the path
 * relative to the served directory. '*' stays within a segment, '**' spans
 * segments.
 */
const escapeRegex = (s: string) => s.replace(/[$()+.?[\\\]^{|}]/g, '\\$&');

const globToRegex = (glob: string): RegExp => {
	let source = '';
	let index = 0;
	while (index < glob.length) {
		if (glob.startsWith('**/', index)) {
			source += '(?:.*/)?';
			index += 3;
		} else if (glob.startsWith('**', index)) {
			source += '.*';
			index += 2;
		} else if (glob[index] === '*') {
			source += '[^/]*';
			index++;
		} else {
			source += escapeRegex(glob[index]);
			index++;
		}
	}
	return new RegExp(`^${source}$`);
};

export type ExcludeMatcher = (relativePath: string) => boolean;

/** Build a predicate over '/'-separated paths relative to the served directory. */
export const createExcludeMatcher = (patterns: string[]): ExcludeMatcher => {
	const rules = patterns
		.map(p => p.trim().replace(/^\.\//, '').replace(/\/+$/, ''))
		.filter(Boolean)
		.map(p => ({ perSegment: !p.includes('/'), regex: globToRegex(p) }));
	if (rules.length === 0) return () => false;

	return relativePath => {
		const normalized = relativePath.split(/[/\\]/).filter(Boolean);
		const full = normalized.join('/');
		return rules.some(rule =>
			rule.perSegment
				? normalized.some(segment => rule.regex.test(segment))
				: rule.regex.test(full)
		);
	};
};

/** Read the patterns the CLI hands the Next server via MARKDOWN_EXCLUDE (JSON array). */
export const excludeFromEnvironment = (
	raw = process.env.MARKDOWN_EXCLUDE
): ExcludeMatcher => {
	try {
		const parsed: unknown = raw ? JSON.parse(raw) : [];
		return createExcludeMatcher(
			Array.isArray(parsed) ? parsed.filter(p => typeof p === 'string') : []
		);
	} catch {
		return createExcludeMatcher([]);
	}
};
