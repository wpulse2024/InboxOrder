import { apiClient } from './client';

export const settingsApi = {
  get: () => apiClient.get('/settings'),
  update: (data: object) => apiClient.patch('/settings', data),
  connectFacebook: (pageId: string, accessToken: string) =>
    apiClient.post('/settings/facebook/connect', { pageId, accessToken }),
  disconnectFacebook: () => apiClient.delete('/settings/facebook/disconnect'),
};
