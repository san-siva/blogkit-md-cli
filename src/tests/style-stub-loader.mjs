import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Loader hooks for node:test runs of code that normally only runs under
 * Next's bundler:
 *
 * - Style imports (.scss/.css) are stubbed; CSS-module lookups echo the
 *   property name back so class names stay readable in assertions.
 * - The @san-siva packages ship ESM syntax in .js files without
 *   "type": "module", which tsx would mis-compile as CJS and lose the named
 *   exports. Their ESM dist files are short-circuited as raw ESM instead.
 */
export async function load(url, context, nextLoad) {
	const pathname = new URL(url).pathname;
	if (/\.(scss|sass|css)$/.test(pathname)) {
		return {
			format: 'module',
			source: 'export default new Proxy({}, { get: (t, p) => String(p) });',
			shortCircuit: true,
		};
	}
	if (/@san-siva\/(blogkit-md\/dist|[^/]+\/dist\/esm)\/.*\.js$/.test(pathname)) {
		return {
			format: 'module',
			source: await readFile(fileURLToPath(url), 'utf8'),
			shortCircuit: true,
		};
	}
	return nextLoad(url, context);
}
