import { Schema, model, Document, Types } from 'mongoose';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface IOrderItem {
  product: string;
  quantity: number;
  price?: number;
  subtotal?: number;
  description?: string;
  sku?: string;
  category?: string;
  imageUrl?: string;
}

export interface IOrder extends Document {
  tenantId: Types.ObjectId;
  customerId: Types.ObjectId;
  messageId: Types.ObjectId;
  parsedOrderId?: Types.ObjectId; // link to the ParsedOrder used to create this order
  status: OrderStatus;
  items: IOrderItem[];
  totalAmount?: number;
  parsedBy: 'rule' | 'ai' | 'manual';
  // Denormalized from ParsedOrder for fulfillment display without a join
  phone?: string;
  address?: string;
  notes?: string;
  correctedAt?: Date; // set when a manual correction is applied
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    parsedOrderId: { type: Schema.Types.ObjectId, ref: 'ParsedOrder' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    items: [
      {
        product: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, min: 0 },
        subtotal: { type: Number, min: 0 },
        description: { type: String, maxlength: 500 },
        sku: { type: String, maxlength: 60 },
        category: { type: String, maxlength: 100 },
        imageUrl: { type: String, maxlength: 1000 },
      },
    ],
    totalAmount: { type: Number, min: 0 },
    parsedBy: { type: String, enum: ['rule', 'ai', 'manual'], required: true },
    phone: { type: String },
    address: { type: String },
    notes: { type: String },
    correctedAt: { type: Date },
  },
  { timestamps: true }
);

// Hot path: orders list filtered by status
orderSchema.index({ tenantId: 1, status: 1 });
// Hot path: paginated orders sorted by date (default view)
orderSchema.index({ tenantId: 1, createdAt: -1 });
// Hot path: customer order history
orderSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
// Analytics: filter by date range across statuses
orderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export const Order = model<IOrder>('Order', orderSchema);
