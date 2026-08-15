import { apiClient } from './client';

export interface PlatformConfig {
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

export type PlatformConfigPatch = Partial<{
  facebookAppId: string | null;
  facebookAppSecret: string | null;
  facebookVerifyToken: string | null;
  appBaseUrl: string | null;
  frontendUrl: string | null;
  aiApiKey: string | null;
  aiApiUrl: string | null;
  aiModel: string | null;
  aiTimeoutMs: number | null;
}>;

export const adminApi = {
  getConfig: () => apiClient.get<PlatformConfig>('/admin/config'),
  updateConfig: (patch: PlatformConfigPatch) => apiClient.patch<PlatformConfig>('/admin/config', patch),
};
