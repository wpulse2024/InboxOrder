import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env';
import { redisClient } from '../../config/redisClient';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import * as settingsService from './settings.service';

const GRAPH_VERSION = 'v21.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const OAUTH_DIALOG_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const SCOPES = ['pages_show_list', 'pages_messaging', 'pages_manage_metadata', 'pages_read_engagement'];
const PENDING_TTL_SECONDS = 600;

function redirectUri(): string {
  return `${env.appBaseUrl}/api/facebook-oauth/callback`;
}

function pendingKey(tenantId: string): string {
  return `fb_oauth_pending:${tenantId}`;
}

interface GraphPage {
  id: string;
  name: string;
  access_token: string;
}

/** GET /api/settings/facebook/oauth/start — returns the FB login dialog URL for the frontend to navigate to. */
export async function startFacebookOAuth(req: Request, res: Response): Promise<void> {
  const state = jwt.sign({ tenantId: req.user!.tenantId, purpose: 'fb_oauth' }, env.jwtSecret, {
    expiresIn: '10m',
  });

  const url = new URL(OAUTH_DIALOG_URL);
  url.searchParams.set('client_id', env.facebookAppId);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('state', state);
  url.searchParams.set('scope', SCOPES.join(','));
  url.searchParams.set('response_type', 'code');

  res.json({ url: url.toString() });
}

async function exchangeCodeForUserToken(code: string): Promise<string> {
  const url = new URL(`${GRAPH_URL}/oauth/access_token`);
  url.searchParams.set('client_id', env.facebookAppId);
  url.searchParams.set('client_secret', env.facebookAppSecret);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('code', code);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Code exchange failed: HTTP ${response.status}`);
  const body = (await response.json()) as { access_token: string };
  return body.access_token;
}

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<string> {
  const url = new URL(`${GRAPH_URL}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', env.facebookAppId);
  url.searchParams.set('client_secret', env.facebookAppSecret);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Long-lived token exchange failed: HTTP ${response.status}`);
  const body = (await response.json()) as { access_token: string };
  return body.access_token;
}

async function fetchManagedPages(userAccessToken: string): Promise<GraphPage[]> {
  const url = new URL(`${GRAPH_URL}/me/accounts`);
  url.searchParams.set('fields', 'id,name,access_token');
  url.searchParams.set('access_token', userAccessToken);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Failed to list pages: HTTP ${response.status}`);
  const body = (await response.json()) as { data: GraphPage[] };
  return body.data ?? [];
}

/** Best-effort — a page connect should still succeed even if the subscribe call fails. */
async function subscribePageToWebhook(page: GraphPage): Promise<void> {
  try {
    const url = new URL(`${GRAPH_URL}/${page.id}/subscribed_apps`);
    url.searchParams.set('subscribed_fields', 'messages,messaging_postbacks');
    url.searchParams.set('access_token', page.access_token);
    const response = await fetch(url.toString(), { method: 'POST' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (err) {
    logger.warn({ err, pageId: page.id }, 'Failed to auto-subscribe page to webhook');
  }
}

function frontendRedirect(res: Response, query: Record<string, string>): void {
  const url = new URL('/settings', env.frontendUrl);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  res.redirect(url.toString());
}

/**
 * GET /api/facebook-oauth/callback — Facebook redirects the browser here directly
 * (no Authorization header), so this route is intentionally public. Tenant identity
 * comes from the signed `state` param minted in startFacebookOAuth.
 */
export async function handleFacebookOAuthCallback(req: Request, res: Response): Promise<void> {
  const { code, state, error: fbError } = req.query as Record<string, string | undefined>;

  if (fbError || !code || !state) {
    frontendRedirect(res, { fb_error: fbError ?? 'missing_code' });
    return;
  }

  let tenantId: string;
  try {
    const payload = jwt.verify(state, env.jwtSecret) as { tenantId: string; purpose: string };
    if (payload.purpose !== 'fb_oauth') throw new Error('wrong purpose');
    tenantId = payload.tenantId;
  } catch {
    frontendRedirect(res, { fb_error: 'invalid_state' });
    return;
  }

  try {
    const shortLivedToken = await exchangeCodeForUserToken(code);
    const userToken = await exchangeForLongLivedToken(shortLivedToken);
    const pages = await fetchManagedPages(userToken);

    if (pages.length === 0) {
      frontendRedirect(res, { fb_error: 'no_pages' });
      return;
    }

    if (pages.length === 1) {
      const [page] = pages;
      await settingsService.connectFacebook(tenantId, page.id, page.access_token);
      await subscribePageToWebhook(page);
      frontendRedirect(res, { fb_connected: '1', page: page.name });
      return;
    }

    await redisClient.set(pendingKey(tenantId), JSON.stringify(pages), 'EX', PENDING_TTL_SECONDS);
    frontendRedirect(res, { fb_select: '1' });
  } catch (err) {
    logger.error({ err, tenantId }, 'Facebook OAuth callback failed');
    frontendRedirect(res, { fb_error: 'oauth_failed' });
  }
}

/** GET /api/settings/facebook/oauth/pending — pages found for this tenant awaiting a pick, if any. */
export async function getPendingPages(req: Request, res: Response): Promise<void> {
  const raw = await redisClient.get(pendingKey(req.user!.tenantId));
  if (!raw) throw new AppError('No pending Facebook pages — start the connection again', 404);

  const pages = JSON.parse(raw) as GraphPage[];
  res.json({ pages: pages.map((p) => ({ pageId: p.id, pageName: p.name })) });
}

const selectSchema = z.object({ pageId: z.string().min(1) });

/** POST /api/settings/facebook/oauth/select — user picked which managed page to connect. */
export async function selectFacebookPage(req: Request, res: Response): Promise<void> {
  const { pageId } = selectSchema.parse(req.body);
  const tenantId = req.user!.tenantId;

  const raw = await redisClient.get(pendingKey(tenantId));
  if (!raw) throw new AppError('No pending Facebook pages — start the connection again', 404);

  const pages = JSON.parse(raw) as GraphPage[];
  const page = pages.find((p) => p.id === pageId);
  if (!page) throw new AppError('Selected page was not in the pending list', 404);

  await settingsService.connectFacebook(tenantId, page.id, page.access_token);
  await subscribePageToWebhook(page);
  await redisClient.del(pendingKey(tenantId));

  res.json({ message: 'Facebook page connected', pageId: page.id, pageName: page.name });
}
