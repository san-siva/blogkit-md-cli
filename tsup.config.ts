import { defineConfig } from 'tsup';

export default defineConfig({
	entry: { 'blogkit-md': 'scripts/blogkit-md.ts' },
	format: ['cjs'],
	outDir: 'bin',
	clean: false,
	target: 'node18',
});
