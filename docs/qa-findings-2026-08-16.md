# QA Findings — 2026-08-16

Core pipeline QA test (webhook → parse → order → dashboard). Sent a real
signed Facebook webhook POST through the live ngrok tunnel to the running
dev backend, then verified in MongoDB and the live UI (Playwright).

## Result

Pipeline works end-to-end: webhook accepted → message stored → parsed →
order created → `order:new` socket event → dashboard/orders list updated
live (order count 5 → 6, correct product/qty shown).

## Bugs found (not yet fixed)

### 1. `AiLog.success` never set to `false` on failure

`backend/src/parser/aiParser.ts:152-158` — the catch block creates an
`AiLog` with `error` set but never sets `success: false`. The schema
default (`AiLog.ts:11`, `success: { default: true }`) wins, even though
the field comment says "false when error is set". This breaks the
`(tenantId, success, createdAt)` index built specifically for AI
failure-rate monitoring/alerting.

Repro: primary AI call returned HTTP 401 in test → `aiLogs` doc shows
`success: true` alongside `error: "AI API returned HTTP 401"`.

**Fix:** set `success: false` explicitly in the catch block's
`AiLog.create(...)` call.

### 2. `Order.parsedBy` mislabeled — wrong provenance

Two independent systems run per message:
- `hybridParse` (rule → AI fallback) → writes to `parsedOrders`, returns
  a `source` ('rule' | 'ai').
- The Groq conversational bot (`modules/conversation/conversationRouter.ts`
  → `orderFinalizer.ts`) — runs separately, does its own extraction via
  function-calling, and is what actually creates the `Order`.

`messageProcessor.ts` passes `hybridParse`'s `source` straight into
`routeConversationMessage(...parsedBy: source)`, which flows into
`orderFinalizer.ts`'s `Order.create({ parsedBy, ... })`. So the order's
`parsedBy` reflects the *unrelated* hybridParse result, not what the
Groq bot actually did.

Repro: rule parser found only phone+address (confidence 0.5, no
product, intent unknown) → correctly triggered AI fallback (which
401'd). Groq bot separately extracted full data (product, qty,
address) via tool calls and created the order. Order shows
`parsedBy: 'rule'` and UI shows "Source: rule" — actually AI-derived
data.

**Fix:** derive `parsedBy` from what the conversation bot itself used
(rule-based draft vs Grok-filled draft), not from the parallel
hybridParse run.

### 3. Groq-extracted order data never saved to `parsedOrders`

Violates the explicit constraint in `CLAUDE.md` ("All parser results
(including AI) are saved to `parsedOrders` before order creation").
Only the hybridParse rule-fallback attempt gets saved. The Groq bot's
own extraction (the data that actually became the order) has no
`parsedOrders` record at all.

Consequence: `parsedOrders` / Order Detail "Original Message" + "Source"
reflect a stale, lower-confidence parse that doesn't match the order
that was actually created — breaks the audit trail needed for manual
corrections (constraint #4).

**Fix:** write a `parsedOrders` record for the conversation-bot
extraction too (source: 'ai', confidence from the Grok pass), or unify
the two write paths.

### 4. Confidence score missing from Order Detail UI

`CLAUDE.md` route table requires `/orders/:id` to show "Message, parsed
data, editable fields, confidence score". Checked the live page
(`OrderDetailDrawer`) — no confidence score rendered anywhere.

**Fix:** add confidence display to the order detail view, sourced from
the correct `parsedOrders` record (blocked on #3 being fixed first, or
it'll show the wrong number).

## Not yet tested

Real Messenger → order flow (actual customer sending a real DM through
Messenger to a connected page, not a synthetic signed webhook POST).
That's the next test pass.
