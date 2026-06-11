import assert from 'node:assert/strict';
import type { Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, test } from 'node:test';

import { GET } from '../app/api/sse/route.ts';

const upstreams: Server[] = [];
const savedPort = process.env.SSE_PORT;

afterEach(() => {
	for (const s of upstreams.splice(0)) s.close();
	if (savedPort === undefined) delete process.env.SSE_PORT;
	else process.env.SSE_PORT = savedPort;
});

/** Stand-in for the CLI wrapper's SSE server: greets each client, keeps a handle. */
function startUpstream(): Promise<{ port: number; clients: Set<ServerResponse> }> {
	const clients = new Set<ServerResponse>();
	const server = createServer((request, res) => {
		res.writeHead(200, { 'Content-Type': 'text/event-stream' });
		res.write('data: connected\n\n');
		clients.add(res);
		request.on('close', () => clients.delete(res));
	});
	upstreams.push(server);
	return new Promise(resolve =>
		server.listen(0, () =>
			resolve({ port: (server.address() as AddressInfo).port, clients })
		)
	);
}

async function readChunk(response: Response): Promise<string> {
	const reader = response.body!.getReader();
	const { value } = await reader.read();
	await reader.cancel();
	return new TextDecoder().decode(value);
}

test('GET /api/sse: 500 when SSE_PORT is not configured', async () => {
	delete process.env.SSE_PORT;
	const response = await GET(new Request('http://localhost/api/sse'));
	assert.equal(response.status, 500);
	assert.match(await response.text(), /SSE port not configured/);
});

test('GET /api/sse: proxies the upstream event stream', async () => {
	const { port } = await startUpstream();
	process.env.SSE_PORT = String(port);

	const response = await GET(new Request('http://localhost/api/sse'));
	assert.equal(response.status, 200);
	assert.equal(response.headers.get('Content-Type'), 'text/event-stream');
	assert.equal(response.headers.get('Cache-Control'), 'no-cache');
	assert.match(await readChunk(response), /data: connected/);
});

test('GET /api/sse: forwards messages the upstream broadcasts', async () => {
	const { port, clients } = await startUpstream();
	process.env.SSE_PORT = String(port);

	const response = await GET(new Request('http://localhost/api/sse'));
	const reader = response.body!.getReader();
	const decoder = new TextDecoder();

	const first = await reader.read();
	let received = decoder.decode(first.value);
	for (const client of clients) client.write('data: reload\n\n');
	while (!received.includes('data: reload')) {
		const chunk = await reader.read();
		received += decoder.decode(chunk.value);
	}
	await reader.cancel();
	assert.match(received, /data: connected/);
	assert.match(received, /data: reload/);
});

test('GET /api/sse: 499 when the upstream is unreachable', async () => {
	// Grab a free port, then close it so nothing is listening there.
	const { port } = await startUpstream();
	upstreams.pop()!.close();
	await new Promise(r => setTimeout(r, 50));
	process.env.SSE_PORT = String(port);

	const response = await GET(new Request('http://localhost/api/sse'));
	assert.equal(response.status, 499);
});
