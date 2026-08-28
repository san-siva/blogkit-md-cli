import { cache } from 'react';

import { readMarkdownFile } from '@san-siva/blogkit-md';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import path from 'node:path';

import { RenderContent } from '../../components/RenderContent';
import { collectMarkdownLinks } from '../../lib/markdown-links';
import { resolveDirectory, resolveSafePath } from '../../lib/resolve-path';

export const dynamic = 'force-dynamic';

type Properties = {
	params: Promise<{ slug: string[] }>;
};

const loadFile = cache(async (slug: string[]) => {
	const target = resolveSafePath(slug, process.env.MARKDOWN_DIR);
	if (!target) return null;
	return readMarkdownFile(`${target}.md`);
});

const loadDirectory = cache((slug: string[]) =>
	resolveDirectory(slug, process.env.MARKDOWN_DIR)
);

export const generateMetadata = async ({
	params,
}: Properties): Promise<Metadata> => {
	const { slug } = await params;
	const result = await loadFile(slug);
	if (result?.success) {
		return {
			...(result.title && { title: result.title }),
			...(result.description && { description: result.description }),
		};
	}
	const dirPath = await loadDirectory(slug);
	if (dirPath) return { title: path.basename(dirPath) };
	return {};
};

const NotePage = async ({ params }: Properties) => {
	const { slug } = await params;
	const result = await loadFile(slug);

	// The .md file wins so directory names can't shadow existing file URLs;
	// fall back to a scoped directory index when the slug is a folder.
	if (!result?.success) {
		const dirPath = await loadDirectory(slug);
		if (dirPath) {
			const links = await collectMarkdownLinks(
				dirPath,
				process.env.MARKDOWN_DIR!
			);
			return (
				<RenderContent
					kind="directory"
					title={path.basename(dirPath)}
					links={links}
				/>
			);
		}
	}

	if (!result) notFound();

	const fallbackTitle = slug[slug.length - 1]?.replace(/-/g, ' ');
	return (
		<RenderContent kind="file" result={result} fallbackTitle={fallbackTitle} />
	);
};

export default NotePage;
