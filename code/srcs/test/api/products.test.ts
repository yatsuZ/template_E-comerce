import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  ApiTestContext,
  createApiTestContext,
  closeApiTestContext,
  createTestProduct,
} from '../helpers/test.helper.js';

updateENV("debug");
Logger.debug("Test Products API", "Tests des routes /api/products");

// Helper : register + login admin → retourne accessToken
async function getAdminToken(ctx: ApiTestContext): Promise<string> {
  // Créer un admin via le service
  await ctx.userService.createAdmin('admin@test.com', 'adminpass');
  const res = await ctx.fastify.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'admin@test.com', password: 'adminpass' },
  });
  return res.json().accessToken;
}

// Helper : register + login user → retourne accessToken
async function getUserToken(ctx: ApiTestContext): Promise<string> {
  await ctx.fastify.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'user@test.com', password: 'userpass123' },
  });
  const res = await ctx.fastify.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'user@test.com', password: 'userpass123' },
  });
  return res.json().accessToken;
}

describe('Products API', () => {
  let ctx: ApiTestContext;

  beforeEach(async () => { ctx = await createApiTestContext(); });
  afterEach(async () => { await closeApiTestContext(ctx); });

  // ========== GET (public) ==========

  describe('GET /api/products', () => {
    it('Retourne la liste des produits (public)', async () => {
      createTestProduct(ctx.productService, 'P1');
      createTestProduct(ctx.productService, 'P2');

      const res = await ctx.fastify.inject({ method: 'GET', url: '/api/products' });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
    });

    it('Retourne liste vide si aucun produit', async () => {
      const res = await ctx.fastify.inject({ method: 'GET', url: '/api/products' });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBe(0);
    });
  });

  describe('GET /api/products/:id', () => {
    it('Retourne un produit par ID (public)', async () => {
      const product = createTestProduct(ctx.productService, 'iPhone');

      const res = await ctx.fastify.inject({ method: 'GET', url: `/api/products/${product.id}` });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.name).toBe('iPhone');
    });

    it('404 si produit inexistant', async () => {
      const res = await ctx.fastify.inject({ method: 'GET', url: '/api/products/9999' });
      expect(res.statusCode).toBe(404);
    });

    it('400 si ID invalide', async () => {
      const res = await ctx.fastify.inject({ method: 'GET', url: '/api/products/abc' });
      expect(res.statusCode).toBe(400);
    });
  });

  // ========== POST (admin) ==========

  describe('POST /api/products', () => {
    it('Admin crée un produit', async () => {
      const token = await getAdminToken(ctx);

      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/products',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'New Product', description: 'Test', price: 9900, stock: 50 },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.name).toBe('New Product');
    });

    it('401 sans token', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/products',
        payload: { name: 'P', price: 100, stock: 10 },
      });
      expect(res.statusCode).toBe(401);
    });

    it('403 si user non-admin', async () => {
      const token = await getUserToken(ctx);

      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/products',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'P', price: 100, stock: 10 },
      });
      expect(res.statusCode).toBe(403);
    });

    it('400 si body invalide', async () => {
      const token = await getAdminToken(ctx);

      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/products',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: '', price: -1 },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ========== PUT (admin) ==========

  describe('PUT /api/products/:id', () => {
    it('Admin modifie un produit', async () => {
      const token = await getAdminToken(ctx);
      const product = createTestProduct(ctx.productService, 'Old Name');

      const res = await ctx.fastify.inject({
        method: 'PUT',
        url: `/api/products/${product.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { price: 5000 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.price).toBe(5000);
    });

    it('404 si produit inexistant', async () => {
      const token = await getAdminToken(ctx);

      const res = await ctx.fastify.inject({
        method: 'PUT',
        url: '/api/products/9999',
        headers: { authorization: `Bearer ${token}` },
        payload: { price: 5000 },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ========== DELETE (admin) ==========

  describe('DELETE /api/products/:id', () => {
    it('Admin supprime un produit', async () => {
      const token = await getAdminToken(ctx);
      const product = createTestProduct(ctx.productService);

      const res = await ctx.fastify.inject({
        method: 'DELETE',
        url: `/api/products/${product.id}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it('404 si produit inexistant', async () => {
      const token = await getAdminToken(ctx);

      const res = await ctx.fastify.inject({
        method: 'DELETE',
        url: '/api/products/9999',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
