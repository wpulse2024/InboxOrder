import { Request, Response } from 'express';
import { z } from 'zod';
import * as settingsService from './settings.service';

export async function getSettings(req: Request, res: Response): Promise<void> {
  const result = await settingsService.getSettings(req.user!.tenantId);
  res.json(result);
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  settings: z
    .object({
      autoConfirmOrders: z.boolean().optional(),
      aiParserEnabled: z.boolean().optional(),
      notificationsEnabled: z.boolean().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const data = updateSchema.parse(req.body);
  const result = await settingsService.updateSettings(req.user!.tenantId, data);
  res.json(result);
}

const connectSchema = z.object({
  pageId: z.string().min(1),
  accessToken: z.string().min(1),
});

export async function connectFacebook(req: Request, res: Response): Promise<void> {
  const { pageId, accessToken } = connectSchema.parse(req.body);
  const result = await settingsService.connectFacebook(req.user!.tenantId, pageId, accessToken);
  res.json(result);
}

export async function disconnectFacebook(req: Request, res: Response): Promise<void> {
  const result = await settingsService.disconnectFacebook(req.user!.tenantId);
  res.json(result);
}
