import Fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import fastifyCookie from '@fastify/cookie';
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

// Type augmentation pour accéder aux services via fastify
declare module 'fastify' {
	interface FastifyInstance {
		authService: AuthService;
		userService: UserService;
		productService: ProductService;
		cartService: CartService;
		orderService: OrderService;
		orderItemService: OrderItemService;
	}
}

export interface AppServices {
	authService: AuthService;
	userService: UserService;
	productService: ProductService;
	cartService: CartService;
	orderService: OrderService;
	orderItemService: OrderItemService;
}

export async function buildFastify(services: AppServices): Promise<FastifyInstance> {
	const fastify = Fastify({
		logger: showLog(),
	});

	// Plugins
	await fastify.register(fastifyCookie);

	// Décorer fastify avec les services
	fastify.decorate('authService', services.authService);
	fastify.decorate('userService', services.userService);
	fastify.decorate('productService', services.productService);
	fastify.decorate('cartService', services.cartService);
	fastify.decorate('orderService', services.orderService);
	fastify.decorate('orderItemService', services.orderItemService);

	// Templates EJS
	await fastify.register(fastifyView, {
		engine: { ejs },
		root: path.join(process.cwd(), 'srcs/static/views'),
	});

	// CSS (depuis srcs)
	await fastify.register(fastifyStatic, {
		root: path.join(process.cwd(), 'srcs/static/css'),
		prefix: '/static/css/',
	});

	// JS compiles (depuis dist)
	await fastify.register(fastifyStatic, {
		root: path.join(process.cwd(), 'dist/static/js'),
		prefix: '/static/js/',
		decorateReply: false,
	});

	// Setup des routes
	await setupRoutes(fastify);

	return fastify;
}
