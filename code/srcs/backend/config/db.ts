import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Logger } from '../utils/logger.js';

const location = "config/db.ts"

export const BDD_FILE_NAME : string = process.env.FILE_NAME_DB || 'default_name_e-commerce';

const getDirname = (): string => {
  return path.join(process.cwd(), 'srcs', 'backend', 'core', 'db');
};

export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    const baseDir = getDirname();
    this.dbPath = dbPath || path.join(baseDir, `../../data/${BDD_FILE_NAME}.db`);

    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      Logger.info(location, 'Created data directory:', dataDir);
    }

    this.db = new Database(this.dbPath);
    Logger.info(location, 'Connected to database:', this.dbPath);

    this.initSchema();
    this.runMigrations();
  }

  private initSchema(): void {
    try {
      const baseDir = getDirname();
      const schemaPath = path.join(baseDir, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      this.db.exec(schema);

      Logger.success(location, 'schema.sql initialized successfully in ', this.dbPath);
    } catch (error) {

      Logger.error(location, 'Failed to initialize schema:', error);
      throw error;
    }
  }

  private runMigrations(): void {
    try {
      const baseDir = getDirname();
      const migrationsDir = path.join(baseDir, 'migrations');

      if (!fs.existsSync(migrationsDir)) {
        Logger.info(location, 'No migrations folder found (using schema.sql directly)');
        return;
      }

      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      if (migrationFiles.length === 0) {
        Logger.info(location, 'No migration files found');
        return;
      }

      migrationFiles.forEach(file => {
        const migrationPath = path.join(migrationsDir, file);
        const migration = fs.readFileSync(migrationPath, 'utf-8');

        try {
          this.db.exec(migration);
          Logger.info(location, `Migration applied: ${file}`);
        } catch (error: any) {
          if (error.message && error.message.includes('duplicate column'))
            Logger.info(location, `Migration already applied: ${file}`);
          else
            throw error;
        }
      });
    } catch (error) {
      Logger.error(location, 'Failed to run migrations:', error);
      throw error;
    }
  }

  getConnection(): Database.Database {
    return this.db;
  }

  close(): void {
    if (this.db)
    {
      this.db.close();
      Logger.info(location, 'Database connection closed');
    }
  }
}
