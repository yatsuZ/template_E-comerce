import Database from 'better-sqlite3';
// import { db as db_Export} from '../../config/db.js';
import { I_User } from '../interfaces/user.interfaces.js';
import { Logger } from '../../utils/logger.js';
import { BaseRepository } from './base.repository.js';
import { Result } from '../../utils/Error/ErrorManagement.js';

const location = "core/repositories/user.repository.ts"

type UserCreate = Omit<I_User, 'id' | 'created_at' | 'updated_at'>;
type UserUpdate = Partial<Pick<I_User, 'email' | 'password'>>;

export class UserRepository extends BaseRepository<I_User, UserCreate, UserUpdate> {
  constructor(db: Database.Database) {
    super(db, 'users');
  }

  findOneByEmail(email: string) : Result<I_User[]> {
    return this.findBy('email', email);
  }
}
