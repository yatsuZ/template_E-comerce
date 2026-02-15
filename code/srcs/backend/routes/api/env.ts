import { FastifyInstance } from 'fastify';

export async function envRoutes(fastify: FastifyInstance) {
	fastify.get('/show-var', async () => {
		return {
			status: 'ok',
			env: {
				TEST: process.env.TEST,
			},
		};
	});
}
