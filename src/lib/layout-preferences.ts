export type LayoutPreferences = {
	/** Widen the article column beyond the default reading width. */
	increasedWidthMode: boolean;
	/** Show the table of contents alongside the article. */
	isTocEnabled: boolean;
};

export const STORAGE_KEY = 'blogkit-md:layout-preferences';

export const defaultPreferences: LayoutPreferences = {
	increasedWidthMode: false,
	isTocEnabled: true,
};

/**
 * sessionStorage, not localStorage: it is scoped to the individual tab, so a
 * refresh keeps that tab's choice while every tab keeps its own layout and a
 * newly opened one starts from the defaults.
 */
const storage = (): Storage | undefined => globalThis.sessionStorage;

const booleanOr = (value: unknown, fallback: boolean): boolean =>
	typeof value === 'boolean' ? value : fallback;

/**
 * Coerce a stored payload into preferences, falling back per field so a
 * partial or half-corrupt value still contributes what it can.
 */
export const parsePreferences = (stored: string | null): LayoutPreferences => {
	if (!stored) return defaultPreferences;

	let parsed: unknown;
	try {
		parsed = JSON.parse(stored);
	} catch {
		return defaultPreferences;
	}

	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		return defaultPreferences;
	}

	const { increasedWidthMode, isTocEnabled } = parsed as Record<
		keyof LayoutPreferences,
		unknown
	>;

	return {
		increasedWidthMode: booleanOr(
			increasedWidthMode,
			defaultPreferences.increasedWidthMode
		),
		isTocEnabled: booleanOr(isTocEnabled, defaultPreferences.isTocEnabled),
	};
};

/**
 * Read this tab's stored preferences. Storage can be missing (server render)
 * or throw (private mode, blocked site data); both fall back to the defaults.
 */
export const readPreferences = (): LayoutPreferences => {
	try {
		return parsePreferences(storage()?.getItem(STORAGE_KEY) ?? null);
	} catch {
		return defaultPreferences;
	}
};

/** Persist this tab's preferences, ignoring unavailable or full storage. */
export const writePreferences = (preferences: LayoutPreferences): void => {
	try {
		storage()?.setItem(STORAGE_KEY, JSON.stringify(preferences));
	} catch {
		// Storage unavailable — preferences stay until this tab is closed.
	}
};
