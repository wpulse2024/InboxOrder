import { apiClient } from './client';

export const analyticsApi = {
  summary: () => apiClient.get('/analytics/summary'),
  topProducts: (limit?: number) => apiClient.get('/analytics/top-products', { params: { limit } }),
  peakHours: () => apiClient.get('/analytics/peak-hours'),
  conversion: () => apiClient.get('/analytics/conversion'),
};
