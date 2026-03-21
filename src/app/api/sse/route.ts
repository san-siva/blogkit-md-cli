export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
	const port = process.env.SSE_PORT;

	if (!port) {
		return new Response('SSE port not configured', { status: 500 });
	}

	const controller = new AbortController();
	request.signal.addEventListener('abort', () => controller.abort());

	try {
		const upstream = await fetch(`http://localhost:${port}`, { signal: controller.signal });
		const body = new ReadableStream({
			async start(streamController) {
				const reader = upstream.body!.getReader();
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						streamController.enqueue(value);
					}
				} catch {
					// upstream closed (server shutdown)
				} finally {
					streamController.close();
				}
			},
			cancel() {
				controller.abort();
			},
		});
		return new Response(body, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
			},
		});
	} catch {
		return new Response(null, { status: 499 });
	}
}
