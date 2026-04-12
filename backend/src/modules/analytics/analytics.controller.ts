import { Request, Response } from 'express';
import * as analyticsService from './analytics.service';

export async function getSummary(req: Request, res: Response): Promise<void> {
  const result = await analyticsService.getSummary(req.user!.tenantId);
  res.json(result);
}

export async function getTopProducts(req: Request, res: Response): Promise<void> {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const result = await analyticsService.getTopProducts(req.user!.tenantId, limit);
  res.json(result);
}

export async function getPeakHours(req: Request, res: Response): Promise<void> {
  const result = await analyticsService.getPeakHours(req.user!.tenantId);
  res.json(result);
}

export async function getConversion(req: Request, res: Response): Promise<void> {
  const result = await analyticsService.getConversion(req.user!.tenantId);
  res.json(result);
}
