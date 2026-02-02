import Database from 'better-sqlite3';
// import { db as db_Export} from '../../config/db.js';
import { I_OrderItems } from '../interfaces/order_items.interfaces.js';
import { Logger } from '../../utils/logger.js';
import { BaseRepository } from './base.repository.js';
import { failure, Result, success } from '../../utils/Error/ErrorManagement.js';

const location = "core/repositories/order.repository.ts"

const colmun_product_id = 'product_id';


type OrderItemssCreate = Omit<I_OrderItems, 'id' | 'created_at' | 'updated_at'>;
type OrderItemssUpdate = never;

export class OrderItemssRepository extends BaseRepository<I_OrderItems, OrderItemssCreate, OrderItemssUpdate> {

  constructor(db: Database.Database) {
    super(db, 'order_items');
  }

  findByProductId(productId: number) : Result<I_OrderItems[]> {
      return this.findBy(colmun_product_id, productId);
  }

  update(): never {
    throw new Error('order_items is immutable');
  }
}
