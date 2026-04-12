import { Tenant } from '../../models/Tenant';
import { AppError } from '../../middleware/errorHandler';
import { encrypt, decrypt } from '../../utils/crypto';

export async function getSettings(tenantId: string) {
  const tenant = await Tenant.findById(tenantId).select('-accessToken').lean();
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
  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: settings },
    { new: true }
  ).select('-accessToken');
  if (!tenant) throw new AppError('Tenant not found', 404);
  return tenant;
}

export async function connectFacebook(
  tenantId: string,
  pageId: string,
  accessToken: string
) {
  const encrypted = encrypt(accessToken);
  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { pageId, accessToken: encrypted },
    { new: true }
  ).select('-accessToken');
  if (!tenant) throw new AppError('Tenant not found', 404);
  return { message: 'Facebook page connected', pageId };
}

export async function disconnectFacebook(tenantId: string) {
  await Tenant.findByIdAndUpdate(tenantId, {
    $set: { pageId: `disconnected_${Date.now()}`, accessToken: '' },
  });
  return { message: 'Facebook page disconnected' };
}
