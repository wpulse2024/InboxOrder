import { AppError } from '../../middleware/errorHandler';
import { encrypt } from '../../utils/crypto';
import * as repo from './settings.repository';

export async function getSettings(tenantId: string) {
  const tenant = await repo.findTenantById(tenantId);
  if (!tenant) throw new AppError('Tenant not found', 404);
  return tenant;
}

export async function updateSettings(
  tenantId: string,
  settings: Partial<{
    name: string;
    settings: {
      autoConfirmOrders?: boolean;
      aiParserEnabled?: boolean;
      notificationsEnabled?: boolean;
      timezone?: string;
    };
  }>
) {
  const tenant = await repo.updateTenant(tenantId, settings);
  if (!tenant) throw new AppError('Tenant not found', 404);
  return tenant;
}

export async function connectFacebook(
  tenantId: string,
  pageId: string,
  accessToken: string
) {
  const encrypted = encrypt(accessToken);
  const tenant = await repo.updatePageConnection(tenantId, pageId, encrypted);
  if (!tenant) throw new AppError('Tenant not found', 404);
  return { message: 'Facebook page connected', pageId };
}

export async function disconnectFacebook(tenantId: string) {
  await repo.clearPageConnection(tenantId);
  return { message: 'Facebook page disconnected' };
}

export async function connectGrok(tenantId: string, apiKey: string) {
  const encrypted = encrypt(apiKey);
  const tenant = await repo.updateGrokKey(tenantId, encrypted);
  if (!tenant) throw new AppError('Tenant not found', 404);
  return { message: 'Grok API key connected' };
}

export async function disconnectGrok(tenantId: string) {
  await repo.clearGrokKey(tenantId);
  return { message: 'Grok API key disconnected' };
}
