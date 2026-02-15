import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../../backend/config/db.js';
import { ArticleRepository } from '../../backend/core/repositories/article.repository.js';
import { UserRepository } from '../../backend/core/repositories/user.repository.js';
import { Logger, updateENV } from '../../backend/utils/logger.js';

updateENV("debug");
Logger.debug("Test ArticleRepository", "Tests du repository Article avec CRUD + slug + tree");

describe('ArticleRepository', () => {
  let db: DatabaseManager;
  let articleRepo: ArticleRepository;
  let userRepo: UserRepository;
  let authorId: number;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    const conn = db.getConnection();
    articleRepo = new ArticleRepository(conn);
    userRepo = new UserRepository(conn);

    // Creer un user auteur
    const userRes = userRepo.create({
      email: 'author@test.com',
      password: 'password',
      google_id: null,
      provider: 'local',
      is_admin: 1,
    });
    if (!userRes.ok) throw new Error('Failed to create author');
    authorId = userRes.data.id;
  });

  afterEach(() => { db.close(); });

  // ========== CREATE ==========

  it('Cree un article', () => {
    const res = articleRepo.create({
      title: 'Mon Article',
      slug: 'mon-article',
      content: '# Hello World',
      parent_id: null,
      author_id: authorId,
      published: 1,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.title).toBe('Mon Article');
    expect(res.data.slug).toBe('mon-article');
    expect(res.data.content).toBe('# Hello World');
    expect(res.data.author_id).toBe(authorId);
    expect(res.data.published).toBe(1);
  });

  it('Erreur si slug duplique', () => {
    articleRepo.create({
      title: 'Article 1',
      slug: 'same-slug',
      content: '',
      parent_id: null,
      author_id: authorId,
      published: 0,
    });

    const res = articleRepo.create({
      title: 'Article 2',
      slug: 'same-slug',
      content: '',
      parent_id: null,
      author_id: authorId,
      published: 0,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe('CONFLICT');
  });

  // ========== READ ==========

  it('findBySlug retourne l\'article', () => {
    articleRepo.create({
      title: 'Test',
      slug: 'test-slug',
      content: 'content',
      parent_id: null,
      author_id: authorId,
      published: 1,
    });

    const res = articleRepo.findBySlug('test-slug');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).not.toBeNull();
      expect(res.data!.slug).toBe('test-slug');
    }
  });

  it('findBySlug retourne null si inexistant', () => {
    const res = articleRepo.findBySlug('inexistant');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeNull();
  });

  it('findByParentId retourne les enfants', () => {
    const parent = articleRepo.create({
      title: 'Parent',
      slug: 'parent',
      content: '',
      parent_id: null,
      author_id: authorId,
      published: 1,
    });
    if (!parent.ok) throw new Error();

    articleRepo.create({
      title: 'Enfant 1',
      slug: 'enfant-1',
      content: '',
      parent_id: parent.data.id,
      author_id: authorId,
      published: 1,
    });
    articleRepo.create({
      title: 'Enfant 2',
      slug: 'enfant-2',
      content: '',
      parent_id: parent.data.id,
      author_id: authorId,
      published: 1,
    });

    const res = articleRepo.findByParentId(parent.data.id);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.length).toBe(2);
  });

  it('findByParentId(null) retourne les racines', () => {
    articleRepo.create({
      title: 'Root 1',
      slug: 'root-1',
      content: '',
      parent_id: null,
      author_id: authorId,
      published: 1,
    });
    articleRepo.create({
      title: 'Root 2',
      slug: 'root-2',
      content: '',
      parent_id: null,
      author_id: authorId,
      published: 1,
    });

    const res = articleRepo.findByParentId(null);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.length).toBe(2);
  });

  it('findPublishedPaginated retourne seulement les publies', () => {
    articleRepo.create({ title: 'Publie', slug: 'publie', content: '', parent_id: null, author_id: authorId, published: 1 });
    articleRepo.create({ title: 'Brouillon', slug: 'brouillon', content: '', parent_id: null, author_id: authorId, published: 0 });

    const res = articleRepo.findPublishedPaginated({ page: 1, limit: 10 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.items.length).toBe(1);
      expect(res.data.items[0].title).toBe('Publie');
      expect(res.data.total).toBe(1);
    }
  });

  it('findAllPublished retourne tous les articles publies', () => {
    articleRepo.create({ title: 'P1', slug: 'p1', content: '', parent_id: null, author_id: authorId, published: 1 });
    articleRepo.create({ title: 'P2', slug: 'p2', content: '', parent_id: null, author_id: authorId, published: 1 });
    articleRepo.create({ title: 'Draft', slug: 'draft', content: '', parent_id: null, author_id: authorId, published: 0 });

    const res = articleRepo.findAllPublished();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.length).toBe(2);
  });

  // ========== UPDATE ==========

  it('Met a jour un article', () => {
    const created = articleRepo.create({
      title: 'Old Title',
      slug: 'old-title',
      content: 'old',
      parent_id: null,
      author_id: authorId,
      published: 0,
    });
    if (!created.ok) throw new Error();

    const res = articleRepo.update(created.data.id, {
      title: 'New Title',
      published: 1,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.title).toBe('New Title');
      expect(res.data.published).toBe(1);
    }
  });

  // ========== DELETE ==========

  it('Supprime un article', () => {
    const created = articleRepo.create({
      title: 'To Delete',
      slug: 'to-delete',
      content: '',
      parent_id: null,
      author_id: authorId,
      published: 0,
    });
    if (!created.ok) throw new Error();

    const del = articleRepo.delete(created.data.id);
    expect(del.ok).toBe(true);

    const find = articleRepo.findById(created.data.id);
    expect(find.ok).toBe(false);
  });

  it('Erreur si ID inexistant au delete', () => {
    const res = articleRepo.delete(9999);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe('NOT_FOUND');
  });
});
