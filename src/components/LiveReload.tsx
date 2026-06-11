'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

// Enough failed reconnects (~3s apart in Chrome) to ride out a server
// replacement — kill + 400ms port release + next start boot — with margin.
const MAX_RETRIES = 30;

export const LiveReload = () => {
	const router = useRouter();

	useEffect(() => {
		let retries = 0;
		let everConnected = false;
		let dropped = false;
		const es = new EventSource('/api/sse');

		es.addEventListener('message', event => {
			if (event.data === 'connected') {
				// Reconnecting after a drop means another server took over this
				// port (e.g. a folder server superseding a file server). The page
				// shape may have completely changed, so do a full reload; a soft
				// refresh is only safe against the server that rendered us.
				if (everConnected && dropped) {
					es.close();
					globalThis.location.reload();
					return;
				}
				everConnected = true;
				dropped = false;
				retries = 0;
				return;
			}
			router.refresh();
		});

		es.addEventListener('error', () => {
			dropped = true;
			if (++retries >= MAX_RETRIES) es.close();
		});

		return () => es.close();
	}, [router]);

	return null;
};
