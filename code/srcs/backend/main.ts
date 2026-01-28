import dotenv from 'dotenv';
import { buildFastify } from './config/fastify.js';
import { Logger } from './utils/logger.js';
import { msg_SERV_READY, msg_SERV_START } from './utils/message.js';
import { shutdown } from './utils/shutdown.js';
import { DatabaseManager } from './config/db.js';
import { UserRepository } from './core/repositories/user.repository.js';

const location = "main.ts"

dotenv.config();

export const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const start = async () => {
	msg_SERV_START();

	try {
    const db = new DatabaseManager();
    const userRepo = new UserRepository(db.getConnection());

    const fastify = await buildFastify();

		process.on('SIGINT', () => shutdown(fastify, db, 'SIGINT'));
		process.on('SIGTERM', () => shutdown(fastify, db, 'SIGTERM'));

		process.on('uncaughtException', (err) => shutdown(fastify, db, 'uncaughtException', err));

		process.on('unhandledRejection', (reason) => shutdown(fastify, db, 'unhandledRejection', reason));

		await fastify.listen({ port: PORT, host: HOST });

		msg_SERV_READY()

		Logger.success(location, 'Fastify server running');
	} catch (err) {
		Logger.error(location, 'Failed to start server:', err);
		process.exit(1);
	}
};

start();


// 1. Gestion derreur 
// 2. Faire une classe abstract de reposotrie
// 3. test les repo
// 4. faire les autre repos avec tester
// 5.