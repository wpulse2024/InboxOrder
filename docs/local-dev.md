# Local Development Setup

## Prerequisites

- Node.js 20+
- Docker + Docker Compose

## Quick start

### 1. Clone and install

```bash
git clone <repo>
cd InboxOrder
cp .env.example .env
# Fill in .env with your actual values
npm install  # installs all workspace packages
```

### 2. Start infrastructure (MongoDB + Redis only)

```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

### 3. Start backend + frontend

```bash
npm run dev
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

### 4. Run the full stack in Docker

```bash
npm run docker:up
# Frontend (nginx): http://localhost:80
# Backend API: http://localhost:3000
```

## Environment Variables

See [.env.example](../.env.example) for all required values.

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | ≥16 char secret for signing JWTs |
| `FACEBOOK_APP_SECRET` | Facebook App secret (for webhook sig verification) |
| `FACEBOOK_VERIFY_TOKEN` | Your chosen webhook verify token |
| `AI_API_KEY` | Anthropic API key |
| `AI_API_URL` | `https://api.anthropic.com/v1/messages` |

## Facebook Webhook Setup

1. Go to your Facebook App → Webhooks
2. Callback URL: `https://your-domain.com/api/webhook/facebook`
3. Verify Token: value of `FACEBOOK_VERIFY_TOKEN` in `.env`
4. Subscribe to: `messages`, `messaging_postbacks`

## Testing the parser locally

```bash
# POST a fake webhook event (skip signature verification in dev)
curl -X POST http://localhost:3000/api/webhook/facebook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{ "entry": [{ "id": "PAGE_ID", "messaging": [{ "sender": { "id": "USER_123" }, "message": { "mid": "msg_1", "text": "1টা red shirt চাই, 01712345678, ঢাকা" } }] }] }'
```
