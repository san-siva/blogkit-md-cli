import { exec, spawn } from 'node:child_process';
import {
	mkdirSync,
	openSync,
	readFileSync,
	statSync,
	watch,
	writeFileSync,
} from 'node:fs';
import type { ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

/* ----------------------------------------------------------------------------
 * Pretty printing — follows the house style in ~/.config/bin/utils.sh:
 *   3-space base indent, "   │ " tree prefix, blue/yellow/green/red palette.
 * ------------------------------------------------------------------------- */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string) => (s: string) =>
	useColor ? `\u001B[${code}m${s}\u001B[0m` : s;

const c = {
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

const INDENT = ' '.repeat(3);
const line = (s = '') => console.log(INDENT + s);
const tree = (s = '') => console.log(c.gray(INDENT + '│ ') + s);

let bannerShown = false;
function banner(): void {
	if (bannerShown) return;
	bannerShown = true;
	line();
	line(c.bold(c.blue('blogkit-md')));
	line(c.gray('preview markdown as blogkit blog posts'));
	line();
}

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

function openBrowser(url: string, skip = false): void {
	// --no-open (skip) and BLOGKIT_MD_NO_OPEN both suppress launching a browser;
	// the env var keeps tests and headless envs quiet.
	if (skip || process.env.BLOGKIT_MD_NO_OPEN) return;
	try {
		// Prefer Chrome; fall back to the default browser if it isn't installed.
		exec(`open -a "Google Chrome" ${url} || open ${url}`);
	} catch {
		/* opening the browser is best-effort */
	}
}

/* ----------------------------------------------------------------------------
 * Instance registry — tracks running servers in ~/.blogkit-md/instances.json.
 * The directory is overridable via BLOGKIT_MD_DIR so tests stay isolated.
 * ------------------------------------------------------------------------- */

export interface Instance {
	pid: number;
	port: number;
	ssePort: number;
	dir: string;
	isDirectory: boolean;
	background: boolean;
	startedAt: string;
}

export const registryDir = (): string =>
	process.env.BLOGKIT_MD_DIR || path.join(os.homedir(), '.blogkit-md');
export const registryFile = (): string =>
	path.join(registryDir(), 'instances.json');
const logDir = (): string => path.join(registryDir(), 'logs');

export const isAlive = (pid: number): boolean => {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
};

export function readRegistry(): Instance[] {
	try {
		const raw = JSON.parse(readFileSync(registryFile(), 'utf8'));
		return Array.isArray(raw) ? (raw as Instance[]) : [];
	} catch {
		return [];
	}
}

export function writeRegistry(list: Instance[]): void {
	try {
		mkdirSync(registryDir(), { recursive: true });
		writeFileSync(registryFile(), JSON.stringify(list, null, 2));
	} catch {
		/* registry is best-effort — never crash the CLI over it */
	}
}

/** Read the registry, dropping any entries whose process is no longer alive. */
export function pruneRegistry(): Instance[] {
	const all = readRegistry();
	const live = all.filter(index => isAlive(index.pid));
	if (live.length !== all.length) writeRegistry(live);
	return live;
}

export function addInstance(inst: Instance): void {
	const list = pruneRegistry().filter(index => index.pid !== inst.pid);
	list.push(inst);
	writeRegistry(list);
}

export function removeInstance(pid: number): void {
	writeRegistry(readRegistry().filter(index => index.pid !== pid));
}

export function findByDir(dir: string): Instance | undefined {
	return pruneRegistry().find(index => index.dir === dir);
}

/**
 * Find a running directory instance that already serves `filePath`. When several
 * nested directory instances contain the file, the deepest (most specific) wins.
 */
export function findContainingDir(filePath: string): Instance | undefined {
	const contains = (dir: string): boolean => {
		const relative = path.relative(dir, filePath);
		return (
			relative !== '' &&
			!relative.startsWith('..') &&
			!path.isAbsolute(relative)
		);
	};
	return pruneRegistry()
		.filter(index => index.isDirectory && contains(index.dir))
		.toSorted((a, b) => b.dir.length - a.dir.length)[0];
}

/** Running instances whose served path lives strictly inside `dir`. */
export function findInstancesUnder(dir: string): Instance[] {
	return pruneRegistry().filter(index => {
		const relative = path.relative(dir, index.dir);
		if (relative === '') return false; // the directory itself
		if (relative.startsWith('..')) return false; // sibling or ancestor
		if (path.isAbsolute(relative)) return false; // no shared base (cross-drive)
		return true; // strictly inside
	});
}

/**
 * URL path a directory instance serves `filePath` at — mirrors the href the
 * Next.js directory index builds: strip `.md`, encode each segment, join with /.
 */
export function fileUrlPath(dir: string, filePath: string): string {
	const relative = path.relative(dir, filePath);
	return (
		'/' +
		relative
			.replace(/\.md$/, '')
			.split(path.sep)
			.map(encodeURIComponent)
			.join('/')
	);
}

export function killInstance(inst: Instance): void {
	try {
		process.kill(inst.pid, 'SIGTERM');
	} catch {
		/* already gone */
	}
	removeInstance(inst.pid);
}

/* ----------------------------------------------------------------------------
 * Instance listing
 * ------------------------------------------------------------------------- */

export function instanceLabel(inst: Instance): string {
	const kind = inst.isDirectory ? '📁' : '📄';
	const mode = inst.background ? c.magenta('bg') : c.gray('fg');
	return (
		`${c.green('localhost:' + inst.port)}  ` +
		`${kind} ${tilde(inst.dir)}  ` +
		`${c.gray('pid ' + inst.pid)} ${c.gray('· ' + humanAge(inst.startedAt))} ${mode}`
	);
}

function printPlainList(instances: Instance[]): void {
	banner();
	line(c.bold('Running instances'));
	instances.forEach(index => tree(instanceLabel(index)));
	line();
}

/** Machine-readable listing: one `<port>\t<dir>` per line, no banner or color. */
function printScriptList(instances: Instance[]): void {
	for (const inst of instances) {
		process.stdout.write(`${inst.port}\t${inst.dir}\n`);
	}
}

/** Interactive list of running instances; ↑/↓ move, ⏎ opens in Chrome, k stops. */
export async function listInstancesInteractive(
	nonInteractive = false
): Promise<void> {
	let instances = pruneRegistry();

	// --non-interactive: emit a bare port+path list (empty output if none) and
	// bail before any banners, colors, or raw-mode key handling.
	if (nonInteractive) {
		printScriptList(instances);
		return;
	}

	if (instances.length === 0) {
		banner();
		line(c.yellow('No running blogkit-md instances.'));
		line();
		return;
	}

	// Non-interactive terminal: just print the list and bail.
	if (!process.stdin.isTTY) {
		printPlainList(instances);
		return;
	}

	await new Promise<void>(resolve => {
		let index = 0;
		const stdin = process.stdin;
		try {
			readline.emitKeypressEvents(stdin);
			stdin.setRawMode(true);
			stdin.resume();
		} catch {
			// Couldn't enter interactive mode — fall back to a plain listing.
			printPlainList(instances);
			resolve();
			return;
		}

		const render = (footer?: string) => {
			const out: string[] = [
				'',
				INDENT +
					c.bold(c.blue('blogkit-md')) +
					c.gray('  ·  running instances'),
				'',
				...instances.map((inst, rowIndex) => {
					const selected = rowIndex === index;
					const pointer = selected ? c.blue('❯ ') : '  ';
					const label = selected
						? instanceLabel(inst)
						: c.dim(instanceLabel(inst));
					return INDENT + pointer + label;
				}),
				'',
				footer ??
					c.gray(INDENT + '↑/↓ j/k move   ⏎ open in Chrome   x stop   q quit'),
				'',
			];
			process.stdout.write('\u001B[2J\u001B[H' + out.join('\n') + '\n');
		};

		const finish = () => {
			stdin.setRawMode(false);
			stdin.removeAllListeners('keypress');
			stdin.pause();
			resolve();
		};

		const onKey = (_string: string, key: readline.Key) => {
			if (!key) return;
			const target = instances[index];
			switch (key.name) {
				case 'up':
				case 'k': {
					index = (index - 1 + instances.length) % instances.length;
					render();
					break;
				}
				case 'down':
				case 'j': {
					index = (index + 1) % instances.length;
					render();
					break;
				}
				case 'return': {
					openBrowser(`http://localhost:${target.port}`);
					render(c.green(INDENT + `Opened localhost:${target.port} in Chrome`));
					finish();
					return;
				}
				case 'x': {
					killInstance(target);
					render(c.green(INDENT + `Stopped localhost:${target.port}.`));
					finish();
					return;
				}
				default: {
					if (
						key.name === 'q' ||
						key.name === 'escape' ||
						(key.ctrl && key.name === 'c')
					) {
						render(c.gray(INDENT + 'Ciao 👋'));
						finish();
					}
				}
			}
		};

		stdin.on('keypress', onKey);
		render();
	});
}

/* ----------------------------------------------------------------------------
 * Argument parsing
 * ------------------------------------------------------------------------- */

export interface ParsedArgs {
	inputArg?: string;
	requestedPort: number;
	wantList: boolean;
	wantTear: boolean;
	wantNoOpen: boolean;
	wantStop: boolean;
	wantNonInteractive: boolean;
	isDetachedChild: boolean;
	wantHelp: boolean;
}

export function parseArgs(argv: string[]): ParsedArgs {
	const isFlag = (a: string) => a.startsWith('-');
	const flagNames = new Set(argv.filter(isFlag).map(a => a.split('=', 1)[0]));
	const inputArgument = argv.find(a => !isFlag(a));
	const portArgument = argv.find(a => a.startsWith('--port='));
	const requestedPort = portArgument
		? Number.parseInt(portArgument.split('=', 2)[1], 10) || 0
		: 0;

	return {
		inputArg: inputArgument,
		requestedPort,
		wantList:
			flagNames.has('--list') ||
			flagNames.has('-l') ||
			flagNames.has('--list-instances'), // legacy alias
		wantTear: flagNames.has('--tear') || flagNames.has('-t'),
		wantNoOpen: flagNames.has('--no-open') || flagNames.has('-n'),
		wantStop: flagNames.has('--stop') || flagNames.has('-s'),
		wantNonInteractive: flagNames.has('--non-interactive'),
		isDetachedChild: flagNames.has('--__detached'), // internal use only
		wantHelp: flagNames.has('--help') || flagNames.has('-h'),
	};
}

function printHelp(): void {
	banner();
	line(c.bold('Usage'));
	tree('blogkit-md <file-or-directory> [options]');
	line();
	line(c.bold('Options'));
	tree(
		`${c.green('--port=<port>')}       run on a specific port (default: random free port)`
	);
	tree(
		`${c.green('-t, --tear')}          stop the instance already serving this path, then start fresh`
	);
	tree(
		`${c.green('-l, --list')}          interactively list & stop running instances`
	);
	tree(
		`${c.green('--non-interactive')}   with -l, print a plain "<port>\\t<path>" list and exit`
	);
	tree(
		`${c.green('-s, --stop')}          stop the instance serving the given path, then exit`
	);
	tree(
		`${c.green('-n, --no-open')}       start the server without opening it in the browser`
	);
	tree(`${c.green('-h, --help')}          show this help`);
	line();
	line(
		c.gray(
			'If a path is already being served, running it again just reopens it.'
		)
	);
	line(
		c.gray('A file inside a served folder reuses that server; serving a folder')
	);
	line(c.gray('replaces any narrower instances already running inside it.'));
	line();
	line(
		c.gray('The server always runs in the background; stop it with ') +
			c.blue('--stop') +
			c.gray(' or ') +
			c.blue('--list') +
			c.gray('.')
	);
	line();
}

/** Stop the instance serving `inputPath`, report the outcome, and exit. (--stop) */
function stopAndExit(inputPath: string): never {
	banner();
	const existing = findByDir(inputPath);
	if (existing) {
		killInstance(existing);
		line(c.green(`✓ Stopped localhost:${existing.port}`));
		tree(c.dim(tilde(existing.dir)));
	} else {
		line(c.yellow('No running instance for that path'));
		tree(c.dim(tilde(inputPath)));
	}
	line();
	process.exit(0);
}

/** Stat the input path, returning whether it's a directory; exits if it's missing. */
function statInput(inputPath: string): boolean {
	try {
		return statSync(inputPath).isDirectory();
	} catch {
		banner();
		line(c.red('✗ Path does not exist'));
		tree(c.dim(inputPath));
		line();
		process.exit(1);
	}
}

/** Stop a running instance and pause briefly so the OS can release its port. */
async function tearDownInstance(existing: Instance): Promise<void> {
	banner();
	line(c.yellow('Tearing down the running instance'));
	tree(
		`${c.green('localhost:' + existing.port)}  ${c.gray('pid ' + existing.pid)}  ` +
			`${existing.background ? c.magenta('background') : c.gray('foreground')}`
	);
	killInstance(existing);
	line(c.green(`✓ Stopped localhost:${existing.port}`));
	line();
	await new Promise(r => setTimeout(r, 400));
}

/** Reopen an already-running instance in the browser, then exit. */
function reopenInstance(existing: Instance, parsed: ParsedArgs): never {
	const url = `http://localhost:${existing.port}`;
	banner();
	line(c.green('Already running — opening it in the browser'));
	tree(`${c.bold('URL')}   ${c.blue(url)}`);
	tree(`${c.bold('Path')}  ${c.dim(tilde(existing.dir))}`);
	line();
	line(
		c.gray('Restart it with ') +
			c.blue('--tear') +
			c.gray(', or list with ') +
			c.blue('--list')
	);
	line();
	openBrowser(url, parsed.wantNoOpen);
	process.exit(0);
}

/**
 * If `inputPath` — a file or a sub-folder — lives under a directory instance
 * that's already running, open it on that server (reusing the port) and exit.
 * For a file we jump straight to its URL; for a sub-folder we open the parent
 * server's index, which already lists everything beneath it. Returns if no such
 * parent instance exists.
 */
function reuseContainingDir(
	inputPath: string,
	isDirectory: boolean,
	parsed: ParsedArgs
): void {
	const parent = findContainingDir(inputPath);
	if (!parent) return;
	const url = isDirectory
		? `http://localhost:${parent.port}`
		: `http://localhost:${parent.port}${fileUrlPath(parent.dir, inputPath)}`;
	banner();
	line(
		c.green(
			isDirectory
				? 'Already serving a parent folder — opening it'
				: 'Already serving this folder — opening the file'
		)
	);
	tree(`${c.bold('URL')}     ${c.blue(url)}`);
	tree(`${c.bold(isDirectory ? 'Folder' : 'File')}  ${c.dim(tilde(inputPath))}`);
	tree(`${c.bold('Parent')}  ${c.dim(tilde(parent.dir))}`);
	line();
	openBrowser(url, parsed.wantNoOpen);
	process.exit(0);
}

/**
 * Stop any narrower instances running inside `dir` so the folder server owns the
 * tree, and return one of their ports so the new server can reuse it. Returns
 * undefined when nothing narrower was running.
 */
export async function supersedeNarrowerInstances(
	dir: string
): Promise<number | undefined> {
	const contained = findInstancesUnder(dir);
	if (contained.length === 0) return undefined;
	banner();
	line(c.yellow('Stopping narrower instances inside this folder'));
	for (const inst of contained) {
		killInstance(inst);
		tree(`${c.green('localhost:' + inst.port)}  ${c.dim(tilde(inst.dir))}`);
	}
	const reusedPort = contained[0].port;
	line(c.gray(`Reusing port ${reusedPort} for ${tilde(dir)}`));
	line();
	// Give the OS a moment to release the ports before reusing them.
	await new Promise(r => setTimeout(r, 400));
	return reusedPort;
}

/**
 * Reconcile the requested path with already-running instances before launch:
 * reopen or tear down an exact match, reuse a parent folder when opening a file
 * inside it, or stop narrower instances when serving a whole folder. Several of
 * these branches exit the process directly. Returns a port to reuse for the new
 * server (from a superseded narrower instance), or undefined for a free port.
 */
async function reconcileInstances(
	inputPath: string,
	isDirectory: boolean,
	parsed: ParsedArgs
): Promise<number | undefined> {
	const existing = findByDir(inputPath);
	if (existing) {
		if (parsed.wantTear) {
			await tearDownInstance(existing);
		} else {
			reopenInstance(existing, parsed); // exits
		}
	}

	// A file or a sub-folder living under an already-running directory instance
	// reuses that server instead of starting another. Checked before supersede
	// so opening a sub-folder of a served tree reuses the parent rather than
	// spinning up (and then superseding) its own server.
	if (!parsed.wantTear && (isDirectory || inputPath.endsWith('.md'))) {
		reuseContainingDir(inputPath, isDirectory, parsed); // exits if a parent is found
	}

	if (isDirectory) {
		return supersedeNarrowerInstances(inputPath);
	}
	return undefined;
}

/** Re-spawn ourselves detached so the preview server keeps running, then exit. */
async function launchInBackground(
	inputPath: string,
	parsed: ParsedArgs,
	scriptPath: string,
	reclaimedPort?: number
): Promise<never> {
	try {
		// Explicit --port wins; otherwise reuse a superseded instance's port.
		const port =
			parsed.requestedPort || reclaimedPort || (await getFreePort());
		mkdirSync(logDir(), { recursive: true });
		const logFile = path.join(logDir(), `${port}.log`);
		const out = openSync(logFile, 'a');
		// The detached child is the one that opens the browser, so forward
		// --no-open to it; everything else it can re-derive from the path.
		const childArgs = [scriptPath, inputPath, `--port=${port}`, '--__detached'];
		if (parsed.wantNoOpen) childArgs.push('--no-open');
		const child = spawn(process.execPath, childArgs, {
			detached: true,
			stdio: ['ignore', out, out],
		});
		child.unref();

		banner();
		line(c.green('Started in the background'));
		tree(`${c.bold('URL')}   ${c.blue('http://localhost:' + port)}`);
		tree(`${c.bold('Path')}  ${c.dim(tilde(inputPath))}`);
		tree(`${c.bold('PID')}   ${c.dim(String(child.pid))}`);
		tree(`${c.bold('Log')}   ${c.dim(tilde(logFile))}`);
		line();
		line(c.gray('Stop it with:  ') + c.blue('blogkit-md --list'));
		line();
	} catch (error) {
		banner();
		line(c.red('✗ Failed to start in the background'));
		tree(c.dim(String(error)));
		line();
		process.exit(1);
	}
	process.exit(0);
}

/* ----------------------------------------------------------------------------
 * Top-level command dispatch
 * ------------------------------------------------------------------------- */

export async function run(argv: string[]): Promise<void> {
	const parsed = parseArgs(argv);

	if (parsed.wantHelp) {
		printHelp();
		process.exit(0);
	}

	if (parsed.wantList) {
		await listInstancesInteractive(parsed.wantNonInteractive);
		process.exit(0);
	}

	if (!parsed.inputArg) {
		line(c.red('✗ Missing path'));
		printHelp();
		process.exit(1);
	}

	const inputPath = path.resolve(process.cwd(), parsed.inputArg);

	// --stop / -s runs before statInput because the path need not still exist.
	if (parsed.wantStop) stopAndExit(inputPath);

	const isDirectory = statInput(inputPath);

	// Reconcile against running instances whether or not we're the detached
	// child: the parent's pass is usually enough, but the child must still
	// handle anything that changed between spawn and start (and is otherwise a
	// harmless no-op). When serving a folder supersedes a narrower instance, its
	// freed port is handed back so the new server can reuse it.
	const reclaimedPort = await reconcileInstances(inputPath, isDirectory, parsed);

	const scriptPath = process.argv[1];
	const packageRoot = path.dirname(path.dirname(scriptPath));
	const nextBin = path.join(packageRoot, 'node_modules/.bin/next');

	// The server always runs detached in the background. The first invocation
	// re-spawns itself with --__detached and exits; that detached child is the
	// one that actually starts the server.
	if (!parsed.isDetachedChild) {
		await launchInBackground(inputPath, parsed, scriptPath, reclaimedPort);
	}

	await startServer(inputPath, isDirectory, parsed, { nextBin, packageRoot });
}

/* ----------------------------------------------------------------------------
 * Server
 * ------------------------------------------------------------------------- */

function getFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const s = createServer();
		s.listen(0, () => {
			const port = (s.address() as AddressInfo).port;
			s.close(error => (error ? reject(error) : resolve(port)));
		});
		s.on('error', reject);
	});
}

