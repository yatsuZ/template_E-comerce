import dotenv from 'dotenv';
import { buildFastify } from './config/fastify.js';
import { Logger } from './utils/logger.js';
import { msg_SERV_READY, msg_SERV_START } from './utils/message.js';
import { db } from './core/config.js';

dotenv.config();

export const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const start = async () => {
	msg_SERV_START();

	try {
		const fastify = await buildFastify();

		// Graceful shutdown
		const shutdown = async (signal: string) => {
			Logger.warn(`Received ${signal}, shutting down...`);

			try {
				await fastify.close();
				Logger.success('Fastify server closed');
			} catch (err) {
				Logger.error('Error closing Fastify:', err);
			}

			try {
				db.close();
			} catch (err) {
				Logger.error('Error closing database:', err);
			}

			process.exit(0);
		};

		process.on('SIGINT', shutdown);
		process.on('SIGTERM', shutdown);
		process.on('uncaughtException', shutdown);
		process.on('unhandledRejection', shutdown);


		await fastify.listen({ port: PORT, host: HOST });
		
		msg_SERV_READY()

		Logger.success('Fastify server running');
	} catch (err) {
		Logger.error('Failed to start server:', err);
		process.exit(1);
	}
};

start();
