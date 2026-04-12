# InboxOrder — Claude Code Project Guide

## Project Overview

InboxOrder is a production-grade multi-tenant SaaS that converts Facebook Messenger messages into structured e-commerce orders using a hybrid parsing pipeline (rule-based → AI fallback) with a real-time dashboard.

**Facebook pages = tenants.** Every data record is scoped to a `tenantId`.

---

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- BullMQ + Redis (job queues)
- Socket.io (real-time)

### Frontend
- Vue 3 + Vite
- Tailwind CSS
- Pinia (state management)
- Axios (HTTP layer)

---

## Project Structure

```
InboxOrder/
├── backend/
│   ├── src/
│   │   ├── config/          # env, db, redis, socket config
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── webhook/
│   │   │   ├── orders/
│   │   │   ├── customers/
│   │   │   ├── analytics/
│   │   │   ├── settings/
│   │   │   └── notifications/
│   │   ├── queue/           # BullMQ workers and processors
│   │   ├── parser/          # Rule-based + AI hybrid parser
│   │   ├── realtime/        # Socket.io event emitters
│   │   ├── middleware/       # auth, error, rate-limit, tenant
│   │   ├── models/          # Mongoose schemas
│   │   └── utils/           # logger, helpers
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/             # Axios service layer
    │   ├── stores/          # Pinia stores
    │   ├── views/           # Page-level components
    │   ├── components/      # Reusable UI components
    │   ├── composables/     # Vue 3 composables
    │   ├── router/          # Vue Router + route guards
    │   └── layouts/         # App shell (sidebar + topbar)
    └── package.json
```

---

## Architecture Rules

- **Pattern**: controller → service → repository (no business logic in controllers or models)
- **Tenant isolation**: every DB query must filter by `tenantId`
- **No mock data**: all code must be production-ready with real integrations
- **TypeScript strict mode**: no `any` types unless absolutely necessary
- **Queues for heavy tasks**: message processing, AI calls, webhook retries go through BullMQ
- **Real-time via Socket.io**: new orders, status changes, webhook failures
- **Error handling**: global Express error middleware + per-worker BullMQ error handlers
- **Logging**: structured logs via a logger utility (e.g., Winston or pino)

---

## Database Collections (MongoDB)

All collections require `tenantId` (ObjectId ref → Tenants), `createdAt`, `updatedAt` timestamps, and appropriate indexes.

| Collection | Key Fields |
|---|---|
| `tenants` | pageId, accessToken, webhookVerifyToken, settings |
| `users` | tenantId, fbSenderId, phone, name, address |
| `messages` | tenantId, fbMessageId, senderId, text, rawPayload, processed |
| `orders` | tenantId, customerId, messageId, status, items[], parsedBy |
| `parsedOrders` | tenantId, messageId, intent, product, quantity, phone, address, confidence, source (rule\|ai) |
| `orderStatusHistory` | tenantId, orderId, fromStatus, toStatus, changedBy |
| `aiLogs` | tenantId, messageId, prompt, response, latencyMs, error |
| `webhookLogs` | tenantId, eventType, payload, statusCode, retries |
| `notificationLogs` | tenantId, type, message, read, metadata |

**Index requirements**: `tenantId` on every collection; compound indexes on `(tenantId, status)`, `(tenantId, createdAt)` for orders; `fbSenderId` + `tenantId` for users.

---

## Message Processing Pipeline

```
Facebook Webhook POST
  → Verify signature (X-Hub-Signature-256)
  → Store raw message in messages collection
  → Enqueue job in BullMQ (messageQueue)
    → Worker picks up job
    → Run Rule-Based Parser
      → Confidence >= 0.7? → use rule result
      → Confidence < 0.7?  → call AI Parser
        → AI fails?        → fallback to rule result
    → Save ParsedOrder (source: 'rule' | 'ai')
    → Create Order (status: 'pending')
    → Emit Socket.io event: order:new
    → Emit notification
```

---

## Hybrid Parser System

### Rule-Based Parser
Supports Bangla + English mixed messages.

Extracts:
- `intent`: order / question / spam
- `product`: product name from message
- `quantity`: numeric quantity
- `phone`: Bangladesh format (`01[3-9]\d{8}`)
- `address`: address fragment

Confidence scoring:
- phone found → +0.3
- product found → +0.3
- intent found → +0.2
- address found → +0.2

Threshold: confidence < 0.7 triggers AI fallback.

### AI Parser
- HTTP-based calls only (no SDK dependency)
- Must handle Bangla + English
- Must safely parse JSON responses (wrap in try/catch)
- Returns: `{ intent, product, quantity, phone, address, confidence_score }`
- On failure: fall back silently to rule-based result, log error to `aiLogs`

---

## API Routes

