import { apiClient } from './client';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ token: string }>('/auth/login', { email, password }),

  register: (data: { email: string; password: string; name: string; tenantName: string }) =>
    apiClient.post<{ token: string }>('/auth/register', data),

  me: () =>
    apiClient.get<{ id: string; email: string; name: string; role: string; tenant: { id: string; name: string; pageId: string } | null }>('/auth/me'),
};
