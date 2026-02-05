import Database from 'better-sqlite3';
// import { db as db_Export} from '../../config/db.js';
import { I_Product } from '../interfaces/product.interfaces.js';
import { Logger } from '../../utils/logger.js';
import { BaseRepository } from './base.repository.js';
import { Result } from '../../utils/Error/ErrorManagement.js';

const location = "core/repositories/product.repository.ts"

export type ProductCreate = Omit<I_Product, 'id' | 'created_at' | 'updated_at'>;
export type ProductUpdate = Partial<Pick<I_Product, 'description' | 'price' | 'image' | 'stock'>>;

export class ProductRepository extends BaseRepository<I_Product, ProductCreate, ProductUpdate> {

  constructor(db: Database.Database) {
    super(db, 'products');
  }

  findOneByName(name: string): Result<I_Product[]> {
    return this.findBy('name', name);
  }
}
