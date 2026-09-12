import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  close(): Promise<void>;
}

class DatabaseManager implements DatabaseClient {
  private pglite: PGlite | null = null;
  private pgPool: pg.Pool | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const databaseUrl = process.env.DATABASE_URL;

    // If external DATABASE_URL is provided, use PostgreSQL Pool
    if (databaseUrl && !databaseUrl.includes('localhost:5432/pulseboard')) {
      try {
        this.pgPool = new pg.Pool({
          connectionString: databaseUrl,
          ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
        });
        await this.pgPool.query('SELECT 1');
        console.log('Connected to external PostgreSQL database via pg.Pool');
      } catch (err) {
        console.warn('Could not connect to external PostgreSQL, falling back to embedded PGlite:', err);
        this.pgPool = null;
      }
    }

    if (!this.pgPool) {
      const dataDir = path.join(process.cwd(), 'data', 'pgdata');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      try {
        this.pglite = new PGlite(dataDir);
        await this.pglite.waitReady;
        console.log(`Connected to embedded PostgreSQL (PGlite) at ${dataDir}`);
      } catch (err) {
        console.warn('PGlite directory initialization fallback to in-memory PGlite:', err);
        this.pglite = new PGlite();
        await this.pglite.waitReady;
        console.log('Connected to in-memory PostgreSQL (PGlite)');
      }
    }

    this.initialized = true;
    await this.applySchema();
  }

  private async applySchema(): Promise<void> {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('schema.sql not found at', schemaPath);
      return;
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Execute schema statements
    if (this.pgPool) {
      await this.pgPool.query(schemaSql);
    } else if (this.pglite) {
      await this.pglite.exec(schemaSql);
    }

    // Check if users table is populated, if not, auto-run seed
    const check = await this.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(check.rows[0]?.count || '0', 10);
    if (count === 0) {
      console.log('Database tables are empty. Running initial database seed...');
      const { seedDatabase } = await import('../seed.js');
      await seedDatabase();
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.initialized) {
      await this.init();
    }

    if (this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount ?? res.rows.length,
      };
    }

    if (this.pglite) {
      const res = await this.pglite.query(sql, params);
      return {
        rows: (res.rows || []) as T[],
        rowCount: res.rows ? res.rows.length : 0,
      };
    }

    throw new Error('Database client is not initialized');
  }

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.pglite) {
      await this.pglite.close();
    }
    this.initialized = false;
  }
}

export const db = new DatabaseManager();
