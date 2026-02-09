import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  TestContext,
  createTestContext,
  closeTestContext,
  createTestUser,
  createTestProduct,
  createTestCartItem,
  createTestOrder,
} from '../helpers/test.helper.js';
import { I_User } from '../../backend/core/interfaces/user.interfaces.js';
import { I_Product } from '../../backend/core/interfaces/product.interfaces.js';

updateENV("debug");
Logger.debug("Test OrderService", "Tests du service Order avec checkout et logique métier");

describe('OrderService', () => {
  let ctx: TestContext;
  let user: I_User;
  let product: I_Product;

  beforeEach(async () => {
    ctx = createTestContext();
    user = await createTestUser(ctx.userService);
    product = createTestProduct(ctx.productService, 'Test Product', 9900, 50);
  });
  afterEach(() => { closeTestContext(ctx); });

  // ========== CREATE ==========

  describe('createOrder()', () => {
    it('Crée une commande valide', () => {
      const res = ctx.orderService.createOrder(user.id, 29700);
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.user_id).toBe(user.id);
      expect(res.data.total).toBe(29700);
      expect(res.data.status).toBe('pending');
      expect(res.data.stripe_payment_id).toBeNull();
    });

    it('Erreur si total <= 0', () => {
      expect(ctx.orderService.createOrder(user.id, 0).ok).toBe(false);
      expect(ctx.orderService.createOrder(user.id, -100).ok).toBe(false);
    });

    it('Erreur si total non entier', () => {
      const res = ctx.orderService.createOrder(user.id, 99.5);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Erreur si user inexistant', () => {
      const res = ctx.orderService.createOrder(9999, 10000);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });
  });

  // ========== CHECKOUT ==========

  describe('checkout()', () => {
    it('Crée une commande à partir du panier', () => {
      createTestCartItem(ctx.cartService, user.id, product.id, 3);

      const res = ctx.orderService.checkout(user.id);
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      // Total = 3 * 9900 = 29700
      expect(res.data.total).toBe(29700);
      expect(res.data.status).toBe('pending');
      expect(res.data.user_id).toBe(user.id);
    });

    it('Crée les order items correspondants', () => {
      createTestCartItem(ctx.cartService, user.id, product.id, 3);

      const orderRes = ctx.orderService.checkout(user.id);
      expect(orderRes.ok).toBe(true);
      if (!orderRes.ok) return;

      const itemsRes = ctx.orderItemService.getByOrderId(orderRes.data.id);
      expect(itemsRes.ok).toBe(true);
      if (!itemsRes.ok) return;

      expect(itemsRes.data.length).toBe(1);
      expect(itemsRes.data[0].product_id).toBe(product.id);
      expect(itemsRes.data[0].quantity).toBe(3);
      expect(itemsRes.data[0].price).toBe(9900);
    });

    it('Décrémente le stock après checkout', () => {
      createTestCartItem(ctx.cartService, user.id, product.id, 10);

      ctx.orderService.checkout(user.id);

      const productRes = ctx.productService.getById(product.id);
      expect(productRes.ok).toBe(true);
      if (productRes.ok) expect(productRes.data.stock).toBe(40); // 50 - 10
    });

    it('Vide le panier après checkout', () => {
      createTestCartItem(ctx.cartService, user.id, product.id, 2);

      ctx.orderService.checkout(user.id);

      const cartRes = ctx.cartService.getCartByUserId(user.id);
      expect(cartRes.ok).toBe(true);
      if (cartRes.ok) expect(cartRes.data.length).toBe(0);
    });

    it('Checkout avec plusieurs produits', async () => {
      const product2 = createTestProduct(ctx.productService, 'Product 2', 5000, 20);
      createTestCartItem(ctx.cartService, user.id, product.id, 2);
      createTestCartItem(ctx.cartService, user.id, product2.id, 3);

      const res = ctx.orderService.checkout(user.id);
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      // Total = (2 * 9900) + (3 * 5000) = 19800 + 15000 = 34800
      expect(res.data.total).toBe(34800);

      // Vérifie les order items
      const itemsRes = ctx.orderItemService.getByOrderId(res.data.id);
      expect(itemsRes.ok).toBe(true);
      if (itemsRes.ok) expect(itemsRes.data.length).toBe(2);

      // Vérifie les stocks
      const p1 = ctx.productService.getById(product.id);
      if (p1.ok) expect(p1.data.stock).toBe(48); // 50 - 2
      const p2 = ctx.productService.getById(product2.id);
      if (p2.ok) expect(p2.data.stock).toBe(17); // 20 - 3
    });

    it('Erreur si panier vide', () => {
      const res = ctx.orderService.checkout(user.id);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Erreur si user inexistant', () => {
      const res = ctx.orderService.checkout(9999);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });

    it('Erreur si stock insuffisant au moment du checkout', () => {
      // Stock = 50, on met 50 dans le panier
      createTestCartItem(ctx.cartService, user.id, product.id, 50);

      // On réduit le stock entre-temps
      ctx.productService.updateStock(product.id, 5);

      const res = ctx.orderService.checkout(user.id);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });
  });

  // ========== READ ==========

  describe('getOrderById()', () => {
    it('Récupère une commande par ID', () => {
      const order = createTestOrder(ctx.orderService, user.id, 15000);
      const res = ctx.orderService.getOrderById(order.id);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.total).toBe(15000);
        expect(res.data.user_id).toBe(user.id);
      }
    });

    it('Erreur si ID inexistant', () => {
      const res = ctx.orderService.getOrderById(9999);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });
  });

  describe('getOrdersByUserId()', () => {
    it('Récupère les commandes d\'un user', () => {
      createTestOrder(ctx.orderService, user.id, 10000);
      createTestOrder(ctx.orderService, user.id, 20000);

      const res = ctx.orderService.getOrdersByUserId(user.id);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.length).toBe(2);
    });

    it('Retourne liste vide si aucune commande', () => {
      const res = ctx.orderService.getOrdersByUserId(user.id);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.length).toBe(0);
    });
  });

  // ========== UPDATE ==========

  describe('updateStatus()', () => {
    it('Met à jour le status vers paid', () => {
      const order = createTestOrder(ctx.orderService, user.id);
      const res = ctx.orderService.updateStatus(order.id, 'paid');
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.status).toBe('paid');
    });

    it('Met à jour le status vers shipped', () => {
      const order = createTestOrder(ctx.orderService, user.id);
      const res = ctx.orderService.updateStatus(order.id, 'shipped');
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.status).toBe('shipped');
    });

    it('Met à jour le status vers delivered', () => {
      const order = createTestOrder(ctx.orderService, user.id);
      const res = ctx.orderService.updateStatus(order.id, 'delivered');
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.status).toBe('delivered');
    });

    it('Erreur si commande inexistante', () => {
      const res = ctx.orderService.updateStatus(9999, 'paid');
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });
  });

  describe('updateStripePaymentId()', () => {
    it('Met à jour le stripe_payment_id', () => {
      const order = createTestOrder(ctx.orderService, user.id);
      const res = ctx.orderService.updateStripePaymentId(order.id, 'pi_123456789');
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.stripe_payment_id).toBe('pi_123456789');
    });

    it('Erreur si commande inexistante', () => {
      const res = ctx.orderService.updateStripePaymentId(9999, 'pi_123');
      expect(res.ok).toBe(false);
    });
  });

  // ========== CANCEL ==========

  describe('cancelOrder()', () => {
    it('Annule une commande pending et rembourse le stock', () => {
      createTestCartItem(ctx.cartService, user.id, product.id, 10);
      const orderRes = ctx.orderService.checkout(user.id);
      expect(orderRes.ok).toBe(true);
      if (!orderRes.ok) return;

      // Stock après checkout : 50 - 10 = 40
      const stockBefore = ctx.productService.getById(product.id);
      if (stockBefore.ok) expect(stockBefore.data.stock).toBe(40);

      const cancelRes = ctx.orderService.cancelOrder(orderRes.data.id);
      expect(cancelRes.ok).toBe(true);
      if (cancelRes.ok) expect(cancelRes.data.status).toBe('cancelled');

      // Stock après annulation : 40 + 10 = 50
      const stockAfter = ctx.productService.getById(product.id);
      if (stockAfter.ok) expect(stockAfter.data.stock).toBe(50);
    });

    it('Erreur si commande pas pending', () => {
      const order = createTestOrder(ctx.orderService, user.id);
      ctx.orderService.updateStatus(order.id, 'paid');

      const res = ctx.orderService.cancelOrder(order.id);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Erreur si commande inexistante', () => {
      const res = ctx.orderService.cancelOrder(9999);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });
  });

  // ========== DELETE ==========

  describe('deleteOrder()', () => {
    it('Supprime une commande', () => {
      const order = createTestOrder(ctx.orderService, user.id);
      const res = ctx.orderService.deleteOrder(order.id);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data).toBe(true);

      expect(ctx.orderService.getOrderById(order.id).ok).toBe(false);
    });

    it('Erreur si ID inexistant', () => {
      expect(ctx.orderService.deleteOrder(9999).ok).toBe(false);
    });
  });
});
