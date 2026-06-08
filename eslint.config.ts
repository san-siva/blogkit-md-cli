import tseslint from 'typescript-eslint';

import {
	defaultRules,
	languageOptions,
	reactExtends,
	reactPlugins,
	reactRules,
	reactSettings,
	testFiles,
} from './eslint-utilities.js';

export default tseslint.config(
	{
		ignores: [
			'node_modules/**',
			'package-lock.json',
			'.next/**',
			'bin/**',
			'dist/**',
			'build/**',
			'coverage/**',
			'*.min.js',
			'*.min.css',
			'*.map',
			'**/*.d.ts',
		],
	},
	{
		files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
		ignores: testFiles,
		plugins: reactPlugins,
		extends: reactExtends,
		settings: reactSettings,
		rules: reactRules,
		languageOptions,
	},
	{
		files: testFiles,
		plugins: reactPlugins,
		extends: reactExtends,
		settings: reactSettings,
		rules: {
			...defaultRules,
			// node:test's `test()` is fire-and-forget by design.
			'@typescript-eslint/no-floating-promises': 0,
			// Node's native test runner requires explicit `.ts` import extensions.
			'import/extensions': 0,
		},
		languageOptions,
	},
);
