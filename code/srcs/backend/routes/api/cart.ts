import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { addToCartSchema, updateCartSchema } from '../../core/schema/cart.schema.js';
import { paginationSchema } from '../../core/schema/pagination.schema.js';
import { safeError } from '../../utils/Error/ErrorManagement.js';

export async function cartRoutes(fastify: FastifyInstance) {
	const cartService = fastify.cartService;

	// Toutes les routes cart nécessitent d'être connecté
	fastify.addHook('preHandler', authMiddleware);

	// ========== READ ==========

	// GET /api/cart → Mon panier (paginé)
	fastify.get('/', async (request, reply) => {
		const pagination = paginationSchema.parse(request.query);
		const result = cartService.getCartByUserIdPaginated(request.user.userId, pagination);
		if (!result.ok) {
			return reply.code(500).send({ success: false, error: 'Server error' });
		}
		return reply.code(200).send({ success: true, ...result.data });
	});

	// ========== CREATE ==========

	// POST /api/cart → Ajouter un produit au panier
	fastify.post('/', async (request, reply) => {
		const parsed = addToCartSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: 'Invalid input',
				details: parsed.error.flatten().fieldErrors,
			});
		}

		const result = cartService.addToCart(request.user.userId, parsed.data.product_id, parsed.data.quantity);
		if (!result.ok) {
			const statusCode = result.error.type === 'NOT_FOUND' ? 404 : 400;
			return reply.code(statusCode).send({ success: false, error: safeError(result.error) });
		}
		return reply.code(201).send({ success: true, data: result.data });
	});

	// ========== UPDATE ==========

	// PUT /api/cart/:id → Modifier la quantité
	fastify.put('/:id', async (request, reply) => {
		const { id } = request.params as { id: string };
		const cartId = parseInt(id, 10);
		if (isNaN(cartId)) {
			return reply.code(400).send({ success: false, error: 'Invalid cart item ID' });
		}

		// Vérifier que l'item appartient à l'user
		const itemResult = cartService.getCartItem(cartId);
		if (!itemResult.ok) {
			return reply.code(404).send({ success: false, error: 'Cart item not found' });
		}
		if (itemResult.data.user_id !== request.user.userId) {
			return reply.code(403).send({ success: false, error: 'Not your cart item' });
		}

		const parsed = updateCartSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: 'Invalid input',
				details: parsed.error.flatten().fieldErrors,
			});
		}

		const result = cartService.updateQuantity(cartId, parsed.data.quantity);
		if (!result.ok) {
			return reply.code(400).send({ success: false, error: safeError(result.error) });
		}
		return reply.code(200).send({ success: true, data: result.data });
	});

	// ========== DELETE ==========

	// DELETE /api/cart/:id → Retirer un item
	fastify.delete('/:id', async (request, reply) => {
		const { id } = request.params as { id: string };
		const cartId = parseInt(id, 10);
		if (isNaN(cartId)) {
			return reply.code(400).send({ success: false, error: 'Invalid cart item ID' });
		}

		// Vérifier que l'item appartient à l'user
		const itemResult = cartService.getCartItem(cartId);
		if (!itemResult.ok) {
			return reply.code(404).send({ success: false, error: 'Cart item not found' });
		}
		if (itemResult.data.user_id !== request.user.userId) {
			return reply.code(403).send({ success: false, error: 'Not your cart item' });
		}

		const result = cartService.removeFromCart(cartId);
		if (!result.ok) {
			return reply.code(500).send({ success: false, error: 'Server error' });
		}
		return reply.code(200).send({ success: true, message: 'Item removed from cart' });
	});

	// DELETE /api/cart → Vider le panier
	fastify.delete('/', async (request, reply) => {
		const result = cartService.clearCart(request.user.userId);
		if (!result.ok) {
			return reply.code(500).send({ success: false, error: 'Server error' });
		}
		return reply.code(200).send({ success: true, message: 'Cart cleared' });
	});
}
