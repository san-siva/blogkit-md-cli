'use client';

import { useState } from 'react';

import { Blog, CheckList, type CheckListItem } from '@san-siva/blogkit';
import type { ReactNode } from 'react';

type Properties = {
	children: ReactNode;
};

export const WidthModeBlog = ({ children }: Properties) => {
	const [increasedWidthMode, setIncreasedWidthMode] = useState(false);

	const widthModeToggle: CheckListItem[] = [
		{
			id: 'increased-width-mode',
			children: <p>Increased width mode</p>,
			isChecked: increasedWidthMode,
			onClick: () => setIncreasedWidthMode(current => !current),
		},
	];

	return (
		<Blog increasedWidthMode={increasedWidthMode}>
			<CheckList items={widthModeToggle} hasMarginDown />
			{children}
		</Blog>
	);
};
