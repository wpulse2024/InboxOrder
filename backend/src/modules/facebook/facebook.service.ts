import { IFacebookPage } from '../../models/FacebookPage';
import { encrypt, decrypt } from '../../utils/crypto';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import * as repo from './facebook.repository';

export async function addPage(
  tenantId: string,
  pageId: string,
  pageName: string,
  accessToken: string,
  tokenExpiresAt?: Date | null
): Promise<{ pageId: string; pageName: string; verifyToken: string }> {
  const encryptedAccessToken = encrypt(accessToken);

  const existing = await repo.findPageByPageId(pageId);
  if (existing) {
    if (existing.tenantId.toString() !== tenantId) {
      throw new AppError('This Facebook page is already connected to another account', 409);
    }
    // Re-connect: update token and re-activate
    await repo.updatePageToken(existing, {
      pageName,
      encryptedAccessToken,
      tokenExpiresAt,
      isActive: true,
    });
    logger.info({ tenantId, pageId }, 'Facebook page reconnected');
    return { pageId, pageName, verifyToken: existing.verifyToken };
  }

  const page = await repo.createPage({ tenantId, pageId, pageName, encryptedAccessToken, tokenExpiresAt });
  logger.info({ tenantId, pageId }, 'Facebook page connected');
  return { pageId, pageName, verifyToken: page.verifyToken };
}

export async function removePage(tenantId: string, pageId: string): Promise<void> {
  const page = await repo.findPageByTenantAndPageId(tenantId, pageId);
  if (!page) throw new AppError('Facebook page not found', 404);
  await repo.deactivatePage(page);
  logger.info({ tenantId, pageId }, 'Facebook page disconnected');
}

export async function listPages(
  tenantId: string
): Promise<Omit<IFacebookPage, 'accessToken'>[]> {
  return repo.findPagesByTenant(tenantId);
}

export async function rotateToken(
  tenantId: string,
  pageId: string,
  newToken: string,
  tokenExpiresAt?: Date | null
): Promise<{ pageId: string; tokenExpiresAt: Date | null }> {
  const page = await repo.findPageByTenantAndPageId(tenantId, pageId);
  if (!page) throw new AppError('Facebook page not found', 404);
  const encryptedAccessToken = encrypt(newToken);
  await repo.updatePageToken(page, { encryptedAccessToken, tokenExpiresAt });
  logger.info({ tenantId, pageId }, 'Page access token rotated');
  return { pageId, tokenExpiresAt: page.tokenExpiresAt };
}

export async function getDecryptedToken(tenantId: string, pageId: string): Promise<string> {
  const page = await repo.findPageByTenantAndPageId(tenantId, pageId);
  if (!page || !page.isActive || !page.accessToken) {
    throw new AppError('Page not found or token missing', 404);
  }
  return decrypt(page.accessToken);
}

/** Used by webhook challenge verification to resolve a per-page verify token. */
export async function findPageByVerifyToken(verifyToken: string): Promise<IFacebookPage | null> {
  return repo.findPageByVerifyToken(verifyToken);
}

/** Used by webhook event handler to resolve the tenantId for an incoming pageId. */
export async function findActivePageById(pageId: string): Promise<IFacebookPage | null> {
  return repo.findActivePageByPageId(pageId);
}

/** Records whether the Graph API webhook subscription call for this page succeeded. */
export async function markWebhookSubscribed(pageId: string, subscribed: boolean): Promise<void> {
  const page = await repo.findPageByPageId(pageId);
  if (!page) return;
  await repo.setWebhookSubscribed(page, subscribed);
}
