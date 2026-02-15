import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger, updateENV } from '../../backend/utils/logger.js';
import {
  TestContext,
  createTestContext,
  closeTestContext,
  createTestAdmin,
} from '../helpers/test.helper.js';

updateENV("debug");
Logger.debug("Test ArticleService", "Tests du service Article avec CRUD, slug, tree");

describe('ArticleService', () => {
  let ctx: TestContext;
  let adminId: number;

  beforeEach(async () => {
    ctx = createTestContext();
    const admin = await createTestAdmin(ctx.userService);
    adminId = admin.id;
  });
  afterEach(() => { closeTestContext(ctx); });

  // ========== CREATE ==========

  describe('createArticle()', () => {
    it('Cree un article avec tous les champs', () => {
      const res = ctx.articleService.createArticle({
        title: 'Mon Article',
        slug: 'mon-article',
        content: '# Hello',
        parent_id: null,
        author_id: adminId,
        published: 1,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.title).toBe('Mon Article');
      expect(res.data.slug).toBe('mon-article');
      expect(res.data.published).toBe(1);
      expect(res.data.author_id).toBe(adminId);
    });

    it('Erreur si slug duplique', () => {
      ctx.articleService.createArticle({
        title: 'First', slug: 'same', content: '', parent_id: null, author_id: adminId, published: 0,
      });

      const res = ctx.articleService.createArticle({
        title: 'Second', slug: 'same', content: '', parent_id: null, author_id: adminId, published: 0,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('CONFLICT');
    });

    it('Erreur si parent_id inexistant', () => {
      const res = ctx.articleService.createArticle({
        title: 'Orphan', slug: 'orphan', content: '', parent_id: 9999, author_id: adminId, published: 0,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
    });

    it('Cree un article enfant', () => {
      const parent = ctx.articleService.createArticle({
        title: 'Parent', slug: 'parent', content: '', parent_id: null, author_id: adminId, published: 1,
      });
      if (!parent.ok) throw new Error();

      const child = ctx.articleService.createArticle({
        title: 'Child', slug: 'child', content: '', parent_id: parent.data.id, author_id: adminId, published: 1,
      });

      expect(child.ok).toBe(true);
      if (child.ok) expect(child.data.parent_id).toBe(parent.data.id);
    });
  });

  describe('createFromMarkdown()', () => {
    it('Cree un article a partir de markdown avec slug auto', () => {
      const res = ctx.articleService.createFromMarkdown('Mon Super Article', '# Contenu MD', adminId);

      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.title).toBe('Mon Super Article');
      expect(res.data.slug).toBe('mon-super-article');
      expect(res.data.content).toBe('# Contenu MD');
      expect(res.data.published).toBe(0); // brouillon par defaut
    });

    it('Genere un slug unique si doublon', () => {
      ctx.articleService.createFromMarkdown('Test', 'content1', adminId);
      const res = ctx.articleService.createFromMarkdown('Test', 'content2', adminId);

      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.slug).toBe('test-1');
    });
  });

  // ========== READ ==========

  describe('getArticleById()', () => {
    it('Retourne un article par ID', () => {
      const created = ctx.articleService.createArticle({
        title: 'Test', slug: 'test', content: '', parent_id: null, author_id: adminId, published: 0,
      });
      if (!created.ok) throw new Error();

      const res = ctx.articleService.getArticleById(created.data.id);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.title).toBe('Test');
    });

    it('Erreur si ID inexistant', () => {
      const res = ctx.articleService.getArticleById(9999);
      expect(res.ok).toBe(false);
    });
  });

  describe('getPublishedBySlug()', () => {
    it('Retourne un article publie par slug', () => {
      ctx.articleService.createArticle({
        title: 'Publie', slug: 'publie', content: 'ok', parent_id: null, author_id: adminId, published: 1,
      });

      const res = ctx.articleService.getPublishedBySlug('publie');
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.title).toBe('Publie');
    });

    it('Erreur si article est un brouillon', () => {
      ctx.articleService.createArticle({
        title: 'Draft', slug: 'draft', content: '', parent_id: null, author_id: adminId, published: 0,
      });

      const res = ctx.articleService.getPublishedBySlug('draft');
      expect(res.ok).toBe(false);
    });

    it('Erreur si slug inexistant', () => {
      const res = ctx.articleService.getPublishedBySlug('nexistepas');
      expect(res.ok).toBe(false);
    });
  });

  describe('getPublishedPaginated()', () => {
    it('Retourne les articles publies pagines', () => {
      for (let i = 0; i < 5; i++) {
        ctx.articleService.createArticle({
          title: `Art ${i}`, slug: `art-${i}`, content: '', parent_id: null, author_id: adminId, published: 1,
        });
      }
      ctx.articleService.createArticle({
        title: 'Draft', slug: 'draft', content: '', parent_id: null, author_id: adminId, published: 0,
      });

      const res = ctx.articleService.getPublishedPaginated({ page: 1, limit: 3 });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.items.length).toBe(3);
        expect(res.data.total).toBe(5);
        expect(res.data.totalPages).toBe(2);
      }
    });
  });

  // ========== TREE ==========

  describe('getTree()', () => {
    it('Construit l\'arborescence des articles publies', () => {
      const root = ctx.articleService.createArticle({
        title: 'Root', slug: 'root', content: '', parent_id: null, author_id: adminId, published: 1,
      });
      if (!root.ok) throw new Error();

      ctx.articleService.createArticle({
        title: 'Child 1', slug: 'child-1', content: '', parent_id: root.data.id, author_id: adminId, published: 1,
      });
      ctx.articleService.createArticle({
        title: 'Child 2', slug: 'child-2', content: '', parent_id: root.data.id, author_id: adminId, published: 1,
      });

      const res = ctx.articleService.getTree();
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.length).toBe(1); // 1 racine
      expect(res.data[0].title).toBe('Root');
      expect(res.data[0].children.length).toBe(2);
    });

    it('Ignore les brouillons dans l\'arbre', () => {
      ctx.articleService.createArticle({
        title: 'Publie', slug: 'publie', content: '', parent_id: null, author_id: adminId, published: 1,
      });
      ctx.articleService.createArticle({
        title: 'Brouillon', slug: 'brouillon', content: '', parent_id: null, author_id: adminId, published: 0,
      });

      const res = ctx.articleService.getTree();
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.length).toBe(1);
    });

    it('Retourne vide si aucun article publie', () => {
      const res = ctx.articleService.getTree();
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.length).toBe(0);
    });
  });

  // ========== UPDATE ==========

  describe('updateArticle()', () => {
    it('Met a jour titre et published', () => {
      const created = ctx.articleService.createArticle({
        title: 'Old', slug: 'old', content: '', parent_id: null, author_id: adminId, published: 0,
      });
      if (!created.ok) throw new Error();

      const res = ctx.articleService.updateArticle(created.data.id, {
        title: 'New',
        published: 1,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.title).toBe('New');
        expect(res.data.published).toBe(1);
      }
    });

    it('Erreur si slug duplique lors de la modif', () => {
      ctx.articleService.createArticle({
        title: 'A', slug: 'slug-a', content: '', parent_id: null, author_id: adminId, published: 0,
      });
      const b = ctx.articleService.createArticle({
        title: 'B', slug: 'slug-b', content: '', parent_id: null, author_id: adminId, published: 0,
      });
      if (!b.ok) throw new Error();

      const res = ctx.articleService.updateArticle(b.data.id, { slug: 'slug-a' });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('CONFLICT');
    });

    it('Erreur si article est son propre parent', () => {
      const created = ctx.articleService.createArticle({
        title: 'Self', slug: 'self', content: '', parent_id: null, author_id: adminId, published: 0,
      });
      if (!created.ok) throw new Error();

      const res = ctx.articleService.updateArticle(created.data.id, { parent_id: created.data.id });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe('INVALID_ARG');
    });

    it('Erreur si article inexistant', () => {
      const res = ctx.articleService.updateArticle(9999, { title: 'New' });
      expect(res.ok).toBe(false);
    });
  });

  // ========== DELETE ==========

  describe('deleteArticle()', () => {
    it('Supprime un article', () => {
      const created = ctx.articleService.createArticle({
        title: 'Del', slug: 'del', content: '', parent_id: null, author_id: adminId, published: 0,
      });
      if (!created.ok) throw new Error();

      const res = ctx.articleService.deleteArticle(created.data.id);
      expect(res.ok).toBe(true);

      expect(ctx.articleService.getArticleById(created.data.id).ok).toBe(false);
    });

    it('Erreur si article inexistant', () => {
      const res = ctx.articleService.deleteArticle(9999);
      expect(res.ok).toBe(false);
    });
  });
});
