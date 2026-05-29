import { query } from '../db.js';

export const movieModel = {
  async findActive() {
    const { rows } = await query(
      `SELECT
         p.id,
         p.titulo,
         p.sinopsis,
         p.duracion_minutos,
         p.director,
         p.clasificacion,
         p.genero,
         f.id AS funcion_id,
         f.fecha_hora,
         f.sala,
         f.formato
       FROM peliculas p
       JOIN funciones f ON f.pelicula_id = p.id
       WHERE p.activa = 1 AND f.activa = 1
       ORDER BY f.fecha_hora ASC`
    );
    return rows;
  },

  async create({ titulo, sinopsis = '', duracion_minutos, director = '', clasificacion = 'TE', genero = '', total_asientos = 100, fecha_hora, sala = 'Sala 1', formato = '2D' }) {
    const { rows: movieResult } = await query(
      `INSERT INTO peliculas (titulo, sinopsis, duracion_minutos, director, clasificacion, genero, total_asientos)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [titulo, sinopsis, duracion_minutos, director, clasificacion, genero, total_asientos]
    );

    let session = null;
    if (fecha_hora) {
      const { rows: sessionResult } = await query(
        `INSERT INTO funciones (pelicula_id, fecha_hora, sala, formato) VALUES (?, ?, ?, ?)`,
        [movieResult.insertId, fecha_hora, sala, formato]
      );
      session = { id: sessionResult.insertId, pelicula_id: movieResult.insertId, fecha_hora, sala, formato };
    }

    return { id: movieResult.insertId, titulo, sinopsis, duracion_minutos, director, clasificacion, genero, total_asientos, funcion: session };
  },

  async findSeats(sessionId) {
    const { rows } = await query(
      `SELECT a.id, a.codigo, a.estado, ta.nombre AS tipo, ta.precio, ta.descripcion
       FROM asientos a
       JOIN tipos_asiento ta ON ta.id = a.tipo_asiento_id
       WHERE a.funcion_id = ?
       ORDER BY a.fila, a.numero`,
      [sessionId]
    );
    return rows;
  }
};
