import { cinemaFacade } from '../patterns/structural/CinemaFacade.js';

export const bookingController = {
  async create(req, res) {
    try {
      const payload = { ...req.body };

      if (req.user) {
        payload.usuario_id = req.user.id;
        payload.nombre_cliente = req.user.nombre;
        payload.email_cliente = req.user.email;
      }

      const result = await cinemaFacade.createBooking(payload);
      res.status(201).json(result);
    } catch (error) {
      console.error(error);
      res.status(error.statusCode || 500).json({ message: error.message || 'Error al crear la reserva' });
    }
  },

  async myHistory(req, res) {
    try {
      const history = await cinemaFacade.listBookingHistory(req.user.id);
      res.json(history);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al cargar historial de reservas' });
    }
  }
};
