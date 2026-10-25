'use client';

import { useEffect, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { createLiveReloadHandlers } from '../lib/live-reload';

export const LiveReload = () => {
	const router = useRouter();
	// Read through a ref so navigating doesn't tear down the event stream.
	const currentPathname = usePathname();
	const pathname = useRef(currentPathname);
	pathname.current = currentPathname;

	useEffect(() => {
		const es = new EventSource('/api/sse');
		const handlers = createLiveReloadHandlers({
			refresh: () => router.refresh(),
			reload: () => globalThis.location.reload(),
			close: () => es.close(),
			getPathname: () => pathname.current,
		});
		es.addEventListener('message', event => handlers.onMessage(event.data));
		es.addEventListener('error', () => handlers.onError());
		return () => es.close();
	}, [router]);

	return null;
};
