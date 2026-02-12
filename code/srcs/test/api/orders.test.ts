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
Logger.debug("Test Orders API", "Tests des routes /api/orders");

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

async function getAdminToken(ctx: ApiTestContext): Promise<string> {
  await ctx.userService.createAdmin('admin@test.com', 'adminpass');
  const res = await ctx.fastify.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'admin@test.com', password: 'adminpass' },
  });
  return res.json().accessToken;
}

// Helper : ajouter au panier via API
async function addToCart(ctx: ApiTestContext, token: string, productId: number, quantity: number) {
  await ctx.fastify.inject({
    method: 'POST',
    url: '/api/cart',
    headers: { authorization: `Bearer ${token}` },
    payload: { product_id: productId, quantity },
  });
}

describe('Orders API', () => {
  let ctx: ApiTestContext;
  let token: string;
  let product: I_Product;

  beforeEach(async () => {
    ctx = await createApiTestContext();
    token = await getUserToken(ctx);
    product = createTestProduct(ctx.productService, 'Test Product', 9900, 50);
  });
  afterEach(async () => { await closeApiTestContext(ctx); });

  // ========== CHECKOUT ==========

  describe('POST /api/orders/checkout', () => {
    it('Crée une commande depuis le panier', async () => {
      await addToCart(ctx, token, product.id, 3);

      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/orders/checkout',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.total).toBe(29700); // 3 * 9900
      expect(body.data.status).toBe('pending');
    });

    it('Vide le panier après checkout', async () => {
      await addToCart(ctx, token, product.id, 2);

      await ctx.fastify.inject({
        method: 'POST',
        url: '/api/orders/checkout',
        headers: { authorization: `Bearer ${token}` },
      });

      const cartRes = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/cart',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(cartRes.json().items.length).toBe(0);
    });

    it('Décrémente le stock', async () => {
      await addToCart(ctx, token, product.id, 10);

      await ctx.fastify.inject({
        method: 'POST',
        url: '/api/orders/checkout',
        headers: { authorization: `Bearer ${token}` },
      });

      const productRes = await ctx.fastify.inject({
        method: 'GET',
        url: `/api/products/${product.id}`,
      });
      expect(productRes.json().data.stock).toBe(40); // 50 - 10
    });

    it('400 si panier vide', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/orders/checkout',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it('401 sans token', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/orders/checkout',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ========== READ ==========

  describe('GET /api/orders', () => {
    it('Retourne mes commandes', async () => {
      await addToCart(ctx, token, product.id, 1);
      await ctx.fastify.inject({
        method: 'POST',
        url: '/api/orders/checkout',
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/orders',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().items.length).toBe(1);
    });

    it('Retourne liste vide si aucune commande', async () => {
      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/orders',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.json().items.length).toBe(0);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('Retourne le détail avec les items', async () => {
      await addToCart(ctx, token, product.id, 3);
      const checkoutRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/orders/checkout',
        headers: { authorization: `Bearer ${token}` },
      });
      const orderId = checkoutRes.json().data.id;

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: `/api/orders/${orderId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.items).toBeDefined();
      expect(body.data.items.length).toBe(1);
      expect(body.data.items[0].quantity).toBe(3);
    });

    it('403 si pas ma commande', async () => {
      await addToCart(ctx, token, product.id, 1);
      const checkoutRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/orders/checkout',
        headers: { authorization: `Bearer ${token}` },
      });
      const orderId = checkoutRes.json().data.id;

      const token2 = await getUserToken(ctx, 'other@test.com');
      const res = await ctx.fastify.inject({
        method: 'GET',
        url: `/api/orders/${orderId}`,
        headers: { authorization: `Bearer ${token2}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('404 si commande inexistante', async () => {
      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/orders/9999',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ========== CANCEL ==========

  describe('PATCH /api/orders/:id/cancel', () => {
    it('Annule une commande pending et rembourse le stock', async () => {
      await addToCart(ctx, token, product.id, 10);
      const checkoutRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/orders/checkout',
        headers: { authorization: `Bearer ${token}` },
      });
      const orderId = checkoutRes.json().data.id;

      const res = await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/cancel`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('cancelled');

      // Stock remboursé
      const productRes = await ctx.fastify.inject({
        method: 'GET',
        url: `/api/products/${product.id}`,
      });
      expect(productRes.json().data.stock).toBe(50); // retour à 50
    });

    it('400 si commande pas pending', async () => {
      await addToCart(ctx, token, product.id, 1);
      const checkoutRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/orders/checkout',
        headers: { authorization: `Bearer ${token}` },
      });
      const orderId = checkoutRes.json().data.id;

      // Passer en paid via admin
      const adminToken = await getAdminToken(ctx);
      await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/orders/admin/${orderId}/status`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: 'paid' },
      });

      const res = await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/orders/${orderId}/cancel`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ========== ADMIN ==========

  describe('PATCH /api/orders/admin/:id/status', () => {
    it('Admin change le status', async () => {
      await addToCart(ctx, token, product.id, 1);
      const checkoutRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/orders/checkout',
        headers: { authorization: `Bearer ${token}` },
      });
      const orderId = checkoutRes.json().data.id;

      const adminToken = await getAdminToken(ctx);
      const res = await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/orders/admin/${orderId}/status`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: 'paid' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('paid');
    });

    it('403 si non-admin', async () => {
      const res = await ctx.fastify.inject({
        method: 'PATCH',
        url: '/api/orders/admin/1/status',
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'paid' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('400 si status invalide', async () => {
      const adminToken = await getAdminToken(ctx);
      await addToCart(ctx, token, product.id, 1);
      const checkoutRes = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/orders/checkout',
        headers: { authorization: `Bearer ${token}` },
      });
      const orderId = checkoutRes.json().data.id;

      const res = await ctx.fastify.inject({
        method: 'PATCH',
        url: `/api/orders/admin/${orderId}/status`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: 'invalid_status' },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
