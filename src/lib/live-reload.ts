// Enough failed reconnects (~3s apart in Chrome) to ride out a server
// replacement — kill + 400ms port release + next start boot — with margin.
export const MAX_RETRIES = 30;

export type LiveReloadHooks = {
	/** Soft refresh — re-fetch server components for the current route. */
	refresh: () => void;
	/** Full page reload — a different server may own the port now. */
	reload: () => void;
	/** Stop listening for events. */
	close: () => void;
};

/**
 * The reconnect state machine behind LiveReload. The SSE server greets every
 * connection with 'connected' and broadcasts 'reload' on file changes:
 *
 * - 'reload' (or any other payload) → soft refresh.
 * - 'connected' after the stream previously dropped → another server took
 *   over this port (e.g. a folder server superseding a file server), so the
 *   page shape may have completely changed → full reload.
 * - The first successful connect never reloads, even if attempts before it
 *   failed — otherwise a server still booting would cause a reload loop.
 * - The retry budget is per-outage: it resets on every successful connect
 *   and closes the stream once an outage exhausts it.
 */
export function createLiveReloadHandlers({
	refresh,
	reload,
	close,
}: LiveReloadHooks) {
	let retries = 0;
	let everConnected = false;
	let dropped = false;

	return {
		onMessage(data: string): void {
			if (data === 'connected') {
				const replaced = everConnected && dropped;
				everConnected = true;
				dropped = false;
				retries = 0;
				if (replaced) {
					close();
					reload();
				}
				return;
			}
			refresh();
		},
		onError(): void {
			dropped = true;
			if (++retries >= MAX_RETRIES) close();
		},
	};
}
