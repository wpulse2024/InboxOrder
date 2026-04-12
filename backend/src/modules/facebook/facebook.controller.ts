import { Request, Response } from 'express';
import { z } from 'zod';
import * as facebookService from './facebook.service';

const addPageSchema = z.object({
  pageId: z.string().min(1),
  pageName: z.string().min(1),
  accessToken: z.string().min(1),
  tokenExpiresAt: z.string().datetime().nullable().optional(),
});

export async function addPage(req: Request, res: Response): Promise<void> {
  const { pageId, pageName, accessToken, tokenExpiresAt } = addPageSchema.parse(req.body);
  const expiresAt = tokenExpiresAt ? new Date(tokenExpiresAt) : null;
  const result = await facebookService.addPage(
    req.user!.tenantId,
    pageId,
    pageName,
    accessToken,
    expiresAt
  );
  res.status(201).json(result);
}

export async function removePage(req: Request, res: Response): Promise<void> {
  await facebookService.removePage(req.user!.tenantId, req.params.pageId);
  res.json({ message: 'Facebook page disconnected' });
}

export async function listPages(req: Request, res: Response): Promise<void> {
  const pages = await facebookService.listPages(req.user!.tenantId);
  res.json({ pages });
}

const rotateTokenSchema = z.object({
  accessToken: z.string().min(1),
  tokenExpiresAt: z.string().datetime().nullable().optional(),
});

export async function rotateToken(req: Request, res: Response): Promise<void> {
  const { accessToken, tokenExpiresAt } = rotateTokenSchema.parse(req.body);
  const expiresAt = tokenExpiresAt ? new Date(tokenExpiresAt) : null;
  const result = await facebookService.rotateToken(
    req.user!.tenantId,
    req.params.pageId,
    accessToken,
    expiresAt
  );
  res.json(result);
}
