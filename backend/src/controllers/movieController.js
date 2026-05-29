import { cinemaFacade } from '../patterns/structural/CinemaFacade.js';

export const movieController = {
  async index(_req, res) {
    res.json(await cinemaFacade.listMovies());
  },

  async create(req, res) {
    const movie = await cinemaFacade.createMovie(req.body);
    res.status(201).json(movie);
  },

  async seats(req, res) {
    res.json(await cinemaFacade.listSeatsBySession(req.params.id));
  }
};
