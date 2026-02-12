import { FastifyInstance } from 'fastify';
import { authMiddleware, adminMiddleware } from '../../middlewares/auth.middleware.js';
import { updateOrderStatusSchema } from '../../core/schema/order.schema.js';

export async function orderRoutes(fastify: FastifyInstance) {
	const orderService = fastify.orderService;
	const orderItemService = fastify.orderItemService;

	// Toutes les routes orders nécessitent d'être connecté
	fastify.addHook('preHandler', authMiddleware);

	// ========== CHECKOUT ==========

	// POST /api/orders/checkout → Passer commande depuis le panier
	fastify.post('/checkout', async (request, reply) => {
		const result = orderService.checkout(request.user.userId);
		if (!result.ok) {
			const statusCode = result.error.type === 'NOT_FOUND' ? 404 : 400;
			return reply.code(statusCode).send({ success: false, error: result.error.message });
		}
		return reply.code(201).send({ success: true, data: result.data });
	});

	// ========== READ ==========

	// GET /api/orders → Mes commandes
	fastify.get('/', async (request, reply) => {
		const result = orderService.getOrdersByUserId(request.user.userId);
		if (!result.ok) {
			return reply.code(500).send({ success: false, error: result.error.message });
		}
		return reply.code(200).send({ success: true, data: result.data });
	});

	// GET /api/orders/:id → Détail d'une commande
	fastify.get('/:id', async (request, reply) => {
		const { id } = request.params as { id: string };
		const orderId = parseInt(id, 10);
		if (isNaN(orderId)) {
			return reply.code(400).send({ success: false, error: 'Invalid order ID' });
		}

		const result = orderService.getOrderById(orderId);
		if (!result.ok) {
			return reply.code(404).send({ success: false, error: 'Order not found' });
		}

		// Vérifier que la commande appartient à l'user (sauf admin)
		if (result.data.user_id !== request.user.userId && request.user.is_admin !== 1) {
			return reply.code(403).send({ success: false, error: 'Not your order' });
		}

		// Récupérer les items de la commande
		const itemsResult = orderItemService.getByOrderId(orderId);
		const items = itemsResult.ok ? itemsResult.data : [];

		return reply.code(200).send({
			success: true,
			data: { ...result.data, items },
		});
	});

	// ========== CANCEL ==========

	// PATCH /api/orders/:id/cancel → Annuler ma commande
	fastify.patch('/:id/cancel', async (request, reply) => {
		const { id } = request.params as { id: string };
		const orderId = parseInt(id, 10);
		if (isNaN(orderId)) {
			return reply.code(400).send({ success: false, error: 'Invalid order ID' });
		}

		// Vérifier que la commande appartient à l'user
		const orderResult = orderService.getOrderById(orderId);
		if (!orderResult.ok) {
			return reply.code(404).send({ success: false, error: 'Order not found' });
		}
		if (orderResult.data.user_id !== request.user.userId && request.user.is_admin !== 1) {
			return reply.code(403).send({ success: false, error: 'Not your order' });
		}

		const result = orderService.cancelOrder(orderId);
		if (!result.ok) {
			return reply.code(400).send({ success: false, error: result.error.message });
		}
		return reply.code(200).send({ success: true, data: result.data });
	});

	// ========== ADMIN ==========

	// GET /api/orders/admin/all → Toutes les commandes (admin)
	fastify.get('/admin/all', { preHandler: [adminMiddleware] }, async (request, reply) => {
		const result = orderService.getAllOrders();
		if (!result.ok) {
			return reply.code(500).send({ success: false, error: result.error.message });
		}
		return reply.code(200).send({ success: true, data: result.data });
	});

	// PATCH /api/orders/admin/:id/status → Changer le status (admin)
	fastify.patch('/admin/:id/status', { preHandler: [adminMiddleware] }, async (request, reply) => {
		const { id } = request.params as { id: string };
		const orderId = parseInt(id, 10);
		if (isNaN(orderId)) {
			return reply.code(400).send({ success: false, error: 'Invalid order ID' });
		}

		const parsed = updateOrderStatusSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: 'Invalid input',
				details: parsed.error.flatten().fieldErrors,
			});
		}

		const result = orderService.updateStatus(orderId, parsed.data.status);
		if (!result.ok) {
			const statusCode = result.error.type === 'NOT_FOUND' ? 404 : 400;
			return reply.code(statusCode).send({ success: false, error: result.error.message });
		}
		return reply.code(200).send({ success: true, data: result.data });
	});
}
