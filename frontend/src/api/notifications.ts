import { apiClient } from './client';
import type { Notification } from '@/types';

export const notificationsApi = {
  list: (unread?: boolean) =>
    apiClient.get<Notification[]>('/notifications', { params: { unread } }),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
};
