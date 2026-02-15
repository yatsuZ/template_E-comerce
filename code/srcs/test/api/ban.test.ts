import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  ApiTestContext,
  createApiTestContext,
  closeApiTestContext,
} from '../helpers/test.helper.js';

updateENV("debug");
Logger.debug("Test Ban API", "Tests des routes ban/unban + login bloque si banni");

async function registerAndLogin(ctx: ApiTestContext, email: string, password: string): Promise<string> {
  await ctx.fastify.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password },
  });
  const res = await ctx.fastify.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });
  return res.json().accessToken;
}

async function getAdminToken(ctx: ApiTestContext): Promise<string> {
  await ctx.userService.createAdmin('admin@test.com', 'adminpass');
  const res = await ctx.fastify.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'admin@test.com', password: 'adminpass' },
  });
  return res.json().accessToken;
}

function getUserIdByEmail(ctx: ApiTestContext, email: string): number {
  const users = ctx.userService.getAll();
  if (!users.ok) throw new Error('Failed to get users');
  const user = users.data.find(u => u.email === email);
  if (!user) throw new Error(`User ${email} not found`);
  return user.id;
}

describe('Ban/Unban API', () => {
  let ctx: ApiTestContext;

  beforeEach(async () => { ctx = await createApiTestContext(); });
  afterEach(async () => { await closeApiTestContext(ctx); });

  // ========== BAN ==========

  describe('PATCH /api/users/:id/ban', () => {
    it('Admin peut bannir un user', async () => {
      const adminToken = await getAdminToken(ctx);
      await registerAndLogin(ctx, 'user@test.com', 'password123');
      const userId = getUserIdByEmail(ctx, 'user@test.com');

      const res = await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${userId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().data.banned).toBe(1);
    });

    it('403 si on essaie de bannir un admin', async () => {
      const adminToken = await getAdminToken(ctx);
      const adminId = getUserIdByEmail(ctx, 'admin@test.com');

      const res = await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${adminId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().success).toBe(false);
    });

    it('409 si user deja banni', async () => {
      const adminToken = await getAdminToken(ctx);
      await registerAndLogin(ctx, 'user@test.com', 'password123');
      const userId = getUserIdByEmail(ctx, 'user@test.com');

      await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${userId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${userId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(409);
    });

    it('404 si user inexistant', async () => {
      const adminToken = await getAdminToken(ctx);

      const res = await ctx.fastify.inject({
        method: 'PATCH',
        url: '/api/users/9999/ban',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('403 si non-admin essaie de bannir', async () => {
      const userToken = await registerAndLogin(ctx, 'user@test.com', 'password123');
      await registerAndLogin(ctx, 'target@test.com', 'password123');
      const targetId = getUserIdByEmail(ctx, 'target@test.com');

      const res = await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${targetId}/ban`,
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ========== UNBAN ==========

  describe('PATCH /api/users/:id/unban', () => {
    it('Admin peut debannir un user', async () => {
      const adminToken = await getAdminToken(ctx);
      await registerAndLogin(ctx, 'user@test.com', 'password123');
      const userId = getUserIdByEmail(ctx, 'user@test.com');

      // Bannir d'abord
      await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${userId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      // Debannir
      const res = await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${userId}/unban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().data.banned).toBe(0);
    });

    it('409 si user pas banni', async () => {
      const adminToken = await getAdminToken(ctx);
      await registerAndLogin(ctx, 'user@test.com', 'password123');
      const userId = getUserIdByEmail(ctx, 'user@test.com');

      const res = await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${userId}/unban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(409);
    });
  });

  // ========== LOGIN BLOQUE ==========

  describe('Login bloque si banni', () => {
    it('403 au login si user est banni', async () => {
      const adminToken = await getAdminToken(ctx);
      await registerAndLogin(ctx, 'banned@test.com', 'password123');
      const userId = getUserIdByEmail(ctx, 'banned@test.com');

      // Bannir le user
      await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${userId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      // Essayer de se login
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'banned@test.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().success).toBe(false);
      expect(res.json().error).toBe('Account is banned');
    });

    it('Login fonctionne apres unban', async () => {
      const adminToken = await getAdminToken(ctx);
      await registerAndLogin(ctx, 'temp@test.com', 'password123');
      const userId = getUserIdByEmail(ctx, 'temp@test.com');

      // Ban
      await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${userId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      // Unban
      await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${userId}/unban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      // Login devrait fonctionner
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'temp@test.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().accessToken).toBeDefined();
    });
  });

  // ========== TOKEN VALIDE MAIS BANNI ==========

  describe('Token valide mais user banni', () => {
    it('403 sur /api/users/me si banni avec un token encore valide', async () => {
      const adminToken = await getAdminToken(ctx);
      const userToken = await registerAndLogin(ctx, 'banned@test.com', 'password123');
      const userId = getUserIdByEmail(ctx, 'banned@test.com');

      // Bannir le user (son token est encore valide 15min)
      await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${userId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      // Essayer d'acceder a une route protegee avec le token encore valide
      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/users/me',
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().success).toBe(false);
      expect(res.json().error).toBe('Account is banned');
    });

    it('403 sur /api/cart si banni avec un token encore valide', async () => {
      const adminToken = await getAdminToken(ctx);
      const userToken = await registerAndLogin(ctx, 'banned2@test.com', 'password123');
      const userId = getUserIdByEmail(ctx, 'banned2@test.com');

      await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/users/${userId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/cart',
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe('Account is banned');
    });
  });
});
