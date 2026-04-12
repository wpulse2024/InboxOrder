<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Customers</h1>
      <span class="text-sm text-gray-500">{{ store.total }} total</span>
    </div>

    <!-- Search -->
    <div class="bg-white rounded-xl shadow-sm p-4">
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search by name or phone…"
        class="w-full max-w-sm rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
        @input="debouncedSearch"
      />
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-x-auto">
      <div v-if="store.loading" class="p-6 text-sm text-gray-500 text-center">Loading…</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Phone</th>
            <th class="px-4 py-3 font-medium">Orders</th>
            <th class="px-4 py-3 font-medium">Joined</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="c in store.customers" :key="c._id" class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-800">{{ c.name }}</td>
            <td class="px-4 py-3 text-gray-600">{{ c.phone ?? '—' }}</td>
            <td class="px-4 py-3 text-gray-600">{{ c.totalOrders }}</td>
            <td class="px-4 py-3 text-gray-500">{{ formatDate(c.createdAt) }}</td>
            <td class="px-4 py-3">
              <RouterLink :to="`/customers/${c._id}`" class="text-brand-600 hover:underline text-xs">View</RouterLink>
            </td>
          </tr>
          <tr v-if="store.customers.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-sm text-gray-500">No customers found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useCustomersStore } from '@/stores/customers';

const store = useCustomersStore();
const searchQuery = ref('');

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => store.fetchCustomers(searchQuery.value), 300);
}

onMounted(() => store.fetchCustomers());

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
</script>
