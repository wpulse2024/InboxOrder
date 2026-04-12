import { apiClient } from './client';
import type { Order, PaginatedResponse } from '@/types';

export interface OrderFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const ordersApi = {
  list: (filters: OrderFilters = {}) =>
    apiClient.get<PaginatedResponse<Order>>('/orders', { params: filters }),

  get: (id: string) =>
    apiClient.get<Order>(`/orders/${id}`),

  updateStatus: (id: string, status: string, note?: string) =>
    apiClient.patch<Order>(`/orders/${id}/status`, { status, note }),

  saveCorrection: (id: string, data: { items?: Order['items']; notes?: string }) =>
    apiClient.patch<Order>(`/orders/${id}/correction`, data),
};
