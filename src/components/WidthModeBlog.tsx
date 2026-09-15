'use client';

import { Blog, CheckList, type CheckListItem } from '@san-siva/blogkit';
import type { ReactNode } from 'react';

import { useLayoutPreferences } from './useLayoutPreferences';

import styles from './WidthModeBlog.module.scss';

type Properties = {
	children: ReactNode;
};

export const WidthModeBlog = ({ children }: Properties) => {
	const {
		preferences: { increasedWidthMode, isTocEnabled },
		toggle,
	} = useLayoutPreferences();

	const widthModeToggle: CheckListItem[] = [
		{
			id: 'increased-width-mode',
			children: <p>Wide layout</p>,
			isChecked: increasedWidthMode,
			onClick: () => toggle('increasedWidthMode'),
		},
		{
			id: 'enable-toc',
			children: <p>Table of contents</p>,
			isChecked: isTocEnabled,
			onClick: () => toggle('isTocEnabled'),
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
