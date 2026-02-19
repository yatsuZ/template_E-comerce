import { FastifyInstance } from 'fastify';
import { healthRoutes } from './api/health.js';
import { envRoutes } from './api/env.js';
import { authRoutes } from './api/auth.js';
import { productRoutes } from './api/products.js';
import { userRoutes } from './api/users.js';
import { cartRoutes } from './api/cart.js';
import { orderRoutes } from './api/orders.js';
import { statsRoutes } from './api/stats.js';
import { articleRoutes } from './api/articles.js';

const SITE_NAME = process.env.SITE_NAME || 'SUSPENDED';

export async function setupRoutes(fastify: FastifyInstance) {
	// Routes API
	await fastify.register(healthRoutes, { prefix: '/api' });
	await fastify.register(envRoutes, { prefix: '/api' });
	await fastify.register(authRoutes, { prefix: '/api/auth' });
	await fastify.register(productRoutes, { prefix: '/api/products' });
	await fastify.register(userRoutes, { prefix: '/api/users' });
	await fastify.register(cartRoutes, { prefix: '/api/cart' });
	await fastify.register(orderRoutes, { prefix: '/api/orders' });
	await fastify.register(statsRoutes, { prefix: '/api/stats' });
	await fastify.register(articleRoutes, { prefix: '/api/articles' });

	// Route principale
	fastify.get('/', async (request, reply) => {
		return reply.view('layout.ejs', {
			title: 'Accueil',
			page: 'home',
			siteName: SITE_NAME,
			// Hero background: set heroImage or heroVideo to enable (ex: '/static/utils/hero.jpg')
			// Falls back to gradient if both are undefined
		});
	});

	// 404 handler
	fastify.setNotFoundHandler(async (request, reply) => {
		if (request.url.startsWith('/api/')) {
			return reply.code(404).send({ success: false, error: 'API endpoint not found' });
		}
		return reply.view('layout.ejs', { title: 'Page non trouvee', page: 'home', siteName: SITE_NAME });
	});
}
