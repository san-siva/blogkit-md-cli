import eslint from '@eslint/js';
import type { Linter } from 'eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { configs as noAwaitInPromiseConfigs } from 'eslint-plugin-no-await-in-promise';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export const defaultExtends = [
	eslint.configs.recommended,
	eslintPluginUnicorn.configs.recommended,
	eslintConfigPrettier,
	noAwaitInPromiseConfigs.recommended,
	...tseslint.configs.recommended,
	importPlugin.flatConfigs.recommended,
	importPlugin.flatConfigs.typescript,
];

export const defaultPlugins = {
	'simple-import-sort': simpleImportSort,
};

export const tsRules: Linter.RulesRecord = {
	'@typescript-eslint/no-explicit-any': 1,
	'@typescript-eslint/no-floating-promises': 2,
	'@typescript-eslint/no-unused-vars': 1,
	'@typescript-eslint/naming-convention': [
		1,
		{
			selector: 'import',
			format: ['camelCase', 'PascalCase', 'snake_case', 'UPPER_CASE'],
		},
		{
			selector: 'enumMember',
			format: ['PascalCase'],
		},
		{
			selector: 'default',
			format: ['camelCase'],
		},
		{
			selector: 'variable',
			format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
		},
		{
			selector: 'variable',
			modifiers: ['destructured'],
			format: ['camelCase', 'snake_case', 'UPPER_CASE', 'PascalCase'],
		},
		{
			selector: 'function',
			format: ['camelCase', 'PascalCase'],
		},
		{
			selector: 'parameter',
			format: [],
		},
		{
			selector: 'memberLike',
			modifiers: ['private'],
			format: ['camelCase'],
			leadingUnderscore: 'forbid',
		},
		{
			selector: 'typeLike',
			format: ['PascalCase'],
		},
		{ selector: 'property', format: [] },
		{
			selector: 'method',
			format: ['PascalCase', 'camelCase', 'UPPER_CASE'],
			leadingUnderscore: 'allowDouble',
		},
	],
	'@typescript-eslint/no-use-before-define': [2, { functions: false }],
	'@typescript-eslint/no-unused-expressions': [
		'error',
		{
			allowShortCircuit: true,
			allowTernary: true,
			allowTaggedTemplates: true,
		},
	],
};

export const defaultRules: Linter.RulesRecord = {
	...tsRules,
	// Ban ES2021+ and ES2022+ features for compatibility with ES2020
	'unicorn/prefer-at': 0,
	//
	'unicorn/filename-case': [
		'error',
		{
			cases: {
				camelCase: true,
				kebabCase: true,
				pascalCase: true,
			},
		},
	],
	'unicorn/prevent-abbreviations': [1],
	'unicorn/no-array-reduce': [1],
	'unicorn/catch-error-name': [0],
	'unicorn/numeric-separators-style': [0],
	'unicorn/prefer-query-selector': [0],
	'unicorn/prefer-global-this': [1],
	'unicorn/no-for-loop': [1],
	'unicorn/no-lonely-if': [0],
	'unicorn/prefer-dom-node-remove': [0],
	'unicorn/prefer-dom-node-append': [0],
	'unicorn/no-null': [0],
	'unicorn/prefer-string-replace-all': [0],
	'unicorn/prefer-string-raw': [1],
	'unicorn/prefer-string-slice': [1],
	'unicorn/prefer-includes': [0],
	'unicorn/no-negated-condition': [1],
	'unicorn/no-array-for-each': [0],
	'unicorn/no-array-callback-reference': [0],
	'unicorn/no-object-as-default-parameter': [1],
	'unicorn/prefer-math-min-max': [1],
	'no-useless-escape': [0],
	'unicorn/prefer-spread': [1],
	'unicorn/prefer-optional-catch-binding': [1],
	'unicorn/switch-case-braces': [1],
	'unicorn/explicit-length-check': [1],
	'unicorn/no-process-exit': [1],
	'unicorn/prefer-top-level-await': [1],
	'unicorn/prefer-dom-node-text-content': [0],
	'unicorn/prefer-node-protocol': [0],
	'unicorn/prefer-number-properties': [1],
	'unicorn/consistent-function-scoping': [1],
	'unicorn/prefer-set-has': [1],
	'unicorn/prefer-object-from-entries': [1],
	'unicorn/no-useless-fallback-in-spread': [1],
	'arrow-body-style': [1, 'as-needed'],
	camelcase: 0,
	'default-param-last': 0,
	'import/order': 0,
	'simple-import-sort/imports': [
		1,
		{
			groups: [
				// React and Redux related packages - exact 'react', 'redux' and their submodules
				['^react$', '^react-.*', '^redux$', '^redux-.*'],
				// Other external modules
				[String.raw`^@?\w`],
				// Parent imports
				[String.raw`^\.\.(?!/?$)`, String.raw`^\.\./?$`],
				// Sibling imports
				[
					String.raw`^\./(?=.*/)(?!/?$)`,
					String.raw`^\.(?!/?$)`,
					String.raw`^\./?$`,
				],
				// Styles
				[String.raw`^.+\.s?css$`],
			],
		},
	],
	'simple-import-sort/exports': 1,
	'import/no-extraneous-dependencies': 0,
	'import/extensions': [
		'error',
		'ignorePackages',
		{
			js: 'never',
			jsx: 'never',
			ts: 'never',
			tsx: 'never',
		},
	],
	'import/no-cycle': [2, { ignoreExternal: true }],
	'import/no-unresolved': 0,
	'import/no-useless-path-segments': 0,
	'import/prefer-default-export': 0,
	'linebreak-style': 0,
	'max-len': 0,
	'max-lines': 0,
	'no-console': 0,
	'no-delete-var': 2,
	'no-nested-ternary': 0,
	'no-restricted-syntax': 0,
	'no-shadow': 0,
	'no-underscore-dangle': [2, { allow: ['_id', '__webpack_public_path__'] }],
	'no-unused-expressions': 2,
	'no-unused-labels': 2,
	'no-use-before-define': 0,
	'operator-linebreak': 0,
	semi: 1,
	'space-before-function-paren': 0,
	'unicode-bom': 0,
	quotes: [
		1,
		'single',
		{
			avoidEscape: true,
			allowTemplateLiterals: true,
		},
	],
};

