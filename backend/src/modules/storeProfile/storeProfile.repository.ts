import { StoreProfile, IStoreProfileProduct, IStoreProfileFaq } from '../../models/StoreProfile';

export async function findByTenant(tenantId: string) {
  return StoreProfile.findOne({ tenantId }).lean();
}

export async function upsert(
  tenantId: string,
  data: { businessInfo?: string; products: IStoreProfileProduct[]; faqs: IStoreProfileFaq[] }
) {
  return StoreProfile.findOneAndUpdate(
    { tenantId },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}
