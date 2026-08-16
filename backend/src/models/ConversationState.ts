import { Schema, model, Document, Types } from 'mongoose';

// Slot-filling state for the conversational Messenger order-taking flow.
// A document exists only while a conversation is in progress; it is deleted
// as soon as the order is finalized (or the pending-order decision resolves).
export type ConversationStage =
  | 'awaiting_name'
  | 'awaiting_phone'
  | 'awaiting_product'
  | 'awaiting_quantity'
  | 'awaiting_address'
  | 'awaiting_email'
  | 'awaiting_pending_order_decision';

export interface ConversationDraft {
  name?: string;
  phone?: string;
  product?: string;
  quantity?: number;
  address?: string;
  email?: string;
}

export interface IConversationState extends Document {
  tenantId: Types.ObjectId;
  fbSenderId: string;
  stage: ConversationStage;
  draft: ConversationDraft;
  emailAsked: boolean;
  pendingOrderId?: Types.ObjectId;
  decision?: 'keep' | 'replace';
  createdAt: Date;
  updatedAt: Date;
}

const conversationStateSchema = new Schema<IConversationState>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    fbSenderId: { type: String, required: true },
    stage: {
      type: String,
      enum: [
        'awaiting_name',
        'awaiting_phone',
        'awaiting_product',
        'awaiting_quantity',
        'awaiting_address',
        'awaiting_email',
        'awaiting_pending_order_decision',
      ],
      required: true,
    },
    draft: {
      name: { type: String },
      phone: { type: String },
      product: { type: String },
      quantity: { type: Number },
      address: { type: String },
      email: { type: String },
    },
    emailAsked: { type: Boolean, default: false },
    pendingOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    decision: { type: String, enum: ['keep', 'replace'] },
  },
  { timestamps: true }
);

// One in-flight conversation per customer per tenant
conversationStateSchema.index({ tenantId: 1, fbSenderId: 1 }, { unique: true });

export const ConversationState = model<IConversationState>(
  'ConversationState',
  conversationStateSchema
);
