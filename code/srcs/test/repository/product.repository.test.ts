import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from './../../backend/config/db.js';
import { ProductRepository } from '../../backend/core/repositories/product.repository.js';
import { I_Product } from '../../backend/core/interfaces/product.interfaces.js';
import { Logger, updateENV } from '../../backend/utils/logger.js';

updateENV("debug");

const location = "Teste de Product Repository";

Logger.debug(location, "Je dois tester Le reposotorie de Product avec la bdd avec la methode CRUD")

function expectDateCloseToNow(dateValue: string | Date, toleranceMs = 5000) {
  const date = new Date(dateValue);
  const now = new Date();
  const diff = Math.abs(now.getTime() - date.getTime());
  expect(diff).toBeLessThan(toleranceMs);
}

function expectProductsEqual(actual: I_Product, expected: Partial<I_Product>) {
  expect(actual.id).toBe(expected.id);
  expect(actual.name).toBe(expected.name);
  expect(actual.description).toBe(expected.description);
  expect(actual.price).toBe(expected.price);
  expect(actual.image).toBe(expected.image);
  expect(actual.stock).toBe(expected.stock);
}

describe('ProductRepository', () => {
  let db: DatabaseManager;
  let productRepo: ProductRepository;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    productRepo = new ProductRepository(db.getConnection());
  });

  afterEach(() => {
    db.close();
  });

  // -------------------
  // CREATE
  // -------------------

  it('Crée un produit → create()', () => {
    const res = productRepo.create({
      name: 'iPhone 15',
      description: 'Dernier iPhone Apple',
      price: 99900,
      image: 'https://example.com/iphone.jpg',
      stock: 50,
    });

    if (!res.ok) {
      Logger.error(location, "Erreur create:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const product = res.data;

    expectProductsEqual(product, {
      id: 1,
      name: 'iPhone 15',
      description: 'Dernier iPhone Apple',
      price: 99900,
      image: 'https://example.com/iphone.jpg',
      stock: 50,
    });

    expectDateCloseToNow(product.created_at);
    expectDateCloseToNow(product.updated_at);
  });

  // -------------------
  // READ
  // -------------------

  it('Récupère un produit existant → findById()', () => {
    const created = productRepo.create({
      name: 'MacBook Pro',
      description: 'Ordinateur portable Apple',
      price: 199900,
      image: 'https://example.com/macbook.jpg',
      stock: 30,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const res = productRepo.findById(created.data.id);
    if (!res.ok) {
      Logger.error(location, "Erreur findById:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.name).toBe('MacBook Pro');
  });

  it('Récupère un produit par nom → findOneByName()', () => {
    productRepo.create({
      name: 'AirPods Pro',
      description: 'Ecouteurs sans fil Apple',
      price: 27900,
      image: 'https://example.com/airpods.jpg',
      stock: 100,
    });

    const res = productRepo.findOneByName('AirPods Pro');
    if (!res.ok) {
      Logger.error(location, "Erreur findOneByName:", res.error);
    }
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.length).toBe(1);
    expect(res.data[0].name).toBe('AirPods Pro');
  });

  // -------------------
  // UPDATE
  // -------------------

  it('Met à jour le prix et updated_at → update()', async () => {
    const created = productRepo.create({
      name: 'iPad',
      description: 'Tablette Apple',
      price: 44900,
      image: 'https://example.com/ipad.jpg',
      stock: 40,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const before = created.data.updated_at;

    const updated = productRepo.update(created.data.id, {
      price: 39900,
      stock: 35,
    });

    if (!updated.ok) {
      Logger.error(location, "Erreur update:", updated.error);
    }
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.data.price).toBe(39900);
    expect(updated.data.stock).toBe(35);
    expect(new Date(updated.data.updated_at).getTime())
      .toBeGreaterThanOrEqual(new Date(before).getTime());
  });

  // -------------------
  // DELETE
  // -------------------

  it('Supprime un produit → delete()', () => {
    const created = productRepo.create({
      name: 'Apple Watch',
      description: 'Montre connectée Apple',
      price: 45900,
      image: 'https://example.com/watch.jpg',
      stock: 25,
    });
    if (!created.ok) {
      Logger.error(location, "Erreur create:", created.error);
      throw new Error();
    }

    const del = productRepo.delete(created.data.id);
    if (!del.ok) {
      Logger.error(location, "Erreur delete:", del.error);
    }
    expect(del.ok).toBe(true);

    const find = productRepo.findById(created.data.id);
    expect(find.ok).toBe(false);
  });

  // -------------------
  // ERROR CASES
  // -------------------

  it('Erreur si nom déjà existant → create()', () => {
    const first = productRepo.create({
      name: 'Produit Unique',
      description: 'Description 1',
      price: 1000,
      image: 'https://example.com/img1.jpg',
      stock: 10,
    });
    expect(first.ok).toBe(true);

    const second = productRepo.create({
      name: 'Produit Unique',
      description: 'Description 2',
      price: 2000,
      image: 'https://example.com/img2.jpg',
      stock: 20,
    });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.type).toBe('CONFLICT');
    }
  });

  it('Erreur si ID inexistant → findById()', () => {
    const res = productRepo.findById(9999);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });

  it('Retourne liste vide si nom inexistant → findOneByName()', () => {
    const res = productRepo.findOneByName('Produit Inexistant');

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.length).toBe(0);
    }
  });

  it('Erreur si ID inexistant → update()', () => {
    const res = productRepo.update(9999, { price: 5000 });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });

  it('Erreur si ID inexistant → delete()', () => {
    const res = productRepo.delete(9999);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.type).toBe('NOT_FOUND');
    }
  });
});
