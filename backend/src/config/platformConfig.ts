import { PlatformConfig, PLATFORM_CONFIG_ID } from '../models/PlatformConfig';
import { encrypt, decrypt } from '../utils/crypto';
import { env } from './env';
import { logger } from '../utils/logger';

export interface ResolvedPlatformConfig {
  facebookAppId: string | null;
  facebookAppSecret: string | null;
  facebookVerifyToken: string | null;
  appBaseUrl: string;
  frontendUrl: string;
  aiApiKey: string | null;
  aiApiUrl: string;
  aiModel: string;
  aiTimeoutMs: number;
}

/** Non-secret view returned by GET /api/admin/config — secrets are booleans, never values. */
export interface PlatformConfigView {
  facebookAppId: string | null;
  facebookAppSecretSet: boolean;
  facebookVerifyToken: string | null;
  appBaseUrl: string;
  frontendUrl: string;
  aiApiKeySet: boolean;
  aiApiUrl: string;
  aiModel: string;
  aiTimeoutMs: number;
}

export interface PlatformConfigPatch {
  facebookAppId?: string | null;
  facebookAppSecret?: string | null;
  facebookVerifyToken?: string | null;
  appBaseUrl?: string | null;
  frontendUrl?: string | null;
  aiApiKey?: string | null;
  aiApiUrl?: string | null;
  aiModel?: string | null;
  aiTimeoutMs?: number | null;
}

let cache: ResolvedPlatformConfig | null = null;

function resolve(doc: {
  facebookAppId: string | null;
  facebookAppSecretEncrypted: string | null;
  facebookVerifyToken: string | null;
  appBaseUrl: string | null;
  frontendUrl: string | null;
  aiApiKeyEncrypted: string | null;
  aiApiUrl: string | null;
  aiModel: string | null;
  aiTimeoutMs: number | null;
} | null): ResolvedPlatformConfig {
  return {
    facebookAppId: doc?.facebookAppId ?? env.facebookAppId,
    facebookAppSecret: doc?.facebookAppSecretEncrypted ? decrypt(doc.facebookAppSecretEncrypted) : env.facebookAppSecret,
    facebookVerifyToken: doc?.facebookVerifyToken ?? env.facebookVerifyToken,
    appBaseUrl: doc?.appBaseUrl ?? env.appBaseUrl,
    frontendUrl: doc?.frontendUrl ?? env.frontendUrl,
    aiApiKey: doc?.aiApiKeyEncrypted ? decrypt(doc.aiApiKeyEncrypted) : env.aiApiKey,
    aiApiUrl: doc?.aiApiUrl ?? env.aiApiUrl,
    aiModel: doc?.aiModel ?? env.aiModel,
    aiTimeoutMs: doc?.aiTimeoutMs ?? env.aiTimeoutMs,
  };
}

/** Call once at boot, after Mongo connects, before the server accepts requests. */
export async function loadPlatformConfig(): Promise<void> {
  const doc = await PlatformConfig.findById(PLATFORM_CONFIG_ID).lean();
  cache = resolve(doc);
  logger.info(
    {
      facebookAppIdSource: doc?.facebookAppId ? 'db' : env.facebookAppId ? 'env' : 'unset',
      appBaseUrl: cache.appBaseUrl,
    },
    'Platform config loaded'
  );
}

/** Synchronous read of the cached config — always call loadPlatformConfig() first at boot. */
export function getPlatformConfig(): ResolvedPlatformConfig {
  if (!cache) {
    throw new Error('Platform config not loaded — call loadPlatformConfig() at server startup');
  }
  return cache;
}

export async function getPlatformConfigView(): Promise<PlatformConfigView> {
  const doc = await PlatformConfig.findById(PLATFORM_CONFIG_ID).lean();
  const resolved = resolve(doc);
  return {
    facebookAppId: resolved.facebookAppId,
    facebookAppSecretSet: !!resolved.facebookAppSecret,
    facebookVerifyToken: resolved.facebookVerifyToken,
    appBaseUrl: resolved.appBaseUrl,
    frontendUrl: resolved.frontendUrl,
    aiApiKeySet: !!resolved.aiApiKey,
    aiApiUrl: resolved.aiApiUrl,
    aiModel: resolved.aiModel,
    aiTimeoutMs: resolved.aiTimeoutMs,
  };
}

/**
 * Applies a partial update and reloads the in-memory cache immediately, so the new
 * values (e.g. a rotated Facebook App Secret) take effect on the very next request —
 * no restart needed. Fields omitted from the patch are left untouched; pass an empty
 * string to explicitly clear a field back to the env fallback.
 */
export async function updatePlatformConfig(
  patch: PlatformConfigPatch,
  updatedBy: string
): Promise<void> {
  const update: Record<string, unknown> = { updatedBy };

  if (patch.facebookAppId !== undefined) update.facebookAppId = patch.facebookAppId || null;
  if (patch.facebookVerifyToken !== undefined) update.facebookVerifyToken = patch.facebookVerifyToken || null;
  if (patch.appBaseUrl !== undefined) update.appBaseUrl = patch.appBaseUrl || null;
  if (patch.frontendUrl !== undefined) update.frontendUrl = patch.frontendUrl || null;
  if (patch.aiApiUrl !== undefined) update.aiApiUrl = patch.aiApiUrl || null;
  if (patch.aiModel !== undefined) update.aiModel = patch.aiModel || null;
  if (patch.aiTimeoutMs !== undefined) update.aiTimeoutMs = patch.aiTimeoutMs ?? null;

  if (patch.facebookAppSecret !== undefined) {
    update.facebookAppSecretEncrypted = patch.facebookAppSecret ? encrypt(patch.facebookAppSecret) : null;
  }
  if (patch.aiApiKey !== undefined) {
    update.aiApiKeyEncrypted = patch.aiApiKey ? encrypt(patch.aiApiKey) : null;
  }

  await PlatformConfig.findByIdAndUpdate(PLATFORM_CONFIG_ID, update, { upsert: true });
  await loadPlatformConfig();
  logger.info({ updatedBy, fields: Object.keys(patch) }, 'Platform config updated');
}
