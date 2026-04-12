import { apiClient } from './client';
import type { Customer, Order, PaginatedResponse } from '@/types';

export const customersApi = {
  list: (params: { search?: string; page?: number; limit?: number } = {}) =>
    apiClient.get<PaginatedResponse<Customer>>('/customers', { params }),

  get: (id: string) =>
    apiClient.get<Customer>(`/customers/${id}`),

  orders: (id: string) =>
    apiClient.get<Order[]>(`/customers/${id}/orders`),
};
