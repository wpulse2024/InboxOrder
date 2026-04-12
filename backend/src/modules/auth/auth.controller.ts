import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';
import { AppError } from '../../middleware/errorHandler';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  tenantName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantId: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function register(req: Request, res: Response): Promise<void> {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const data = loginSchema.parse(req.body);
  const result = await authService.login(data);
  res.json(result);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.refresh(refreshToken);
  res.json(result);
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = refreshSchema.parse(req.body);
  await authService.logout(refreshToken);
  res.json({ message: 'Logged out successfully' });
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 401);
  await authService.logoutAll(req.user.userId);
  res.json({ message: 'Logged out from all devices' });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const result = await authService.getMe(req.user.userId);
  res.json(result);
}
