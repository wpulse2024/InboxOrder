<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>

    <div v-if="store.loading" class="text-sm text-gray-500">Loading analytics…</div>

    <template v-else>
      <!-- Summary cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders" :value="summary?.totalOrders ?? 0" />
        <StatCard label="Total Revenue" :value="`৳${(summary?.totalRevenue ?? 0).toLocaleString()}`" />
        <StatCard label="Conversion Rate" :value="`${(summary?.conversionRate ?? 0).toFixed(1)}%`" />
        <StatCard
          label="Pending"
          :value="(summary?.byStatus as Record<string, { count: number }>)?.pending?.count ?? 0"
        />
      </div>

      <!-- Bottom row: top products + peak hours -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top products -->
        <div class="bg-white rounded-xl shadow-sm p-5">
          <h2 class="text-base font-semibold text-gray-900 mb-4">Top Products</h2>
          <div v-if="store.topProducts.length === 0" class="text-sm text-gray-500">No data yet.</div>
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="pb-2 font-medium">Product</th>
                <th class="pb-2 font-medium text-right">Orders</th>
                <th class="pb-2 font-medium text-right">Units</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="p in store.topProducts" :key="p.product">
                <td class="py-2 text-gray-800">{{ p.product }}</td>
                <td class="py-2 text-right text-gray-600">{{ p.orders }}</td>
                <td class="py-2 text-right text-gray-600">{{ p.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Peak hours -->
        <div class="bg-white rounded-xl shadow-sm p-5">
          <h2 class="text-base font-semibold text-gray-900 mb-4">Peak Order Hours</h2>
          <div v-if="store.peakHours.length === 0" class="text-sm text-gray-500">No data yet.</div>
          <template v-else>
            <div class="flex h-20 items-end gap-px">
              <div
                v-for="bar in hourlyBars"
                :key="bar.hour"
                class="flex-1 rounded-t-sm bg-brand-100 hover:bg-brand-500 cursor-default transition-colors"
                :style="{ height: bar.heightPx + 'px' }"
                :title="`${bar.hour}:00 — ${bar.count} orders`"
              />
            </div>
            <div class="mt-1.5 flex justify-between px-px text-[10px] text-gray-400">
              <span>0h</span>
              <span>6h</span>
              <span>12h</span>
              <span>18h</span>
              <span>23h</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Order status breakdown -->
      <div v-if="statusRows.length > 0" class="bg-white rounded-xl shadow-sm p-5">
        <h2 class="text-base font-semibold text-gray-900 mb-4">Order Status Breakdown</h2>
        <div class="space-y-2">
          <div v-for="row in statusRows" :key="row.status" class="flex items-center gap-3">
            <span class="w-24 shrink-0 text-xs text-gray-600 capitalize">{{ row.status }}</span>
            <div class="flex-1 h-2 rounded-full bg-gray-100">
              <div
                class="h-2 rounded-full transition-all"
                :class="row.color"
                :style="{ width: row.pct + '%' }"
              />
            </div>
            <span class="w-8 shrink-0 text-right text-xs font-medium text-gray-700">{{ row.count }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useAnalyticsStore } from '@/stores/analytics';
import StatCard from '@/components/StatCard.vue';

const store = useAnalyticsStore();
const summary = computed(() => store.summary as Record<string, unknown> | null);

const MAX_BAR_PX = 72;

const hourlyBars = computed(() => {
  const maxCount = Math.max(...store.peakHours.map((h) => h.count), 1);
  const hourMap = new Map(store.peakHours.map((h) => [h.hour, h.count]));
  return Array.from({ length: 24 }, (_, i) => {
    const count = hourMap.get(i) ?? 0;
    return {
      hour: i,
      count,
      heightPx: count > 0 ? Math.max(Math.round((count / maxCount) * MAX_BAR_PX), 3) : 0,
    };
  });
});

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-400',
  confirmed: 'bg-green-500',
  processing: 'bg-blue-500',
  shipped: 'bg-indigo-500',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-red-400',
};

const statusRows = computed(() => {
  const byStatus = (summary.value?.byStatus ?? {}) as Record<string, { count: number }>;
  const total = Object.values(byStatus).reduce((s, v) => s + v.count, 0) || 1;
  return Object.entries(byStatus)
    .map(([status, { count }]) => ({
      status,
      count,
      pct: Math.round((count / total) * 100),
      color: STATUS_COLORS[status] ?? 'bg-gray-400',
    }))
    .sort((a, b) => b.count - a.count);
});

onMounted(() => store.fetchAll());
</script>
