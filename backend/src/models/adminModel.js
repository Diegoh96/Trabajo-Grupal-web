import { query } from '../db.js';

export const adminModel = {
  async getSummary() {
    const [movies, bookings, revenue, seats] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM peliculas WHERE activa = 1'),
      query('SELECT COUNT(*) AS total FROM reservas'),
      query("SELECT COALESCE(SUM(total),0) AS total FROM reservas WHERE estado = 'confirmada'"),
      query("SELECT COUNT(*) AS total FROM asientos WHERE estado = 'vendido'")
    ]);

    return {
      movies: Number(movies.rows[0].total),
      bookings: Number(bookings.rows[0].total),
      revenue: Number(revenue.rows[0].total),
      soldSeats: Number(seats.rows[0].total)
    };
  },

  async findRecentBookings() {
    const { rows } = await query(
      `SELECT r.id, r.nombre_cliente, r.email_cliente, r.total, r.estado, r.creado_en,
              p.titulo AS pelicula_titulo, f.fecha_hora, f.sala
       FROM reservas r
       JOIN funciones f ON f.id = r.funcion_id
       JOIN peliculas p ON p.id = f.pelicula_id
       ORDER BY r.creado_en DESC
       LIMIT 50`
    );
    return rows;
  }
};
