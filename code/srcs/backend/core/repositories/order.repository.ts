import Database from 'better-sqlite3';
// import { db as db_Export} from '../../config/db.js';
import { I_Order } from '../interfaces/order.interfaces.js';
import { Logger } from '../../utils/logger.js';
import { BaseRepository } from './base.repository.js';
import { failure, Result, success } from '../../utils/Error/ErrorManagement.js';

const location = "core/repositories/order.repository.ts"

const colmun_user_id = 'user_id';
// const colmun_product_id = 'product_id';


type OrderCreate = Omit<I_Order, 'id' | 'created_at' | 'updated_at' | 'status' | 'stripe_payment_id'>;
type OrderUpdate = Partial<Pick<I_Order, 'status' | 'stripe_payment_id'>>;

export class OrderRepository extends BaseRepository<I_Order, OrderCreate, OrderUpdate> {

  constructor(db: Database.Database) {
    super(db, 'orders');
  }

  findByUserId(userId: number) : Result<I_Order[]> {
      return this.findBy(colmun_user_id, userId);
  }
}
