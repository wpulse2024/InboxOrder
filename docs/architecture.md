# InboxOrder — Architecture

## System Overview

```
Facebook Messenger
      │
      ▼ POST /api/webhook/facebook
┌─────────────────┐
│   Backend API   │  Express + TypeScript
│  (port 3000)    │
└────────┬────────┘
         │ enqueue job
         ▼
┌─────────────────┐
│   BullMQ Queue  │  messageQueue
│   (Redis)       │
└────────┬────────┘
         │ worker picks up
         ▼
┌─────────────────┐
│  Hybrid Parser  │
│  Rule → AI      │
└────────┬────────┘
         │ creates
         ▼
┌─────────────────┐    ┌──────────────┐
│   MongoDB       │    │  Socket.io   │  real-time push
│   (all data)    │    │  (per-tenant │  to frontend
└─────────────────┘    │   rooms)     │
                       └──────────────┘
```

## Tenant Isolation

Every MongoDB document has a `tenantId` field. All service-layer queries filter by `tenantId`. Socket.io rooms are namespaced as `tenant:{id}`.

## Message Processing Pipeline

1. Facebook POST → signature verified → raw message stored → **return 200 immediately**
2. BullMQ worker picks up job (retries: 3, exponential backoff)
3. Rule-based parser runs first
4. If `confidence < 0.7` AND `aiParserEnabled` → AI parser called (10s timeout)
5. AI failure → silent fallback to rule result, error logged to `aiLogs`
6. `ParsedOrder` saved (always)
7. If `intent === 'order'` → `Order` created, customer upserted
8. `order:new` Socket.io event emitted + notification created

## Parser Confidence Scoring

| Signal found | +Score |
|---|---|
| Phone number | +0.30 |
| Product name | +0.30 |
| Order intent keyword | +0.20 |
| Address fragment | +0.20 |
| **Threshold** | **0.70** |

## Redis Usage

- BullMQ job queues (messageQueue, webhookRetryQueue, notificationQueue)
- Analytics aggregation cache (TTL: 5 min, keys: `analytics:{type}:{tenantId}`)

## Security

- `X-Hub-Signature-256` verification on all Facebook webhook POSTs
- Page access tokens encrypted at rest (AES-256-GCM)
- JWT auth (7d expiry) with tenant context embedded in payload
- Helmet.js headers, rate limiting on all routes
- Non-root Docker user in production images
