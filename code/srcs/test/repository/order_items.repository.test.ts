import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from './../../backend/config/db.js';
import { OrderItemssRepository } from '../../backend/core/repositories/order_items.repository.js';
import { OrderRepository } from '../../backend/core/repositories/order.repository.js';
import { UserRepository } from '../../backend/core/repositories/user.repository.js';
import { ProductRepository } from '../../backend/core/repositories/product.repository.js';
import { I_OrderItems } from '../../backend/core/interfaces/order_items.interfaces.js';
import { Logger, updateENV } from '../../backend/utils/logger.js';

updateENV("debug");

const location = "Teste de OrderItems Repository";

Logger.debug(location, "Je dois tester Le reposotorie de OrderItems avec la bdd avec la methode CRUD")

function expectDateCloseToNow(dateValue: string | Date, toleranceMs = 5000) {
  const date = new Date(dateValue);
  const now = new Date();
  const diff = Math.abs(now.getTime() - date.getTime());
  expect(diff).toBeLessThan(toleranceMs);
}

function expectOrderItemsEqual(actual: I_OrderItems, expected: Partial<I_OrderItems>) {
  expect(actual.id).toBe(expected.id);
  expect(actual.order_id).toBe(expected.order_id);
  expect(actual.product_id).toBe(expected.product_id);
  expect(actual.quantity).toBe(expected.quantity);
  expect(actual.price).toBe(expected.price);
}

describe('OrderItemsRepository', () => {
  let db: DatabaseManager;
  let orderItemsRepo: OrderItemssRepository;
  let orderRepo: OrderRepository;
  let userRepo: UserRepository;
  let productRepo: ProductRepository;
  let orderId: number;
  let productId: number;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    orderItemsRepo = new OrderItemssRepository(db.getConnection());
    orderRepo = new OrderRepository(db.getConnection());
    userRepo = new UserRepository(db.getConnection());
    productRepo = new ProductRepository(db.getConnection());

    // Créer un user pour les tests
    const userRes = userRepo.create({
      email: 'orderitems_test@gmail.com',
      password: '123456',
      google_id: null,
      provider: 'local',
      is_admin: 0,
    });
    if (!userRes.ok) throw new Error('Failed to create test user');

    // Créer une commande pour les tests
    const orderRes = orderRepo.create({
      user_id: userRes.data.id,
      total: 50000,
    });
    if (!orderRes.ok) throw new Error('Failed to create test order');
    orderId = orderRes.data.id;

    // Créer un produit pour les tests
    const productRes = productRepo.create({
      name: 'Test Product for OrderItems',
      description: 'Product for order items testing',
      price: 2500,
      image: 'https://example.com/product.jpg',
      stock: 50,
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

  it('Crée un item de commande → create()', () => {
    const res = orderItemsRepo.create({
      order_id: orderId,
      product_id: productId,
      quantity: 3,
      price: 2500,
    });

    if (!res.ok) {
      Logger.error(location, "Erreur create:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const orderItem = res.data;

    expectOrderItemsEqual(orderItem, {
      id: 1,
      order_id: orderId,
      product_id: productId,
      quantity: 3,
      price: 2500,
    });

    expectDateCloseToNow(orderItem.created_at);
    expectDateCloseToNow(orderItem.updated_at);
  });

  // -------------------
  // READ
  // -------------------

  it('Récupère un item de commande existant → findById()', () => {
    const created = orderItemsRepo.create({
      order_id: orderId,
      product_id: productId,
      quantity: 2,
      price: 2500,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const res = orderItemsRepo.findById(created.data.id);
    if (!res.ok) {
      Logger.error(location, "Erreur findById:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.quantity).toBe(2);
  });

  it('Récupère les items de commande par productId → findByProductId()', () => {
    orderItemsRepo.create({
      order_id: orderId,
      product_id: productId,
      quantity: 1,
      price: 2500,
    });

    const res = orderItemsRepo.findByProductId(productId);
    if (!res.ok) {
      Logger.error(location, "Erreur findByProductId:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.length).toBe(1);
    expect(res.data[0].product_id).toBe(productId);
  });

  // -------------------
  // UPDATE (should throw error - immutable)
  // -------------------

  it('Erreur si tentative de mise à jour → update() (immutable)', () => {
    const created = orderItemsRepo.create({
      order_id: orderId,
      product_id: productId,
      quantity: 1,
      price: 2500,
    });
    if (!created.ok) throw new Error();

    expect(() => {
      orderItemsRepo.update();
    }).toThrow('order_items is immutable');
  });

  // -------------------
  // DELETE
  // -------------------

  it('Supprime un item de commande → delete()', () => {
    const created = orderItemsRepo.create({
      order_id: orderId,
      product_id: productId,
      quantity: 1,
      price: 2500,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const del = orderItemsRepo.delete(created.data.id);
    if (!del.ok) {
      Logger.error(location, "Erreur delete:", del.error);
    }
    expect(del.ok).toBe(true);

    const find = orderItemsRepo.findById(created.data.id);
    expect(find.ok).toBe(false);
  });

  // -------------------
  // ERROR CASES
  // -------------------

  it('Erreur si ID inexistant → findById()', () => {
    const res = orderItemsRepo.findById(9999);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });

  it('Retourne liste vide si productId inexistant → findByProductId()', () => {
    const res = orderItemsRepo.findByProductId(9999);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.length).toBe(0);
    }
  });

  it('Erreur si ID inexistant → delete()', () => {
    const res = orderItemsRepo.delete(9999);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });
});
