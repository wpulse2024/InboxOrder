import { AppError } from '../../middleware/errorHandler';
import { emitNotification } from '../../realtime/emitters';
import * as repo from './notifications.repository';

export async function getNotifications(tenantId: string, unreadOnly = false) {
  return repo.findNotifications(tenantId, unreadOnly);
}

export async function markRead(notificationId: string, tenantId: string) {
  const notification = await repo.markNotificationRead(notificationId, tenantId);
  if (!notification) throw new AppError('Notification not found', 404);
  return notification;
}

export async function createNotification(
  tenantId: string,
  type: 'order:new' | 'order:updated' | 'webhook:failure' | 'system',
  message: string,
  metadata?: Record<string, unknown>
) {
  const notification = await repo.insertNotification(tenantId, type, message, metadata);
  emitNotification(tenantId, notification.toObject());
  return notification;
}
