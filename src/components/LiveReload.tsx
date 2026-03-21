'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const LiveReload = () => {
	const router = useRouter();

	useEffect(() => {
		const es = new EventSource(`http://localhost:${process.env.NEXT_PUBLIC_SSE_PORT}`);
		es.onmessage = () => router.refresh();
		return () => es.close();
	}, [router]);

	return null;
};
