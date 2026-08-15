import crypto from 'crypto';
import { getPlatformConfig } from '../../config/platformConfig';
import { Tenant } from '../../models/Tenant';
import { findActivePageById, findPageByVerifyToken } from '../facebook/facebook.service';
import { enqueueMessage } from '../../queue/queues';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import * as repo from './webhook.repository';

export function verifyFacebookSignature(rawBody: Buffer, signature: string): boolean {
  const { facebookAppSecret } = getPlatformConfig();
  if (!facebookAppSecret) return false;
  const expected = `sha256=${crypto
    .createHmac('sha256', facebookAppSecret)
    .update(rawBody)
    .digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Resolves the tenantId for a given Facebook pageId.
 *
 * Lookup order:
 *  1. FacebookPage collection (multi-page model — new)
 *  2. Tenant.pageId field (legacy single-page model — fallback)
 *
 * Returns null when no tenant is found for the pageId.
 */
async function resolveTenantId(pageId: string): Promise<string | null> {
  const fbPage = await findActivePageById(pageId);
  if (fbPage) return fbPage.tenantId.toString();

  // Legacy fallback: tenants whose single pageId was stored directly on the Tenant document
  const legacyTenant = await Tenant.findOne({ pageId }, { _id: 1 }).lean();
  return legacyTenant ? legacyTenant._id.toString() : null;
}

export async function handleWebhookEvent(payload: Record<string, unknown>): Promise<void> {
  const entries = (payload.entry as unknown[]) ?? [];

  for (const entry of entries) {
    const e = entry as Record<string, unknown>;
    const pageId = e.id as string;
    const messaging = (e.messaging as unknown[]) ?? [];

    const tenantId = await resolveTenantId(pageId);
    if (!tenantId) {
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
      const exists = await repo.messageExists(tenantId, fbMessageId);
      if (exists) {
        logger.debug({ fbMessageId }, 'Duplicate message, skipping');
        continue;
      }

      const savedMsg = await repo.createMessage({
        tenantId,
        fbMessageId,
        senderId,
        text,
        rawPayload: msg as Record<string, unknown>,
      });

      const webhookLog = await repo.createWebhookLog({
        tenantId,
        messageId: savedMsg._id,
        eventType: 'message',
        payload: msg as Record<string, unknown>,
        statusCode: 200,
      });

      const msgId = savedMsg._id.toString();
      const logId = webhookLog._id.toString();

      logger.info({ messageId: msgId, tenantId }, 'Message stored, enqueuing for processing');

      // Enqueue to BullMQ — returns immediately, worker handles retries.
      await enqueueMessage(msgId, tenantId, logId);
    }
  }
}

/**
 * Verifies the Facebook webhook challenge.
 *
 * Accepts:
 *  1. The global app-level FACEBOOK_VERIFY_TOKEN (env var)
 *  2. Any per-page verify token stored in the FacebookPage collection
 */
export async function verifyChallenge(
  mode: string,
  token: string,
  challenge: string
): Promise<string> {
  if (mode !== 'subscribe') throw new AppError('Webhook verification failed', 403);

  // Fast path: app-level token
  if (getPlatformConfig().facebookVerifyToken && token === getPlatformConfig().facebookVerifyToken) {
    return challenge;
  }

  // Per-page token: look up in FacebookPage collection
  const page = await findPageByVerifyToken(token);
  if (page) return challenge;

  throw new AppError('Webhook verification failed', 403);
}