async function startServer(
	inputPath: string,
	isDirectory: boolean,
	parsed: ParsedArgs,
	paths: { nextBin: string; packageRoot: string }
): Promise<void> {
	const clients = new Set<ServerResponse>();

	const sseServer = createServer((request, res) => {
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'Access-Control-Allow-Origin': '*',
		});
		res.write('data: connected\n\n');
		clients.add(res);
		request.on('close', () => clients.delete(res));
	});

	await new Promise<void>(resolve => sseServer.listen(0, resolve));
	const ssePort = (sseServer.address() as AddressInfo).port;
	const nextPort = parsed.requestedPort || (await getFreePort());

	const nextEnvironment = {
		...process.env,
		...(isDirectory
			? { MARKDOWN_DIR: inputPath }
			: { MARKDOWN_FILE: inputPath }),
		SSE_PORT: String(ssePort),
	};

	const broadcastReload = () => {
		for (const client of clients) client.write('data: reload\n\n');
	};

	if (isDirectory) {
		watch(inputPath, { recursive: true }, (_, filename) => {
			if (filename && filename.endsWith('.md')) broadcastReload();
		});
	} else {
		const markdownFilename = path.basename(inputPath);
		watch(path.dirname(inputPath), (_, filename) => {
			if (filename === markdownFilename) broadcastReload();
		});
	}

	// Register this instance and make sure we clean up on the way out. The
	// server only ever runs as the detached background child, so it's always
	// recorded as a background instance.
	const me: Instance = {
		pid: process.pid,
		port: nextPort,
		ssePort,
		dir: inputPath,
		isDirectory,
		background: true,
		startedAt: new Date().toISOString(),
	};
	addInstance(me);

	const child = spawn(paths.nextBin, ['start', '--port', String(nextPort)], {
		cwd: paths.packageRoot,
		env: nextEnvironment,
		stdio: ['inherit', 'pipe', 'inherit'],
	});

	// Tear down the next child along with us, otherwise it keeps holding the
	// port after this process is killed (e.g. via --list).
	const shutdown = () => {
		try {
			child.kill('SIGTERM');
		} catch {
			/* already gone */
		}
		try {
			sseServer.close();
		} catch {
			/* already closed */
		}
		removeInstance(process.pid);
	};

	process.on('exit', shutdown);
	process.on('SIGINT', () => process.exit(0));
	process.on('SIGTERM', () => process.exit(0));

	let ready = false;

	child.stdout?.on('data', (chunk: Buffer) => {
		if (!ready) {
			const match = chunk.toString().match(/http:\/\/localhost:\d+/);
			if (match) {
				ready = true;
				const url = `http://localhost:${nextPort}`;
				openBrowser(url, parsed.wantNoOpen);
			}
		}
	});

	child.on('exit', code => {
		try {
			sseServer.close();
		} catch {
			/* already closed */
		}
		removeInstance(process.pid);
		process.exit(code ?? 0);
	});
}
