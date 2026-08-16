import { apiClient } from './client';

export interface StoreProfileProduct {
  name: string;
  price: number;
  description?: string;
  sku?: string;
  category?: string;
  imageUrl?: string;
}

export interface StoreProfileFaq {
  question: string;
  answer: string;
}

export interface StoreProfileData {
  businessInfo?: string;
  products: StoreProfileProduct[];
  faqs: StoreProfileFaq[];
}

export const storeProfileApi = {
  get: () => apiClient.get('/store-profile'),
  update: (data: StoreProfileData) => apiClient.put('/store-profile', data),
};
