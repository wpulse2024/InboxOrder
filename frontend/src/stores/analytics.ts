import { defineStore } from 'pinia';
import { ref } from 'vue';
import { analyticsApi } from '@/api/analytics';

export const useAnalyticsStore = defineStore('analytics', () => {
  const summary = ref<Record<string, unknown> | null>(null);
  const topProducts = ref<{ product: string; count: number; orders: number }[]>([]);
  const peakHours = ref<{ hour: number; count: number }[]>([]);
  const loading = ref(false);

  async function fetchAll() {
    loading.value = true;
    try {
      const [s, p, h] = await Promise.all([
        analyticsApi.summary(),
        analyticsApi.topProducts(10),
        analyticsApi.peakHours(),
      ]);
      summary.value = s.data as Record<string, unknown>;
      topProducts.value = p.data as typeof topProducts.value;
      peakHours.value = h.data as typeof peakHours.value;
    } finally {
      loading.value = false;
    }
  }

  return { summary, topProducts, peakHours, loading, fetchAll };
});
