import chalk from 'chalk';

const isDev = process.env.NODE_ENV !== 'production';

export const Logger = {
	info: (...args: any[]) => {
		if (isDev) console.log(chalk.blue('[INFO]'), ...args);
	},

	success: (...args: any[]) => {
		if (isDev) console.log(chalk.green('[OK]'), ...args);
	},

	warn: (...args: any[]) => {
		if (isDev) console.log(chalk.yellow('[WARN]'), ...args);
	},

	error: (...args: any[]) => {
		console.log(chalk.red('[ERROR]'), ...args);
	},

	debug: (...args: any[]) => {
		if (isDev) console.log(chalk.gray('[DEBUG]'), ...args);
	},

	server: (message: string) => {
		console.log(chalk.magenta('[SERVER]'), message);
	},

	route: (method: string, path: string) => {
		const methodColor = {
			GET: chalk.green,
			POST: chalk.blue,
			PUT: chalk.yellow,
			DELETE: chalk.red,
			PATCH: chalk.cyan,
		}[method] || chalk.white;

		if (isDev) console.log(chalk.gray('[ROUTE]'), methodColor(method.padEnd(6)), path);
	},
};

export function showLog() {
	if (process.env.NODE_ENV === 'production') return false;
	return {
		level: 'info',
		transport: {
			target: 'pino-pretty',
			options: { colorize: true }
		}
	};
}
