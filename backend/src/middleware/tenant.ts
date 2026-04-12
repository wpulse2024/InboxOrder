import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Ensures req.user.tenantId is present on every protected route.
 * Must be used after the `authenticate` middleware.
 */
export function requireTenant(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.tenantId) {
    return next(new AppError('Tenant context missing', 403));
  }
  next();
}
