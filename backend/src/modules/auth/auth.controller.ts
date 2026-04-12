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

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Unauthorized', 401);
  const result = await authService.getMe(req.user.userId);
  res.json(result);
}
