import { Blog, BlogHeader, Callout } from '@san-siva/blogkit';
import Link from 'next/link';

import { LiveReload } from '@/components/LiveReload';

type LinkItem = { href: string; label: string };

type Props = {
	title: string;
	links: LinkItem[];
};

export const RenderDirectory = ({ title, links }: Props) => (
	<Blog>
		<LiveReload />
		<BlogHeader
			title={[title]}
			desc={[`${links.length} markdown file${links.length === 1 ? '' : 's'}`]}
		/>
		{links.length === 0 ? (
			<Callout type="warning">No markdown files found in this directory.</Callout>
		) : (
			<ul>
				{links.map(({ href, label }) => (
					<li key={href}>
						<Link href={href}>{label}</Link>
					</li>
				))}
			</ul>
		)}
	</Blog>
);
