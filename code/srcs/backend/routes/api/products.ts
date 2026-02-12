import { FastifyInstance } from 'fastify';
import { authMiddleware, adminMiddleware } from '../../middlewares/auth.middleware.js';
import { createProductSchema, updateProductSchema } from '../../core/schema/product.schema.js';
import { paginationSchema } from '../../core/schema/pagination.schema.js';
import { Logger } from '../../utils/logger.js';

export async function productRoutes(fastify: FastifyInstance) {
	const productService = fastify.productService;

	// ========== PUBLIC ==========

	// GET /api/products → Liste tous les produits (paginé)
	fastify.get('/', async (request, reply) => {
		const pagination = paginationSchema.parse(request.query);
		const result = productService.getAllPaginated(pagination);
		if (!result.ok) {
			return reply.code(500).send({ success: false, error: result.error.message });
		}
		return reply.code(200).send({ success: true, ...result.data });
	});

	// GET /api/products/:id → Détail d'un produit
	fastify.get('/:id', async (request, reply) => {
		const { id } = request.params as { id: string };
		const productId = parseInt(id, 10);
		if (isNaN(productId)) {
			return reply.code(400).send({ success: false, error: 'Invalid product ID' });
		}

		const result = productService.getById(productId);
		if (!result.ok) {
			return reply.code(404).send({ success: false, error: 'Product not found' });
		}
		return reply.code(200).send({ success: true, data: result.data });
	});

	// ========== ADMIN ==========

	// POST /api/products → Créer un produit (admin)
	fastify.post('/', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const parsed = createProductSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: 'Invalid input',
				details: parsed.error.flatten().fieldErrors,
			});
		}

		const result = productService.createProduct({
			name: parsed.data.name,
			description: parsed.data.description ?? null,
			price: parsed.data.price,
			image: parsed.data.image ?? null,
			stock: parsed.data.stock,
		});

		if (!result.ok) {
			const statusCode = result.error.type === 'CONFLICT' ? 409 : 400;
			return reply.code(statusCode).send({ success: false, error: result.error.message });
		}
		Logger.audit('ADMIN_CREATE_PRODUCT', { adminId: request.user.userId, productId: result.data.id, name: parsed.data.name });
		return reply.code(201).send({ success: true, data: result.data });
	});

	// PUT /api/products/:id → Modifier un produit (admin)
	fastify.put('/:id', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const { id } = request.params as { id: string };
		const productId = parseInt(id, 10);
		if (isNaN(productId)) {
			return reply.code(400).send({ success: false, error: 'Invalid product ID' });
		}

		const parsed = updateProductSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: 'Invalid input',
				details: parsed.error.flatten().fieldErrors,
			});
		}

		const result = productService.updateProduct(productId, parsed.data);
		if (!result.ok) {
			const statusCode = result.error.type === 'NOT_FOUND' ? 404 : 400;
			return reply.code(statusCode).send({ success: false, error: result.error.message });
		}
		Logger.audit('ADMIN_UPDATE_PRODUCT', { adminId: request.user.userId, productId });
		return reply.code(200).send({ success: true, data: result.data });
	});

	// DELETE /api/products/:id → Supprimer un produit (admin)
	fastify.delete('/:id', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const { id } = request.params as { id: string };
		const productId = parseInt(id, 10);
		if (isNaN(productId)) {
			return reply.code(400).send({ success: false, error: 'Invalid product ID' });
		}

		const result = productService.deleteProduct(productId);
		if (!result.ok) {
			return reply.code(404).send({ success: false, error: 'Product not found' });
		}
		Logger.audit('ADMIN_DELETE_PRODUCT', { adminId: request.user.userId, productId });
		return reply.code(200).send({ success: true, message: 'Product deleted' });
	});
}
