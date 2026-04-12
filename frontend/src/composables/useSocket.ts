import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';
import { useOrdersStore } from '@/stores/orders';
import { useNotificationsStore } from '@/stores/notifications';
import { useAnalyticsStore } from '@/stores/analytics';
import type { Order, OrderStatus, Notification } from '@/types';

let socket: Socket | null = null;

export function useSocket() {
  function connect() {
    if (socket?.connected) return;

    const auth = useAuthStore();

    socket = io(import.meta.env.VITE_SOCKET_URL ?? '', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      if (auth.user?.tenant?.id) {
        socket!.emit('join:tenant', auth.user.tenant.id);
      }
    });

    socket.on('order:new', ({ order }: { order: Order }) => {
      useOrdersStore().onOrderNew(order);
      useAnalyticsStore().fetchAll();
    });

    socket.on('order:updated', ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      useOrdersStore().onOrderUpdated(orderId, status);
      useAnalyticsStore().fetchAll();
    });

    socket.on('notification:new', ({ notification }: { notification: Notification }) => {
      useNotificationsStore().onNew(notification);
    });

    socket.on('webhook:failure', ({ error, retries }: { error: string; retries: number }) => {
      useNotificationsStore().onNew({
        _id: `wf-${Date.now()}`,
        tenantId: '',
        type: 'webhook:failure',
        message: `Webhook failed after ${retries} ${retries === 1 ? 'retry' : 'retries'}: ${error}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    });
  }

  function disconnect() {
    socket?.disconnect();
    socket = null;
  }

  return { connect, disconnect };
}
