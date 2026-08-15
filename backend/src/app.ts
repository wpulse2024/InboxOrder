import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { getPlatformConfig } from './config/platformConfig';

import authRoutes from './modules/auth/auth.routes';
import webhookRoutes from './modules/webhook/webhook.routes';
import ordersRoutes from './modules/orders/orders.routes';
import customersRoutes from './modules/customers/customers.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import settingsRoutes from './modules/settings/settings.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import facebookRoutes from './modules/facebook/facebook.routes';
import facebookOAuthPublicRoutes from './modules/settings/facebookOAuthPublic.routes';
import adminRoutes from './modules/admin/admin.routes';

export function createApp() {
  const app = express();

  // Security
  app.use(helmet());
  app.use(
    cors({
      // Read on every request (not captured at boot) so an admin-updated frontendUrl
      // takes effect immediately — see config/platformConfig.ts.
      origin: (_origin, callback) => callback(null, getPlatformConfig().frontendUrl ?? '*'),
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
  app.use('/api/facebook-oauth', facebookOAuthPublicRoutes);
  app.use('/api/admin', adminRoutes);

  // Global error handler — must be last
  app.use(errorHandler);

  return app;
}
