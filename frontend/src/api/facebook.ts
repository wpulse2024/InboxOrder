import { apiClient } from './client';

export interface ConnectedPage {
  pageId: string;
  pageName: string;
  isActive: boolean;
  webhookSubscribed: boolean;
  tokenExpiresAt: string | null;
}

export const facebookApi = {
  listPages: () => apiClient.get<{ pages: ConnectedPage[] }>('/facebook/pages'),
  addPage: (pageId: string, pageName: string, accessToken: string) =>
    apiClient.post('/facebook/pages', { pageId, pageName, accessToken }),
  removePage: (pageId: string) => apiClient.delete(`/facebook/pages/${pageId}`),
};
