import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  ApiTestContext,
  createApiTestContext,
  closeApiTestContext,
  createTestProduct,
} from '../helpers/test.helper.js';
import { I_Product } from '../../backend/core/interfaces/product.interfaces.js';

updateENV("debug");
Logger.debug("Test Cart API", "Tests des routes /api/cart");

async function getUserToken(ctx: ApiTestContext, email = 'user@test.com'): Promise<string> {
  await ctx.fastify.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'password123' },
  });
  const res = await ctx.fastify.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: 'password123' },
  });
  return res.json().accessToken;
}

describe('Cart API', () => {
  let ctx: ApiTestContext;
  let token: string;
  let product: I_Product;

  beforeEach(async () => {
    ctx = await createApiTestContext();
    token = await getUserToken(ctx);
    product = createTestProduct(ctx.productService, 'Test Product', 9900, 50);
  });
  afterEach(async () => { await closeApiTestContext(ctx); });

  // ========== GET ==========

  describe('GET /api/cart', () => {
    it('Retourne mon panier vide', async () => {
      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBe(0);
    });

    it('401 sans token', async () => {
      const res = await ctx.fastify.inject({ method: 'GET', url: '/api/cart' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ========== POST ==========

  describe('POST /api/cart', () => {
    it('Ajoute un produit au panier', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
        payload: { product_id: product.id, quantity: 3 },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.quantity).toBe(3);
    });

    it('Additionne la quantité si déjà dans le panier', async () => {
      await ctx.fastify.inject({
        method: 'POST',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
        payload: { product_id: product.id, quantity: 2 },
      });

      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
        payload: { product_id: product.id, quantity: 3 },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.quantity).toBe(5);
    });

    it('400 si stock insuffisant', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
        payload: { product_id: product.id, quantity: 999 },
      });
      expect(res.statusCode).toBe(400);
    });

    it('404 si produit inexistant', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
        payload: { product_id: 9999, quantity: 1 },
      });
      expect(res.statusCode).toBe(404);
    });

    it('400 si body invalide', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
        payload: { product_id: product.id, quantity: -1 },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ========== PUT ==========

  describe('PUT /api/cart/:id', () => {
    it('Modifie la quantité', async () => {
      const addRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
        payload: { product_id: product.id, quantity: 2 },
      });
      const cartId = addRes.json().data.id;

      const res = await ctx.fastify.inject({
        method: 'PUT',
        url: `/api/cart/${cartId}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { quantity: 10 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.quantity).toBe(10);
    });

    it('403 si pas mon item', async () => {
      // User 1 ajoute un item
      const addRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
        payload: { product_id: product.id, quantity: 1 },
      });
      const cartId = addRes.json().data.id;

      // User 2 essaie de modifier
      const token2 = await getUserToken(ctx, 'other@test.com');
      const res = await ctx.fastify.inject({
        method: 'PUT',
        url: `/api/cart/${cartId}`,
        headers: { authorization: `Bearer ${token2}` },
        payload: { quantity: 5 },
      });
      expect(res.statusCode).toBe(403);
    });

    it('404 si item inexistant', async () => {
      const res = await ctx.fastify.inject({
        method: 'PUT',
        url: '/api/cart/9999',
        headers: { authorization: `Bearer ${token}` },
        payload: { quantity: 5 },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ========== DELETE ==========

  describe('DELETE /api/cart/:id', () => {
    it('Retire un item du panier', async () => {
      const addRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
        payload: { product_id: product.id, quantity: 1 },
      });
      const cartId = addRes.json().data.id;

      const res = await ctx.fastify.inject({
        method: 'DELETE',
        url: `/api/cart/${cartId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
    });

    it('403 si pas mon item', async () => {
      const addRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
        payload: { product_id: product.id, quantity: 1 },
      });
      const cartId = addRes.json().data.id;

      const token2 = await getUserToken(ctx, 'other@test.com');
      const res = await ctx.fastify.inject({
        method: 'DELETE',
        url: `/api/cart/${cartId}`,
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/cart', () => {
    it('Vide tout le panier', async () => {
      const product2 = createTestProduct(ctx.productService, 'P2', 5000, 20);
      await ctx.fastify.inject({
        method: 'POST',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
        payload: { product_id: product.id, quantity: 1 },
      });
      await ctx.fastify.inject({
        method: 'POST',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
        payload: { product_id: product2.id, quantity: 2 },
      });

      const res = await ctx.fastify.inject({
        method: 'DELETE',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);

      const getRes = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(getRes.json().data.length).toBe(0);
    });
  });
});
