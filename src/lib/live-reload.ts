// Enough failed reconnects (~3s apart in Chrome) to ride out a server
// replacement — kill + 400ms port release + next start boot — with margin.
export const MAX_RETRIES = 30;

const decodePart = (part: string) => {
	try {
		return decodeURIComponent(part);
	} catch {
		return part;
	}
};

/** A pathname or event route as a comparable, decoded, slash-trimmed string. */
export const normalizeRoute = (route: string): string =>
	route.split('/').filter(Boolean).map(decodePart).join('/');

/**
 * Whether a broadcast concerns the page at `pathname`. Events are
 * 'change:<route>' (a file's content changed) and 'list:<route>' (a file was
 * added or removed), where <route> is the file's URL path without '.md':
 *
 * - 'change' only affects the page rendering that file.
 * - 'list' only affects directory indexes, which list file names but not
 *   their content: the root index and any folder containing the file.
 * - Anything else (a bare 'reload') is treated as relevant to every page.
 */
export const isRelevantTo = (data: string, pathname: string): boolean => {
	const separator = data.indexOf(':');
	const kind = separator === -1 ? data : data.slice(0, separator);
	if (kind !== 'change' && kind !== 'list') return true;

	const route = normalizeRoute(data.slice(separator + 1));
	const current = normalizeRoute(pathname);
	if (kind === 'change') return route === current;
	return current === '' || route.startsWith(current + '/');
};

export type LiveReloadHooks = {
	/** Soft refresh — re-fetch server components for the current route. */
	refresh: () => void;
	/** Full page reload — a different server may own the port now. */
	reload: () => void;
	/** Stop listening for events. */
	close: () => void;
	/** The path of the page being shown, so unrelated changes are ignored. */
	getPathname?: () => string;
};

/**
 * The reconnect state machine behind LiveReload. The SSE server greets every
 * connection with 'connected' and broadcasts 'reload' on file changes:
 *
 * - A change event for this page (see isRelevantTo, any other payload counts
 *   as relevant to every page) → soft refresh. Events for other pages are
 *   ignored, so only the page whose content changed re-renders.
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
	getPathname = () => '',
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
			if (isRelevantTo(data, getPathname())) refresh();
		},
		onError(): void {
			dropped = true;
			if (++retries >= MAX_RETRIES) close();
		},
	};
}
