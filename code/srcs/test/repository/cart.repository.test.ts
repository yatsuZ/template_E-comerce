import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from './../../backend/config/db.js';
import { CartRepository } from '../../backend/core/repositories/cart.repository.js';
import { UserRepository } from '../../backend/core/repositories/user.repository.js';
import { ProductRepository } from '../../backend/core/repositories/product.repository.js';
import { I_Cart } from '../../backend/core/interfaces/cart.interfaces.js';
import { Logger, updateENV } from '../../backend/utils/logger.js';

updateENV("debug");

const location = "Teste de Cart Repository";

Logger.debug(location, "Je dois tester Le reposotorie de Cart avec la bdd avec la methode CRUD")

function expectDateCloseToNow(dateValue: string | Date, toleranceMs = 5000) {
  const date = new Date(dateValue);
  const now = new Date();
  const diff = Math.abs(now.getTime() - date.getTime());
  expect(diff).toBeLessThan(toleranceMs);
}

function expectCartsEqual(actual: I_Cart, expected: Partial<I_Cart>) {
  expect(actual.id).toBe(expected.id);
  expect(actual.user_id).toBe(expected.user_id);
  expect(actual.product_id).toBe(expected.product_id);
  expect(actual.quantity).toBe(expected.quantity);
  expect(actual.price).toBe(expected.price);
}

describe('CartRepository', () => {
  let db: DatabaseManager;
  let cartRepo: CartRepository;
  let userRepo: UserRepository;
  let productRepo: ProductRepository;
  let userId: number;
  let productId: number;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    cartRepo = new CartRepository(db.getConnection());
    userRepo = new UserRepository(db.getConnection());
    productRepo = new ProductRepository(db.getConnection());

    // Créer un user et un product pour les tests
    const userRes = userRepo.create({
      email: 'cart_test@gmail.com',
      password: '123456',
      google_id: null,
      provider: 'local',
      is_admin: 0,
    });
    if (!userRes.ok) throw new Error('Failed to create test user');
    userId = userRes.data.id;

    const productRes = productRepo.create({
      name: 'Test Product',
      description: 'Product for cart testing',
      price: 1999,
      image: 'https://example.com/test.jpg',
      stock: 100,
    });
    if (!productRes.ok) throw new Error('Failed to create test product');
    productId = productRes.data.id;
  });

  afterEach(() => {
    db.close();
  });

  // -------------------
  // CREATE
  // -------------------

  it('Crée un item dans le panier → create()', () => {
    const res = cartRepo.create({
      user_id: userId,
      product_id: productId,
      quantity: 2,
      price: 1999,
    });

    if (!res.ok) {
      Logger.error(location, "Erreur create:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const cart = res.data;

    expectCartsEqual(cart, {
      id: 1,
      user_id: userId,
      product_id: productId,
      quantity: 2,
      price: 1999,
    });

    expectDateCloseToNow(cart.created_at);
    expectDateCloseToNow(cart.updated_at);
  });

  // -------------------
  // READ
  // -------------------

  it('Récupère un item du panier existant → findById()', () => {
    const created = cartRepo.create({
      user_id: userId,
      product_id: productId,
      quantity: 3,
      price: 1999,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const res = cartRepo.findById(created.data.id);
    if (!res.ok) {
      Logger.error(location, "Erreur findById:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.quantity).toBe(3);
  });

  it('Récupère les items du panier par userId → findByUserId()', () => {
    cartRepo.create({
      user_id: userId,
      product_id: productId,
      quantity: 1,
      price: 1999,
    });

    const res = cartRepo.findByUserId(userId);
    if (!res.ok) {
      Logger.error(location, "Erreur findByUserId:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.length).toBe(1);
    expect(res.data[0].user_id).toBe(userId);
  });

  it('Récupère les items du panier par productId → findByProductId()', () => {
    cartRepo.create({
      user_id: userId,
      product_id: productId,
      quantity: 1,
      price: 1999,
    });

    const res = cartRepo.findByProductId(productId);
    if (!res.ok) {
      Logger.error(location, "Erreur findByProductId:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.length).toBe(1);
    expect(res.data[0].product_id).toBe(productId);
  });

  it('Récupère un item par user et product → findOneByUserAndProduct()', () => {
    cartRepo.create({
      user_id: userId,
      product_id: productId,
      quantity: 5,
      price: 1999,
    });

    const res = cartRepo.findOneByUserAndProduct(userId, productId);
    if (!res.ok) {
      Logger.error(location, "Erreur findOneByUserAndProduct:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data).not.toBeNull();
    expect(res.data!.user_id).toBe(userId);
    expect(res.data!.product_id).toBe(productId);
    expect(res.data!.quantity).toBe(5);
  });

  it('Retourne null si user/product non trouvé → findOneByUserAndProduct()', () => {
    const res = cartRepo.findOneByUserAndProduct(9999, 9999);

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data).toBeNull();
  });

  // -------------------
  // UPDATE
  // -------------------

  it('Met à jour la quantité et updated_at → update()', async () => {
    const created = cartRepo.create({
      user_id: userId,
      product_id: productId,
      quantity: 2,
      price: 1999,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const before = created.data.updated_at;

    const updated = cartRepo.update(created.data.id, {
      quantity: 10,
      price: 1799,
    });

    if (!updated.ok) {
      Logger.error(location, "Erreur update:", updated.error);
    }
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.data.quantity).toBe(10);
    expect(updated.data.price).toBe(1799);
    expect(new Date(updated.data.updated_at).getTime())
      .toBeGreaterThanOrEqual(new Date(before).getTime());
  });

  // -------------------
  // DELETE
  // -------------------

  it('Supprime un item du panier → delete()', () => {
    const created = cartRepo.create({
      user_id: userId,
      product_id: productId,
      quantity: 1,
      price: 1999,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const del = cartRepo.delete(created.data.id);
    if (!del.ok) {
      Logger.error(location, "Erreur delete:", del.error);
    }
    expect(del.ok).toBe(true);

    const find = cartRepo.findById(created.data.id);
    expect(find.ok).toBe(false);
  });

  // -------------------
  // ERROR CASES
  // -------------------

  it('Erreur si ID inexistant → findById()', () => {
    const res = cartRepo.findById(9999);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });

  it('Retourne liste vide si userId inexistant → findByUserId()', () => {
    const res = cartRepo.findByUserId(9999);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.length).toBe(0);
    }
  });

  it('Retourne liste vide si productId inexistant → findByProductId()', () => {
    const res = cartRepo.findByProductId(9999);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.length).toBe(0);
    }
  });

  it('Erreur si ID inexistant → update()', () => {
    const res = cartRepo.update(9999, { quantity: 5 });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });

  it('Erreur si ID inexistant → delete()', () => {
    const res = cartRepo.delete(9999);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });
});
