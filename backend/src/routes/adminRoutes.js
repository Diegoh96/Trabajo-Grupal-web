import { Router } from 'express';
import { requireAuth, requireAdmin } from '../auth.js';
import { adminController } from '../controllers/adminController.js';

export const adminRoutes = Router();
adminRoutes.use(requireAuth, requireAdmin);
adminRoutes.get('/summary', adminController.summary);
adminRoutes.get('/bookings', adminController.bookings);
