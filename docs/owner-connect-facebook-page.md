# Page Owner Guide — Connecting Your Facebook Page

**Audience:** you run a shop/business and want your Facebook Page's Messenger messages to show up as orders in InboxOrder. No technical setup needed on your end — no App IDs, no tokens, no code.

## Steps

1. **Sign up / log in** to InboxOrder.
2. Go to **Settings**.
3. Under **Facebook Pages**, click **Connect with Facebook**.
4. Facebook opens its login/consent screen — log in with the Facebook account that manages your Page, and approve access.
5. You're sent back to Settings:
   - If you manage **one** Page, it connects automatically — done.
   - If you manage **multiple** Pages, you'll see a checklist — tick the page(s) you want InboxOrder to handle and click **Connect**. You can select more than one.
6. Each connected page appears in a list with a status badge:
   - **Webhook active** — messages will flow in normally.
   - **Webhook pending** — the automatic subscription step didn't complete (rare — usually resolves by disconnecting and reconnecting that page; if it persists, contact support).

That's it. Send a test message to your Page on Messenger — it should appear under **Orders** within a few seconds.

## Connecting additional pages later

The **Connect with Facebook** button stays available after your first page is connected — click it again any time to add another Page you manage.

## Disconnecting a page

In Settings, find the page in the list and click **Disconnect**. This stops new messages from that page being processed; past orders and messages are kept.

## Troubleshooting

| Problem | What to try |
|---|---|
| "No Facebook Pages found for that account" | You're not an admin of any Facebook Page with that login — check you're logged into the right Facebook account, and that you're an admin (not just an editor) of the Page. |
| "That login link expired" | The connect attempt took too long — click **Connect with Facebook** again. |
| Page shows "Webhook pending" | Disconnect and reconnect the page. If it stays pending, contact support. |
| Messages aren't showing up as orders | Confirm the page shows **Webhook active**. If it does and messages still don't appear, contact support — this may be a backend issue, not something you can fix from Settings. |
| Facebook login was cancelled | You closed the Facebook popup/dialog before approving — click **Connect with Facebook** to try again. |

## What InboxOrder can and can't see

Connecting only grants access to messages sent to your Page's Messenger inbox — InboxOrder never sees your personal Facebook account, timeline, or friends. You can revoke access at any time from Facebook's own **Settings → Business Integrations**, in addition to disconnecting from InboxOrder.
