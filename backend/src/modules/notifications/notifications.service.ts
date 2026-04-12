import { NotificationLog } from '../../models/NotificationLog';
import { AppError } from '../../middleware/errorHandler';
import { emitNotification } from '../../realtime/emitters';

export async function getNotifications(tenantId: string, unreadOnly = false) {
  const query: Record<string, unknown> = { tenantId };
  if (unreadOnly) query.read = false;

  return NotificationLog.find(query).sort({ createdAt: -1 }).limit(50).lean();
}

export async function markRead(notificationId: string, tenantId: string) {
  const notification = await NotificationLog.findOneAndUpdate(
    { _id: notificationId, tenantId },
    { read: true },
    { new: true }
  );
  if (!notification) throw new AppError('Notification not found', 404);
  return notification;
}

export async function createNotification(
  tenantId: string,
  type: 'order:new' | 'order:updated' | 'webhook:failure' | 'system',
  message: string,
  metadata?: Record<string, unknown>
) {
  const notification = await NotificationLog.create({ tenantId, type, message, metadata });
  emitNotification(tenantId, notification.toObject());
  return notification;
}
