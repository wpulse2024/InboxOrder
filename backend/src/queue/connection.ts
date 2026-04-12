import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Creates a fresh IORedis connection for use by BullMQ.
 *
 * Each BullMQ entity (Queue, Worker, QueueEvents) must have its own
 * connection — do NOT share a single instance across them.
 * `maxRetriesPerRequest: null` is required by BullMQ.
 */
export function createRedisConnection(): IORedis {
  const conn = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });

  conn.on('error', (err: Error) => {
    logger.error({ err }, 'Redis connection error');
  });

  conn.on('connect', () => {
    logger.info('Redis connected');
  });

  return conn;
}
