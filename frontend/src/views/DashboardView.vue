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
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useAnalyticsStore } from '@/stores/analytics';
import StatCard from '@/components/StatCard.vue';

const store = useAnalyticsStore();
const summary = computed(() => store.summary as Record<string, unknown> | null);

onMounted(() => store.fetchAll());
</script>
