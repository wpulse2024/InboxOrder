<template>
  <div v-if="loading" class="text-sm text-gray-500 py-8 text-center">Loading…</div>

  <div v-else-if="customer" class="max-w-2xl space-y-6">
    <div class="flex items-center gap-3">
      <RouterLink to="/customers" class="text-sm text-brand-600 hover:underline">&larr; Customers</RouterLink>
      <h1 class="text-xl font-bold text-gray-900">{{ customer.name }}</h1>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-5 grid grid-cols-2 gap-4 text-sm">
      <div><span class="text-gray-500">Phone</span><p class="font-medium mt-0.5">{{ customer.phone ?? '—' }}</p></div>
      <div><span class="text-gray-500">Address</span><p class="font-medium mt-0.5">{{ customer.address ?? '—' }}</p></div>
      <div><span class="text-gray-500">Total Orders</span><p class="font-medium mt-0.5">{{ customer.totalOrders }}</p></div>
      <div><span class="text-gray-500">Joined</span><p class="font-medium mt-0.5">{{ formatDate(customer.createdAt) }}</p></div>
    </div>

    <div class="bg-white rounded-xl shadow-sm overflow-x-auto">
      <div class="px-5 py-4 border-b">
        <h2 class="text-sm font-semibold text-gray-900">Order History</h2>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Items</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="order in orders" :key="order._id">
            <td class="px-4 py-3 text-gray-700">
              {{ order.items.map((i) => `${i.product} ×${i.quantity}`).join(', ') || '—' }}
            </td>
            <td class="px-4 py-3"><OrderStatusBadge :status="order.status" /></td>
            <td class="px-4 py-3 text-gray-500">{{ formatDate(order.createdAt) }}</td>
          </tr>
          <tr v-if="orders.length === 0">
            <td colspan="3" class="px-4 py-6 text-center text-sm text-gray-500">No orders yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { customersApi } from '@/api/customers';
import type { Customer, Order } from '@/types';
import OrderStatusBadge from '@/components/OrderStatusBadge.vue';

const route = useRoute();
const customer = ref<Customer | null>(null);
const orders = ref<Order[]>([]);
const loading = ref(true);

onMounted(async () => {
  const id = route.params.id as string;
  const [c, o] = await Promise.all([customersApi.get(id), customersApi.orders(id)]);
  customer.value = c.data;
  orders.value = o.data;
  loading.value = false;
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
</script>
