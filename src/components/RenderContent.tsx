import { BlogHeader, Callout } from '@san-siva/blogkit';
import { MarkdownSections, readMarkdownFile } from '@san-siva/blogkit-md';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { SettingsToolbar } from './SettingsToolbar';

type MarkdownResult = Awaited<ReturnType<typeof readMarkdownFile>>;

type LinkItem = { href: string; label: string };

/**
 * Rendered above the content. The CLI passes its live-reload client; a
 * statically exported site leaves it out, having no SSE endpoint to listen to.
 */
type Shared = { liveReload?: ReactNode };

type Props = Shared &
	(
		| { kind: 'file'; result: MarkdownResult; fallbackTitle?: string }
		| { kind: 'directory'; title: string; links: LinkItem[] }
	);

export const RenderContent = (props: Props) => {
	const { liveReload } = props;

	if (props.kind === 'directory') {
		const { title, links } = props;
		return (
			<SettingsToolbar>
				{liveReload}
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
			</SettingsToolbar>
		);
	}

	const { result, fallbackTitle } = props;

	if (!result.success) {
		return (
			<SettingsToolbar>
				{liveReload}
				<Callout type="warning">{result.error}</Callout>
			</SettingsToolbar>
		);
	}

	const { rendered, title, description } = result;
	const resolvedTitle = title ?? fallbackTitle;

	return (
		<SettingsToolbar>
			{liveReload}
			{resolvedTitle && (
				<BlogHeader
					title={[resolvedTitle]}
					desc={description ? [description] : []}
				/>
			)}
			<MarkdownSections rendered={rendered} />
		</SettingsToolbar>
	);
};
