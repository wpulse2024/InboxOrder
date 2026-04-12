import { defineStore } from 'pinia';
import { ref } from 'vue';
import { customersApi } from '@/api/customers';
import type { Customer } from '@/types';

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pages = ref(1);
  const loading = ref(false);
  const search = ref('');

  async function fetchCustomers(newSearch?: string) {
    if (newSearch !== undefined) search.value = newSearch;
    loading.value = true;
    try {
      const { data } = await customersApi.list({ search: search.value || undefined, page: page.value });
      customers.value = data.customers ?? [];
      total.value = data.total;
      pages.value = data.pages;
    } finally {
      loading.value = false;
    }
  }

  function setPage(n: number) {
    page.value = n;
    fetchCustomers();
  }

  return { customers, total, page, pages, loading, search, fetchCustomers, setPage };
});
