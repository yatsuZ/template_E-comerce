import { FastifyInstance } from 'fastify';
import { authMiddleware, adminMiddleware } from '../../middlewares/auth.middleware.js';
import { createArticleSchema, updateArticleSchema } from '../../core/schema/article.schema.js';
import { paginationSchema } from '../../core/schema/pagination.schema.js';
import { Logger } from '../../utils/logger.js';

export async function articleRoutes(fastify: FastifyInstance) {
	const articleService = fastify.articleService;

	// ========== PUBLIC ==========

	// GET /api/articles → Liste articles publiés (paginé)
	fastify.get('/', async (request, reply) => {
		const pagination = paginationSchema.parse(request.query);
		const result = articleService.getPublishedPaginated(pagination);
		if (!result.ok) {
			return reply.code(500).send({ success: false, error: result.error.message });
		}
		return reply.code(200).send({
			success: true,
			items: result.data.items,
			total: result.data.total,
			page: result.data.page,
			limit: result.data.limit,
			totalPages: result.data.totalPages,
		});
	});

	// GET /api/articles/tree → Arborescence des articles publiés
	fastify.get('/tree', async (request, reply) => {
		const result = articleService.getTree();
		if (!result.ok) {
			return reply.code(500).send({ success: false, error: result.error.message });
		}
		return reply.code(200).send({ success: true, data: result.data });
	});

	// GET /api/articles/slug/:slug → Article par slug (publié uniquement)
	fastify.get('/slug/:slug', async (request, reply) => {
		const { slug } = request.params as { slug: string };
		const result = articleService.getPublishedBySlug(slug);
		if (!result.ok) {
			return reply.code(404).send({ success: false, error: 'Article not found' });
		}
		return reply.code(200).send({ success: true, data: result.data });
	});

	// ========== ADMIN ==========

	// GET /api/articles/admin/all → Tous les articles (brouillons inclus)
	fastify.get('/admin/all', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const pagination = paginationSchema.parse(request.query);
		const result = articleService.getAllPaginated(pagination);
		if (!result.ok) {
			return reply.code(500).send({ success: false, error: result.error.message });
		}
		return reply.code(200).send({
			success: true,
			items: result.data.items,
			total: result.data.total,
			page: result.data.page,
			limit: result.data.limit,
			totalPages: result.data.totalPages,
		});
	});

	// GET /api/articles/admin/:id → Article par id
	fastify.get('/admin/:id', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const { id } = request.params as { id: string };
		const articleId = parseInt(id, 10);
		if (isNaN(articleId)) {
			return reply.code(400).send({ success: false, error: 'Invalid article ID' });
		}
		const result = articleService.getArticleById(articleId);
		if (!result.ok) {
			return reply.code(404).send({ success: false, error: 'Article not found' });
		}
		return reply.code(200).send({ success: true, data: result.data });
	});

	// POST /api/articles → Créer un article (JSON)
	fastify.post('/', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const parsed = createArticleSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: 'Invalid input',
				details: parsed.error.flatten().fieldErrors,
			});
		}

		const result = articleService.createArticle({
			...parsed.data,
			parent_id: parsed.data.parent_id ?? null,
			published: parsed.data.published ?? 0,
			author_id: request.user.userId,
		});

		if (!result.ok) {
			const statusCode = result.error.type === 'CONFLICT' ? 409
				: result.error.type === 'NOT_FOUND' ? 404 : 400;
			return reply.code(statusCode).send({ success: false, error: result.error.message });
		}

		Logger.audit('ADMIN_CREATE_ARTICLE', { adminId: request.user.userId, articleId: result.data.id, title: parsed.data.title });
		return reply.code(201).send({ success: true, data: result.data });
	});

	// POST /api/articles/upload → Upload fichier .md (multipart)
	fastify.post('/upload', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const data = await request.file();
		if (!data) {
			return reply.code(400).send({ success: false, error: 'No file uploaded' });
		}

		const filename = data.filename;
		if (!filename.endsWith('.md')) {
			return reply.code(400).send({ success: false, error: 'Only .md files are accepted' });
		}

		const buffer = await data.toBuffer();
		const content = buffer.toString('utf-8');
		const title = filename.replace(/\.md$/, '').replace(/[-_]/g, ' ');

		const parentIdField = data.fields?.parent_id;
		let parentId: number | null = null;
		if (parentIdField && typeof parentIdField === 'object' && 'value' in parentIdField) {
			const val = parseInt((parentIdField as { value: string }).value, 10);
			if (!isNaN(val)) parentId = val;
		}

		const result = articleService.createFromMarkdown(title, content, request.user.userId, parentId);
		if (!result.ok) {
			const statusCode = result.error.type === 'CONFLICT' ? 409 : 400;
			return reply.code(statusCode).send({ success: false, error: result.error.message });
		}

		Logger.audit('ADMIN_UPLOAD_ARTICLE', { adminId: request.user.userId, articleId: result.data.id, filename });
		return reply.code(201).send({ success: true, data: result.data });
	});

	// PUT /api/articles/admin/:id → Modifier un article
	fastify.put('/admin/:id', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const { id } = request.params as { id: string };
		const articleId = parseInt(id, 10);
		if (isNaN(articleId)) {
			return reply.code(400).send({ success: false, error: 'Invalid article ID' });
		}

		const parsed = updateArticleSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: 'Invalid input',
				details: parsed.error.flatten().fieldErrors,
			});
		}

		const result = articleService.updateArticle(articleId, parsed.data);
		if (!result.ok) {
			const statusCode = result.error.type === 'NOT_FOUND' ? 404
				: result.error.type === 'CONFLICT' ? 409
				: result.error.type === 'INVALID_ARG' ? 400 : 500;
			return reply.code(statusCode).send({ success: false, error: result.error.message });
		}

		Logger.audit('ADMIN_UPDATE_ARTICLE', { adminId: request.user.userId, articleId });
		return reply.code(200).send({ success: true, data: result.data });
	});

	// DELETE /api/articles/admin/:id → Supprimer un article
	fastify.delete('/admin/:id', { preHandler: [authMiddleware, adminMiddleware] }, async (request, reply) => {
		const { id } = request.params as { id: string };
		const articleId = parseInt(id, 10);
		if (isNaN(articleId)) {
			return reply.code(400).send({ success: false, error: 'Invalid article ID' });
		}

		const result = articleService.deleteArticle(articleId);
		if (!result.ok) {
			return reply.code(404).send({ success: false, error: 'Article not found' });
		}

		Logger.audit('ADMIN_DELETE_ARTICLE', { adminId: request.user.userId, articleId });
		return reply.code(200).send({ success: true, message: 'Article deleted' });
	});
}
