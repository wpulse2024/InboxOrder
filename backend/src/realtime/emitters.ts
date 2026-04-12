import { getIO } from '../config/socket';
import { logger } from '../utils/logger';

function emit(room: string, event: string, payload: unknown): void {
  try {
    getIO().to(room).emit(event, payload);
  } catch (err) {
    // Socket may not be initialized in worker-only contexts
    logger.debug({ err, room, event }, 'Socket emit skipped (not initialized)');
  }
}

export function emitOrderNew(tenantId: string, order: unknown): void {
  emit(`tenant:${tenantId}`, 'order:new', { order });
}

export function emitOrderUpdated(tenantId: string, orderId: string, status: string): void {
  emit(`tenant:${tenantId}`, 'order:updated', { orderId, status });
}

export function emitWebhookFailure(tenantId: string, error: string, retries: number): void {
  emit(`tenant:${tenantId}`, 'webhook:failure', { error, retries });
}

export function emitNotification(tenantId: string, notification: unknown): void {
  emit(`tenant:${tenantId}`, 'notification:new', { notification });
}
