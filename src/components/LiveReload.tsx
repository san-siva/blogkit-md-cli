'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { createLiveReloadHandlers } from '@/lib/live-reload';

export const LiveReload = () => {
	const router = useRouter();

	useEffect(() => {
		const es = new EventSource('/api/sse');
		const handlers = createLiveReloadHandlers({
			refresh: () => router.refresh(),
			reload: () => globalThis.location.reload(),
			close: () => es.close(),
		});
		es.addEventListener('message', event => handlers.onMessage(event.data));
		es.addEventListener('error', () => handlers.onError());
		return () => es.close();
	}, [router]);

	return null;
};
