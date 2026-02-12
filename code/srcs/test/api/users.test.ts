import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  ApiTestContext,
  createApiTestContext,
  closeApiTestContext,
} from '../helpers/test.helper.js';

updateENV("debug");
Logger.debug("Test Users API", "Tests des routes /api/users");

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

describe('Users API', () => {
  let ctx: ApiTestContext;

  beforeEach(async () => { ctx = await createApiTestContext(); });
  afterEach(async () => { await closeApiTestContext(ctx); });

  // ========== ME ==========

  describe('GET /api/users/me', () => {
    it('Retourne mon profil sans le password', async () => {
      const token = await registerAndLogin(ctx, 'me@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/users/me',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.email).toBe('me@test.com');
      expect(body.data.password).toBeUndefined();
    });

    it('401 sans token', async () => {
      const res = await ctx.fastify.inject({ method: 'GET', url: '/api/users/me' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/users/me/email', () => {
    it('Modifie mon email', async () => {
      const token = await registerAndLogin(ctx, 'old@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'PUT',
        url: '/api/users/me/email',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'new@test.com' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.email).toBe('new@test.com');
    });

    it('400 si email invalide', async () => {
      const token = await registerAndLogin(ctx, 'user@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'PUT',
        url: '/api/users/me/email',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'invalid' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /api/users/me/password', () => {
    it('Modifie mon password', async () => {
      const token = await registerAndLogin(ctx, 'user@test.com', 'oldpass123');

      const res = await ctx.fastify.inject({
        method: 'PUT',
        url: '/api/users/me/password',
        headers: { authorization: `Bearer ${token}` },
        payload: { currentPassword: 'oldpass123', newPassword: 'newpass123' },
      });

      expect(res.statusCode).toBe(200);
    });

    it('401 si ancien password incorrect', async () => {
      const token = await registerAndLogin(ctx, 'user@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'PUT',
        url: '/api/users/me/password',
        headers: { authorization: `Bearer ${token}` },
        payload: { currentPassword: 'wrongpass', newPassword: 'newpass123' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/users/me', () => {
    it('Supprime mon compte avec password', async () => {
      const token = await registerAndLogin(ctx, 'user@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'DELETE',
        url: '/api/users/me',
        headers: { authorization: `Bearer ${token}` },
        payload: { password: 'password123' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it('401 si password incorrect', async () => {
      const token = await registerAndLogin(ctx, 'user@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'DELETE',
        url: '/api/users/me',
        headers: { authorization: `Bearer ${token}` },
        payload: { password: 'wrongpass' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ========== ADMIN ==========

  describe('GET /api/users (admin)', () => {
    it('Admin voit tous les users sans password', async () => {
      const token = await getAdminToken(ctx);
      await registerAndLogin(ctx, 'u1@test.com', 'password123');
      await registerAndLogin(ctx, 'u2@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/users',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.items.length).toBe(3); // admin + 2 users
      expect(body.items[0].password).toBeUndefined();
      expect(body.total).toBe(3);
    });

    it('403 si non-admin', async () => {
      const token = await registerAndLogin(ctx, 'user@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/users',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/users/:id (admin)', () => {
    it('Admin voit un user par ID', async () => {
      const token = await getAdminToken(ctx);
      await registerAndLogin(ctx, 'target@test.com', 'password123');

      const users = ctx.userService.getAll();
      if (!users.ok) throw new Error();
      const target = users.data.find(u => u.email === 'target@test.com')!;

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: `/api/users/${target.id}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.email).toBe('target@test.com');
    });
  });

  describe('DELETE /api/users/:id (admin)', () => {
    it('Admin supprime un user', async () => {
      const token = await getAdminToken(ctx);
      await registerAndLogin(ctx, 'target@test.com', 'password123');

      const users = ctx.userService.getAll();
      if (!users.ok) throw new Error();
      const target = users.data.find(u => u.email === 'target@test.com')!;

      const res = await ctx.fastify.inject({
        method: 'DELETE',
        url: `/api/users/${target.id}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
    });
  });
});
