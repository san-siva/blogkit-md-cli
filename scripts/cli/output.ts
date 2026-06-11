import { exec } from 'node:child_process';
import os from 'node:os';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string) => (s: string) =>
	useColor ? `[${code}m${s}[0m` : s;

export const c = {
	bold: paint('1'),
	dim: paint('2'),
	red: paint('31'),
	green: paint('32'),
	yellow: paint('33'),
	blue: paint('34'),
	magenta: paint('35'),
	cyan: paint('36'),
	gray: paint('90'),
};

export const INDENT = ' '.repeat(3);
export const line = (s = '') => console.log(INDENT + s);
export const tree = (s = '') => console.log(c.gray(INDENT + '│ ') + s);

export const tilde = (p: string): string => {
	const home = os.homedir();
	return p.startsWith(home) ? '~' + p.slice(home.length) : p;
};

export function humanAge(iso: string): string {
	const start = Date.parse(iso);
	if (Number.isNaN(start)) return '—';
	const secs = Math.max(0, Math.floor((Date.now() - start) / 1000));
	if (secs < 60) return `${secs}s`;
	if (secs < 3600) return `${Math.floor(secs / 60)}m`;
	if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
	return `${Math.floor(secs / 86400)}d`;
}

let bannerShown = false;
export function banner(): void {
	if (bannerShown) return;
	bannerShown = true;
	line();
	line(c.bold(c.blue('blogkit-md')));
	line(c.gray('preview markdown as blogkit blog posts'));
	line();
}

export function openBrowser(url: string, skip = false, forceNewTab = false): void {
	if (skip || process.env.BLOGKIT_MD_NO_OPEN) return;
	try {
		if (forceNewTab) {
			// When reusing a superseded port Chrome may already have that URL open
			// in a stale tab. osascript "open location" always opens a new tab so
			// the fresh content loads at a clean URL (no cache-busting params).
			exec(
				`osascript -e 'tell app "Google Chrome" to open location "${url}"' 2>/dev/null` +
					` || open -a "Google Chrome" "${url}" || open "${url}"`
			);
		} else {
			exec(`open -a "Google Chrome" "${url}" || open "${url}"`);
		}
	} catch {
		/* best-effort */
	}
}
