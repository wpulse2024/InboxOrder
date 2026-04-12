import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import webhookRoutes from './modules/webhook/webhook.routes';
import ordersRoutes from './modules/orders/orders.routes';
import customersRoutes from './modules/customers/customers.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import settingsRoutes from './modules/settings/settings.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import facebookRoutes from './modules/facebook/facebook.routes';

export function createApp() {
  const app = express();

  // Security
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Capture raw body for webhook signature verification
  app.use(
    express.json({
      verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  app.use(express.urlencoded({ extended: true }));

  // Rate limiting
  app.use('/api', apiRateLimiter);

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/webhook', webhookRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/customers', customersRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/facebook', facebookRoutes);

  // Global error handler — must be last
  app.use(errorHandler);

  return app;
}
