import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  TestContext,
  createTestContext,
  closeTestContext,
  expectDateCloseToNow,
  createTestProduct,
} from '../helpers/test.helper.js';

updateENV("debug");
Logger.debug("Test ProductService", "Tests du service Product avec validations");

describe('ProductService', () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = createTestContext(); });
  afterEach(() => { closeTestContext(ctx); });

  // ========== CREATE ==========

  describe('createProduct()', () => {
    it('Crée un produit valide', () => {
      const res = ctx.productService.createProduct({
        name: 'iPhone 15',
        description: 'Dernier iPhone',
        price: 99900,
        image: 'https://example.com/iphone.jpg',
        stock: 50,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.name).toBe('iPhone 15');
      expect(res.data.price).toBe(99900);
      expect(res.data.stock).toBe(50);
      expectDateCloseToNow(res.data.created_at);
    });

    it('Crée un produit avec image null', () => {
      const res = ctx.productService.createProduct({
        name: 'Produit sans image',
        description: 'Test',
        price: 1000,
        image: null,
        stock: 10,
      });
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.image).toBeNull();
    });

    it('Erreur si prix négatif', () => {
      const res = ctx.productService.createProduct({
        name: 'Produit', description: 'Test', price: -100, image: null, stock: 10,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Erreur si stock négatif', () => {
      const res = ctx.productService.createProduct({
        name: 'Produit', description: 'Test', price: 1000, image: null, stock: -5,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Erreur si image URL invalide', () => {
      expect(ctx.productService.createProduct({
        name: 'P1', description: 'Test', price: 1000, image: 'not-a-url', stock: 10,
      }).ok).toBe(false);

      expect(ctx.productService.createProduct({
        name: 'P2', description: 'Test', price: 1000, image: 'https://example.com/file.pdf', stock: 10,
      }).ok).toBe(false);
    });

    it('Erreur si nom déjà existant', () => {
      ctx.productService.createProduct({
        name: 'Unique', description: 'Premier', price: 1000, image: null, stock: 10,
      });
      const res = ctx.productService.createProduct({
        name: 'Unique', description: 'Deuxième', price: 2000, image: null, stock: 20,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('CONFLICT');
    });
  });

  // ========== READ ==========

  describe('getById()', () => {
    it('Récupère un produit existant', () => {
      const product = createTestProduct(ctx.productService);
      const res = ctx.productService.getById(product.id);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.name).toBe('Test Product');
    });

    it('Erreur si ID inexistant', () => {
      const res = ctx.productService.getById(9999);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });
  });

  describe('getByName()', () => {
    it('Récupère un produit par nom', () => {
      createTestProduct(ctx.productService, 'MacBook Pro');
      const res = ctx.productService.getByName('MacBook Pro');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).not.toBeNull();
        expect(res.data!.name).toBe('MacBook Pro');
      }
    });

    it('Retourne null si nom inexistant', () => {
      const res = ctx.productService.getByName('Inexistant');
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data).toBeNull();
    });
  });

  describe('getAll()', () => {
    it('Récupère tous les produits', () => {
      createTestProduct(ctx.productService, 'P1');
      createTestProduct(ctx.productService, 'P2');
      createTestProduct(ctx.productService, 'P3');
      const res = ctx.productService.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.length).toBe(3);
    });

    it('Retourne liste vide si aucun produit', () => {
      const res = ctx.productService.getAll();
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.length).toBe(0);
    });
  });

  // ========== UPDATE ==========

  describe('updateProduct()', () => {
    it('Met à jour un produit', () => {
      const product = createTestProduct(ctx.productService);
      const res = ctx.productService.updateProduct(product.id, {
        description: 'Nouvelle description',
        price: 1500,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.description).toBe('Nouvelle description');
        expect(res.data.price).toBe(1500);
      }
    });

    it('Erreur si prix négatif ou ID inexistant', () => {
      const product = createTestProduct(ctx.productService);
      expect(ctx.productService.updateProduct(product.id, { price: -500 }).ok).toBe(false);
      expect(ctx.productService.updateProduct(9999, { price: 5000 }).ok).toBe(false);
    });
  });

  describe('updateStock()', () => {
    it('Met à jour le stock', () => {
      const product = createTestProduct(ctx.productService);
      const res = ctx.productService.updateStock(product.id, 50);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.stock).toBe(50);
    });

    it('Erreur si stock négatif', () => {
      const product = createTestProduct(ctx.productService);
      expect(ctx.productService.updateStock(product.id, -10).ok).toBe(false);
    });
  });

  describe('updatePrice()', () => {
    it('Met à jour le prix', () => {
      const product = createTestProduct(ctx.productService);
      const res = ctx.productService.updatePrice(product.id, 2500);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.price).toBe(2500);
    });
  });

  // ========== DELETE ==========

  describe('deleteProduct()', () => {
    it('Supprime un produit', () => {
      const product = createTestProduct(ctx.productService);
      const res = ctx.productService.deleteProduct(product.id);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data).toBe(true);
      expect(ctx.productService.getById(product.id).ok).toBe(false);
    });

    it('Erreur si ID inexistant', () => {
      expect(ctx.productService.deleteProduct(9999).ok).toBe(false);
    });
  });

  // ========== BUSINESS METHODS ==========

  describe('hasEnoughStock()', () => {
    it('Retourne true si stock suffisant', () => {
      const product = createTestProduct(ctx.productService, 'P', 9900, 50);
      const res = ctx.productService.hasEnoughStock(product.id, 30);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data).toBe(true);
    });

    it('Retourne false si stock insuffisant', () => {
      const product = createTestProduct(ctx.productService, 'P', 9900, 10);
      const res = ctx.productService.hasEnoughStock(product.id, 20);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data).toBe(false);
    });

    it('Erreur si produit inexistant', () => {
      expect(ctx.productService.hasEnoughStock(9999, 10).ok).toBe(false);
    });
  });

  describe('decrementStock()', () => {
    it('Décrémente le stock après achat', () => {
      const product = createTestProduct(ctx.productService, 'P', 9900, 50);
      const res = ctx.productService.decrementStock(product.id, 15);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.stock).toBe(35);
    });

    it('Erreur si stock insuffisant', () => {
      const product = createTestProduct(ctx.productService, 'P', 9900, 10);
      expect(ctx.productService.decrementStock(product.id, 20).ok).toBe(false);
    });

    it('Erreur si quantité <= 0', () => {
      const product = createTestProduct(ctx.productService);
      expect(ctx.productService.decrementStock(product.id, 0).ok).toBe(false);
      expect(ctx.productService.decrementStock(product.id, -5).ok).toBe(false);
    });
  });

  describe('incrementStock()', () => {
    it('Incrémente le stock après remboursement', () => {
      const product = createTestProduct(ctx.productService, 'P', 9900, 30);
      const res = ctx.productService.incrementStock(product.id, 10);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.stock).toBe(40);
    });

    it('Erreur si quantité <= 0', () => {
      const product = createTestProduct(ctx.productService);
      expect(ctx.productService.incrementStock(product.id, 0).ok).toBe(false);
      expect(ctx.productService.incrementStock(product.id, -5).ok).toBe(false);
    });
  });
});
