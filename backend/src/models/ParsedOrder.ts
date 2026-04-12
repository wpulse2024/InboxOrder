import { Schema, model, Document, Types } from 'mongoose';

export interface IParsedOrder extends Document {
  tenantId: Types.ObjectId;
  messageId: Types.ObjectId;
  intent: 'order' | 'question' | 'spam' | 'unknown';
  product?: string;
  quantity?: number;
  phone?: string;
  address?: string;
  confidence: number;  // 0.0 – 1.0
  source: 'rule' | 'ai';
  rawText: string;
  createdAt: Date;
  updatedAt: Date;
}

const parsedOrderSchema = new Schema<IParsedOrder>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true, index: true },
    intent: {
      type: String,
      enum: ['order', 'question', 'spam', 'unknown'],
      required: true,
    },
    product: { type: String },
    quantity: { type: Number, min: 1 },
    phone: { type: String },
    address: { type: String },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    source: { type: String, enum: ['rule', 'ai'], required: true },
    rawText: { type: String, required: true },
  },
  { timestamps: true }
);

// Supports fetching parsed result for a specific message (order detail view)
parsedOrderSchema.index({ tenantId: 1, messageId: 1 });
// Supports confidence analytics and filtering low-confidence results
parsedOrderSchema.index({ tenantId: 1, source: 1, confidence: -1 });

export const ParsedOrder = model<IParsedOrder>('ParsedOrder', parsedOrderSchema);
