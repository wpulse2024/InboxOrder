# Connecting a Facebook Page to InboxOrder

This guide walks through the end-to-end process of connecting a Facebook Page so that Messenger messages are received, parsed, and turned into orders.

---

## Prerequisites

- A **Facebook App** with Messenger permissions (see [Facebook App Setup](#1-facebook-app-setup))
- A **Facebook Page** you own or administer
- InboxOrder backend running with all environment variables set
- Your InboxOrder account credentials (JWT token from `/api/auth/login`)

---

## 1. Facebook App Setup

### 1.1 Create a Facebook App

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**
2. Select **Business** type
3. Note your **App ID** and **App Secret** — you will need the secret for the backend

### 1.2 Add the Messenger Product

1. Inside your app dashboard, click **Add Product** → **Messenger** → **Set Up**
2. Under **Access Tokens**, select the Facebook Page you want to connect
3. Generate a **Page Access Token** and copy it — you will use this when calling the API

### 1.3 Configure Webhooks

1. In the Messenger product settings, go to **Webhooks** → **Add Callback URL**
2. Set the **Callback URL** to:
   ```
   https://<your-domain>/api/webhook/facebook
   ```
3. Set the **Verify Token** — this must match the `FACEBOOK_VERIFY_TOKEN` value in your backend `.env` (or the per-page verify token returned when you connect a page)
4. Subscribe to these **Webhook Fields**:
   - `messages`
   - `messaging_postbacks` (optional)
5. Click **Verify and Save** — Facebook will call your endpoint immediately; the server must respond within 5 seconds

### 1.4 Subscribe the Page

After saving the webhook, click **Add Subscriptions** on your page and confirm the same fields above.

---

## 2. Backend Environment Variables

Add the following to `backend/.env`:

```env
FACEBOOK_APP_SECRET=<your-app-secret>        # Used to verify X-Hub-Signature-256 on every POST
FACEBOOK_VERIFY_TOKEN=<any-random-string>    # Must match what you entered in the Facebook dashboard
ENCRYPTION_KEY=<32-byte-hex-string>          # Used to encrypt page access tokens at rest
```

> **Security note:** The `ENCRYPTION_KEY` must be exactly 32 bytes when decoded. Generate one with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

Restart the backend after updating `.env`.

---

## 3. Connecting a Page via the API

All management endpoints require a valid Bearer token. Get one by logging in:

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "you@example.com",
  "password": "yourpassword"
}
```

Use the returned `token` in the `Authorization` header for every request below.

### 3.1 Add a Facebook Page

```bash
POST /api/facebook/pages
Authorization: Bearer <token>
Content-Type: application/json

{
  "pageId": "123456789012345",
  "pageName": "My Store",
  "accessToken": "<page-access-token-from-facebook>",
  "tokenExpiresAt": null
}
```

**Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `pageId` | string | Yes | Facebook Page ID (found in Page Settings → About) |
| `pageName` | string | Yes | Human-readable name for this page |
| `accessToken` | string | Yes | Page Access Token generated in the Facebook App dashboard |
| `tokenExpiresAt` | ISO date or `null` | No | Expiry date for short-lived tokens; `null` for long-lived tokens |

**Response:**

```json
{
  "pageId": "123456789012345",
  "pageName": "My Store",
  "verifyToken": "abc123xyz..."
}
```

> The `verifyToken` in the response is the **per-page webhook verify token**. If you want per-page webhook isolation, use this value in the Facebook dashboard instead of the global `FACEBOOK_VERIFY_TOKEN`.

If the page was previously disconnected, re-calling this endpoint with the same `pageId` will reconnect it and update the access token.

---

## 4. Verifying the Webhook Connection

Facebook performs a **GET** challenge to confirm your webhook endpoint is live. The server handles this automatically. You can test it manually:

```bash
GET /api/webhook/facebook?hub.mode=subscribe&hub.verify_token=<your-verify-token>&hub.challenge=CHALLENGE_ACCEPTED
```

Expected response: `CHALLENGE_ACCEPTED` (plain text, HTTP 200)

If you get a 403, the verify token does not match. Double-check `FACEBOOK_VERIFY_TOKEN` in `.env` or use the `verifyToken` returned from the connect API.

---

## 5. Testing Message Delivery

1. Open Messenger and send a message to your connected Facebook Page
2. Facebook forwards it as a POST to `/api/webhook/facebook`
3. The server verifies the `X-Hub-Signature-256` header using your `FACEBOOK_APP_SECRET`
4. The message is stored and queued for parsing
5. An order is created and a `order:new` Socket.io event is emitted

You can also send a test message from the Facebook App dashboard → **Messenger** → **Test Your Bot**.

---

## 6. Managing Connected Pages

### List all connected pages

```bash
GET /api/facebook/pages
Authorization: Bearer <token>
```

Returns all active pages for your tenant. Access tokens are never returned in list responses.

### Rotate a page access token

Use this when Facebook issues a new token (e.g., short-lived token renewal):

```bash
PATCH /api/facebook/pages/:pageId/token
Authorization: Bearer <token>
Content-Type: application/json

{
  "accessToken": "<new-page-access-token>",
  "tokenExpiresAt": "2026-12-31T00:00:00.000Z"
}
```

### Disconnect a page

```bash
DELETE /api/facebook/pages/:pageId
Authorization: Bearer <token>
```

This deactivates the page and clears the stored access token. Existing orders and messages are not deleted.

---

## 7. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Webhook verification fails (403) | `hub.verify_token` mismatch | Check `FACEBOOK_VERIFY_TOKEN` in `.env` or use the per-page `verifyToken` |
| Messages not received | Page not subscribed to webhook | Re-subscribe in Facebook App → Messenger → Webhooks |
| Signature verification error (401) | Wrong `FACEBOOK_APP_SECRET` | Copy App Secret from Facebook App → Settings → Basic |
| Orders not created | Worker not running | Start the BullMQ worker: `npm run dev` includes workers |
| Token decryption error | `ENCRYPTION_KEY` changed after tokens were stored | Rotate tokens for all pages using the token rotation endpoint |
| `tokenExpiresAt` not null but orders stop | Short-lived token expired | Rotate the token with a fresh one from the Facebook dashboard |

---

## 8. Security Notes

- **Never expose your Page Access Token** in client-side code — it is stored encrypted on the server
- **Rotate tokens regularly** if you use short-lived tokens (they expire in ~60 days)
- **Verify every webhook POST** — the backend does this automatically using `X-Hub-Signature-256`
- **One page = one tenant** — a page connected under one account cannot receive events under another
