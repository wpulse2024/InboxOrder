import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { logger } from '../utils/logger';

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Socket client connected');

    // Client must join its tenant room after connecting
    socket.on('join:tenant', (tenantId: string) => {
      socket.join(`tenant:${tenantId}`);
      logger.info({ socketId: socket.id, tenantId }, 'Socket joined tenant room');
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Socket client disconnected');
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialized. Call initSocket() first.');
  return io;
}
