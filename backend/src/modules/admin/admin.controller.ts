import { Request, Response } from 'express';
import { z } from 'zod';
import { getPlatformConfigView, updatePlatformConfig } from '../../config/platformConfig';

/** GET /api/admin/config — masked view, secrets returned as booleans only. */
export async function getConfig(_req: Request, res: Response): Promise<void> {
  res.json(await getPlatformConfigView());
}

const patchSchema = z.object({
  facebookAppId: z.string().min(1).nullable().optional(),
  facebookAppSecret: z.string().min(1).nullable().optional(),
  facebookVerifyToken: z.string().min(1).nullable().optional(),
  appBaseUrl: z.string().url().nullable().optional(),
  frontendUrl: z.string().url().nullable().optional(),
  aiApiKey: z.string().min(1).nullable().optional(),
  aiApiUrl: z.string().url().nullable().optional(),
  aiModel: z.string().min(1).nullable().optional(),
  aiTimeoutMs: z.number().int().positive().nullable().optional(),
});

/** PATCH /api/admin/config — partial update, applies immediately (no restart). */
export async function patchConfig(req: Request, res: Response): Promise<void> {
  const patch = patchSchema.parse(req.body);
  await updatePlatformConfig(patch, req.user!.userId);
  res.json(await getPlatformConfigView());
}
