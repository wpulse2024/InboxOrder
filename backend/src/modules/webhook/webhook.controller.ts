import { Request, Response } from 'express';
import * as webhookService from './webhook.service';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

export async function handlePost(req: Request, res: Response): Promise<void> {
  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) throw new AppError('Missing signature', 400);

  const rawBody: Buffer = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from('');
  const valid = webhookService.verifyFacebookSignature(rawBody, signature);
  if (!valid) throw new AppError('Invalid signature', 403);

  // Respond to Facebook immediately — processing happens async in queue
  res.sendStatus(200);

  try {
    await webhookService.handleWebhookEvent(req.body as Record<string, unknown>);
  } catch (err) {
    logger.error({ err }, 'Error processing webhook event');
  }
}

export function handleGet(req: Request, res: Response): void {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const result = webhookService.verifyChallenge(mode, token, challenge);
  res.send(result);
}
