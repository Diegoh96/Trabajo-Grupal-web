import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

async function main() {
  const dbName = process.env.DB_NAME || 'cinemark_db';
  const serverConnection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  const schemaPath = path.join(backendRoot, 'sql', 'schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');
  await serverConnection.query(schema);
  await serverConnection.end();

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    multipleStatements: true
  });

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cinemark.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(adminPassword, 10);

  await connection.execute(
    `INSERT INTO usuarios (nombre, email, password_hash, rol)
     VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), rol = 'admin'`,
    ['Administrador', adminEmail, hash]
  );

  await connection.query(`
    INSERT INTO tipos_asiento (nombre, precio, descripcion) VALUES
      ('VIP', 9500.00, 'Centro de sala, mejor vista'),
      ('Preferencial', 7200.00, 'Vista central'),
      ('General', 5200.00, 'Entrada estándar')
    ON DUPLICATE KEY UPDATE precio = VALUES(precio), descripcion = VALUES(descripcion);
  `);

  const [moviesResult] = await connection.query(`
    INSERT INTO peliculas (titulo, sinopsis, duracion_minutos, director, clasificacion, genero, total_asientos) VALUES
      ('Medianoche en la Ciudad', 'Thriller urbano con estética oscura y tensión constante.', 118, 'A. Valdés', '14+', 'Suspenso', 100),
      ('Órbita Final', 'Ciencia ficción sobre una tripulación atrapada en una estación orbital.', 132, 'M. Torres', 'TE+7', 'Ciencia ficción', 100),
      ('Risas de Viernes', 'Comedia familiar para una salida ligera al cine.', 96, 'C. Fuentes', 'TE', 'Comedia', 100);
  `);

  const [movieRows] = await connection.query('SELECT id, titulo FROM peliculas ORDER BY id');
  const nowPlus = days => {
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 19).replace('T', ' ');
  };

  const sessions = [
    [movieRows[0].id, nowPlus(3), 'Sala 1', '2D'],
    [movieRows[1].id, nowPlus(5), 'Sala 2', 'IMAX'],
    [movieRows[2].id, nowPlus(7), 'Sala 3', '2D']
  ];

  for (const session of sessions) {
    await connection.execute(
      'INSERT INTO funciones (pelicula_id, fecha_hora, sala, formato) VALUES (?, ?, ?, ?)',
      session
    );
  }

  const [types] = await connection.query('SELECT id, nombre FROM tipos_asiento');
  const typeByName = Object.fromEntries(types.map(type => [type.nombre, type.id]));
  const [sessionRows] = await connection.query('SELECT id FROM funciones ORDER BY id');

  for (const session of sessionRows) {
    for (let row = 1; row <= 10; row++) {
      const fila = String.fromCharCode(64 + row);
      for (let number = 1; number <= 10; number++) {
        const codigo = `${fila}${number}`;
        const tipo = row <= 2 ? 'VIP' : row <= 5 ? 'Preferencial' : 'General';
        await connection.execute(
          `INSERT INTO asientos (funcion_id, codigo, fila, numero, tipo_asiento_id)
           VALUES (?, ?, ?, ?, ?)`,
          [session.id, codigo, fila, number, typeByName[tipo]]
        );
      }
    }
  }

  await connection.end();
  console.log('Base de datos MySQL inicializada. Admin:', adminEmail, 'Password:', adminPassword);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
