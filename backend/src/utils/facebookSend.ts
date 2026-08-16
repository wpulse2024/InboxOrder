import { logger } from './logger';

// Matches the Graph API version used elsewhere in the codebase (facebookOAuth.controller.ts)
const GRAPH_VERSION = 'v21.0';
const SEND_TIMEOUT_MS = 10000;

export async function sendTextMessage(
  pageAccessToken: string,
  recipientPsid: string,
  text: string
): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: { text },
        messaging_type: 'RESPONSE',
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Facebook Send API returned HTTP ${response.status}: ${body}`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    logger.error({ err, recipientPsid }, 'Failed to send Facebook message');
    throw err;
  }
}
