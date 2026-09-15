import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import { afterEach, before, beforeEach, test } from 'node:test';

import type { LayoutPreferencesState } from '../components/useLayoutPreferences';
import type { LayoutPreferences } from '../lib/layout-preferences';
import { STORAGE_KEY } from '../lib/layout-preferences';

// react-dom/client and the hook are imported only after the DOM globals are
// in place, so nothing captures a missing `window` at module-evaluation time.
let act: typeof import('react').act;
let createElement: typeof import('react').createElement;
let createRoot: typeof import('react-dom/client').createRoot;
let useLayoutPreferences: typeof import('../components/useLayoutPreferences').useLayoutPreferences;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
	url: 'http://localhost/',
});

/**
 * One tab's sessionStorage. Real sessionStorage is per-tab, so each of these
 * stands in for a separate tab sharing the same origin.
 */
const tabStorage = (seed?: Record<string, string>) => {
	const entries = new Map(Object.entries(seed ?? {}));
	return {
		read: () => entries.get(STORAGE_KEY) ?? null,
		storage: {
			getItem: (key: string) => entries.get(key) ?? null,
			setItem: (key: string, value: string) => entries.set(key, value),
			removeItem: (key: string) => entries.delete(key),
			clear: () => entries.clear(),
			key: () => null,
			length: 0,
		} as unknown as Storage,
	};
};

/** Point the hook's storage at one tab. */
const activeTab = (storage?: Storage) => {
	Object.defineProperty(globalThis, 'sessionStorage', {
		value: storage,
		configurable: true,
	});
};

/** Model a tab where storage is unavailable (private mode, blocked data). */
const withoutStorage = () => activeTab();

before(async () => {
	// defineProperty, not assign: some of these globals (navigator) are
	// getter-only on the Node global object.
	const globals = {
		window: dom.window,
		document: dom.window.document,
		navigator: dom.window.navigator,
		IS_REACT_ACT_ENVIRONMENT: true,
	};
	for (const [key, value] of Object.entries(globals)) {
		Object.defineProperty(globalThis, key, { value, configurable: true });
	}

	({ act, createElement } = await import('react'));
	({ createRoot } = await import('react-dom/client'));
	({ useLayoutPreferences } = await import(
		'../components/useLayoutPreferences'
	));
});

beforeEach(() => activeTab(tabStorage().storage));
afterEach(() => {
	dom.window.document.body.innerHTML = '';
});

type Mounted = {
	/** State as of the latest render. */
	latest: () => LayoutPreferencesState;
	/** Preferences observed on the very first render, before effects ran. */
	firstRender: LayoutPreferences;
	unmount: () => void;
};

/**
 * Mount a probe component that does nothing but expose the hook's state, so
 * the assertions cover the persistence wiring rather than the Blog UI.
 */
const mountHook = async (): Promise<Mounted> => {
	const renders: LayoutPreferencesState[] = [];
	const Probe = () => {
		renders.push(useLayoutPreferences());
		return null;
	};

	const container = dom.window.document.createElement('div');
	dom.window.document.body.append(container);
	const root = createRoot(container);
	await act(async () => {
		root.render(createElement(Probe));
	});

	return {
		latest: () => renders.at(-1) as LayoutPreferencesState,
		firstRender: renders[0].preferences,
		unmount: () => act(() => root.unmount()),
	};
};

const toggle = async (mounted: Mounted, key: keyof LayoutPreferences) => {
	await act(async () => mounted.latest().toggle(key));
};

test('useLayoutPreferences: first render uses the defaults, so SSR markup matches', async () => {
	const tab = tabStorage({
		[STORAGE_KEY]: JSON.stringify({
			increasedWidthMode: true,
			isTocEnabled: false,
		}),
	});
	activeTab(tab.storage);

	const mounted = await mountHook();

	// Hydration safety: the stored value must not reach the first render.
	assert.deepEqual(mounted.firstRender, {
		increasedWidthMode: false,
		isTocEnabled: true,
	});
	mounted.unmount();
});

