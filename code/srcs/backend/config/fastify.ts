import Fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import fastifyCookie from '@fastify/cookie';
import ejs from 'ejs';
import path from 'path';
import { showLog } from '../utils/logger.js';
import { setupRoutes } from '../routes/index.js';
import { AuthService } from '../core/services/auth.service.js';

// Type augmentation pour accéder aux services via fastify.authService
declare module 'fastify' {
	interface FastifyInstance {
		authService: AuthService;
	}
}

export interface AppServices {
	authService: AuthService;
}

export async function buildFastify(services: AppServices): Promise<FastifyInstance> {
	const fastify = Fastify({
		logger: showLog(),
	});

	// Plugins
	await fastify.register(fastifyCookie);

	// Décorer fastify avec les services
	fastify.decorate('authService', services.authService);

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
