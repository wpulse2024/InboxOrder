import { Request, Response } from 'express';
import { z } from 'zod';
import * as ordersService from './orders.service';
import { AppError } from '../../middleware/errorHandler';
import type { OrderStatus } from '../../models/Order';

export async function listOrders(req: Request, res: Response): Promise<void> {
  const { tenantId } = req.user!;
  const { status, dateFrom, dateTo, page, limit } = req.query;

  const result = await ordersService.listOrders({
    tenantId,
    status: status as OrderStatus | undefined,
    dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo: dateTo ? new Date(dateTo as string) : undefined,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20,
  });

  res.json(result);
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const order = await ordersService.getOrder(req.params.id, req.user!.tenantId);
  res.json(order);
}

const statusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  note: z.string().optional(),
});

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { status, note } = statusSchema.parse(req.body);
  const order = await ordersService.updateStatus(
    req.params.id,
    req.user!.tenantId,
    status,
    req.user!.userId,
    note
  );
  res.json(order);
}

const correctionSchema = z.object({
  items: z
    .array(
      z.object({
        product: z.string(),
        quantity: z.number().min(1),
        price: z.number().optional(),
        description: z.string().max(500).optional(),
        sku: z.string().max(60).optional(),
        category: z.string().max(100).optional(),
        imageUrl: z.string().max(1000).optional(),
      })
    )
    .optional(),
  notes: z.string().optional(),
});

export async function saveCorrection(req: Request, res: Response): Promise<void> {
  const corrections = correctionSchema.parse(req.body);
  const order = await ordersService.saveCorrection(req.params.id, req.user!.tenantId, corrections);
  res.json(order);
}
