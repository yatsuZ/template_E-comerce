import Database from 'better-sqlite3';
// import { db as db_Export} from '../../config/db.js';
import { I_Cart } from '../interfaces/cart.interfaces.js';
import { Logger } from '../../utils/logger.js';
import { BaseRepository } from './base.repository.js';
import { failure, Result, success } from '../../utils/Error/ErrorManagement.js';

const location = "core/repositories/cart.repository.ts"

const colmun_user_id = 'user_id';
const colmun_product_id = 'product_id';


export type CartCreate = Omit<I_Cart, 'id' | 'created_at' | 'updated_at'>;
export type CartUpdate = Partial<Pick<I_Cart, 'quantity'>>;

export class CartRepository extends BaseRepository<I_Cart, CartCreate, CartUpdate> {

  constructor(db: Database.Database) {
    super(db, 'cart_items');
  }

  findByUserId(userId: number) : Result<I_Cart[]> {
      return this.findBy(colmun_user_id, userId);
  }

  findByProductId(userId: number) : Result<I_Cart[]> {
      return this.findBy(colmun_product_id, userId);
  }

  findOneByUserAndProduct(userId: number, productId: number): Result<I_Cart | null> {
    try {
      const row = this.db
        .prepare(`SELECT * FROM ${this.tableName} WHERE ${colmun_user_id} = ? AND ${colmun_product_id} = ?`)
        .get(userId, productId);
    
      return success((row ?? null) as I_Cart | null);
    } catch (err) {
      return failure('DATABASE', `Error fetching ${this.tableName} by user/product`, err);
    }
  }

}
