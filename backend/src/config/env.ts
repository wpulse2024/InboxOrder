import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().optional(),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  FACEBOOK_APP_SECRET: z.string().min(1, 'FACEBOOK_APP_SECRET is required'),
  FACEBOOK_VERIFY_TOKEN: z.string().min(1, 'FACEBOOK_VERIFY_TOKEN is required'),

  AI_API_KEY: z.string().min(1, 'AI_API_KEY is required'),
  AI_API_URL: z.string().url('AI_API_URL must be a valid URL'),
  AI_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  AI_TIMEOUT_MS: z.string().default('10000'),
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
  redisUrl: parsed.data.REDIS_URL ?? '',

  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,

  facebookAppSecret: parsed.data.FACEBOOK_APP_SECRET,
  facebookVerifyToken: parsed.data.FACEBOOK_VERIFY_TOKEN,

  aiApiKey: parsed.data.AI_API_KEY,
  aiApiUrl: parsed.data.AI_API_URL,
  aiModel: parsed.data.AI_MODEL,
  aiTimeoutMs: parseInt(parsed.data.AI_TIMEOUT_MS, 10),
} as const;
