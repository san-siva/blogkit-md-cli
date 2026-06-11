import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getFreePort } from '../cli/server.ts';

test('getFreePort: resolves to a valid port number', async () => {
	const port = await getFreePort();
	assert.equal(typeof port, 'number');
	assert.ok(port >= 1024 && port <= 65535, `expected valid port, got ${port}`);
});

test('getFreePort: two calls return different ports', async () => {
	const [a, b] = await Promise.all([getFreePort(), getFreePort()]);
	assert.notEqual(a, b);
});
