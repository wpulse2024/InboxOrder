import { Schema, model, Document } from 'mongoose';

/**
 * Singleton document (fixed _id) holding platform-wide config that used to live only in
 * `.env` — shared Facebook App credentials and AI provider settings. Editable by platform
 * admins via /api/admin/config instead of requiring a server redeploy. Secrets are encrypted
 * at rest with the same AES-256-GCM helper used for page access tokens.
 */
export interface IPlatformConfig extends Omit<Document, '_id'> {
  _id: string;
  facebookAppId: string | null;
  facebookAppSecretEncrypted: string | null;
  facebookVerifyToken: string | null;
  appBaseUrl: string | null;
  frontendUrl: string | null;
  aiApiKeyEncrypted: string | null;
  aiApiUrl: string | null;
  aiModel: string | null;
  aiTimeoutMs: number | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const PLATFORM_CONFIG_ID = 'singleton';

const platformConfigSchema = new Schema<IPlatformConfig>(
  {
    _id: { type: String, default: PLATFORM_CONFIG_ID },
    facebookAppId: { type: String, default: null },
    facebookAppSecretEncrypted: { type: String, default: null },
    facebookVerifyToken: { type: String, default: null },
    appBaseUrl: { type: String, default: null },
    frontendUrl: { type: String, default: null },
    aiApiKeyEncrypted: { type: String, default: null },
    aiApiUrl: { type: String, default: null },
    aiModel: { type: String, default: null },
    aiTimeoutMs: { type: Number, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const PlatformConfig = model<IPlatformConfig>('PlatformConfig', platformConfigSchema);
