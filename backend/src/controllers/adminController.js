import { cinemaFacade } from '../patterns/structural/CinemaFacade.js';

export const adminController = {
  async summary(_req, res) {
    res.json(await cinemaFacade.getAdminSummary());
  },

  async bookings(_req, res) {
    res.json(await cinemaFacade.listRecentBookings());
  }
};
