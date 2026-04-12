import { Tenant, ITenant } from '../../models/Tenant';

export async function findTenantById(tenantId: string) {
  return Tenant.findById(tenantId).select('-accessToken').lean();
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
