import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  ApiTestContext,
  createApiTestContext,
  closeApiTestContext,
  createTestProduct,
} from '../helpers/test.helper.js';

updateENV("debug");
Logger.debug("Test Stats API", "Tests des routes /api/stats (admin only)");

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

describe('Stats API', () => {
  let ctx: ApiTestContext;

  beforeEach(async () => { ctx = await createApiTestContext(); });
  afterEach(async () => { await closeApiTestContext(ctx); });

  describe('GET /api/stats', () => {
    it('Admin recoit les stats du dashboard', async () => {
      const adminToken = await getAdminToken(ctx);

      // Creer quelques donnees
      await registerAndLogin(ctx, 'u1@test.com', 'password123');
      await registerAndLogin(ctx, 'u2@test.com', 'password123');
      createTestProduct(ctx.productService, 'Produit 1', 5000, 10);
      createTestProduct(ctx.productService, 'Produit 2', 3000, 20);

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/stats',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.totalUsers).toBe(3); // admin + 2 users
      expect(body.data.totalProducts).toBe(2);
      expect(typeof body.data.totalOrders).toBe('number');
      expect(typeof body.data.totalRevenue).toBe('number');
      expect(typeof body.data.ordersByStatus).toBe('object');
    });

    it('Stats vides retournent des zeros', async () => {
      const adminToken = await getAdminToken(ctx);

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/stats',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.totalUsers).toBe(1); // juste l'admin
      expect(body.data.totalProducts).toBe(0);
      expect(body.data.totalOrders).toBe(0);
      expect(body.data.totalRevenue).toBe(0);
    });

    it('403 si non-admin', async () => {
      const userToken = await registerAndLogin(ctx, 'user@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/stats',
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('401 sans token', async () => {
      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/stats',
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
