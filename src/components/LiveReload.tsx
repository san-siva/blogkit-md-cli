'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const LiveReload = () => {
	const router = useRouter();

	useEffect(() => {
		let retries = 0;
		const es = new EventSource('/api/sse');
		es.addEventListener('message', () => router.refresh());
		es.addEventListener('error', () => {
			if (++retries >= 5) es.close();
		});
		return () => es.close();
	}, [router]);

	return null;
};
