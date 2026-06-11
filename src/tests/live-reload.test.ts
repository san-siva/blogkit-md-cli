import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createLiveReloadHandlers, MAX_RETRIES } from '../lib/live-reload.ts';

function instrumented() {
	const calls = { refresh: 0, reload: 0, close: 0 };
	const handlers = createLiveReloadHandlers({
		refresh: () => calls.refresh++,
		reload: () => calls.reload++,
		close: () => calls.close++,
	});
	return { calls, handlers };
}

test('liveReload: the initial connected greeting does nothing', () => {
	const { calls, handlers } = instrumented();
	handlers.onMessage('connected');
	assert.deepEqual(calls, { refresh: 0, reload: 0, close: 0 });
});

test('liveReload: a reload broadcast triggers a soft refresh', () => {
	const { calls, handlers } = instrumented();
	handlers.onMessage('connected');
	handlers.onMessage('reload');
	handlers.onMessage('reload');
	assert.deepEqual(calls, { refresh: 2, reload: 0, close: 0 });
});

test('liveReload: reconnecting after a drop closes the stream and fully reloads', () => {
	const { calls, handlers } = instrumented();
	handlers.onMessage('connected');
	handlers.onError(); // server died
	handlers.onError(); // still booting
	handlers.onMessage('connected'); // replacement server is up
	assert.deepEqual(calls, { refresh: 0, reload: 1, close: 1 });
});

test('liveReload: a flaky first connect never causes a reload loop', () => {
	const { calls, handlers } = instrumented();
	handlers.onError(); // server still booting on first page load
	handlers.onError();
	handlers.onMessage('connected');
	assert.deepEqual(calls, { refresh: 0, reload: 0, close: 0 });
});

test('liveReload: an exhausted retry budget closes the stream', () => {
	const { calls, handlers } = instrumented();
	handlers.onMessage('connected');
	for (let index = 0; index < MAX_RETRIES; index++) handlers.onError();
	assert.equal(calls.close, 1);
});

test('liveReload: the retry budget is per-outage, reset by each successful connect', () => {
	const { calls, handlers } = instrumented();
	handlers.onMessage('connected');
	// Two outages that each stay under the budget must never close the stream.
	for (let index = 0; index < MAX_RETRIES - 1; index++) handlers.onError();
	handlers.onMessage('connected'); // reload fires, but budget also resets
	for (let index = 0; index < MAX_RETRIES - 1; index++) handlers.onError();
	assert.equal(calls.close, 1); // only the close paired with the reload
	assert.equal(calls.reload, 1);
});
