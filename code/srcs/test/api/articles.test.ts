import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  ApiTestContext,
  createApiTestContext,
  closeApiTestContext,
} from '../helpers/test.helper.js';

updateENV("debug");
Logger.debug("Test Articles API", "Tests des routes /api/articles (public + admin)");

async function getAdminToken(ctx: ApiTestContext): Promise<string> {
  await ctx.userService.createAdmin('admin@test.com', 'adminpass');
  const res = await ctx.fastify.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'admin@test.com', password: 'adminpass' },
  });
  return res.json().accessToken;
}

async function registerAndLogin(ctx: ApiTestContext, email: string, password: string): Promise<string> {
  await ctx.fastify.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password },
  });
  const res = await ctx.fastify.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });
  return res.json().accessToken;
}

async function createArticle(ctx: ApiTestContext, token: string, data: {
  title: string;
  slug: string;
  content?: string;
  parent_id?: number | null;
  published?: number;
}) {
  return ctx.fastify.inject({
    method: 'POST',
    url: '/api/articles',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      content: '',
      parent_id: null,
      published: 0,
      ...data,
    },
  });
}

describe('Articles API', () => {
  let ctx: ApiTestContext;

  beforeEach(async () => { ctx = await createApiTestContext(); });
  afterEach(async () => { await closeApiTestContext(ctx); });

  // ========== PUBLIC ==========

  describe('GET /api/articles (public)', () => {
    it('Retourne les articles publies pagines', async () => {
      const token = await getAdminToken(ctx);
      await createArticle(ctx, token, { title: 'Pub 1', slug: 'pub-1', published: 1 });
      await createArticle(ctx, token, { title: 'Pub 2', slug: 'pub-2', published: 1 });
      await createArticle(ctx, token, { title: 'Draft', slug: 'draft', published: 0 });

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/articles',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.items.length).toBe(2);
      expect(body.total).toBe(2);
    });

    it('Pagination fonctionne', async () => {
      const token = await getAdminToken(ctx);
      for (let i = 0; i < 5; i++) {
        await createArticle(ctx, token, { title: `Art ${i}`, slug: `art-${i}`, published: 1 });
      }

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/articles?page=1&limit=2',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.items.length).toBe(2);
      expect(body.total).toBe(5);
      expect(body.totalPages).toBe(3);
    });
  });

  describe('GET /api/articles/tree (public)', () => {
    it('Retourne l\'arborescence des articles publies', async () => {
      const token = await getAdminToken(ctx);
      const parentRes = await createArticle(ctx, token, { title: 'Root', slug: 'root', published: 1 });
      const parentId = parentRes.json().data.id;

      await createArticle(ctx, token, { title: 'Child', slug: 'child', parent_id: parentId, published: 1 });

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/articles/tree',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].children.length).toBe(1);
    });
  });

  describe('GET /api/articles/slug/:slug (public)', () => {
    it('Retourne un article publie par slug', async () => {
      const token = await getAdminToken(ctx);
      await createArticle(ctx, token, { title: 'Mon Art', slug: 'mon-art', content: '# Hello', published: 1 });

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/articles/slug/mon-art',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.title).toBe('Mon Art');
      expect(res.json().data.content).toBe('# Hello');
    });

    it('404 si article est un brouillon', async () => {
      const token = await getAdminToken(ctx);
      await createArticle(ctx, token, { title: 'Draft', slug: 'draft', published: 0 });

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/articles/slug/draft',
      });

      expect(res.statusCode).toBe(404);
    });

    it('404 si slug inexistant', async () => {
      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/articles/slug/inexistant',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ========== ADMIN ==========

  describe('GET /api/articles/admin/all', () => {
    it('Admin voit tous les articles (brouillons inclus)', async () => {
      const token = await getAdminToken(ctx);
      await createArticle(ctx, token, { title: 'Pub', slug: 'pub', published: 1 });
      await createArticle(ctx, token, { title: 'Draft', slug: 'draft', published: 0 });

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/articles/admin/all',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().items.length).toBe(2);
    });

    it('403 si non-admin', async () => {
      const userToken = await registerAndLogin(ctx, 'user@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/articles/admin/all',
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/articles/admin/:id', () => {
    it('Admin voit un article par ID', async () => {
      const token = await getAdminToken(ctx);
      const createRes = await createArticle(ctx, token, { title: 'Test', slug: 'test', published: 0 });
      const articleId = createRes.json().data.id;

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: `/api/articles/admin/${articleId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.title).toBe('Test');
    });

    it('404 si article inexistant', async () => {
      const token = await getAdminToken(ctx);

      const res = await ctx.fastify.inject({
        method: 'GET',
        url: '/api/articles/admin/9999',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/articles', () => {
    it('Admin cree un article', async () => {
      const token = await getAdminToken(ctx);

      const res = await createArticle(ctx, token, {
        title: 'Nouveau',
        slug: 'nouveau',
        content: '# Contenu',
        published: 1,
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Nouveau');
      expect(body.data.slug).toBe('nouveau');
    });

    it('409 si slug duplique', async () => {
      const token = await getAdminToken(ctx);
      await createArticle(ctx, token, { title: 'First', slug: 'dup' });

      const res = await createArticle(ctx, token, { title: 'Second', slug: 'dup' });

      expect(res.statusCode).toBe(409);
    });

    it('400 si body invalide', async () => {
      const token = await getAdminToken(ctx);

      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/articles',
        headers: { authorization: `Bearer ${token}` },
        payload: { title: '' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('403 si non-admin', async () => {
      const userToken = await registerAndLogin(ctx, 'user@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/articles',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { title: 'Test', slug: 'test', content: '' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('401 sans token', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/articles',
        payload: { title: 'Test', slug: 'test', content: '' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/articles/admin/:id', () => {
    it('Admin modifie un article', async () => {
      const token = await getAdminToken(ctx);
      const createRes = await createArticle(ctx, token, { title: 'Old', slug: 'old', published: 0 });
      const articleId = createRes.json().data.id;

      const res = await ctx.fastify.inject({
        method: 'PUT',
        url: `/api/articles/admin/${articleId}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'Updated', published: 1 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.title).toBe('Updated');
      expect(res.json().data.published).toBe(1);
    });

    it('409 si slug duplique lors de la modif', async () => {
      const token = await getAdminToken(ctx);
      await createArticle(ctx, token, { title: 'A', slug: 'slug-a' });
      const bRes = await createArticle(ctx, token, { title: 'B', slug: 'slug-b' });
      const bId = bRes.json().data.id;

      const res = await ctx.fastify.inject({
        method: 'PUT',
        url: `/api/articles/admin/${bId}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { slug: 'slug-a' },
      });

      expect(res.statusCode).toBe(409);
    });

    it('404 si article inexistant', async () => {
      const token = await getAdminToken(ctx);

      const res = await ctx.fastify.inject({
        method: 'PUT',
        url: '/api/articles/admin/9999',
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'New' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/articles/admin/:id', () => {
    it('Admin supprime un article', async () => {
      const token = await getAdminToken(ctx);
      const createRes = await createArticle(ctx, token, { title: 'Del', slug: 'del' });
      const articleId = createRes.json().data.id;

      const res = await ctx.fastify.inject({
        method: 'DELETE',
        url: `/api/articles/admin/${articleId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it('404 si article inexistant', async () => {
      const token = await getAdminToken(ctx);

      const res = await ctx.fastify.inject({
        method: 'DELETE',
        url: '/api/articles/admin/9999',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('403 si non-admin', async () => {
      const userToken = await registerAndLogin(ctx, 'user@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'DELETE',
        url: '/api/articles/admin/1',
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ========== UPLOAD MD ==========

  describe('POST /api/articles/upload', () => {
    it('401 sans token', async () => {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/articles/upload',
      });

      expect(res.statusCode).toBe(401);
    });

    it('403 si non-admin', async () => {
      const userToken = await registerAndLogin(ctx, 'user@test.com', 'password123');

      const res = await ctx.fastify.inject({
        method: 'POST',
        url: '/api/articles/upload',
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
