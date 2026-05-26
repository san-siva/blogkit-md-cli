import { Blog, BlogHeader, Callout } from '@san-siva/blogkit';
import { MarkdownSections, readMarkdownFile } from '@san-siva/blogkit-md';

import { LiveReload } from '@/components/LiveReload';

type MarkdownResult = Awaited<ReturnType<typeof readMarkdownFile>>;

type Props = {
	result: MarkdownResult;
	fallbackTitle?: string;
};

export const RenderFile = ({ result, fallbackTitle }: Props) => {
	if (!result.success) {
		return (
			<Blog>
				<LiveReload />
				<Callout type="warning">{result.error}</Callout>
			</Blog>
		);
	}

	const { rendered, title, description } = result;
	const resolvedTitle = title ?? fallbackTitle;

	return (
		<Blog>
			<LiveReload />
			{resolvedTitle && (
				<BlogHeader
					title={[resolvedTitle]}
					desc={description ? [description] : []}
				/>
			)}
			<MarkdownSections rendered={rendered} />
		</Blog>
	);
};
