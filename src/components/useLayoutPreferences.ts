'use client';

import { useEffect, useRef, useState } from 'react';

import {
	defaultPreferences,
	type LayoutPreferences,
	readPreferences,
	writePreferences,
} from '../lib/layout-preferences';

export type LayoutPreferencesState = {
	preferences: LayoutPreferences;
	/** Flip one preference and persist the result. */
	toggle: (key: keyof LayoutPreferences) => void;
};

/**
 * Layout preferences that survive a reload of the current tab, independently
 * of any other tab (see the storage choice in lib/layout-preferences).
 *
 * Stored values are read on mount rather than during render: the server has
 * no storage, so reading during render would make the first client render
 * disagree with the server HTML and trip hydration.
 */
export const useLayoutPreferences = (): LayoutPreferencesState => {
	const [preferences, setPreferences] =
		useState<LayoutPreferences>(defaultPreferences);
	// Only a real toggle is worth storing: without this, the restore below
	// would write the defaults straight back into a tab nobody has touched.
	const hasToggled = useRef(false);

	useEffect(() => {
		setPreferences(readPreferences());
	}, []);

	useEffect(() => {
		if (hasToggled.current) writePreferences(preferences);
	}, [preferences]);

	return {
		preferences,
		toggle: key => {
			hasToggled.current = true;
			setPreferences(current => ({ ...current, [key]: !current[key] }));
		},
	};
};
