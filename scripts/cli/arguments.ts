export interface ParsedArgs {
	inputArg?: string;
	requestedPort: number;
	wantList: boolean;
	wantTear: boolean;
	wantNoOpen: boolean;
	wantStop: boolean;
	wantStopAll: boolean;
	wantNonInteractive: boolean;
	isDetachedChild: boolean;
	isPortReused: boolean;
	wantHelp: boolean;
	unknownFlags: string[];
}

const KNOWN_FLAGS = new Set([
	'--port',
	'--tear', '-t',
	'--list', '-l', '--list-instances',
	'--no-open', '-n',
	'--stop', '-s',
	'--stop-all', '-S',
	'--non-interactive',
	'--help', '-h',
	'--__detached', '--__port-reused', // internal
]);

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
		wantStopAll: flagNames.has('--stop-all') || flagNames.has('-S'),
		wantNonInteractive: flagNames.has('--non-interactive'),
		isDetachedChild: flagNames.has('--__detached'), // internal use only
		isPortReused: flagNames.has('--__port-reused'), // internal use only
		wantHelp: flagNames.has('--help') || flagNames.has('-h'),
		unknownFlags: [...flagNames].filter(f => !KNOWN_FLAGS.has(f)),
	};
}
