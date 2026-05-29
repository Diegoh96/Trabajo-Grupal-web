import { movieModel } from '../../models/movieModel.js';
import { bookingService } from '../../services/bookingService.js';
import { adminModel } from '../../models/adminModel.js';

/**
 * PATRÓN ESTRUCTURAL: Facade
 * Simplifica el acceso de los controladores a películas, funciones, asientos,
 * reservas y métricas administrativas.
 */
export const cinemaFacade = {
  listMovies: () => movieModel.findActive(),
  createMovie: movie => movieModel.create(movie),
  listSeatsBySession: sessionId => movieModel.findSeats(sessionId),

  createBooking: booking => bookingService.createBooking(booking),
  listBookingHistory: userId => bookingService.findHistoryByUser(userId),

  getAdminSummary: () => adminModel.getSummary(),
  listRecentBookings: () => adminModel.findRecentBookings()
};
