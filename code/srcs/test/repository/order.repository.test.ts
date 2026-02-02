import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from './../../backend/config/db.js';
import { OrderRepository } from '../../backend/core/repositories/order.repository.js';
import { UserRepository } from '../../backend/core/repositories/user.repository.js';
import { I_Order } from '../../backend/core/interfaces/order.interfaces.js';
import { Logger, updateENV } from '../../backend/utils/logger.js';

updateENV("debug");

const location = "Teste de Order Repository";

Logger.debug(location, "Je dois tester Le reposotorie de Order avec la bdd avec la methode CRUD")

function expectDateCloseToNow(dateValue: string | Date, toleranceMs = 5000) {
  const date = new Date(dateValue);
  const now = new Date();
  const diff = Math.abs(now.getTime() - date.getTime());
  expect(diff).toBeLessThan(toleranceMs);
}

function expectOrdersEqual(actual: I_Order, expected: Partial<I_Order>) {
  expect(actual.id).toBe(expected.id);
  expect(actual.user_id).toBe(expected.user_id);
  expect(actual.total).toBe(expected.total);
  expect(actual.status).toBe(expected.status);
  expect(actual.stripe_payment_id).toBe(expected.stripe_payment_id);
}

describe('OrderRepository', () => {
  let db: DatabaseManager;
  let orderRepo: OrderRepository;
  let userRepo: UserRepository;
  let userId: number;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    orderRepo = new OrderRepository(db.getConnection());
    userRepo = new UserRepository(db.getConnection());

    // Créer un user pour les tests
    const userRes = userRepo.create({
      email: 'order_test@gmail.com',
      password: '123456',
      google_id: null,
      provider: 'local',
      is_admin: 0,
    });
    if (!userRes.ok) throw new Error('Failed to create test user');
    userId = userRes.data.id;
  });

  afterEach(() => {
    db.close();
  });

  // -------------------
  // CREATE
  // -------------------

  it('Crée une commande → create()', () => {
    const res = orderRepo.create({
      user_id: userId,
      total: 15999,
    });

    if (!res.ok) {
      Logger.error(location, "Erreur create:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const order = res.data;

    expectOrdersEqual(order, {
      id: 1,
      user_id: userId,
      total: 15999,
      status: 'pending',
      stripe_payment_id: null,
    });

    expectDateCloseToNow(order.created_at);
    expectDateCloseToNow(order.updated_at);
  });

  // -------------------
  // READ
  // -------------------

  it('Récupère une commande existante → findById()', () => {
    const created = orderRepo.create({
      user_id: userId,
      total: 29999,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const res = orderRepo.findById(created.data.id);
    if (!res.ok) {
      Logger.error(location, "Erreur findById:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.total).toBe(29999);
  });

  it('Récupère les commandes par userId → findByUserId()', () => {
    orderRepo.create({
      user_id: userId,
      total: 10000,
    });
    orderRepo.create({
      user_id: userId,
      total: 20000,
    });

    const res = orderRepo.findByUserId(userId);
    if (!res.ok) {
      Logger.error(location, "Erreur findByUserId:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.length).toBe(2);
    expect(res.data[0].user_id).toBe(userId);
    expect(res.data[1].user_id).toBe(userId);
  });

  // -------------------
  // UPDATE
  // -------------------

  it('Met à jour le status et updated_at → update()', async () => {
    const created = orderRepo.create({
      user_id: userId,
      total: 5000,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const before = created.data.updated_at;

    const updated = orderRepo.update(created.data.id, {
      status: 'paid',
      stripe_payment_id: 'pi_123456789',
    });

    if (!updated.ok) {
      Logger.error(location, "Erreur update:", updated.error);
    }
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.data.status).toBe('paid');
    expect(updated.data.stripe_payment_id).toBe('pi_123456789');
    expect(new Date(updated.data.updated_at).getTime())
      .toBeGreaterThanOrEqual(new Date(before).getTime());
  });

  it('Met à jour le status vers shipped → update()', () => {
    const created = orderRepo.create({
      user_id: userId,
      total: 7500,
    });
    if (!created.ok) throw new Error();

    const updated = orderRepo.update(created.data.id, {
      status: 'shipped',
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.data.status).toBe('shipped');
  });

  it('Met à jour le status vers delivered → update()', () => {
    const created = orderRepo.create({
      user_id: userId,
      total: 12000,
    });
    if (!created.ok) throw new Error();

    const updated = orderRepo.update(created.data.id, {
      status: 'delivered',
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.data.status).toBe('delivered');
  });

  // -------------------
  // DELETE
  // -------------------

  it('Supprime une commande → delete()', () => {
    const created = orderRepo.create({
      user_id: userId,
      total: 3000,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const del = orderRepo.delete(created.data.id);
    if (!del.ok) {
      Logger.error(location, "Erreur delete:", del.error);
    }
    expect(del.ok).toBe(true);

    const find = orderRepo.findById(created.data.id);
    expect(find.ok).toBe(false);
  });

  // -------------------
  // ERROR CASES
  // -------------------

  it('Erreur si ID inexistant → findById()', () => {
    const res = orderRepo.findById(9999);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });

  it('Retourne liste vide si userId inexistant → findByUserId()', () => {
    const res = orderRepo.findByUserId(9999);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.length).toBe(0);
    }
  });

  it('Erreur si ID inexistant → update()', () => {
    const res = orderRepo.update(9999, { status: 'paid' });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });

  it('Erreur si ID inexistant → delete()', () => {
    const res = orderRepo.delete(9999);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });
});
