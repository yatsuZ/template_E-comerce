import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  TestContext,
  createTestContext,
  closeTestContext,
  createTestUser,
  createTestProduct,
  createTestCartItem,
} from '../helpers/test.helper.js';
import { I_User } from '../../backend/core/interfaces/user.interfaces.js';
import { I_Product } from '../../backend/core/interfaces/product.interfaces.js';

updateENV("debug");
Logger.debug("Test CartService", "Tests du service Cart avec validations et logique métier");

describe('CartService', () => {
  let ctx: TestContext;
  let user: I_User;
  let product: I_Product;

  beforeEach(async () => {
    ctx = createTestContext();
    user = await createTestUser(ctx.userService);
    product = createTestProduct(ctx.productService, 'Test Product', 9900, 50);
  });
  afterEach(() => { closeTestContext(ctx); });

  // ========== VALIDATION ==========

  describe('Validation', () => {
    it('Erreur si quantity <= 0', () => {
      expect(ctx.cartService.addToCart(user.id, product.id, 0).ok).toBe(false);
      expect(ctx.cartService.addToCart(user.id, product.id, -1).ok).toBe(false);
    });

    it('Erreur si quantity non entier', () => {
      const res = ctx.cartService.addToCart(user.id, product.id, 1.5);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });
  });

  // ========== ADD TO CART ==========

  describe('addToCart()', () => {
    it('Ajoute un produit au panier', () => {
      const res = ctx.cartService.addToCart(user.id, product.id, 3);
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.user_id).toBe(user.id);
      expect(res.data.product_id).toBe(product.id);
      expect(res.data.quantity).toBe(3);
    });

    it('Erreur si user inexistant', () => {
      const res = ctx.cartService.addToCart(9999, product.id, 1);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });

    it('Erreur si product inexistant', () => {
      const res = ctx.cartService.addToCart(user.id, 9999, 1);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });

    it('Erreur si stock insuffisant', () => {
      const res = ctx.cartService.addToCart(user.id, product.id, 999);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Si produit déjà dans panier → additionne la quantité', () => {
      ctx.cartService.addToCart(user.id, product.id, 3);
      const res = ctx.cartService.addToCart(user.id, product.id, 2);
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.quantity).toBe(5);
    });

    it('Erreur si quantité combinée dépasse le stock', () => {
      ctx.cartService.addToCart(user.id, product.id, 40);
      const res = ctx.cartService.addToCart(user.id, product.id, 20);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Ajoute plusieurs produits différents au panier', async () => {
      const product2 = createTestProduct(ctx.productService, 'Product 2', 5000, 30);
      ctx.cartService.addToCart(user.id, product.id, 2);
      ctx.cartService.addToCart(user.id, product2.id, 5);

      const cartRes = ctx.cartService.getCartByUserId(user.id);
      expect(cartRes.ok).toBe(true);
      if (cartRes.ok) expect(cartRes.data.length).toBe(2);
    });
  });

  // ========== READ ==========

  describe('getCartByUserId()', () => {
    it('Récupère les items du panier d\'un user', () => {
      const product2 = createTestProduct(ctx.productService, 'P2', 5000, 20);
      ctx.cartService.addToCart(user.id, product.id, 2);
      ctx.cartService.addToCart(user.id, product2.id, 1);

      const res = ctx.cartService.getCartByUserId(user.id);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.length).toBe(2);
        expect(res.data[0].user_id).toBe(user.id);
      }
    });

    it('Retourne liste vide si panier vide', () => {
      const res = ctx.cartService.getCartByUserId(user.id);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.length).toBe(0);
    });
  });

  describe('getCartItem()', () => {
    it('Récupère un item par ID', () => {
      const item = createTestCartItem(ctx.cartService, user.id, product.id, 3);
      const res = ctx.cartService.getCartItem(item.id);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.quantity).toBe(3);
    });

    it('Erreur si ID inexistant', () => {
      const res = ctx.cartService.getCartItem(9999);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });
  });

  // ========== UPDATE ==========

  describe('updateQuantity()', () => {
    it('Met à jour la quantité', () => {
      const item = createTestCartItem(ctx.cartService, user.id, product.id, 2);
      const res = ctx.cartService.updateQuantity(item.id, 10);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.quantity).toBe(10);
    });

    it('Erreur si quantité <= 0', () => {
      const item = createTestCartItem(ctx.cartService, user.id, product.id, 2);
      expect(ctx.cartService.updateQuantity(item.id, 0).ok).toBe(false);
      expect(ctx.cartService.updateQuantity(item.id, -5).ok).toBe(false);
    });

    it('Erreur si stock insuffisant', () => {
      const item = createTestCartItem(ctx.cartService, user.id, product.id, 2);
      const res = ctx.cartService.updateQuantity(item.id, 999);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Erreur si cart item inexistant', () => {
      const res = ctx.cartService.updateQuantity(9999, 5);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });
  });

  // ========== DELETE ==========

  describe('removeFromCart()', () => {
    it('Supprime un item du panier', () => {
      const item = createTestCartItem(ctx.cartService, user.id, product.id, 2);
      const res = ctx.cartService.removeFromCart(item.id);
      expect(res.ok).toBe(true);

      expect(ctx.cartService.getCartItem(item.id).ok).toBe(false);
    });

    it('Erreur si ID inexistant', () => {
      expect(ctx.cartService.removeFromCart(9999).ok).toBe(false);
    });
  });

  describe('clearCart()', () => {
    it('Vide tout le panier d\'un user', () => {
      const product2 = createTestProduct(ctx.productService, 'P2', 5000, 20);
      ctx.cartService.addToCart(user.id, product.id, 2);
      ctx.cartService.addToCart(user.id, product2.id, 1);

      const res = ctx.cartService.clearCart(user.id);
      expect(res.ok).toBe(true);

      const cart = ctx.cartService.getCartByUserId(user.id);
      expect(cart.ok).toBe(true);
      if (cart.ok) expect(cart.data.length).toBe(0);
    });

    it('OK si panier déjà vide', () => {
      const res = ctx.cartService.clearCart(user.id);
      expect(res.ok).toBe(true);
    });
  });
});
