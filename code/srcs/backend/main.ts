import chalk from 'chalk';
import dotenv from 'dotenv';
import { buildFastify } from './config/fastify.js';
import { Logger } from './utils/logger.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const start = async () => {
	console.log(chalk.magenta('\n========================================'));
	console.log(chalk.magenta('         SERVER STARTING...'));
	console.log(chalk.magenta('========================================\n'));

	try {
		const fastify = await buildFastify();

		await fastify.listen({ port: PORT, host: HOST });

		console.log(chalk.green('\n========================================'));
		console.log(chalk.green('         SERVER READY'));
		console.log(chalk.green('========================================'));
		console.log(chalk.cyan(`\n  Local:   http://localhost:${PORT}`));
		console.log(chalk.cyan(`  API:     http://localhost:${PORT}/api/health\n`));

		Logger.success('Fastify server running');
	} catch (err) {
		Logger.error('Failed to start server:', err);
		process.exit(1);
	}
};

start();
