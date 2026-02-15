import { FastifyInstance } from 'fastify';
import { authMiddleware, adminMiddleware } from '../../middlewares/auth.middleware.js';
import { updateEmailSchema, updatePasswordSchema, deleteAccountSchema } from '../../core/schema/user.schema.js';
import { paginationSchema } from '../../core/schema/pagination.schema.js';
import { Logger } from '../../utils/logger.js';
import { safeError } from '../../utils/Error/ErrorManagement.js';
import { I_User } from '../../core/interfaces/user.interfaces.js';

// Enlève les champs sensibles de la réponse
function sanitizeUser(user: I_User) {
	const { password, refresh_token, ...safe } = user;
	return safe;
}

export async function userRoutes(fastify: FastifyInstance) {
	const userService = fastify.userService;

	// ========== MON PROFIL (auth) ==========

	// GET /api/users/me → Mon profil
	fastify.get('/me', { preHandler: [authMiddleware] }, async (request, reply) => {
		const result = userService.getUserById(request.user.userId);
		if (!result.ok) {
			return reply.code(404).send({ success: false, error: 'User not found' });
		}
		return reply.code(200).send({ success: true, data: sanitizeUser(result.data) });
	});

	// PUT /api/users/me/email → Modifier mon email
	fastify.put('/me/email', { preHandler: [authMiddleware] }, async (request, reply) => {
		const parsed = updateEmailSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: 'Invalid input',
				details: parsed.error.flatten().fieldErrors,
			});
		}

		const result = userService.updateEmail(request.user.userId, parsed.data.email);
		if (!result.ok) {
			const statusCode = result.error.type === 'CONFLICT' ? 409 : 400;
			return reply.code(statusCode).send({ success: false, error: safeError(result.error) });
		}
		return reply.code(200).send({ success: true, data: sanitizeUser(result.data) });
	});

	// PUT /api/users/me/password → Modifier mon password
	fastify.put('/me/password', { preHandler: [authMiddleware] }, async (request, reply) => {
		const parsed = updatePasswordSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: 'Invalid input',
				details: parsed.error.flatten().fieldErrors,
			});
		}

		// Vérifier l'ancien password
		const verifyResult = await userService.verifyPassword(request.user.userId, parsed.data.currentPassword);
		if (!verifyResult.ok) {
			return reply.code(401).send({ success: false, error: 'Current password is incorrect' });
		}

		const result = await userService.updatePassword(request.user.userId, parsed.data.newPassword);
		if (!result.ok) {
			return reply.code(400).send({ success: false, error: safeError(result.error) });
		}
		return reply.code(200).send({ success: true, data: sanitizeUser(result.data) });
	});

	// DELETE /api/users/me → Supprimer mon compte
	fastify.delete('/me', { preHandler: [authMiddleware] }, async (request, reply) => {
		const parsed = deleteAccountSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: 'Invalid input',
				details: parsed.error.flatten().fieldErrors,
			});
		}

		// Vérifier le password avant suppression
		const verifyResult = await userService.verifyPassword(request.user.userId, parsed.data.password);
		if (!verifyResult.ok) {
			return reply.code(401).send({ success: false, error: 'Password is incorrect' });
		}

		const result = userService.deleteUserById(request.user.userId);
		if (!result.ok) {
			return reply.code(500).send({ success: false, error: 'Server error' });
		}
		return reply.code(200).send({ success: true, message: 'Account deleted' });
	});

	// ========== ADMIN ==========

	// GET /api/users → Liste tous les users (admin, paginé)
	fastify.get('/', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const pagination = paginationSchema.parse(request.query);
		const result = userService.getAllPaginated(pagination);
		if (!result.ok) {
			return reply.code(500).send({ success: false, error: 'Server error' });
		}
		return reply.code(200).send({
			success: true,
			items: result.data.items.map(sanitizeUser),
			total: result.data.total,
			page: result.data.page,
			limit: result.data.limit,
			totalPages: result.data.totalPages,
		});
	});

	// GET /api/users/:id → Voir un user (admin)
	fastify.get('/:id', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const { id } = request.params as { id: string };
		const userId = parseInt(id, 10);
		if (isNaN(userId)) {
			return reply.code(400).send({ success: false, error: 'Invalid user ID' });
		}

		const result = userService.getUserById(userId);
		if (!result.ok) {
			return reply.code(404).send({ success: false, error: 'User not found' });
		}
		return reply.code(200).send({ success: true, data: sanitizeUser(result.data) });
	});

	// PATCH /api/users/:id/ban → Bannir un user (admin)
	fastify.patch('/:id/ban', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const { id } = request.params as { id: string };
		const userId = parseInt(id, 10);
		if (isNaN(userId)) {
			return reply.code(400).send({ success: false, error: 'Invalid user ID' });
		}

		const result = userService.banUser(userId);
		if (!result.ok) {
			const statusCode = result.error.type === 'NOT_FOUND' ? 404
				: result.error.type === 'FORBIDDEN' ? 403
				: result.error.type === 'CONFLICT' ? 409 : 500;
			return reply.code(statusCode).send({ success: false, error: safeError(result.error) });
		}
		Logger.audit('ADMIN_BAN_USER', { adminId: request.user.userId, targetUserId: userId, ip: request.ip });
		return reply.code(200).send({ success: true, data: sanitizeUser(result.data) });
	});

	// PATCH /api/users/:id/unban → Débannir un user (admin)
	fastify.patch('/:id/unban', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const { id } = request.params as { id: string };
		const userId = parseInt(id, 10);
		if (isNaN(userId)) {
			return reply.code(400).send({ success: false, error: 'Invalid user ID' });
		}

		const result = userService.unbanUser(userId);
		if (!result.ok) {
			const statusCode = result.error.type === 'NOT_FOUND' ? 404
				: result.error.type === 'CONFLICT' ? 409 : 500;
			return reply.code(statusCode).send({ success: false, error: safeError(result.error) });
		}
		Logger.audit('ADMIN_UNBAN_USER', { adminId: request.user.userId, targetUserId: userId, ip: request.ip });
		return reply.code(200).send({ success: true, data: sanitizeUser(result.data) });
	});

	// DELETE /api/users/:id → Supprimer un user (admin)
	fastify.delete('/:id', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const { id } = request.params as { id: string };
		const userId = parseInt(id, 10);
		if (isNaN(userId)) {
			return reply.code(400).send({ success: false, error: 'Invalid user ID' });
		}

		const result = userService.deleteUserById(userId);
		if (!result.ok) {
			return reply.code(404).send({ success: false, error: 'User not found' });
		}
		Logger.audit('ADMIN_DELETE_USER', { adminId: request.user.userId, targetUserId: userId, ip: request.ip });
		return reply.code(200).send({ success: true, message: 'User deleted' });
	});
}
