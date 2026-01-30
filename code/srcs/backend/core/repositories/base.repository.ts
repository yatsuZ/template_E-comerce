import { failure, Result, success } from "../../utils/Error/ErrorMangament";
import Database from 'better-sqlite3';

export abstract class BaseRepository<T, TCreate extends object, TUpdate extends object, ID = number> {
  protected tableName: string;
  protected db: Database.Database;

  constructor(database: Database.Database, tableName: string) {
    this.db = database;
    this.tableName = tableName;
  }

  // -------------------
  // CREATE
  // -------------------

  create(data: TCreate): Result<T> {
    try {
      const keys = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const stmt = this.db.prepare(
        `INSERT INTO ${this.tableName} (${keys}) VALUES (${placeholders})`
      );

      const info = stmt.run(values);

      const row = this.db.prepare(
        `SELECT * FROM ${this.tableName} WHERE id = ?`
      ).get(info.lastInsertRowid);

      return success(row as T);

    } catch (err) {
      return failure('DATABASE', `Error creating record in ${this.tableName}`, err);
    }
  }


  // -------------------
  // READ
  // -------------------

  findById(id: ID): Result<T> {
    try {
      const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
      if (!row) return failure('NOT_FOUND', `${this.tableName} record not found`);
      return success(row as T);
    } catch (err) {
      return failure('DATABASE', `Error fetching ${this.tableName}`, err);
    }
  }

  // READ by arbitrary column
  findBy<K extends keyof T>(column: K, value: T[K]): Result<T[]> {
    try {
      const rows = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${String(column)} = ?`).all(value);
      return success(rows as T[]);
    } catch (err) {
      return failure('DATABASE', `Error fetching ${this.tableName} by ${String(column)}`, err);
    }
  }

  findAll(): Result<T[]> {
    try {
      const rows = this.db.prepare(`SELECT * FROM ${this.tableName}`).all();
      return success(rows as T[]);
    } catch (err) {
      return failure('DATABASE', `Error fetching ${this.tableName}`, err);
    }
  }

  // -------------------
  // UPDATE
  // -------------------

  update(id: ID, data: TUpdate): Result<T> {
    try {
      const keys = Object.keys(data);
      if (keys.length === 0) return failure('INVALID_ARG', 'No fields to update');

      const setClause = [...keys.map(key => `${key} = ?`), 'updated_at = CURRENT_TIMESTAMP']
      .join(', ');

      const values = Object.values(data);

      const stmt = this.db.prepare(
        `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`
      );

      const info = stmt.run(...values, id);

      if (info.changes === 0) return failure('NOT_FOUND', `${this.tableName} record not found`);

      return this.findById(id);
    } catch (err) {
      return failure('DATABASE', `Error updating record in ${this.tableName}`, err);
    }
  }

  // -------------------
  // DELETE
  // -------------------

  delete(id: ID): Result<void> {
    try {
      const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
      const info = stmt.run(id);

      if (info.changes === 0) return failure('NOT_FOUND', `${this.tableName} record not found`);

      return success(undefined);
    } catch (err) {
      return failure('DATABASE', `Error deleting record from ${this.tableName}`, err);
    }
  }
}
