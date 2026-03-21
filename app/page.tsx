import { Blog, BlogHeader, Callout } from '@san-siva/blogkit';
import { MarkdownSections } from '@san-siva/blogkit-md';

import { ScrollToHash } from '@/components/ScrollToHash';
import { readMarkdownFile } from '@/hooks/readMarkdownFile';

const Page = async () => {
	const result = await readMarkdownFile(process.env.MARKDOWN_FILE);

	if (!result.success) {
		return (
			<Blog>
				<Callout type="warning">{result.error}</Callout>
			</Blog>
		);
	}

	const { rendered, frontmatter } = result;

	return (
		<Blog>
			<ScrollToHash />
			{frontmatter.title && (
				<BlogHeader
					title={[frontmatter.title]}
					desc={frontmatter.description ? [frontmatter.description] : []}
				/>
			)}
			<MarkdownSections rendered={rendered} />
		</Blog>
	);
};

export default Page;
