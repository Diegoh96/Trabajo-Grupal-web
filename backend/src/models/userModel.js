import bcrypt from 'bcryptjs';
import { query } from '../db.js';

export const userModel = {
  async createClient({ nombre, email, password }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES (?, ?, ?, 'cliente')`,
      [nombre, email.toLowerCase(), passwordHash]
    );

    return { id: rows.insertId, nombre, email: email.toLowerCase(), rol: 'cliente' };
  },

  async findByEmail(email) {
    const { rows } = await query('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [String(email || '').toLowerCase()]);
    return rows[0];
  },

  async validatePassword(password, hash) {
    return bcrypt.compare(password || '', hash);
  }
};
