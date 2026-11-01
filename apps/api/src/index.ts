import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import { connectDB } from './config/database';
import { logger } from './config/logger';
import { errorHandler, notFound } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import plansRoutes from './routes/plans';
import tasksRoutes from './routes/tasks';
import roadmapRoutes from './routes/roadmap';
import profileRoutes from './routes/profile';
import dashboardRoutes from './routes/dashboard';

const app = express();

// ── Security middleware ───────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// ── Rate limiting ─────────────────────────────────────────────
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests. Please wait.' },
  })
);

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── HTTP logging (skips health check) ────────────────────────
app.use(
  morgan('dev', {
    skip: (req) => req.path === '/health',
  })
);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Error handling ────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDB();
    const server = app.listen(env.PORT, () => {
      logger.info(`PlacementOS API running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received — shutting down gracefully');
      server.close(() => process.exit(0));
    });
    process.on('SIGINT', async () => {
      logger.info('SIGINT received — shutting down gracefully');
      server.close(() => process.exit(0));
    });
  } catch (err) {
    logger.error('Failed to start server', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

bootstrap();

export default app;
