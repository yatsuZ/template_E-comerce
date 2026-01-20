import Database from 'better-sqlite3';
// import { db as db_Export} from '../../config/db.js';
import { I_User } from '../interfaces/user.interfaces.js';
import { Logger } from '../../utils/logger.js';

const location = "core/repositories/user.repository.ts"

export class UserRepository {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  createUser(email: string, hashedPassword: string, googleId?: string) {
    const stmt = this.db.prepare(`
      INSERT INTO users (email, password, google_id, provider)
      VALUES (?, ?, ?, ?)
    `);

    const have_googleId = googleId ?? null;
    const log_by_google_or_local = googleId ? 'google' : 'local';

    const res = stmt.run(email, hashedPassword, have_googleId, log_by_google_or_local);
    return res.lastInsertRowid as number;
  }

  createAdmin(email: string, hashedPassword: string, googleId?: string) {
    const stmt = this.db.prepare(`
      INSERT INTO users (email, password, google_id, provider, is_admin)
      VALUES (?, ?, ?, ?, 1)
    `);
    const res = stmt.run(email, hashedPassword, googleId ?? null, googleId ? 'google' : 'local');
    return res.lastInsertRowid as number;
  }
  
  findOneById(id: number): I_User | undefined {
    return this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as I_User | undefined;
  }

  findOneByEmail(email: string): I_User | undefined {
    return this.db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as I_User | undefined;
  }

  updateUser(id: number, data: Partial<{email: string; password: string}>) : boolean {
    const updates = [];
    const params = [];

    if (data.email)
    {
      updates.push('email = ?');
      params.push(data.email);
    }
    if (data.password) 
    {
      updates.push('password = ?');
      params.push(data.password);
    }

    if (!updates.length) return false;

    params.push(id);
    const stmt = this.db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  delete(id: number) : boolean {
    const stmt = this.db.prepare(`DELETE FROM users WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }
}