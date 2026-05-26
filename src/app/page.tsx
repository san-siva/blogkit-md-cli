import { readMarkdownFile } from '@san-siva/blogkit-md';
import type { Metadata } from 'next';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';

import { RenderDirectory } from '@/components/RenderDirectory';
import { RenderFile } from '@/components/RenderFile';

export const dynamic = 'force-dynamic';

const getMarkdownFile = cache(() => readMarkdownFile(process.env.MARKDOWN_FILE));

const getMarkdownLinks = cache(async () => {
	const dir = process.env.MARKDOWN_DIR;
	if (!dir) return [];
	const links: { href: string; label: string }[] = [];

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
				const relative = path.relative(dir, fullPath);
				const href = '/' + relative.replace(/\.md$/, '').split(path.sep).map(encodeURIComponent).join('/');
				const label = relative.replace(/\.md$/, '').split(path.sep).join(' / ');
				links.push({ href, label });
			}
		}
	};

	await walk(dir);
	links.sort((a, b) => a.label.localeCompare(b.label));
	return links;
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
		return <RenderDirectory title={title} links={links} />;
	}

	const result = await getMarkdownFile();
	return <RenderFile result={result} />;
};

export default Page;