test('useLayoutPreferences: applies the stored choice after mount', async () => {
	const tab = tabStorage({
		[STORAGE_KEY]: JSON.stringify({
			increasedWidthMode: true,
			isTocEnabled: false,
		}),
	});
	activeTab(tab.storage);

	const mounted = await mountHook();

	assert.deepEqual(mounted.latest().preferences, {
		increasedWidthMode: true,
		isTocEnabled: false,
	});
	mounted.unmount();
});

test('useLayoutPreferences: mounting without a stored value writes nothing over it', async () => {
	const tab = tabStorage();
	activeTab(tab.storage);

	const mounted = await mountHook();

	// The restore guard: the defaults must not be persisted as a "choice".
	assert.equal(tab.read(), null);
	mounted.unmount();
});

test('useLayoutPreferences: toggling persists both preferences', async () => {
	const tab = tabStorage();
	activeTab(tab.storage);

	const mounted = await mountHook();

	await toggle(mounted, 'increasedWidthMode');
	assert.deepEqual(JSON.parse(tab.read() ?? 'null'), {
		increasedWidthMode: true,
		isTocEnabled: true,
	});

	await toggle(mounted, 'isTocEnabled');
	assert.deepEqual(mounted.latest().preferences, {
		increasedWidthMode: true,
		isTocEnabled: false,
	});
	assert.deepEqual(JSON.parse(tab.read() ?? 'null'), {
		increasedWidthMode: true,
		isTocEnabled: false,
	});
	mounted.unmount();
});

test('useLayoutPreferences: a remount (page reload) restores the last toggles', async () => {
	const tab = tabStorage();
	activeTab(tab.storage);

	const first = await mountHook();
	await toggle(first, 'increasedWidthMode');
	await toggle(first, 'isTocEnabled');
	first.unmount();

	// Same tab storage, fresh tree — what a refresh looks like to the hook.
	const reloaded = await mountHook();

	assert.deepEqual(reloaded.latest().preferences, {
		increasedWidthMode: true,
		isTocEnabled: false,
	});
	reloaded.unmount();
});

test('useLayoutPreferences: toggling back off survives a reload too', async () => {
	const tab = tabStorage();
	activeTab(tab.storage);

	const first = await mountHook();
	await toggle(first, 'increasedWidthMode');
	await toggle(first, 'increasedWidthMode');
	first.unmount();

	const reloaded = await mountHook();

	assert.deepEqual(reloaded.latest().preferences, {
		increasedWidthMode: false,
		isTocEnabled: true,
	});
	// An explicit "off" is stored, not left absent.
	assert.deepEqual(JSON.parse(tab.read() ?? 'null'), {
		increasedWidthMode: false,
		isTocEnabled: true,
	});
	reloaded.unmount();
});

test('useLayoutPreferences: one tab’s toggles do not leak into another tab', async () => {
	const tabA = tabStorage();
	const tabB = tabStorage();

	activeTab(tabA.storage);
	const inTabA = await mountHook();
	await toggle(inTabA, 'increasedWidthMode');
	inTabA.unmount();

	activeTab(tabB.storage);
	const inTabB = await mountHook();

	// A second tab starts from the defaults, however tab A was left.
	assert.deepEqual(inTabB.latest().preferences, {
		increasedWidthMode: false,
		isTocEnabled: true,
	});
	await toggle(inTabB, 'isTocEnabled');
	inTabB.unmount();

	// ...and neither tab has overwritten the other's stored choice.
	assert.deepEqual(JSON.parse(tabA.read() ?? 'null'), {
		increasedWidthMode: true,
		isTocEnabled: true,
	});
	assert.deepEqual(JSON.parse(tabB.read() ?? 'null'), {
		increasedWidthMode: false,
		isTocEnabled: false,
	});
});

test('useLayoutPreferences: a corrupt stored value falls back to the defaults', async () => {
	const tab = tabStorage({ [STORAGE_KEY]: '{not json' });
	activeTab(tab.storage);

	const mounted = await mountHook();

	assert.deepEqual(mounted.latest().preferences, {
		increasedWidthMode: false,
		isTocEnabled: true,
	});
	mounted.unmount();
});

test('useLayoutPreferences: mounts and toggles without storage at all', async () => {
	withoutStorage();

	const mounted = await mountHook();
	await toggle(mounted, 'increasedWidthMode');

	assert.equal(mounted.latest().preferences.increasedWidthMode, true);
	mounted.unmount();
});
