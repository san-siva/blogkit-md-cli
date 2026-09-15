import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
	defaultPreferences,
	parsePreferences,
	readPreferences,
	STORAGE_KEY,
	writePreferences,
} from '../lib/layout-preferences';

type StorageStub = {
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => void;
};

/** Install a sessionStorage stand-in for the duration of one test. */
const withStorage = (storage?: StorageStub) => {
	Object.defineProperty(globalThis, 'sessionStorage', {
		value: storage,
		configurable: true,
	});
};

/** Model a context with no storage at all, as on the server. */
const withoutStorage = () => withStorage();

/** Storage that records writes, like the browser's, and can be seeded. */
const memoryStorage = (seed?: string) => {
	const store: { value: string | null } = { value: seed ?? null };
	return {
		store,
		getItem: (key: string) => (key === STORAGE_KEY ? store.value : null),
		setItem: (key: string, value: string) => {
			if (key === STORAGE_KEY) store.value = value;
		},
	};
};

afterEach(() => {
	Reflect.deleteProperty(globalThis, 'sessionStorage');
});

test('parsePreferences: defaults when nothing is stored', () => {
	assert.deepEqual(parsePreferences(null), defaultPreferences);
	assert.deepEqual(parsePreferences(''), defaultPreferences);
});

test('parsePreferences: round-trips both preferences', () => {
	const stored = { increasedWidthMode: true, isTocEnabled: false };
	assert.deepEqual(parsePreferences(JSON.stringify(stored)), stored);
});

test('parsePreferences: defaults for unparseable or non-object payloads', () => {
	for (const payload of ['{not json', 'null', '[]', '"wide"', '42']) {
		assert.deepEqual(
			parsePreferences(payload),
			defaultPreferences,
			`payload ${payload} should fall back`
		);
	}
});

test('parsePreferences: falls back per field, keeping the valid ones', () => {
	assert.deepEqual(
		parsePreferences(JSON.stringify({ increasedWidthMode: true })),
		{ increasedWidthMode: true, isTocEnabled: true }
	);
	assert.deepEqual(
		parsePreferences(JSON.stringify({ increasedWidthMode: 'yes', isTocEnabled: false })),
		{ increasedWidthMode: false, isTocEnabled: false }
	);
});

test('readPreferences: defaults when storage is absent (server render)', () => {
	withoutStorage();
	assert.deepEqual(readPreferences(), defaultPreferences);
});

test('readPreferences: reads the stored value under the shared key', () => {
	const storage = memoryStorage(
		JSON.stringify({ increasedWidthMode: true, isTocEnabled: false })
	);
	withStorage(storage);

	assert.deepEqual(readPreferences(), {
		increasedWidthMode: true,
		isTocEnabled: false,
	});
});

test('readPreferences: defaults when storage access throws', () => {
	withStorage({
		getItem: () => {
			throw new Error('blocked site data');
		},
		setItem: () => {},
	});

	assert.deepEqual(readPreferences(), defaultPreferences);
});

test('writePreferences: stores a value readPreferences can restore', () => {
	const storage = memoryStorage();
	withStorage(storage);

	const preferences = { increasedWidthMode: true, isTocEnabled: false };
	writePreferences(preferences);

	assert.deepEqual(JSON.parse(storage.store.value ?? 'null'), preferences);
	assert.deepEqual(readPreferences(), preferences);
});

test('writePreferences: swallows a throwing or absent storage', () => {
	withStorage({
		getItem: () => null,
		setItem: () => {
			throw new Error('quota exceeded');
		},
	});
	assert.doesNotThrow(() => writePreferences(defaultPreferences));

	withoutStorage();
	assert.doesNotThrow(() => writePreferences(defaultPreferences));
});
