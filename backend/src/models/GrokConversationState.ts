import { Schema, model, Document, Types } from 'mongoose';
import { ConversationDraft } from './ConversationState';

export interface IGrokHistoryEntry {
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  toolCallId?: string;
  toolName?: string;
  toolArgsJson?: string;
}

export interface IGrokConversationState extends Document {
  tenantId: Types.ObjectId;
  fbSenderId: string;
  draft: ConversationDraft;
  history: IGrokHistoryEntry[];
  emailAsked: boolean;
  pendingOrderId?: Types.ObjectId;
  decision?: 'keep' | 'replace';
  createdAt: Date;
  updatedAt: Date;
}

const grokConversationStateSchema = new Schema<IGrokConversationState>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    fbSenderId: { type: String, required: true },
    draft: {
      name: { type: String },
      phone: { type: String },
      product: { type: String },
      quantity: { type: Number },
      address: { type: String },
      email: { type: String },
    },
    history: [
      {
        role: { type: String, enum: ['user', 'assistant', 'tool'], required: true },
        content: { type: String, default: null },
        toolCallId: { type: String },
        toolName: { type: String },
        toolArgsJson: { type: String },
      },
    ],
    emailAsked: { type: Boolean, default: false },
    pendingOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    decision: { type: String, enum: ['keep', 'replace'] },
  },
  { timestamps: true }
);

// One in-flight AI-agent conversation per customer per tenant
grokConversationStateSchema.index({ tenantId: 1, fbSenderId: 1 }, { unique: true });

export const GrokConversationState = model<IGrokConversationState>(
  'GrokConversationState',
  grokConversationStateSchema
);
