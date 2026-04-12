import { Schema, model, Document, Types } from 'mongoose';

export interface IFacebookPage extends Document {
  tenantId: Types.ObjectId;
  pageId: string;
  pageName: string;
  accessToken: string;         // AES-256-GCM encrypted at rest
  tokenExpiresAt: Date | null; // null = long-lived token (no expiry)
  verifyToken: string;         // per-page webhook verify token (generated on connect)
  isActive: boolean;
  webhookSubscribed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const facebookPageSchema = new Schema<IFacebookPage>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    pageId: { type: String, required: true, unique: true, index: true },
    pageName: { type: String, required: true },
    accessToken: { type: String, required: true, default: '' },
    tokenExpiresAt: { type: Date, default: null },
    verifyToken: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    webhookSubscribed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Lookup all active pages for a tenant (settings page, token rotation)
facebookPageSchema.index({ tenantId: 1, isActive: 1 });
// Webhook challenge verification by per-page token
facebookPageSchema.index({ verifyToken: 1 });

export const FacebookPage = model<IFacebookPage>('FacebookPage', facebookPageSchema);
