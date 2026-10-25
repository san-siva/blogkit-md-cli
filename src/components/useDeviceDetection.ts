'use client';

import { useEffect, useState } from 'react';

type DeviceDetection = {
	isMobile: boolean;
	isIpad: boolean;
};

/**
 * Detects phones and iPads from the user agent. Both start as `false` so the
 * server render and first client render match.
 *
 * iPadOS 13+ reports a desktop Mac user agent, so an iPad is also recognised
 * as a "Macintosh" with a touch screen.
 */
export const useDeviceDetection = (): DeviceDetection => {
	const [device, setDevice] = useState<DeviceDetection>({
		isMobile: false,
		isIpad: false,
	});

	useEffect(() => {
		const { userAgent, maxTouchPoints } = navigator;
		setDevice({
			isMobile: /iPhone|iPod|Android/i.test(userAgent),
			isIpad: /iPad/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1),
		});
	}, []);

	return device;
};
