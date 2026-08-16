import { Schema, model, Document, Types } from 'mongoose';
import type { OrderStatus } from './Order';

export interface IOrderStatusHistory extends Document {
  tenantId: Types.ObjectId;
  orderId: Types.ObjectId;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  changedBy?: Types.ObjectId; // User._id — unset when the change was system/bot-driven, not a dashboard user
  note?: string;
  createdAt: Date;
}

const orderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    fromStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      required: true,
    },
    toStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      required: true,
    },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
  },
  // History is append-only; no updatedAt needed
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Primary query: fetch full history for a single order in chronological order
orderStatusHistorySchema.index({ tenantId: 1, orderId: 1, createdAt: -1 });

export const OrderStatusHistory = model<IOrderStatusHistory>(
  'OrderStatusHistory',
  orderStatusHistorySchema
);
