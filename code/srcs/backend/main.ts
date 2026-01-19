import dotenv from 'dotenv';
import { buildFastify } from './config/fastify.js';
import { Logger } from './utils/logger.js';
import { msg_SERV_READY, msg_SERV_START } from './utils/message.js';
import { shutdown } from './utils/shutdown.js';

dotenv.config();

export const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const start = async () => {
	msg_SERV_START();

	try {
		const fastify = await buildFastify();

		// Graceful shutdown
		process.on('SIGINT', () => shutdown(fastify, 'SIGINT'));
		process.on('SIGTERM', () => shutdown(fastify, 'SIGTERM'));

		process.on('uncaughtException', (err) => shutdown(fastify, 'uncaughtException', err));

		process.on('unhandledRejection', (reason) => shutdown(fastify, 'unhandledRejection', reason));

		await fastify.listen({ port: PORT, host: HOST });

		msg_SERV_READY()

		Logger.success('Fastify server running');
	} catch (err) {
		Logger.error('Failed to start server:', err);
		process.exit(1);
	}
};

start();
