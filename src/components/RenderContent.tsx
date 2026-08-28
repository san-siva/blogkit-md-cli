import { BlogHeader, Callout } from '@san-siva/blogkit';
import { MarkdownSections, readMarkdownFile } from '@san-siva/blogkit-md';
import Link from 'next/link';

import { LiveReload } from './LiveReload';
import { WidthModeBlog } from './WidthModeBlog';

type MarkdownResult = Awaited<ReturnType<typeof readMarkdownFile>>;

type LinkItem = { href: string; label: string };

type Props =
	| { kind: 'file'; result: MarkdownResult; fallbackTitle?: string }
	| { kind: 'directory'; title: string; links: LinkItem[] };

export const RenderContent = (props: Props) => {
	if (props.kind === 'directory') {
		const { title, links } = props;
		return (
			<WidthModeBlog>
				<LiveReload />
				<BlogHeader
					title={[title]}
					desc={[`${links.length} markdown file${links.length === 1 ? '' : 's'}`]}
				/>
				{links.length === 0 ? (
					<Callout type="warning">
						No markdown files found in this directory.
					</Callout>
				) : (
					<ul>
						{links.map(({ href, label }) => (
							<li key={href}>
								<Link href={href}>{label}</Link>
							</li>
						))}
					</ul>
				)}
			</WidthModeBlog>
		);
	}

	const { result, fallbackTitle } = props;

	if (!result.success) {
		return (
			<WidthModeBlog>
				<LiveReload />
				<Callout type="warning">{result.error}</Callout>
			</WidthModeBlog>
		);
	}

	const { rendered, title, description } = result;
	const resolvedTitle = title ?? fallbackTitle;

	return (
		<WidthModeBlog>
			<LiveReload />
			{resolvedTitle && (
				<BlogHeader
					title={[resolvedTitle]}
					desc={description ? [description] : []}
				/>
			)}
			<MarkdownSections rendered={rendered} />
		</WidthModeBlog>
	);
};
