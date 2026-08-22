import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middleware/error-handler';

// Route imports
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import appointmentRoutes from './routes/appointment.routes';
import doctorRoutes from './routes/doctor.routes';
import calendarRoutes from './routes/calendar.routes';

const app = express();

// ── Middleware ────────────────────────────────────────
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Health Check ─────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', appointmentRoutes);        // /doctors, /appointments
app.use('/api/v1/doctor', doctorRoutes);
app.use('/api/v1/calendar', calendarRoutes);

// ── 404 Handler ──────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Error Handler ────────────────────────────────────
app.use(errorHandler);

export default app;
