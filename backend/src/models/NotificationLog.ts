import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType = 'order:new' | 'order:updated' | 'webhook:failure' | 'system';

export interface INotificationLog extends Document {
  tenantId: Types.ObjectId;
  userId?: Types.ObjectId;   // scoped to a specific user; null = broadcast to all tenant users
  type: NotificationType;
  message: string;
  read: boolean;
  readAt?: Date;             // timestamp when marked read
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const notificationLogSchema = new Schema<INotificationLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['order:new', 'order:updated', 'webhook:failure', 'system'],
      required: true,
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Primary query: unread notification feed for a tenant, newest first
notificationLogSchema.index({ tenantId: 1, read: 1, createdAt: -1 });
// Supports user-specific notification filtering
notificationLogSchema.index({ tenantId: 1, userId: 1, read: 1, createdAt: -1 });

export const NotificationLog = model<INotificationLog>('NotificationLog', notificationLogSchema);
