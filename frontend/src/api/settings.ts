import { apiClient } from './client';

export const settingsApi = {
  get: () => apiClient.get('/settings'),
  update: (data: object) => apiClient.patch('/settings', data),

  startFacebookOAuth: () => apiClient.get('/settings/facebook/oauth/start'),
  getPendingFacebookPages: () => apiClient.get('/settings/facebook/oauth/pending'),
  selectFacebookPages: (pageIds: string[]) =>
    apiClient.post('/settings/facebook/oauth/select', { pageIds }),
};
