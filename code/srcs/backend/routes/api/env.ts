import { FastifyInstance } from 'fastify';
import { Logger } from '../../utils/logger.js';

const location = "routes/api/env.ts"

export async function envRoutes(fastify: FastifyInstance) {
	fastify.get('/env', async () => {
		const envVars = {
			NODE_ENV: process.env.NODE_ENV,
			PORT: process.env.PORT,
			TEST: process.env.TEST,
			// Ajoute ici les variables que tu veux exposer
		};

		Logger.info(location, 'Variables d\'environnement:');
		console.log(envVars);
		return {
			status: 'ok',
			env: envVars,
		};
	});
}
