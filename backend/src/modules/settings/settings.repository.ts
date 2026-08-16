import { Tenant, ITenant } from '../../models/Tenant';

export interface TenantSettingsView {
  _id: ITenant['_id'];
  name: string;
  pageId: string;
  webhookVerifyToken: string;
  isActive: boolean;
  settings: ITenant['settings'];
  grokEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function findTenantById(tenantId: string): Promise<TenantSettingsView | null> {
  const tenant = await Tenant.findById(tenantId).select('-accessToken').lean();
  if (!tenant) return null;
  const { grokApiKeyEncrypted, accessToken: _accessToken, ...rest } = tenant;
  return { ...rest, grokEnabled: !!grokApiKeyEncrypted };
}

export async function updateTenant(
  tenantId: string,
  data: Partial<{
    name: string;
    settings: {
      autoConfirmOrders?: boolean;
      aiParserEnabled?: boolean;
      notificationsEnabled?: boolean;
      timezone?: string;
    };
  }>
) {
  return Tenant.findByIdAndUpdate(tenantId, { $set: data }, { new: true })
    .select('-accessToken')
    .lean();
}

export async function updatePageConnection(
  tenantId: string,
  pageId: string,
  encryptedAccessToken: string
) {
  return Tenant.findByIdAndUpdate(
    tenantId,
    { pageId, accessToken: encryptedAccessToken },
    { new: true }
  )
    .select('-accessToken')
    .lean();
}

export async function clearPageConnection(tenantId: string): Promise<void> {
  await Tenant.findByIdAndUpdate(tenantId, {
    $set: { pageId: `disconnected_${Date.now()}`, accessToken: '' },
  });
}

export async function updateGrokKey(tenantId: string, encryptedApiKey: string) {
  return Tenant.findByIdAndUpdate(
    tenantId,
    { $set: { grokApiKeyEncrypted: encryptedApiKey } },
    { new: true }
  )
    .select('-accessToken -grokApiKeyEncrypted')
    .lean();
}

export async function clearGrokKey(tenantId: string): Promise<void> {
  await Tenant.findByIdAndUpdate(tenantId, { $set: { grokApiKeyEncrypted: null } });
}
