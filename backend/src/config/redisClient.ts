import IORedis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * General-purpose Redis connection for non-queue use (e.g. short-lived OAuth
 * state). BullMQ entities must use `createRedisConnection` instead — see
 * queue/connection.ts.
 */
export const redisClient = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: 3,
});

redisClient.on('error', (err: Error) => {
  logger.error({ err }, 'Redis client error');
});
