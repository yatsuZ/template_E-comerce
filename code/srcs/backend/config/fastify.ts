import Fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import ejs from 'ejs';
import path from 'path';
import { showLog } from '../utils/logger.js';
import { setupRoutes } from '../routes/index.js';
import { AuthService } from '../core/services/auth.service.js';
import { UserService } from '../core/services/user.service.js';
import { ProductService } from '../core/services/products.service.js';
import { CartService } from '../core/services/cart.service.js';
import { OrderService } from '../core/services/order.service.js';
import { OrderItemService } from '../core/services/order_items.service.js';
import { StatsService } from '../core/services/stats.service.js';
import { ArticleService } from '../core/services/article.service.js';

// Type augmentation pour accéder aux services via fastify
declare module 'fastify' {
	interface FastifyInstance {
		authService: AuthService;
		userService: UserService;
		productService: ProductService;
		cartService: CartService;
		orderService: OrderService;
		orderItemService: OrderItemService;
		statsService: StatsService;
		articleService: ArticleService;
	}
}

export interface AppServices {
	authService: AuthService;
	userService: UserService;
	productService: ProductService;
	cartService: CartService;
	orderService: OrderService;
	orderItemService: OrderItemService;
	statsService: StatsService;
	articleService: ArticleService;
}

export async function buildFastify(services: AppServices): Promise<FastifyInstance> {
	const fastify = Fastify({
		logger: showLog(),
	});

	// Plugins securite
	await fastify.register(fastifyHelmet);
	await fastify.register(fastifyCors, {
		origin: process.env.CORS_ORIGIN || 'http://localhost:3010',
		credentials: true,
	});
	await fastify.register(fastifyRateLimit, {
		max: 100,
		timeWindow: '1 minute',
	});

	// Plugins
	await fastify.register(fastifyCookie);
	await fastify.register(fastifyMultipart, {
		limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
	});

	// Décorer fastify avec les services
	fastify.decorate('authService', services.authService);
	fastify.decorate('userService', services.userService);
	fastify.decorate('productService', services.productService);
	fastify.decorate('cartService', services.cartService);
	fastify.decorate('orderService', services.orderService);
	fastify.decorate('orderItemService', services.orderItemService);
	fastify.decorate('statsService', services.statsService);
	fastify.decorate('articleService', services.articleService);

	// Templates EJS
	await fastify.register(fastifyView, {
		engine: { ejs },
		root: path.join(process.cwd(), 'srcs/static/views'),
	});

	// CSS (depuis dist, compilé par Tailwind)
	await fastify.register(fastifyStatic, {
		root: path.join(process.cwd(), 'dist/static/css'),
		prefix: '/static/css/',
	});

	// JS compiles (depuis dist)
	await fastify.register(fastifyStatic, {
		root: path.join(process.cwd(), 'dist/static/js'),
		prefix: '/static/js/',
		decorateReply: false,
	});

	// Fonts & assets statiques (depuis srcs)
	await fastify.register(fastifyStatic, {
		root: path.join(process.cwd(), 'srcs/static/utils'),
		prefix: '/static/utils/',
		decorateReply: false,
	});

	// Setup des routes
	await setupRoutes(fastify);

	return fastify;
}
