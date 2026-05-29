import { Router } from 'express';
import { requireAuth, optionalAuth } from '../auth.js';
import { bookingController } from '../controllers/bookingController.js';

export const bookingRoutes = Router();
bookingRoutes.post('/', optionalAuth, bookingController.create);
bookingRoutes.get('/me', requireAuth, bookingController.myHistory);
