import { Blog, BlogHeader, Callout } from '@san-siva/blogkit';
import { MarkdownSections, readMarkdownFile } from '@san-siva/blogkit-md';
import type { Metadata } from 'next';
import { cache } from 'react';

import { LiveReload } from '@/components/LiveReload';

export const dynamic = 'force-dynamic';

const getMarkdownFile = cache(() => readMarkdownFile(process.env.MARKDOWN_FILE));

export const generateMetadata = async (): Promise<Metadata> => {
	const result = await getMarkdownFile();
	if (!result.success) return {};
	return {
		...(result.title && { title: result.title }),
		...(result.description && { description: result.description }),
	};
};

const Page = async () => {
	const result = await getMarkdownFile();

	if (!result.success) {
		return (
			<Blog>
				<Callout type="warning">{result.error}</Callout>
			</Blog>
		);
	}

	const { rendered, title, description } = result;

	return (
		<Blog>
			<LiveReload />
			{title && (
				<BlogHeader
					title={[title]}
					desc={description ? [description] : []}
				/>
			)}
			<MarkdownSections rendered={rendered} />
		</Blog>
	);
};

export default Page;
