import { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema } from '../../core/schema/auth.schema.js';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 jours en secondes

function getRefreshCookieOptions() {
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict' as const,
		path: '/api/auth',
		maxAge: REFRESH_COOKIE_MAX_AGE,
	};
}

export async function authRoutes(fastify: FastifyInstance) {
	const authService = fastify.authService;

	// ========== REGISTER ==========

	fastify.post('/register', async (request, reply) => {
		const parsed = registerSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: 'Invalid input',
				details: parsed.error.flatten().fieldErrors,
			});
		}

		const { email, password } = parsed.data;
		const result = await authService.register(email, password);

		if (!result.ok) {
			const statusCode = result.error.type === 'CONFLICT' ? 409 : 400;
			return reply.code(statusCode).send({
				success: false,
				error: result.error.message,
			});
		}

		reply.setCookie(REFRESH_COOKIE_NAME, result.data.refreshToken, getRefreshCookieOptions());

		return reply.code(201).send({
			success: true,
			accessToken: result.data.accessToken,
		});
	});

	// ========== LOGIN ==========

	fastify.post('/login', async (request, reply) => {
		const parsed = loginSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: 'Invalid input',
				details: parsed.error.flatten().fieldErrors,
			});
		}

		const { email, password } = parsed.data;
		const result = await authService.login(email, password);

		if (!result.ok) {
			return reply.code(401).send({
				success: false,
				error: 'Invalid email or password',
			});
		}

		reply.setCookie(REFRESH_COOKIE_NAME, result.data.refreshToken, getRefreshCookieOptions());

		return reply.code(200).send({
			success: true,
			accessToken: result.data.accessToken,
		});
	});

	// ========== REFRESH ==========

	fastify.post('/refresh', async (request, reply) => {
		const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

		if (!refreshToken) {
			return reply.code(401).send({
				success: false,
				error: 'No refresh token provided',
			});
		}

		const result = authService.refresh(refreshToken);
		if (!result.ok) {
			reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
			return reply.code(401).send({
				success: false,
				error: 'Invalid or expired refresh token',
			});
		}

		return reply.code(200).send({
			success: true,
			accessToken: result.data.accessToken,
		});
	});

	// ========== LOGOUT ==========

	fastify.post('/logout', async (request, reply) => {
		reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });

		return reply.code(200).send({
			success: true,
			message: 'Logged out',
		});
	});
}
