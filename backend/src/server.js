import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRoutes } from './routes/authRoutes.js';
import { movieRoutes } from './routes/movieRoutes.js';
import { bookingRoutes } from './routes/bookingRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(backendRoot, '..');
const frontendPublicPath = path.join(projectRoot, 'frontend', 'public');

dotenv.config({ path: path.join(backendRoot, '.env') });

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Frontend separado del backend.
// Desde backend/src/server.js apunta a: ../../frontend/public
app.use(express.static(frontendPublicPath));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'cinemark-sistema' });
});

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Evita que rutas API inexistentes devuelvan index.html.
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Ruta API no encontrada' });
});

// SPA/fallback del frontend.
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPublicPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Servidor listo en http://localhost:${port}`);
});
