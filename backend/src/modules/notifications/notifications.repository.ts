import { NotificationLog, INotificationLog } from '../../models/NotificationLog';

export async function findNotifications(tenantId: string, unreadOnly: boolean) {
  const query: Record<string, unknown> = { tenantId };
  if (unreadOnly) query.read = false;
  return NotificationLog.find(query).sort({ createdAt: -1 }).limit(50).lean();
}

export async function markNotificationRead(
  notificationId: string,
  tenantId: string
): Promise<INotificationLog | null> {
  return NotificationLog.findOneAndUpdate(
    { _id: notificationId, tenantId },
    { read: true, readAt: new Date() },
    { new: true }
  );
}

export async function insertNotification(
  tenantId: string,
  type: 'order:new' | 'order:updated' | 'webhook:failure' | 'system',
  message: string,
  metadata?: Record<string, unknown>
): Promise<INotificationLog> {
  return NotificationLog.create({ tenantId, type, message, metadata });
}