```
POST   /auth/login
POST   /auth/register
GET    /auth/me

POST   /webhook/facebook          # Facebook webhook verification + event ingestion
GET    /webhook/facebook          # Webhook challenge verification

GET    /orders                    # Paginated, filterable (status, date, product)
GET    /orders/:id
PATCH  /orders/:id/status
PATCH  /orders/:id/correction     # Save manual corrections

GET    /customers
GET    /customers/:id
GET    /customers/:id/orders

GET    /analytics/summary
GET    /analytics/top-products
GET    /analytics/peak-hours
GET    /analytics/conversion

GET    /settings
PATCH  /settings
POST   /settings/facebook/connect
DELETE /settings/facebook/disconnect

GET    /notifications
PATCH  /notifications/:id/read
```

---

## Queue System (BullMQ)

Queues:
- `messageQueue` — process incoming Facebook messages
- `webhookRetryQueue` — retry failed webhook deliveries
- `notificationQueue` — send/store notifications

Worker rules:
- Retries: 3 attempts with exponential backoff
- Dead-letter handling: log to DB after max retries exceeded
- Concurrency: configurable per environment

---

## Real-Time Events (Socket.io)

Rooms are scoped by `tenantId`. Clients join room on authentication.

| Event | Payload |
|---|---|
| `order:new` | `{ order, tenant }` |
| `order:updated` | `{ orderId, status, tenant }` |
| `webhook:failure` | `{ error, retries }` |
| `notification:new` | `{ notification }` |

---

## Frontend Dashboard Modules

### Layout
- Sidebar + topbar shell (`AppLayout.vue`)
- Mobile responsive (Tailwind breakpoints)
- Route guards: redirect unauthenticated users to `/login`

### Pages
| Route | View | Description |
|---|---|---|
| `/login` | `LoginView` | Auth form |
| `/dashboard` | `DashboardView` | Analytics overview |
| `/orders` | `OrdersView` | Orders table + real-time updates |
| `/orders/:id` | `OrderDetailDrawer` | Message, parsed data, editable fields, confidence score |
| `/customers` | `CustomersView` | Customer list + search |
| `/customers/:id` | `CustomerDetailView` | Profile + order history |
| `/settings` | `SettingsView` | Facebook page connect, webhook status |

### Pinia Stores
- `useAuthStore` — user session, token, tenant
- `useOrdersStore` — orders list, filters, pagination, socket sync
- `useCustomersStore` — customer list + search
- `useNotificationsStore` — notification feed
- `useAnalyticsStore` — dashboard metrics

### Axios Layer
- Base URL from env
- Request interceptor: attach Bearer token
- Response interceptor: handle 401 (auto logout), 422 (validation errors)

---

## Facebook Integration

- Use Graph API webhooks (`/webhook/facebook`)
- Verify `X-Hub-Signature-256` header on every POST
- Store page access tokens encrypted in `tenants` collection
- Support multiple pages per account (one tenant = one page)
- Handle webhook retries gracefully (idempotency via `fbMessageId`)

---

## Security & Performance

- Rate limiting on all API routes (express-rate-limit)
- Helmet.js for security headers
- Tenant isolation enforced at service layer (never skip `tenantId` filter)
- Redis caching for analytics aggregations (TTL: 5 min)
- MongoDB compound indexes on all hot query paths
- Webhook endpoint signature verification before any processing

---

## Error Handling

- Global Express error middleware (`src/middleware/errorHandler.ts`)
- All async route handlers wrapped in `asyncHandler` utility
- BullMQ workers catch and log errors per job
- AI parser failures are silent (fallback, then log to `aiLogs`)
- Webhook failures trigger `webhookRetryQueue` job

---

## Analytics (MongoDB Aggregation)

All analytics queries use aggregation pipelines scoped to `tenantId`:
- Total orders by status
- Revenue (sum of order totals, if present)
- Peak order hours (`$hour` on `createdAt`)
- Top products (group by product name, count)
- Conversion rate (orders with `confirmed` status / total orders)

---

## Environment Variables

```env
# Backend
PORT=
MONGODB_URI=
REDIS_URL=
JWT_SECRET=
FACEBOOK_APP_SECRET=
AI_API_KEY=
AI_API_URL=

# Frontend
VITE_API_BASE_URL=
VITE_SOCKET_URL=
```

---

## Development Commands

```bash
# Backend
cd backend && npm install
npm run dev          # ts-node-dev watch mode
npm run build        # tsc compile
npm run start        # run compiled dist

# Frontend
cd frontend && npm install
npm run dev          # Vite dev server
npm run build        # production build
npm run preview      # preview production build
```

---

## Key Implementation Constraints

1. Never bypass `tenantId` scoping — this is a hard multi-tenant requirement
2. Rule parser runs first on every message — AI is only a fallback
3. All parser results (including AI) are saved to `parsedOrders` before order creation
4. Manual corrections via `/orders/:id/correction` update the order but also log the original parsed values
5. Socket.io rooms must match tenant scope — no cross-tenant event leakage
6. Facebook webhook must respond within 5s — enqueue and return 200 immediately
7. AI HTTP calls must have a timeout (default: 10s) to avoid blocking workers