export const languageOptions = {
	ecmaVersion: 2020 as const,
	parserOptions: {
		projectService: {
			// The ESLint config files live outside the app's tsconfig; let the
			// parser fall back to an inferred project for them.
			allowDefaultProject: ['eslint.config.ts', 'eslint-utilities.ts'],
			defaultProject: './tsconfig.json',
		},
		tsconfigRootDir: import.meta.dirname,
	},
};

export const testFiles = [
	'**/*.test.ts',
	'**/*.test.tsx',
	'**/*.test.js',
	'**/*.test.jsx',
	'**/*.spec.ts',
	'**/*.spec.tsx',
	'**/*.spec.js',
	'**/*.spec.jsx',
];

export const reactPlugins = {
	...defaultPlugins,
	react: react,
	'react-hooks': reactHooks,
};

export const reactExtends = [
	react.configs.flat.recommended,
	jsxA11y.flatConfigs?.recommended,
	...defaultExtends,
];

export const defaultSettings = {
	'import/resolver': {
		node: true,
		typescript: true,
	},
};

export const reactSettings = {
	...defaultSettings,
	react: {
		version: 'detect',
		pragma: 'React',
		fragment: 'Fragment',
	},
};

export const reactRules: Linter.RulesRecord = {
	...defaultRules,
	'react/jsx-uses-react': 0,
	'react/react-in-jsx-scope': 0,
	'react-hooks/rules-of-hooks': 2,
	'react-hooks/exhaustive-deps': 1,
	'eol-last': ['error', 'always'],
	'jsx-a11y/alt-text': 0,
	'jsx-a11y/click-events-have-key-events': 0,
	'jsx-a11y/control-has-associated-label': 0,
	'jsx-a11y/img-has-alt': 0,
	'jsx-a11y/no-noninteractive-element-interactions': 0,
	'jsx-a11y/no-static-element-interactions': 0,
	'jsx-a11y/label-has-associated-control': 0,
	'react/jsx-filename-extension': [1, { extensions: ['.tsx'] }],
	'react/jsx-props-no-spreading': 0,
	'react/no-unstable-nested-components': [
		'error',
		{
			allowAsProps: true,
		},
	],
	'react/prop-types': 0, // TS does it also by default
	'react/require-default-props': 0, // TS does it also by default
	'react/function-component-definition': [2, { namedComponents: 'arrow-function' }],
	'react/no-unknown-property': 1,
};
