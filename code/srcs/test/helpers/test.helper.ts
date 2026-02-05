import { expect } from 'vitest';
import { DatabaseManager } from '../../backend/config/db.js';
import { UserRepository } from '../../backend/core/repositories/user.repository.js';
import { ProductRepository } from '../../backend/core/repositories/product.repository.js';
import { CartRepository } from '../../backend/core/repositories/cart.repository.js';
import { OrderRepository } from '../../backend/core/repositories/order.repository.js';
import { OrderItemsRepository } from '../../backend/core/repositories/order_items.repository.js';
import { UserService } from '../../backend/core/services/user.service.js';
import { ProductService } from '../../backend/core/services/products.service.js';

// ========== ASSERTIONS ==========

/**
 * Vérifie qu'une date est proche de maintenant (dans la tolérance)
 */
export function expectDateCloseToNow(dateValue: string | Date, toleranceMs = 5000) {
  const date = new Date(dateValue);
  const now = new Date();
  const diff = Math.abs(now.getTime() - date.getTime());
  expect(diff).toBeLessThan(toleranceMs);
}

// ========== DATABASE SETUP ==========

export interface TestContext {
  db: DatabaseManager;
  // Repositories
  userRepo: UserRepository;
  productRepo: ProductRepository;
  cartRepo: CartRepository;
  orderRepo: OrderRepository;
  orderItemsRepo: OrderItemsRepository;
  // Services
  userService: UserService;
  productService: ProductService;
}

/**
 * Crée une BDD en mémoire avec tous les repos et services
 */
export function createTestContext(): TestContext {
  const db = new DatabaseManager(':memory:');
  const conn = db.getConnection();

  // Repositories
  const userRepo = new UserRepository(conn);
  const productRepo = new ProductRepository(conn);
  const cartRepo = new CartRepository(conn);
  const orderRepo = new OrderRepository(conn);
  const orderItemsRepo = new OrderItemsRepository(conn);

  // Services
  const userService = new UserService(userRepo);
  const productService = new ProductService(productRepo);

  return {
    db,
    userRepo,
    productRepo,
    cartRepo,
    orderRepo,
    orderItemsRepo,
    userService,
    productService,
  };
}

/**
 * Ferme la connexion BDD
 */
export function closeTestContext(ctx: TestContext) {
  ctx.db.close();
}

// ========== DATA FACTORIES ==========

/**
 * Crée un user de test rapidement
 */
export async function createTestUser(
  service: UserService,
  email = 'test@example.com',
  password = 'password123'
) {
  const res = await service.createUser(email, password);
  if (!res.ok) throw new Error(`Failed to create test user: ${res.error.message}`);
  return res.data;
}

/**
 * Crée un admin de test rapidement
 */
export async function createTestAdmin(
  service: UserService,
  email = 'admin@example.com',
  password = 'adminpass'
) {
  const res = await service.createAdmin(email, password);
  if (!res.ok) throw new Error(`Failed to create test admin: ${res.error.message}`);
  return res.data;
}

/**
 * Crée un produit de test rapidement
 */
export function createTestProduct(
  service: ProductService,
  name = 'Test Product',
  price = 9900,
  stock = 100
) {
  const res = service.createProduct({
    name,
    description: `Description for ${name}`,
    price,
    image: null,
    stock,
  });
  if (!res.ok) throw new Error(`Failed to create test product: ${res.error.message}`);
  return res.data;
}

/**
 * Crée un user via repository (sans hash, pour tests repo)
 */
export function createTestUserRaw(repo: UserRepository, email = 'test@example.com') {
  const res = repo.create({
    email,
    password: 'raw_password',
    google_id: null,
    provider: 'local',
    is_admin: 0,
  });
  if (!res.ok) throw new Error(`Failed to create test user: ${res.error.message}`);
  return res.data;
}

/**
 * Crée un produit via repository (pour tests repo)
 */
export function createTestProductRaw(repo: ProductRepository, name = 'Test Product') {
  const res = repo.create({
    name,
    description: `Description for ${name}`,
    price: 9900,
    image: null,
    stock: 100,
  });
  if (!res.ok) throw new Error(`Failed to create test product: ${res.error.message}`);
  return res.data;
}
