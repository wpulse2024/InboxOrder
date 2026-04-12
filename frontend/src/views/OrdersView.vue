<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Orders</h1>
      <span class="text-sm text-gray-500">{{ store.total }} total</span>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 bg-white rounded-xl shadow-sm p-4">
      <select
        v-model="statusFilter"
        class="rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
        @change="applyFilters"
      >
        <option value="">All statuses</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <input
        v-model="dateFrom"
        type="date"
        class="rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
        @change="applyFilters"
      />
      <input
        v-model="dateTo"
        type="date"
        class="rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
        @change="applyFilters"
      />
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-x-auto">
      <div v-if="store.loading" class="p-6 text-sm text-gray-500 text-center">Loading…</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Customer</th>
            <th class="px-4 py-3 font-medium">Items</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Source</th>
            <th class="px-4 py-3 font-medium">Date</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="order in store.orders" :key="order._id" class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-800">
              {{ typeof order.customerId === 'object' ? order.customerId.name : order.customerId }}
            </td>
            <td class="px-4 py-3 text-gray-600">
              {{ order.items.map((i) => `${i.product} ×${i.quantity}`).join(', ') || '—' }}
            </td>
            <td class="px-4 py-3">
              <OrderStatusBadge :status="order.status" />
            </td>
            <td class="px-4 py-3">
              <span class="badge" :class="order.parsedBy === 'ai' ? 'bg-purple-100 text-purple-700' : order.parsedBy === 'manual' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'">
                {{ order.parsedBy }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-500">{{ formatDate(order.createdAt) }}</td>
            <td class="px-4 py-3">
              <RouterLink :to="`/orders/${order._id}`" class="text-brand-600 hover:underline text-xs">View</RouterLink>
            </td>
          </tr>
          <tr v-if="store.orders.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-sm text-gray-500">No orders found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="store.pages > 1" class="flex justify-center gap-2">
      <button
        v-for="p in store.pages"
        :key="p"
        class="btn text-xs"
        :class="p === store.page ? 'btn-primary' : 'btn-secondary'"
        @click="store.setPage(p)"
      >{{ p }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useOrdersStore } from '@/stores/orders';
import OrderStatusBadge from '@/components/OrderStatusBadge.vue';

const store = useOrdersStore();
const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const statusFilter = ref('');
const dateFrom = ref('');
const dateTo = ref('');

onMounted(() => store.fetchOrders());

function applyFilters() {
  store.setPage(1);
  store.fetchOrders({
    status: statusFilter.value || undefined,
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
</script>
