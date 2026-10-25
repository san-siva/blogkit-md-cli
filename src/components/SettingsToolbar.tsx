'use client';

import { Blog, CheckList, type CheckListItem } from '@san-siva/blogkit';
import type { ReactNode } from 'react';

import { useDeviceDetection } from './useDeviceDetection';
import { useLayoutPreferences } from './useLayoutPreferences';

import styles from './SettingsToolbar.module.scss';

type Properties = {
	children: ReactNode;
};

export const SettingsToolbar = ({ children }: Properties) => {
	const {
		preferences: { increasedWidthMode, isTocEnabled },
		toggle,
	} = useLayoutPreferences();
	const { isMobile, isIpad } = useDeviceDetection();

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
			{!isMobile && !isIpad && (
				<div className={styles.wrapper}>
					<div className={styles.toolbar}>
						<CheckList items={widthModeToggle} />
					</div>
				</div>
			)}
			{children}
		</Blog>
	);
};
