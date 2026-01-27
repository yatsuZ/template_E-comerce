import Database from 'better-sqlite3';
// import { db as db_Export} from '../../config/db.js';
import { I_Product } from '../interfaces/product.interfaces.js';
import { Logger } from '../../utils/logger.js';

const location = "core/repositories/product.repository.ts"

export class ProductRepository {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  createProduct(name: string, description: string, price: number, image_arg ?: string, stock_arg ?: number) : number {
    if (price < 0) return -1;

    const stmt = this.db.prepare(`
      INSERT INTO products (name, description, price, image, stock)
      VALUES (?, ?, ?, ?, ?)
    `);

    const image : string | null = image_arg ?? null;
    const stock : number = stock_arg ?? 0;

    const res = stmt.run(name, description, price, image, stock);
    return res.lastInsertRowid as number;
  }
  
  findOneById(id: number): I_Product | undefined {
    return this.db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as I_Product | undefined;
  }

  findOneByName(name: string): I_Product | undefined {
    return this.db.prepare(`SELECT * FROM products WHERE name = ?`).get(name) as I_Product | undefined;
  }

  updateProduct(id: number, data: Partial<{description: string, price: number, image : string}>) : boolean {// on peut changer le prix la description et limage
    const updates = [];
    const params = [];

    if (data.description !== undefined)
    {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.price!== undefined)
    {
      if (data.price < 0) return false;
      updates.push('price = ?');
      params.push(data.price);
    }
    if (data.image !== undefined)
    {
      updates.push('image = ?');
      params.push(data.image);
    }

    if (!updates.length) return false;

    params.push(id);
    const stmt = this.db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`);
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  delete(id: number) : boolean {
    const stmt = this.db.prepare(`DELETE FROM products WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }
}