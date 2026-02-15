import { expect } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { DatabaseManager } from '../../backend/config/db.js';
import { UserRepository } from '../../backend/core/repositories/user.repository.js';
import { ProductRepository } from '../../backend/core/repositories/product.repository.js';
import { CartRepository } from '../../backend/core/repositories/cart.repository.js';
import { OrderRepository } from '../../backend/core/repositories/order.repository.js';
import { OrderItemsRepository } from '../../backend/core/repositories/order_items.repository.js';
import { ArticleRepository } from '../../backend/core/repositories/article.repository.js';
import { UserService } from '../../backend/core/services/user.service.js';
import { ProductService } from '../../backend/core/services/products.service.js';
import { CartService } from '../../backend/core/services/cart.service.js';
import { OrderService } from '../../backend/core/services/order.service.js';
import { OrderItemService } from '../../backend/core/services/order_items.service.js';
import { AuthService } from '../../backend/core/services/auth.service.js';
import { StatsService } from '../../backend/core/services/stats.service.js';
import { ArticleService } from '../../backend/core/services/article.service.js';
import { setupRoutes } from '../../backend/routes/index.js';

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
  articleRepo: ArticleRepository;
  // Services
  userService: UserService;
  productService: ProductService;
  cartService: CartService;
  orderService: OrderService;
  orderItemService: OrderItemService;
  authService: AuthService;
  statsService: StatsService;
  articleService: ArticleService;
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
  const articleRepo = new ArticleRepository(conn);

  // Services
  const userService = new UserService(userRepo);
  const productService = new ProductService(productRepo);
  const cartService = new CartService(cartRepo, productService, userService);
  const orderItemService = new OrderItemService(orderItemsRepo);
  const orderService = new OrderService(orderRepo, orderItemService, cartService, productService, userService);
  const authService = new AuthService(userService);
  const statsService = new StatsService(conn);
  const articleService = new ArticleService(articleRepo);

  return {
    db,
    userRepo,
    productRepo,
    cartRepo,
    orderRepo,
    orderItemsRepo,
    articleRepo,
    userService,
    productService,
    cartService,
    orderService,
    orderItemService,
    authService,
    statsService,
    articleService,
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

/**
 * Ajoute un produit au panier de test
 */
export function createTestCartItem(
  service: CartService,
  userId: number,
  productId: number,
  quantity = 1
) {
  const res = service.addToCart(userId, productId, quantity);
  if (!res.ok) throw new Error(`Failed to create test cart item: ${res.error.message}`);
  return res.data;
}

/**
 * Crée une commande de test (simple, sans checkout)
 */
export function createTestOrder(
  service: OrderService,
  userId: number,
  total = 10000
) {
  const res = service.createOrder(userId, total);
  if (!res.ok) throw new Error(`Failed to create test order: ${res.error.message}`);
  return res.data;
}

/**
 * Crée un order item de test
 */
export function createTestOrderItem(
  service: OrderItemService,
  orderId: number,
  productId: number,
  quantity = 1,
  price = 9900
) {
  const res = service.createItem({ order_id: orderId, product_id: productId, quantity, price });
  if (!res.ok) throw new Error(`Failed to create test order item: ${res.error.message}`);
  return res.data;
}

// ========== API TEST CONTEXT ==========

export interface ApiTestContext extends TestContext {
  fastify: FastifyInstance;
}

/**
 * Crée un contexte de test API avec une instance Fastify + BDD en mémoire
 */
export async function createApiTestContext(): Promise<ApiTestContext> {
  const ctx = createTestContext();

  const fastify = Fastify({ logger: false });
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyMultipart, { limits: { fileSize: 5 * 1024 * 1024 } });
  fastify.decorate('authService', ctx.authService);
  fastify.decorate('userService', ctx.userService);
  fastify.decorate('productService', ctx.productService);
  fastify.decorate('cartService', ctx.cartService);
  fastify.decorate('orderService', ctx.orderService);
  fastify.decorate('orderItemService', ctx.orderItemService);
  fastify.decorate('statsService', ctx.statsService);
  fastify.decorate('articleService', ctx.articleService);
  await setupRoutes(fastify);
  await fastify.ready();

  return { ...ctx, fastify };
}

/**
 * Ferme Fastify + BDD
 */
export async function closeApiTestContext(ctx: ApiTestContext) {
  await ctx.fastify.close();
  ctx.db.close();
}
