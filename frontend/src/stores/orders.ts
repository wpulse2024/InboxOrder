import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ordersApi, type OrderFilters } from '@/api/orders';
import type { Order, OrderStatus } from '@/types';

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pages = ref(1);
  const loading = ref(false);
  const filters = ref<OrderFilters>({});

  async function fetchOrders(newFilters?: OrderFilters) {
    if (newFilters) filters.value = { ...filters.value, ...newFilters };
    loading.value = true;
    try {
      const { data } = await ordersApi.list({ ...filters.value, page: page.value });
      orders.value = data.orders ?? [];
      total.value = data.total;
      pages.value = data.pages;
    } finally {
      loading.value = false;
    }
  }

  async function updateStatus(id: string, status: OrderStatus, note?: string) {
    const { data } = await ordersApi.updateStatus(id, status, note);
    const idx = orders.value.findIndex((o) => o._id === id);
    if (idx !== -1) orders.value[idx] = data;
    return data;
  }

  // Called by socket event — prepend new order to list
  function onOrderNew(order: Order) {
    orders.value.unshift(order);
    total.value++;
  }

  // Called by socket event — update status in place
  function onOrderUpdated(orderId: string, status: OrderStatus) {
    const order = orders.value.find((o) => o._id === orderId);
    if (order) order.status = status;
  }

  function setPage(n: number) {
    page.value = n;
    fetchOrders();
  }

  return { orders, total, page, pages, loading, filters, fetchOrders, updateStatus, onOrderNew, onOrderUpdated, setPage };
});
