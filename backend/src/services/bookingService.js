import { pool } from '../db.js';
import { bookingSubject } from '../patterns/behavioral/BookingObserver.js';

export const bookingService = {
  async createBooking({ usuario_id = null, funcion_id, nombre_cliente, email_cliente, asiento_ids, confiteria = [] }) {
    const connection = await pool.getConnection();

    try {
      if (!funcion_id || !nombre_cliente || !email_cliente || !Array.isArray(asiento_ids) || asiento_ids.length === 0) {
        const error = new Error('Datos de reserva incompletos');
        error.statusCode = 400;
        throw error;
      }

      await connection.beginTransaction();

      const placeholders = asiento_ids.map(() => '?').join(',');
      const [seats] = await connection.execute(
        `SELECT a.id, a.codigo, ta.nombre AS tipo, ta.precio
         FROM asientos a
         JOIN tipos_asiento ta ON ta.id = a.tipo_asiento_id
         WHERE a.funcion_id = ? AND a.id IN (${placeholders}) AND a.estado = 'disponible'
         FOR UPDATE`,
        [funcion_id, ...asiento_ids]
      );

      if (seats.length !== asiento_ids.length) {
        await connection.rollback();
        const error = new Error('Uno o más asientos ya no están disponibles');
        error.statusCode = 409;
        throw error;
      }

      const totalAsientos = seats.reduce((sum, seat) => sum + Number(seat.precio), 0);
      const totalConfiteria = confiteria.reduce((sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 1), 0);
      const total = totalAsientos + totalConfiteria;

      const [bookingResult] = await connection.execute(
        `INSERT INTO reservas (usuario_id, funcion_id, nombre_cliente, email_cliente, cantidad, total, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmada')`,
        [usuario_id, funcion_id, nombre_cliente, email_cliente.toLowerCase(), seats.length, total]
      );

      for (const seat of seats) {
        await connection.execute(
          'INSERT INTO reserva_asientos (reserva_id, asiento_id, precio) VALUES (?, ?, ?)',
          [bookingResult.insertId, seat.id, seat.precio]
        );
      }

      for (const item of confiteria) {
        if (item.item && Number(item.cantidad || 0) > 0) {
          await connection.execute(
            'INSERT INTO confiteria (reserva_id, item, cantidad) VALUES (?, ?, ?)',
            [bookingResult.insertId, item.item, Number(item.cantidad)]
          );
        }
      }

      await connection.execute(`UPDATE asientos SET estado = 'vendido' WHERE id IN (${placeholders})`, asiento_ids);
      await connection.commit();

      const confirmedBooking = {
        id: bookingResult.insertId,
        usuario_id,
        funcion_id,
        nombre_cliente,
        email_cliente: email_cliente.toLowerCase(),
        cantidad: seats.length,
        total,
        estado: 'confirmada'
      };

      bookingSubject.notify('booking.confirmed', confirmedBooking);
      return { booking: confirmedBooking, total };
    } catch (error) {
      try { await connection.rollback(); } catch {}
      throw error;
    } finally {
      connection.release();
    }
  },

  async findHistoryByUser(userId) {
    const [rows] = await pool.execute(
      `SELECT
         r.id,
         r.total,
         r.estado,
         r.creado_en,
         p.titulo AS pelicula_titulo,
         f.fecha_hora,
         f.sala,
         f.formato,
         COALESCE(
           JSON_ARRAYAGG(
             JSON_OBJECT('codigo', a.codigo, 'tipo', ta.nombre, 'precio', ra.precio)
           ),
           JSON_ARRAY()
         ) AS asientos
       FROM reservas r
       JOIN funciones f ON f.id = r.funcion_id
       JOIN peliculas p ON p.id = f.pelicula_id
       LEFT JOIN reserva_asientos ra ON ra.reserva_id = r.id
       LEFT JOIN asientos a ON a.id = ra.asiento_id
       LEFT JOIN tipos_asiento ta ON ta.id = a.tipo_asiento_id
       WHERE r.usuario_id = ?
       GROUP BY r.id, p.titulo, f.fecha_hora, f.sala, f.formato
       ORDER BY r.creado_en DESC`,
      [userId]
    );

    return rows.map(row => ({
      ...row,
      asientos: typeof row.asientos === 'string' ? JSON.parse(row.asientos) : row.asientos
    }));
  }
};
