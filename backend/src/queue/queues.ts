import { Queue } from 'bullmq';
import { createRedisConnection } from './connection';
import { logger } from '../utils/logger';

export const MESSAGE_QUEUE_NAME = 'message-processing';

export interface MessageJobData {
  messageId: string;
  tenantId: string;
  /** MongoDB _id of the WebhookLog document; null for recovered messages. */
  logId: string | null;
}

let _messageQueue: Queue<MessageJobData> | null = null;

export function getMessageQueue(): Queue<MessageJobData> {
  if (!_messageQueue) {
    _messageQueue = new Queue<MessageJobData>(MESSAGE_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 4, // 1 initial attempt + 3 retries
        backoff: { type: 'custom' },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      },
    });

    _messageQueue.on('error', (err: Error) => {
      logger.error({ err }, 'Message queue error');
    });
  }
  return _messageQueue;
}

/**
 * Adds a message processing job to the queue.
 * Uses messageId as the jobId so duplicate webhook deliveries
 * don't produce duplicate jobs (BullMQ deduplication by jobId).
 */
export async function enqueueMessage(
  messageId: string,
  tenantId: string,
  logId: string | null
): Promise<void> {
  const queue = getMessageQueue();
  await queue.add(
    'process-message',
    { messageId, tenantId, logId },
    { jobId: messageId }
  );
  logger.info({ messageId, tenantId }, 'Message enqueued for processing');
}

export async function closeMessageQueue(): Promise<void> {
  if (_messageQueue) {
    await _messageQueue.close();
    _messageQueue = null;
  }
}
