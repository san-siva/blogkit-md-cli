import readline from 'node:readline';

import { banner, c, INDENT, humanAge, line, openBrowser, tilde, tree } from './output.ts';
import { killInstance, pruneRegistry, type Instance } from './registry.ts';

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
	instances.forEach(i => tree(instanceLabel(i)));
	line();
}

function printScriptList(instances: Instance[]): void {
	for (const inst of instances) {
		process.stdout.write(`${inst.port}\t${inst.dir}\n`);
	}
}

export async function listInstancesInteractive(nonInteractive = false): Promise<void> {
	const instances = pruneRegistry();

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
			printPlainList(instances);
			resolve();
			return;
		}

		const render = (footer?: string) => {
			const out: string[] = [
				'',
				INDENT + c.bold(c.blue('blogkit-md')) + c.gray('  ·  running instances'),
				'',
				...instances.map((inst, rowIndex) => {
					const selected = rowIndex === index;
					const pointer = selected ? c.blue('❯ ') : '  ';
					const label = selected ? instanceLabel(inst) : c.dim(instanceLabel(inst));
					return INDENT + pointer + label;
				}),
				'',
				footer ?? c.gray(INDENT + '↑/↓ j/k move   ⏎ open in Chrome   x stop   q quit'),
				'',
			];
			process.stdout.write('[2J[H' + out.join('\n') + '\n');
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
					if (key.name === 'q' || key.name === 'escape' || (key.ctrl && key.name === 'c')) {
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
