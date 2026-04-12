import { apiClient } from './client';
import type { AuthUser } from '@/types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthTokens>('/auth/login', { email, password }),

  register: (data: { email: string; password: string; name: string; tenantName: string }) =>
    apiClient.post<AuthTokens>('/auth/register', data),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthTokens>('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    apiClient.post<void>('/auth/logout', { refreshToken }),

  me: () =>
    apiClient.get<AuthUser>('/auth/me'),
};
