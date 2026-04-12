import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import * as authRepo from './auth.repository';
import type { JwtPayload } from '../../middleware/auth';

export async function register(data: {
  email: string;
  password: string;
  name: string;
  tenantName: string;
}): Promise<{ token: string }> {
  const existing = await authRepo.findUserByEmail(data.email, '');
  if (existing) throw new AppError('Email already registered', 409);

  const { user, tenant } = await authRepo.createUserAndTenant(data);

  const payload: JwtPayload = {
    userId: (user._id as string).toString(),
    tenantId: (tenant._id as string).toString(),
    role: user.role,
  };

  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
  return { token };
}

export async function login(data: {
  email: string;
  password: string;
  tenantId?: string;
}): Promise<{ token: string }> {
  // When tenantId is not supplied we search by email globally (single-user scenario)
  // In a real multi-tenant setup the login page would know the tenantId from subdomain, etc.
  const user = data.tenantId
    ? await authRepo.findUserByEmail(data.email, data.tenantId)
    : await import('../../models/User').then(({ User }) =>
        User.findOne({ email: data.email.toLowerCase() })
      );

  if (!user) throw new AppError('Invalid credentials', 401);

  const valid = await authRepo.verifyPassword(user, data.password);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const payload: JwtPayload = {
    userId: (user._id as string).toString(),
    tenantId: user.tenantId.toString(),
    role: user.role,
  };

  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
  return { token };
}

export async function getMe(userId: string) {
  const user = await authRepo.findUserById(userId);
  if (!user) throw new AppError('User not found', 404);

  const tenant = await authRepo.findTenantById(user.tenantId.toString());
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenant: tenant
      ? { id: tenant._id, name: tenant.name, pageId: tenant.pageId }
      : null,
  };
}
