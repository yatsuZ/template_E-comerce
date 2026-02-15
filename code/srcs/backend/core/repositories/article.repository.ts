import Database from 'better-sqlite3';
import { I_Article } from '../interfaces/article.interfaces.js';
import { BaseRepository } from './base.repository.js';
import { Result, success, failure, PaginationOptions, Paginated } from '../../utils/Error/ErrorManagement.js';

type ArticleCreate = Omit<I_Article, 'id' | 'created_at' | 'updated_at'>;
type ArticleUpdate = Partial<Pick<I_Article, 'title' | 'slug' | 'content' | 'parent_id' | 'published'>>;

export class ArticleRepository extends BaseRepository<I_Article, ArticleCreate, ArticleUpdate> {
  constructor(db: Database.Database) {
    super(db, 'articles');
  }

  findBySlug(slug: string): Result<I_Article | null> {
    try {
      const row = this.db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug);
      return success(row ? (row as I_Article) : null);
    } catch (err) {
      return failure('DATABASE', 'Error fetching article by slug', err);
    }
  }

  findByParentId(parentId: number | null): Result<I_Article[]> {
    try {
      const rows = parentId === null
        ? this.db.prepare('SELECT * FROM articles WHERE parent_id IS NULL').all()
        : this.db.prepare('SELECT * FROM articles WHERE parent_id = ?').all(parentId);
      return success(rows as I_Article[]);
    } catch (err) {
      return failure('DATABASE', 'Error fetching articles by parent_id', err);
    }
  }

  findPublishedPaginated(options: PaginationOptions): Result<Paginated<I_Article>> {
    try {
      const offset = (options.page - 1) * options.limit;
      const rows = this.db.prepare(
        'SELECT * FROM articles WHERE published = 1 ORDER BY id DESC LIMIT ? OFFSET ?'
      ).all(options.limit, offset) as I_Article[];
      const total = (this.db.prepare(
        'SELECT COUNT(*) as count FROM articles WHERE published = 1'
      ).get() as { count: number }).count;
      return success({
        items: rows,
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / options.limit),
      });
    } catch (err) {
      return failure('DATABASE', 'Error fetching published articles', err);
    }
  }

  findAllPublished(): Result<I_Article[]> {
    try {
      const rows = this.db.prepare('SELECT * FROM articles WHERE published = 1 ORDER BY id DESC').all();
      return success(rows as I_Article[]);
    } catch (err) {
      return failure('DATABASE', 'Error fetching all published articles', err);
    }
  }
}
