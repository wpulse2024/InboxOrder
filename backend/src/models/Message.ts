import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  tenantId: Types.ObjectId;
  fbMessageId: string;
  senderId: string;              // Facebook sender PSID (string)
  customerId?: Types.ObjectId;   // resolved after customer upsert in processor
  text: string;
  rawPayload: Record<string, unknown>;
  processed: boolean;
  processingError?: string;      // captures worker failures for debugging
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    fbMessageId: { type: String, required: true },
    senderId: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    text: { type: String, required: true },
    rawPayload: { type: Schema.Types.Mixed, required: true },
    processed: { type: Boolean, default: false, index: true },
    processingError: { type: String },
  },
  { timestamps: true }
);

// Idempotency: same FB message must not be processed twice per tenant
messageSchema.index({ tenantId: 1, fbMessageId: 1 }, { unique: true });
// Supports paginated message list and analytics by time
messageSchema.index({ tenantId: 1, createdAt: -1 });
// Supports picking up unprocessed messages for queue recovery
messageSchema.index({ tenantId: 1, processed: 1, createdAt: 1 });

export const Message = model<IMessage>('Message', messageSchema);
