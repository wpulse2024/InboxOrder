import { Schema, model, Document, Types } from 'mongoose';

// Facebook Messenger senders (one per page/tenant scope)
export interface ICustomer extends Document {
  tenantId: Types.ObjectId;
  fbSenderId: string;
  name: string;
  phone?: string;
  address?: string;
  totalOrders: number;       // denormalized counter for fast listing
  lastMessageAt?: Date;      // last interaction timestamp for activity sorting
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    fbSenderId: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    totalOrders: { type: Number, default: 0, min: 0 },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

// Unique customer per page; used heavily during upsert in message processor
customerSchema.index({ tenantId: 1, fbSenderId: 1 }, { unique: true });
// Supports paginated customer list sorted by recency
customerSchema.index({ tenantId: 1, createdAt: -1 });
// Supports "most recent activity" sort in customer list view
customerSchema.index({ tenantId: 1, lastMessageAt: -1 });

export const Customer = model<ICustomer>('Customer', customerSchema);
