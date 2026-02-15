import { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema } from '../../core/schema/auth.schema.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { Logger } from '../../utils/logger.js';

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
			if (result.error.type === 'CONFLICT') {
				// Anti-énumération : même réponse que si le compte avait été créé
				// L'attaquant ne peut pas savoir si l'email existe
				Logger.audit('REGISTER_DUPLICATE', { email, ip: request.ip });
				return reply.code(201).send({
					success: true,
					message: 'If this email is not already registered, a new account has been created. Check your email.',
				});
			}
			return reply.code(400).send({
				success: false,
				error: result.error.message,
			});
		}

		Logger.audit('REGISTER', { email, ip: request.ip });

		reply.setCookie(REFRESH_COOKIE_NAME, result.data.refreshToken, getRefreshCookieOptions());

		return reply.code(201).send({
			success: true,
			accessToken: result.data.accessToken,
		});
	});

	// ========== LOGIN ==========

	fastify.post('/login', {
		config: {
			rateLimit: {
				max: 5,
				timeWindow: '1 minute',
			},
		},
	}, async (request, reply) => {
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
			if (result.error.type === 'FORBIDDEN') {
				Logger.audit('LOGIN_BANNED', { email, ip: request.ip });
				return reply.code(403).send({
					success: false,
					error: 'Account is banned',
				});
			}
			Logger.audit('LOGIN_FAILED', { email, ip: request.ip });
			return reply.code(401).send({
				success: false,
				error: 'Invalid email or password',
			});
		}

		Logger.audit('LOGIN', { email, ip: request.ip });

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

		// Rotation : set le nouveau refresh token dans le cookie
		reply.setCookie(REFRESH_COOKIE_NAME, result.data.refreshToken, getRefreshCookieOptions());

		return reply.code(200).send({
			success: true,
			accessToken: result.data.accessToken,
		});
	});

	// ========== LOGOUT ==========

	fastify.post('/logout', { preHandler: [authMiddleware] }, async (request, reply) => {
		Logger.audit('LOGOUT', { userId: request.user.userId, ip: request.ip });
		// Supprimer le refresh token de la BDD
		authService.logout(request.user.userId);

		reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });

		return reply.code(200).send({
			success: true,
			message: 'Logged out',
		});
	});
}
