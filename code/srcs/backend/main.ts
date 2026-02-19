import dotenv from 'dotenv';
import { buildFastify } from './config/fastify.js';
import { Logger } from './utils/logger.js';
import { msg_SERV_READY, msg_SERV_START } from './utils/message.js';
import { shutdown } from './utils/shutdown.js';
import { DatabaseManager } from './config/db.js';
import { UserRepository } from './core/repositories/user.repository.js';
import { ProductRepository } from './core/repositories/product.repository.js';
import { CartRepository } from './core/repositories/cart.repository.js';
import { OrderRepository } from './core/repositories/order.repository.js';
import { OrderItemsRepository } from './core/repositories/order_items.repository.js';
import { ArticleRepository } from './core/repositories/article.repository.js';
import { UserService } from './core/services/user.service.js';
import { ProductService } from './core/services/products.service.js';
import { CartService } from './core/services/cart.service.js';
import { OrderService } from './core/services/order.service.js';
import { OrderItemService } from './core/services/order_items.service.js';
import { AuthService } from './core/services/auth.service.js';
import { StatsService } from './core/services/stats.service.js';
import { ArticleService } from './core/services/article.service.js';
import { seedAdmin, seedTestData } from './utils/seed.js';

const location = "main.ts"

dotenv.config();

export const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const start = async () => {
	msg_SERV_START();

	try {
    const db = new DatabaseManager();
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

    await seedAdmin(userService);

    // Seed test data (only in development, only if DB is empty)
    const admin = userService.getUserByEmail(process.env.ADMIN_EMAIL || '');
    if (admin.ok && admin.data) {
      seedTestData(productService, articleService, admin.data.id);
    }

    const fastify = await buildFastify({
      authService,
      userService,
      productService,
      cartService,
      orderService,
      orderItemService,
      statsService,
      articleService,
    });

		process.on('SIGINT', () => shutdown(fastify, db, 'SIGINT'));
		process.on('SIGTERM', () => shutdown(fastify, db, 'SIGTERM'));

		process.on('uncaughtException', (err) => shutdown(fastify, db, 'uncaughtException', err));

		process.on('unhandledRejection', (reason) => shutdown(fastify, db, 'unhandledRejection', reason));

		await fastify.listen({ port: PORT, host: HOST });

		msg_SERV_READY()

		Logger.success(location, 'Fastify server running');
	} catch (err) {
		Logger.error(location, 'Failed to start server:', err);
		process.exit(1);
	}
};

start();
