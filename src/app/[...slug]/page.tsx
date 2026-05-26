import { readMarkdownFile } from '@san-siva/blogkit-md';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import path from 'node:path';
import { cache } from 'react';

import { RenderFile } from '@/components/RenderFile';

export const dynamic = 'force-dynamic';

type Props = {
	params: Promise<{ slug: string[] }>;
};

const resolveMarkdownPath = (slug: string[]): string | null => {
	const dir = process.env.MARKDOWN_DIR;
	if (!dir) return null;

	const safeSlug = slug.map(part => decodeURIComponent(part)).filter(p => p && p !== '..' && !p.includes('/') && !p.includes('\\'));
	if (safeSlug.length !== slug.length) return null;

	const filePath = path.resolve(dir, `${safeSlug.join(path.sep)}.md`);
	const relative = path.relative(dir, filePath);
	if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
	return filePath;
};

const loadFile = cache(async (slug: string[]) => {
	const filePath = resolveMarkdownPath(slug);
	if (!filePath) return null;
	return readMarkdownFile(filePath);
});

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
	const { slug } = await params;
	const result = await loadFile(slug);
	if (!result || !result.success) return {};
	return {
		...(result.title && { title: result.title }),
		...(result.description && { description: result.description }),
	};
};

const NotePage = async ({ params }: Props) => {
	const { slug } = await params;
	const result = await loadFile(slug);

	if (!result) notFound();

	const fallbackTitle = slug[slug.length - 1]?.replace(/-/g, ' ');
	return <RenderFile result={result} fallbackTitle={fallbackTitle} />;
};

export default NotePage;
