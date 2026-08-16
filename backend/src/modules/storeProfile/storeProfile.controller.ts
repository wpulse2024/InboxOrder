import { Request, Response } from 'express';
import { z } from 'zod';
import * as storeProfileService from './storeProfile.service';

export async function getStoreProfile(req: Request, res: Response): Promise<void> {
  const result = await storeProfileService.getStoreProfile(req.user!.tenantId);
  res.json(result);
}

const productSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().min(0),
  description: z.string().max(500).optional(),
  sku: z.string().max(60).optional(),
  category: z.string().max(100).optional(),
  imageUrl: z.string().max(1000).optional(),
});

const faqSchema = z.object({
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(1000),
});

const upsertSchema = z.object({
  businessInfo: z.string().max(4000).optional(),
  products: z.array(productSchema).max(100).default([]),
  faqs: z.array(faqSchema).max(50).default([]),
});

export async function upsertStoreProfile(req: Request, res: Response): Promise<void> {
  const data = upsertSchema.parse(req.body);
  const result = await storeProfileService.upsertStoreProfile(req.user!.tenantId, data);
  res.json(result);
}
