import crypto from 'crypto';
import { FacebookPage, IFacebookPage } from '../../models/FacebookPage';

export async function findPageByPageId(pageId: string): Promise<IFacebookPage | null> {
  return FacebookPage.findOne({ pageId });
}

export async function findPageByTenantAndPageId(
  tenantId: string,
  pageId: string
): Promise<IFacebookPage | null> {
  return FacebookPage.findOne({ tenantId, pageId });
}

export async function findActivePageByPageId(pageId: string): Promise<IFacebookPage | null> {
  return FacebookPage.findOne({ pageId, isActive: true });
}

export async function findPageByVerifyToken(verifyToken: string): Promise<IFacebookPage | null> {
  return FacebookPage.findOne({ verifyToken, isActive: true });
}

export async function findPagesByTenant(
  tenantId: string
): Promise<Omit<IFacebookPage, 'accessToken'>[]> {
  return FacebookPage.find({ tenantId, isActive: true })
    .select('-accessToken')
    .lean() as unknown as Omit<IFacebookPage, 'accessToken'>[];
}

export async function createPage(data: {
  tenantId: string;
  pageId: string;
  pageName: string;
  encryptedAccessToken: string;
  tokenExpiresAt?: Date | null;
}): Promise<IFacebookPage> {
  const verifyToken = crypto.randomBytes(32).toString('hex');
  return FacebookPage.create({
    tenantId: data.tenantId,
    pageId: data.pageId,
    pageName: data.pageName,
    accessToken: data.encryptedAccessToken,
    tokenExpiresAt: data.tokenExpiresAt ?? null,
    verifyToken,
    isActive: true,
    webhookSubscribed: false,
  });
}

export async function updatePageToken(
  page: IFacebookPage,
  updates: {
    pageName?: string;
    encryptedAccessToken: string;
    tokenExpiresAt?: Date | null;
    isActive?: boolean;
  }
): Promise<IFacebookPage> {
  if (updates.pageName !== undefined) page.pageName = updates.pageName;
  page.accessToken = updates.encryptedAccessToken;
  page.tokenExpiresAt = updates.tokenExpiresAt ?? null;
  if (updates.isActive !== undefined) page.isActive = updates.isActive;
  return page.save();
}

export async function deactivatePage(page: IFacebookPage): Promise<void> {
  // Access is already gated on isActive (getDecryptedToken, findActivePageByPageId) —
  // clearing accessToken here isn't needed and an empty string fails the schema's `required`.
  page.isActive = false;
  await page.save();
}

export async function setWebhookSubscribed(page: IFacebookPage, value: boolean): Promise<void> {
  page.webhookSubscribed = value;
  await page.save();
}
