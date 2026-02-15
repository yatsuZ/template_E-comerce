import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, AccessTokenPayload } from '../config/jwt.js';

// ========== TYPE AUGMENTATION ==========

declare module 'fastify' {
  interface FastifyRequest {
    user: AccessTokenPayload;
  }
}

// ========== AUTH MIDDLEWARE ==========

/**
 * Vérifie le header Authorization: Bearer <token>
 * Si valide → ajoute request.user avec { userId, email, is_admin }
 * Si invalide → 401 Unauthorized
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({
      success: false,
      error: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.slice(7); // Enlève "Bearer "

  const result = verifyAccessToken(token);
  if (!result.ok) {
    return reply.code(401).send({
      success: false,
      error: result.error.message.includes('expired') ? 'Token expired' : 'Invalid token',
    });
  }

  request.user = result.data;

  // Vérifier si l'utilisateur est banni en BDD
  const userResult = request.server.userService.getUserById(result.data.userId);
  if (!userResult.ok) {
    return reply.code(401).send({
      success: false,
      error: 'User not found',
    });
  }
  if (userResult.data.banned === 1) {
    return reply.code(403).send({
      success: false,
      error: 'Account is banned',
    });
  }
}

// ========== ADMIN MIDDLEWARE ==========

/**
 * Vérifie que l'utilisateur est admin (is_admin === 1)
 * Doit être utilisé APRÈS authMiddleware
 */
export async function adminMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user || request.user.is_admin !== 1) {
    return reply.code(403).send({
      success: false,
      error: 'Admin access required',
    });
  }
}
