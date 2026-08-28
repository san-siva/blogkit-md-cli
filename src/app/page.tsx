import { cache } from 'react';

import { readMarkdownFile } from '@san-siva/blogkit-md';
import type { Metadata } from 'next';
import path from 'node:path';

import { RenderContent } from '../components/RenderContent';
import { collectMarkdownLinks } from '../lib/markdown-links';

export const dynamic = 'force-dynamic';

const getMarkdownFile = cache(() =>
	readMarkdownFile(process.env.MARKDOWN_FILE)
);

const getMarkdownLinks = cache(async () => {
	const dir = process.env.MARKDOWN_DIR;
	if (!dir) return [];
	return collectMarkdownLinks(dir, dir);
});

export const generateMetadata = async (): Promise<Metadata> => {
	if (process.env.MARKDOWN_DIR) {
		return { title: path.basename(process.env.MARKDOWN_DIR) };
	}
	const result = await getMarkdownFile();
	if (!result.success) return {};
	return {
		...(result.title && { title: result.title }),
		...(result.description && { description: result.description }),
	};
};

const Page = async () => {
	if (process.env.MARKDOWN_DIR) {
		const links = await getMarkdownLinks();
		const title = path.basename(process.env.MARKDOWN_DIR);
		return <RenderContent kind="directory" title={title} links={links} />;
	}

	const result = await getMarkdownFile();
	return <RenderContent kind="file" result={result} />;
};

export default Page;
