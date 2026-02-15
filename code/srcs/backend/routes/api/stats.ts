import { FastifyInstance } from 'fastify';
import { authMiddleware, adminMiddleware } from '../../middlewares/auth.middleware.js';

export async function statsRoutes(fastify: FastifyInstance) {
	const statsService = fastify.statsService;

	// GET /api/stats → Dashboard stats (admin only)
	fastify.get('/', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const result = statsService.getDashboardStats();
		if (!result.ok) {
			return reply.code(500).send({ success: false, error: 'Server error' });
		}
		return reply.code(200).send({ success: true, data: result.data });
	});
}
