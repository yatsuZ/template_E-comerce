import { ArticleRepository } from '../repositories/article.repository.js';
import { I_Article, I_ArticleTree } from '../interfaces/article.interfaces.js';
import { Result, success, failure, PaginationOptions, Paginated } from '../../utils/Error/ErrorManagement.js';

const location = 'core/services/article.service.ts';
const MAX_ARTICLES = 20;

// Patterns dangereux dans le contenu markdown (XSS, injection)
const MALICIOUS_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,               // onclick=, onerror=, onload=, etc.
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<form[\s>]/i,
  /<input[\s>]/i,
  /data\s*:\s*text\/html/i,
  /<link[\s>]/i,
  /<meta[\s>]/i,
  /expression\s*\(/i,          // CSS expression()
  /url\s*\(\s*javascript/i,
];

export class ArticleService {
  constructor(private _articleRepo: ArticleRepository) {}

  // ========== CREATE ==========

  createArticle(data: {
    title: string;
    slug: string;
    content: string;
    parent_id: number | null;
    author_id: number;
    published: number;
  }): Result<I_Article> {
    // Vérifier la limite d'articles
    const allResult = this._articleRepo.findAll();
    if (allResult.ok && allResult.data.length >= MAX_ARTICLES)
      return failure('FORBIDDEN', `${location} createArticle: article limit reached (max ${MAX_ARTICLES})`);

    // Vérifier l'absence de contenu malveillant
    const maliciousCheck = this.containsMaliciousContent(data.content);
    if (maliciousCheck)
      return failure('VALIDATION', `${location} createArticle: content contains forbidden pattern (${maliciousCheck})`);

    // Vérifier l'unicité du slug
    const existing = this._articleRepo.findBySlug(data.slug);
    if (!existing.ok) return existing;
    if (existing.data)
      return failure('CONFLICT', `${location} createArticle: slug already exists`, data.slug);

    // Vérifier que le parent existe si spécifié
    if (data.parent_id !== null) {
      const parentResult = this._articleRepo.findById(data.parent_id);
      if (!parentResult.ok)
        return failure('NOT_FOUND', `${location} createArticle: parent article not found`);
    }

    return this._articleRepo.create({
      title: data.title,
      slug: data.slug,
      content: data.content,
      parent_id: data.parent_id,
      author_id: data.author_id,
      published: data.published,
    });
  }

  createFromMarkdown(
    title: string,
    markdownContent: string,
    authorId: number,
    parentId: number | null = null
  ): Result<I_Article> {
    const slug = this.generateSlug(title);

    return this.createArticle({
      title,
      slug,
      content: markdownContent,
      parent_id: parentId,
      author_id: authorId,
      published: 0,
    });
  }

  // ========== READ ==========

  getArticleById(id: number): Result<I_Article> {
    return this._articleRepo.findById(id);
  }

  getArticleBySlug(slug: string): Result<I_Article> {
    const result = this._articleRepo.findBySlug(slug);
    if (!result.ok) return result;
    if (!result.data)
      return failure('NOT_FOUND', `${location} getArticleBySlug: article not found`);
    return success(result.data);
  }

  getPublishedBySlug(slug: string): Result<I_Article> {
    const result = this._articleRepo.findBySlug(slug);
    if (!result.ok) return result;
    if (!result.data || result.data.published !== 1)
      return failure('NOT_FOUND', `${location} getPublishedBySlug: article not found`);
    return success(result.data);
  }

  getPublishedPaginated(options: PaginationOptions): Result<Paginated<I_Article>> {
    return this._articleRepo.findPublishedPaginated(options);
  }

  getAllPaginated(options: PaginationOptions): Result<Paginated<I_Article>> {
    return this._articleRepo.findAllPaginated(options);
  }

  getByParentId(parentId: number | null): Result<I_Article[]> {
    return this._articleRepo.findByParentId(parentId);
  }

  // ========== TREE ==========

  getTree(): Result<I_ArticleTree[]> {
    const allResult = this._articleRepo.findAllPublished();
    if (!allResult.ok) return allResult;

    const articles = allResult.data;
    return success(this.buildTree(articles));
  }

  private buildTree(articles: I_Article[]): I_ArticleTree[] {
    const map = new Map<number, I_ArticleTree>();
    const roots: I_ArticleTree[] = [];

    // Initialiser chaque article comme noeud de l'arbre
    for (const article of articles) {
      map.set(article.id, { ...article, children: [] });
    }

    // Construire l'arborescence
    for (const article of articles) {
      const node = map.get(article.id)!;
      if (article.parent_id !== null && map.has(article.parent_id)) {
        map.get(article.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  // ========== UPDATE ==========

  updateArticle(id: number, data: {
    title?: string;
    slug?: string;
    content?: string;
    parent_id?: number | null;
    published?: number;
  }): Result<I_Article> {
    const existing = this._articleRepo.findById(id);
    if (!existing.ok)
      return failure('NOT_FOUND', `${location} updateArticle: article not found`);

    // Vérifier l'absence de contenu malveillant si modifié
    if (data.content !== undefined) {
      const maliciousCheck = this.containsMaliciousContent(data.content);
      if (maliciousCheck)
        return failure('VALIDATION', `${location} updateArticle: content contains forbidden pattern (${maliciousCheck})`);
    }

    // Vérifier l'unicité du slug si modifié
    if (data.slug && data.slug !== existing.data.slug) {
      const slugCheck = this._articleRepo.findBySlug(data.slug);
      if (!slugCheck.ok) return slugCheck;
      if (slugCheck.data)
        return failure('CONFLICT', `${location} updateArticle: slug already exists`, data.slug);
    }

    // Vérifier que le parent existe si spécifié
    if (data.parent_id !== undefined && data.parent_id !== null) {
      if (data.parent_id === id)
        return failure('INVALID_ARG', `${location} updateArticle: article cannot be its own parent`);
      const parentResult = this._articleRepo.findById(data.parent_id);
      if (!parentResult.ok)
        return failure('NOT_FOUND', `${location} updateArticle: parent article not found`);
    }

    return this._articleRepo.update(id, data);
  }

  // ========== DELETE ==========

  deleteArticle(id: number): Result<boolean> {
    const existing = this._articleRepo.findById(id);
    if (!existing.ok)
      return failure('NOT_FOUND', `${location} deleteArticle: article not found`);

    const deleteResult = this._articleRepo.delete(id);
    if (!deleteResult.ok) return deleteResult;

    return success(true);
  }

  // ========== HELPERS ==========

  /**
   * Vérifie si le contenu contient des patterns malveillants (XSS, injection)
   * Retourne le pattern trouvé ou null si le contenu est safe
   */
  private containsMaliciousContent(content: string): string | null {
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(content)) return pattern.source;
    }
    return null;
  }

  private generateSlug(title: string): string {
    let slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '')    // Remove non-alphanumeric
      .replace(/\s+/g, '-')            // Spaces to hyphens
      .replace(/-+/g, '-')             // Collapse multiple hyphens
      .replace(/^-|-$/g, '');           // Trim hyphens

    // Vérifier l'unicité, ajouter un suffixe si nécessaire
    const baseSlug = slug;
    let counter = 1;
    while (true) {
      const existing = this._articleRepo.findBySlug(slug);
      if (!existing.ok || !existing.data) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}
