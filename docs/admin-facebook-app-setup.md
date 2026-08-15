# Admin Guide — Facebook App Setup (one-time, platform-wide)

**Audience:** the person deploying/operating InboxOrder (you). Done **once**, ever — not per tenant, not per page owner. This registers a single Meta App that every business using your InboxOrder instance authorizes through, the same way ManyChat/Chatfuel/Buffer do it.

Page owners never see any of this. They just click "Connect with Facebook" — see [`owner-connect-facebook-page.md`](./owner-connect-facebook-page.md).

---

## 1. Create the Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**
2. Type: **Business**
3. Add products: **Facebook Login for Business** and **Messenger**
4. Note the **App ID** and **App Secret** (Settings → Basic) — these go into env vars below, once, on your server.

## 2. Configure Facebook Login for Business

1. Facebook Login for Business → Settings
2. Add a **Valid OAuth Redirect URI**:
   ```
   {APP_BASE_URL}/api/facebook-oauth/callback
   ```
   e.g. `https://api.yourdomain.com/api/facebook-oauth/callback`
3. Request these permissions (App Review required before going live to real users outside your test roles): `pages_show_list`, `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`

## 3. Configure the Messenger webhook

1. Messenger product → Settings → Webhooks → **Add Callback URL**
2. Callback URL:
   ```
   {APP_BASE_URL}/api/webhook/facebook
   ```
3. Verify Token: any string you choose — this becomes `FACEBOOK_VERIFY_TOKEN` below
4. Subscribe to fields: `messages`, `messaging_postbacks`

This webhook is **one shared endpoint for every tenant** — the backend resolves which tenant/page a message belongs to from the Page ID in the payload (`webhook.service.ts` → `resolveTenantId`, checks the `FacebookPage` collection). You never register a separate webhook per business.

## 4. Enter the values in Platform Config (no `.env` editing, no restart)

Log in as a platform admin and go to **Platform Config** in the sidebar (`/admin/config`). Enter:

- **Facebook App** → App ID, App Secret, Webhook Verify Token (from steps 1 and 3)
- **URLs** → App Base URL, Frontend URL

Click **Save configuration** — it takes effect immediately for every tenant, no backend restart needed. The App Secret and AI API Key fields are write-only: once saved, the form shows "(configured)" instead of the value, and you only need to re-enter them when rotating a credential.

**Becoming a platform admin:** the first admin is granted via the `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` env var (set it to your login email, boot the server once — it's idempotent and safe to leave set). Every platform admin after that can be granted the same way, or by flipping `isPlatformAdmin: true` directly on their `User` document. This flag is separate from the per-tenant `owner`/`admin`/`staff` role — it grants cross-tenant access to shared config, not tenant data.

These values are shared by every tenant — that's the whole point of OAuth: Facebook, not you, issues each business owner their own Page Access Token when they click through the consent screen.

**Fallback:** if `/admin/config` has never been filled in (e.g. a fresh deploy before first login), the backend falls back to the equivalent `.env` vars (`FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_VERIFY_TOKEN`, `APP_BASE_URL`, `FRONTEND_URL`) — see `backend/src/config/platformConfig.ts`. Once a value is saved in the UI, it takes priority over the env var.

## 5. Go live

- While in Development Mode, only Meta accounts added as **Testers/Developers/Admins** on the App can complete OAuth.
- To let arbitrary users (your 10k signups) connect their own pages, submit the app for **App Review** for the four permissions above, then switch the app to **Live**.
- No further backend changes needed once approved — the OAuth flow and webhook are already multi-tenant.

## 6. Operational checks

| Check | How |
|---|---|
| Webhook reachable | `GET {APP_BASE_URL}/api/webhook/facebook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=CHALLENGE_ACCEPTED` → expect `CHALLENGE_ACCEPTED` |
| OAuth redirect URI matches | Must be byte-identical between Meta App settings and `APP_BASE_URL` env var |
| A tenant's page not receiving messages | Check `FacebookPage.webhookSubscribed` for that page — `false` means the auto-subscribe call failed (see `facebookOAuth.controller.ts` → `subscribePageToWebhook`) |
| Rotating the App Secret | Update it in `/admin/config` — takes effect immediately for webhook signature verification, no restart |

---

For the low-level per-page management API (add/rotate/remove a page's token directly, without OAuth — useful for scripting or support), see [`connect-facebook-page.md`](./connect-facebook-page.md).
