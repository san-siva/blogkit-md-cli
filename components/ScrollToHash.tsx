'use client';

import { useEffect } from 'react';

const SCROLL_KEY = 'blogkit-md:scroll-y';

export const ScrollToHash = () => {
	useEffect(() => {
		const saved = sessionStorage.getItem(SCROLL_KEY);
		if (saved !== null) {
			window.scrollTo({ top: Number(saved) });
		}

		const saveScroll = () => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
		window.addEventListener('scroll', saveScroll, { passive: true });
		return () => window.removeEventListener('scroll', saveScroll);
	}, []);

	return null;
};
