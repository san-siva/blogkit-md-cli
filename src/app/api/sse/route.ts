export const dynamic = 'force-dynamic';

export async function GET() {
	const port = process.env.SSE_PORT;

	if (!port) {
		return new Response('SSE port not configured', { status: 500 });
	}

	const upstream = await fetch(`http://localhost:${port}`);

	return new Response(upstream.body, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
		},
	});
}
