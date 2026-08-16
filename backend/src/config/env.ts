import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // The block below are bootstrap fallbacks only. Once the server is running, platform
  // admins manage the live values via /admin/config (see config/platformConfig.ts), which
  // is backed by the PlatformConfig collection, not by these env vars — those DB values
  // take priority whenever set. Left optional here so a fresh deploy with an empty .env
  // can still boot and be configured entirely from the UI afterward.
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  FACEBOOK_VERIFY_TOKEN: z.string().optional(),

  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  AI_API_KEY: z.string().optional(),
  AI_API_URL: z.string().url().default('https://api.anthropic.com/v1/messages'),
  AI_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  AI_TIMEOUT_MS: z.string().default('10000'),

  // Groq (api.groq.com, OpenAI-compatible): used by the per-tenant AI sales agent. No
  // platform-wide API key here — each tenant supplies their own key via /settings,
  // encrypted on Tenant.grokApiKeyEncrypted. (Field/var names kept as "grok" from the
  // original xAI-Grok naming — Groq's API shape is identical OpenAI-style tool-calling.)
  GROK_API_URL: z.string().url().default('https://api.groq.com/openai/v1/chat/completions'),
  GROK_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROK_TIMEOUT_MS: z.string().default('20000'),

  // One-time bootstrap only: on boot, if set, grants isPlatformAdmin to the matching user
  // (if they exist) so there's a first admin able to reach /admin/config. Safe to leave in
  // .env permanently — it's idempotent — or remove after the first successful boot.
  PLATFORM_ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  port: parseInt(parsed.data.PORT, 10),
  nodeEnv: parsed.data.NODE_ENV,
  isDev: parsed.data.NODE_ENV === 'development',

  mongodbUri: parsed.data.MONGODB_URI,
  redisUrl: parsed.data.REDIS_URL,

  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,

  facebookAppId: parsed.data.FACEBOOK_APP_ID ?? null,
  facebookAppSecret: parsed.data.FACEBOOK_APP_SECRET ?? null,
  facebookVerifyToken: parsed.data.FACEBOOK_VERIFY_TOKEN ?? null,

  appBaseUrl: parsed.data.APP_BASE_URL,
  frontendUrl: parsed.data.FRONTEND_URL,

  aiApiKey: parsed.data.AI_API_KEY ?? null,
  aiApiUrl: parsed.data.AI_API_URL,
  aiModel: parsed.data.AI_MODEL,
  aiTimeoutMs: parseInt(parsed.data.AI_TIMEOUT_MS, 10),

  grokApiUrl: parsed.data.GROK_API_URL,
  grokModel: parsed.data.GROK_MODEL,
  grokTimeoutMs: parseInt(parsed.data.GROK_TIMEOUT_MS, 10),

  platformAdminBootstrapEmail: parsed.data.PLATFORM_ADMIN_BOOTSTRAP_EMAIL ?? null,
} as const;
