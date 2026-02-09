import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  TestContext,
  createTestContext,
  closeTestContext,
  createTestUser,
  createTestProduct,
  createTestOrder,
  createTestOrderItem,
} from '../helpers/test.helper.js';
import { I_User } from '../../backend/core/interfaces/user.interfaces.js';
import { I_Product } from '../../backend/core/interfaces/product.interfaces.js';
import { I_Order } from '../../backend/core/interfaces/order.interfaces.js';

updateENV("debug");
Logger.debug("Test OrderItemService", "Tests du service OrderItem avec validations");

describe('OrderItemService', () => {
  let ctx: TestContext;
  let user: I_User;
  let product: I_Product;
  let order: I_Order;

  beforeEach(async () => {
    ctx = createTestContext();
    user = await createTestUser(ctx.userService);
    product = createTestProduct(ctx.productService, 'Test Product', 9900, 50);
    order = createTestOrder(ctx.orderService, user.id, 29700);
  });
  afterEach(() => { closeTestContext(ctx); });

  // ========== CREATE ==========

  describe('createItem()', () => {
    it('Crée un order item valide', () => {
      const res = ctx.orderItemService.createItem({
        order_id: order.id,
        product_id: product.id,
        quantity: 3,
        price: 9900,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.order_id).toBe(order.id);
      expect(res.data.product_id).toBe(product.id);
      expect(res.data.quantity).toBe(3);
      expect(res.data.price).toBe(9900);
    });

    it('Accepte un prix de 0 (produit gratuit)', () => {
      const res = ctx.orderItemService.createItem({
        order_id: order.id,
        product_id: product.id,
        quantity: 1,
        price: 0,
      });
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.price).toBe(0);
    });

    it('Erreur si quantity <= 0', () => {
      expect(ctx.orderItemService.createItem({
        order_id: order.id, product_id: product.id, quantity: 0, price: 9900,
      }).ok).toBe(false);

      expect(ctx.orderItemService.createItem({
        order_id: order.id, product_id: product.id, quantity: -1, price: 9900,
      }).ok).toBe(false);
    });

    it('Erreur si quantity non entier', () => {
      const res = ctx.orderItemService.createItem({
        order_id: order.id, product_id: product.id, quantity: 1.5, price: 9900,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Erreur si price négatif', () => {
      const res = ctx.orderItemService.createItem({
        order_id: order.id, product_id: product.id, quantity: 1, price: -100,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Erreur si price non entier', () => {
      const res = ctx.orderItemService.createItem({
        order_id: order.id, product_id: product.id, quantity: 1, price: 99.5,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });
  });

  // ========== READ ==========

  describe('getById()', () => {
    it('Récupère un order item par ID', () => {
      const item = createTestOrderItem(ctx.orderItemService, order.id, product.id, 2, 9900);
      const res = ctx.orderItemService.getById(item.id);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.quantity).toBe(2);
        expect(res.data.price).toBe(9900);
      }
    });

    it('Erreur si ID inexistant', () => {
      const res = ctx.orderItemService.getById(9999);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });
  });

  describe('getByOrderId()', () => {
    it('Récupère les items d\'une commande', () => {
      const product2 = createTestProduct(ctx.productService, 'P2', 5000, 30);
      createTestOrderItem(ctx.orderItemService, order.id, product.id, 2, 9900);
      createTestOrderItem(ctx.orderItemService, order.id, product2.id, 1, 5000);

      const res = ctx.orderItemService.getByOrderId(order.id);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.length).toBe(2);
    });

    it('Retourne liste vide si aucun item', () => {
      const res = ctx.orderItemService.getByOrderId(order.id);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.length).toBe(0);
    });
  });

  describe('getByProductId()', () => {
    it('Récupère les items par produit', () => {
      createTestOrderItem(ctx.orderItemService, order.id, product.id, 3, 9900);

      const res = ctx.orderItemService.getByProductId(product.id);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.length).toBe(1);
        expect(res.data[0].product_id).toBe(product.id);
      }
    });

    it('Retourne liste vide si aucun item pour ce produit', () => {
      const res = ctx.orderItemService.getByProductId(9999);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.length).toBe(0);
    });
  });

  // ========== DELETE ==========

  describe('deleteItem()', () => {
    it('Supprime un order item', () => {
      const item = createTestOrderItem(ctx.orderItemService, order.id, product.id, 1, 9900);
      const res = ctx.orderItemService.deleteItem(item.id);
      expect(res.ok).toBe(true);

      expect(ctx.orderItemService.getById(item.id).ok).toBe(false);
    });

    it('Erreur si ID inexistant', () => {
      expect(ctx.orderItemService.deleteItem(9999).ok).toBe(false);
    });
  });
});
