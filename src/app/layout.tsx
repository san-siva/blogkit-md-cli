import type { Metadata } from 'next';
import { JetBrains_Mono, Montserrat, Rubik } from 'next/font/google';

import '@san-siva/stylekit/styles/globals.scss';
import '@san-siva/blogkit/styles.css';
import styles from '@san-siva/stylekit/styles/index.module.scss';

const montserrat = Montserrat({
	subsets: ['latin'] as const,
	weight: ['400', '500', '600', '700', '800'] as const,
	style: ['normal', 'italic'] as const,
	variable: '--font-montserrat',
});

const rubik = Rubik({
	subsets: ['latin'] as const,
	weight: ['300', '400', '500', '600', '700', '800', '900'] as const,
	style: ['normal', 'italic'] as const,
	variable: '--font-rubik',
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ['latin'] as const,
	weight: ['400', '500', '600', '700'] as const,
	style: ['normal', 'italic'] as const,
	variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
	title: 'Blogkit MD',
	description: 'Markdown to JSX blog post renderer',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
	<html lang="en">
		<body
			className={`${montserrat.variable} ${rubik.variable} ${jetbrainsMono.variable}`}
		>
			<div className={`${styles.page}`}>{children}</div>
		</body>
	</html>
);

export default RootLayout;
