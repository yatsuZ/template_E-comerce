import Database from 'better-sqlite3';
// import { db as db_Export} from '../../config/db.js';
import { I_Cart } from '../interfaces/cart.interfaces.js';
import { Logger } from '../../utils/logger.js';
import { BaseRepository } from './base.repository.js';
import { failure, Result, success } from '../../utils/Error/ErrorMangament.js';

const location = "core/repositories/cart.repository.ts"

const colmun_user_id = 'user_id';
const colmun_product_id = 'product_id';


type CartCreate = Omit<I_Cart, 'id' | 'created_at' | 'updated_at'>;
type CartUpdate = Partial<Pick<I_Cart, 'quantity' | 'price'>>;

export class CartRepository extends BaseRepository<I_Cart, CartCreate, CartUpdate> {

  constructor(db: Database.Database) {
    super(db, 'cart_items');
  }

  findByUserId(userId: number) : Result<I_Cart[]> {
      return this.findBy(colmun_user_id, userId);
  }

  findByProductId(userId: number) : Result<I_Cart[]> {
      return this.findBy(colmun_user_id, userId);
  }

  findOneByUserAndProduct(userId: number, productId: number) : Result<I_Cart[]> {
    try {
      const rows = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${String(colmun_user_id)} = ? AND ${String(colmun_product_id)} = ?`).all(userId, productId);
      return success(rows as I_Cart[]);
    } catch (err) {
      return failure('DATABASE', `Error fetching ${this.tableName} by ${String(colmun_user_id)} AND ${String(colmun_product_id)}`, err);
    }
  }

}
