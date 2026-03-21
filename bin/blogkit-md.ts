import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exec, spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const markdownFile = args.find(a => !a.startsWith('--'));
const portArg = args.find(a => a.startsWith('--port='));
const requestedPort = portArg ? parseInt(portArg.split('=')[1]) : 0;

if (!markdownFile) {
	console.error('Usage: blogkit-md <path-to-markdown-file> [--port=3001]');
	process.exit(1);
}

const packageRoot = path.dirname(path.dirname(process.argv[1]));
const markdownPath = path.resolve(process.cwd(), markdownFile);
const nextBin = path.join(packageRoot, 'node_modules/.bin/next');

const clients = new Set<ServerResponse>();

function getFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const s = createServer();
		s.listen(0, () => {
			const port = (s.address() as AddressInfo).port;
			s.close(err => (err ? reject(err) : resolve(port)));
		});
		s.on('error', reject);
	});
}

const sseServer = createServer((req, res) => {
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive',
		'Access-Control-Allow-Origin': '*',
	});
	res.write('data: connected\n\n');
	clients.add(res);
	req.on('close', () => clients.delete(res));
});

sseServer.listen(0, async () => {
	const ssePort = (sseServer.address() as AddressInfo).port;
	const nextPort = requestedPort || await getFreePort();
	const nextEnv = { ...process.env, MARKDOWN_FILE: markdownPath, SSE_PORT: String(ssePort) };

	const markdownFilename = path.basename(markdownPath);
	watch(path.dirname(markdownPath), (_, filename) => {
		if (filename === markdownFilename) {
			for (const client of clients) {
				client.write('data: reload\n\n');
			}
		}
	});

	const child = spawn(nextBin, ['start', '--port', String(nextPort)], {
		cwd: packageRoot,
		env: nextEnv,
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
		sseServer.close();
		process.exit(code ?? 0);
	});
});
