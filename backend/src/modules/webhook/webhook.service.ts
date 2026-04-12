import crypto from 'crypto';
import { env } from '../../config/env';
import { Message } from '../../models/Message';
import { Tenant } from '../../models/Tenant';
import { WebhookLog } from '../../models/WebhookLog';
import { processMessage } from '../../queue/messageProcessor';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

export function verifyFacebookSignature(rawBody: Buffer, signature: string): boolean {
  const expected = `sha256=${crypto
    .createHmac('sha256', env.facebookAppSecret)
    .update(rawBody)
    .digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function handleWebhookEvent(payload: Record<string, unknown>): Promise<void> {
  const entries = (payload.entry as unknown[]) ?? [];

  for (const entry of entries) {
    const e = entry as Record<string, unknown>;
    const pageId = e.id as string;
    const messaging = (e.messaging as unknown[]) ?? [];

    const tenant = await Tenant.findOne({ pageId });
    if (!tenant) {
      logger.warn({ pageId }, 'No tenant found for pageId, skipping');
      continue;
    }

    for (const msg of messaging) {
      const m = msg as Record<string, unknown>;
      const messageData = m.message as Record<string, unknown> | undefined;
      if (!messageData) continue;

      const fbMessageId = messageData.mid as string;
      const senderId = (m.sender as Record<string, unknown>)?.id as string;
      const text = (messageData.text as string) ?? '';

      if (!text.trim()) continue;

      // Idempotency: skip duplicate webhook deliveries
      const exists = await Message.exists({ tenantId: tenant._id, fbMessageId });
      if (exists) {
        logger.debug({ fbMessageId }, 'Duplicate message, skipping');
        continue;
      }

      const savedMsg = await Message.create({
        tenantId: tenant._id,
        fbMessageId,
        senderId,
        text,
        rawPayload: msg as Record<string, unknown>,
        processed: false,
      });

      // Fire-and-forget: webhook must return within 5s
      setImmediate(() => {
        processMessage(savedMsg._id.toString(), tenant._id.toString()).catch((err) =>
          logger.error({ err, messageId: savedMsg._id }, 'Message processing failed')
        );
      });

      logger.info({ messageId: savedMsg._id, tenantId: tenant._id }, 'Message queued for processing');

      await WebhookLog.create({
        tenantId: tenant._id,
        eventType: 'message',
        payload: msg as Record<string, unknown>,
        statusCode: 200,
        retries: 0,
      });
    }
  }
}

export function verifyChallenge(
  mode: string,
  token: string,
  challenge: string
): string {
  if (mode === 'subscribe' && token === env.facebookVerifyToken) {
    return challenge;
  }
  throw new AppError('Webhook verification failed', 403);
}
