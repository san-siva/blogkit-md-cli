'use client';

import { useState } from 'react';

import { Blog, CheckList, type CheckListItem } from '@san-siva/blogkit';
import type { ReactNode } from 'react';

import styles from './WidthModeBlog.module.scss';

type Properties = {
	children: ReactNode;
};

export const WidthModeBlog = ({ children }: Properties) => {
	const [increasedWidthMode, setIncreasedWidthMode] = useState(false);
	const [isTocEnabled, setIsTocEnabled] = useState(true);

	const widthModeToggle: CheckListItem[] = [
		{
			id: 'increased-width-mode',
			children: <p>Wide layout</p>,
			isChecked: increasedWidthMode,
			onClick: () => setIncreasedWidthMode(current => !current),
		},
		{
			id: 'enable-toc',
			children: <p>Table of contents</p>,
			isChecked: isTocEnabled,
			onClick: () => setIsTocEnabled(current => !current),
		},
	];

	return (
		<Blog increasedWidthMode={increasedWidthMode} isTocEnabled={isTocEnabled}>
			<div className={styles.toolbar}>
				<CheckList items={widthModeToggle} />
			</div>
			{children}
		</Blog>
	);
};
