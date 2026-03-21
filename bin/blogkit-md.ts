import { exec, spawn } from 'node:child_process';
import { stat, writeFileSync } from 'node:fs';
import path from 'node:path';

const markdownFile = process.argv[2];

if (!markdownFile) {
	console.error('Usage: blogkit-md <path-to-markdown-file>');
	process.exit(1);
}

const packageRoot = path.dirname(path.dirname(process.argv[1]));
const markdownPath = path.resolve(process.cwd(), markdownFile);
const triggerPath = path.join(packageRoot, 'utils/devReloadTrigger.ts');
const nextBin = path.join(packageRoot, 'node_modules/.bin/next');

writeFileSync(triggerPath, `export const reloadTrigger = '${Date.now()}';\n`);

let lastMtime: number | null = null;

const checkMarkdownFile = () => {
	stat(markdownPath, (error, stats) => {
		if (error) return;
		const { mtimeMs } = stats;
		if (lastMtime !== null && mtimeMs !== lastMtime) {
			writeFileSync(triggerPath, `export const reloadTrigger = '${mtimeMs}';\n`);
		}
		lastMtime = mtimeMs;
	});
};

setInterval(checkMarkdownFile, 500);
checkMarkdownFile();

const child = spawn(nextBin, ['dev'], {
	cwd: packageRoot,
	env: { ...process.env, MARKDOWN_FILE: markdownPath },
	stdio: ['inherit', 'pipe', 'inherit'],
});

let browserOpened = false;

child.stdout?.on('data', (chunk: Buffer) => {
	process.stdout.write(chunk);
	if (!browserOpened) {
		const match = chunk.toString().match(/http:\/\/localhost:\d+/);
		if (match) {
			browserOpened = true;
			exec(`open ${match[0]}`);
		}
	}
});

child.on('exit', code => {
	process.exit(code ?? 0);
});
