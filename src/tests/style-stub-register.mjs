import { createRequire, register } from 'node:module';

// Style files only load under a bundler (Next); for node:test runs they are
// stubbed with a proxy that echoes CSS-module lookups back as class names.

// ESM pipeline: registered after tsx (later --import), so this hook runs
// first in the chain and short-circuits before tsx tries to parse styles.
register('./style-stub-loader.mjs', import.meta.url);

// CJS pipeline: tsx routes some package internals through require().
const require = createRequire(import.meta.url);
const stub = module_ => {
	module_.exports = new Proxy(
		{},
		{ get: (_t, property) => (typeof property === 'string' && property !== '__esModule' ? property : undefined) }
	);
};
for (const extension of ['.scss', '.sass', '.css']) {
	require.extensions[extension] = stub;
}
