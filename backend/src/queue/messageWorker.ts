import { Worker, Job } from 'bullmq';
import { Message } from '../models/Message';
import { WebhookLog } from '../models/WebhookLog';
import { processMessage } from './messageProcessor';
import { emitWebhookFailure } from '../realtime/emitters';
import { createRedisConnection } from './connection';
import { enqueueMessage, MessageJobData, MESSAGE_QUEUE_NAME } from './queues';
import { logger } from '../utils/logger';

// Must match CLAUDE.md spec: 30s → 2min → 10min
// attemptsMade is 1-indexed: 1 = first retry (after initial failure)
const RETRY_DELAYS_MS: readonly number[] = [30_000, 120_000, 600_000];

let _worker: Worker<MessageJobData> | null = null;

async function processJob(job: Job<MessageJobData>): Promise<void> {
  const { messageId, tenantId, logId } = job.data;

  logger.info(
    { jobId: job.id, messageId, tenantId, attemptsMade: job.attemptsMade },
    'Worker processing message'
  );

  await processMessage(messageId, tenantId);

  if (logId) {
    await WebhookLog.updateOne(
      { _id: logId },
      { $set: { resolvedAt: new Date(), statusCode: 200 } }
    );
  }
}

export function startMessageWorker(concurrency = 5): Worker<MessageJobData> {
  if (_worker) return _worker;

  _worker = new Worker<MessageJobData>(MESSAGE_QUEUE_NAME, processJob, {
    connection: createRedisConnection(),
    concurrency,
    settings: {
      backoffStrategy: (attemptsMade: number) =>
        RETRY_DELAYS_MS[attemptsMade - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1],
    },
  });

  _worker.on('completed', (job) => {
    logger.info({ jobId: job.id, messageId: job.data.messageId }, 'Message job completed');
  });

  _worker.on('failed', async (job, err) => {
    if (!job) return;
    const { messageId, tenantId, logId } = job.data;
    const maxAttempts = job.opts.attempts ?? 4;
    const exhausted = job.attemptsMade >= maxAttempts;

    logger.error(
      { err, messageId, tenantId, attemptsMade: job.attemptsMade, exhausted },
      'Message job failed'
    );

    if (logId) {
      await WebhookLog.updateOne(
        { _id: logId },
        { $inc: { retries: 1 }, $set: { error: err.message } }
      ).catch(() => {});
    }

    if (exhausted) {
      emitWebhookFailure(tenantId, err.message, job.attemptsMade);
    }
  });

  _worker.on('error', (err) => {
    logger.error({ err }, 'BullMQ worker error');
  });

  logger.info({ concurrency }, 'Message processing worker started');
  return _worker;
}

export async function stopMessageWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('Message processing worker stopped');
  }
}

/**
 * On startup: finds messages saved to MongoDB but absent from Redis
 * (e.g. Redis was down when the webhook arrived).
 *
 * BullMQ persists unfinished jobs in Redis across normal restarts,
 * so this only handles the Redis-outage edge case.
 */
export async function recoverUnprocessedMessages(): Promise<void> {
  const cutoff = new Date(Date.now() - 60_000);
  const stuckMessages = await Message.find(
    { processed: false, createdAt: { $lt: cutoff } },
    { _id: 1, tenantId: 1 }
  ).lean();

  if (stuckMessages.length === 0) return;

  logger.info({ count: stuckMessages.length }, 'Re-enqueuing unprocessed messages on startup');

  for (const msg of stuckMessages) {
    const messageId = msg._id.toString();
    const tenantId = msg.tenantId.toString();

    const log = await WebhookLog.findOne(
      { messageId: msg._id, resolvedAt: null },
      { _id: 1 }
    ).lean();

    const logId = log ? log._id.toString() : null;

    await enqueueMessage(messageId, tenantId, logId).catch((err) => {
      logger.error({ err, messageId }, 'Failed to re-enqueue message during recovery');
    });
  }
}
