import { IStoreProfileProduct, IStoreProfileFaq } from '../../models/StoreProfile';
import * as repo from './storeProfile.repository';

export async function getStoreProfile(tenantId: string) {
  const profile = await repo.findByTenant(tenantId);
  if (profile) return profile;
  return { tenantId, businessInfo: '', products: [], faqs: [] };
}

export async function upsertStoreProfile(
  tenantId: string,
  data: { businessInfo?: string; products: IStoreProfileProduct[]; faqs: IStoreProfileFaq[] }
) {
  return repo.upsert(tenantId, data);
}
