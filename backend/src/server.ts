import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { initSocket } from './config/socket';
import { env } from './config/env';
import { logger } from './utils/logger';
import { recoverUnprocessedMessages } from './queue/webhookRetryWorker';
import { startMessageWorker, stopMessageWorker } from './queue/messageWorker';
import { closeMessageQueue } from './queue/queues';

async function main() {
  await connectDB();

  // Start BullMQ worker before recovery so re-enqueued jobs are picked up immediately
  startMessageWorker();

  // Re-enqueue any messages saved to DB but missing from Redis (Redis-outage recovery)
  await recoverUnprocessedMessages();

  const app = createApp();
  const httpServer = http.createServer(app);

  initSocket(httpServer);

  httpServer.listen(env.port, () => {
    logger.info(`Server running on port ${env.port} [${env.nodeEnv}]`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    httpServer.close(async () => {
      await stopMessageWorker();
      await closeMessageQueue();
      await disconnectDB();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 15_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    logger.error({ err }, 'Unhandled rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
