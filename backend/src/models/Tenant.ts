import { Schema, model, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  pageId: string;
  accessToken: string; // encrypted at rest
  webhookVerifyToken: string;
  isActive: boolean;
  grokApiKeyEncrypted: string | null; // per-tenant Grok/xAI key, encrypted at rest — presence enables the AI sales agent
  settings: {
    autoConfirmOrders: boolean;
    aiParserEnabled: boolean;
    notificationsEnabled: boolean;
    timezone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    pageId: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: false, default: '' },
    webhookVerifyToken: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
    grokApiKeyEncrypted: { type: String, default: null },
    settings: {
      autoConfirmOrders: { type: Boolean, default: false },
      aiParserEnabled: { type: Boolean, default: true },
      notificationsEnabled: { type: Boolean, default: true },
      timezone: { type: String, default: 'Asia/Dhaka' },
    },
  },
  { timestamps: true }
);

export const Tenant = model<ITenant>('Tenant', tenantSchema);
