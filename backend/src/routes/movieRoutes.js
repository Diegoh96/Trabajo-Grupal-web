import { Router } from 'express';
import { requireAuth, requireAdmin } from '../auth.js';
import { movieController } from '../controllers/movieController.js';

export const movieRoutes = Router();
movieRoutes.get('/', movieController.index);
movieRoutes.post('/', requireAuth, requireAdmin, movieController.create);
movieRoutes.get('/sessions/:id/seats', movieController.seats);
