import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..', '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

/**
 * PATRÓN CREACIONAL: Singleton
 * Mantiene una sola instancia del pool de conexiones MySQL para toda la app.
 */
class DatabaseSingleton {
  static instance;

  constructor() {
    if (DatabaseSingleton.instance) return DatabaseSingleton.instance;

    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cinemark_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      namedPlaceholders: false,
      timezone: 'Z'
    });

    DatabaseSingleton.instance = this;
  }

  async query(sql, params = []) {
    const start = Date.now();
    const [rows] = await this.pool.execute(sql, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV !== 'production') {
      console.log('SQL', { sql, duration, rows: Array.isArray(rows) ? rows.length : rows.affectedRows });
    }

    return { rows };
  }

  connect() {
    return this.pool.getConnection();
  }

  end() {
    return this.pool.end();
  }
}

export const database = new DatabaseSingleton();
