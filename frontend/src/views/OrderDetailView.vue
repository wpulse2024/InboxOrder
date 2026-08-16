<template>
  <div v-if="loading" class="text-sm text-gray-500 py-8 text-center">Loading order…</div>

  <div v-else-if="order" class="max-w-2xl space-y-6">
    <div class="flex items-center gap-3">
      <RouterLink to="/orders" class="text-sm text-brand-600 hover:underline">&larr; Orders</RouterLink>
      <h1 class="text-xl font-bold text-gray-900">Order #{{ order._id.slice(-6).toUpperCase() }}</h1>
      <OrderStatusBadge :status="order.status" />
    </div>

    <!-- Message -->
    <div class="bg-white rounded-xl shadow-sm p-5 space-y-2">
      <h2 class="text-sm font-semibold text-gray-700">Original Message</h2>
      <p class="text-sm text-gray-800 whitespace-pre-wrap">
        {{ typeof order.messageId === 'object' ? order.messageId.text : '—' }}
      </p>
      <p class="text-xs text-gray-400">
        Source: <span class="font-medium">{{ order.parsedBy }}</span>
      </p>
    </div>

    <!-- Parsed items -->
    <div class="bg-white rounded-xl shadow-sm p-5 space-y-3">
      <h2 class="text-sm font-semibold text-gray-700">Order Items</h2>
      <div v-for="(item, i) in editableItems" :key="i" class="flex gap-3 rounded-md border border-gray-200 p-3">
        <img
          v-if="item.imageUrl"
          :src="item.imageUrl"
          class="w-14 h-14 rounded-md object-cover shrink-0 border border-gray-200"
          alt=""
        />
        <div class="flex-1 space-y-2">
          <div class="flex gap-3 items-center">
            <input
              v-model="item.product"
              class="flex-1 rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
              placeholder="Product"
            />
            <input
              v-model.number="item.quantity"
              type="number"
              min="1"
              class="w-20 rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
              placeholder="Qty"
            />
            <input
              v-model.number="item.price"
              type="number"
              min="0"
              step="0.01"
              class="w-24 rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
              placeholder="Price"
            />
          </div>
          <div class="flex gap-2">
            <input
              v-model="item.sku"
              placeholder="SKU"
              class="w-32 rounded-md border-gray-300 text-xs focus:border-brand-500 focus:ring-brand-500"
            />
            <input
              v-model="item.category"
              placeholder="Category"
              class="w-32 rounded-md border-gray-300 text-xs focus:border-brand-500 focus:ring-brand-500"
            />
            <input
              v-model="item.imageUrl"
              placeholder="Image URL"
              class="flex-1 rounded-md border-gray-300 text-xs focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <input
            v-model="item.description"
            placeholder="Description"
            class="w-full rounded-md border-gray-300 text-xs focus:border-brand-500 focus:ring-brand-500"
          />
          <p v-if="item.price" class="text-xs text-gray-400">
            Subtotal: {{ (item.price * item.quantity).toFixed(2) }}
          </p>
        </div>
      </div>
      <button class="text-xs text-brand-600 hover:underline" @click="editableItems.push({ product: '', quantity: 1 })">+ Add item</button>
      <p v-if="order.totalAmount" class="text-sm font-semibold text-gray-700 text-right">
        Total: {{ order.totalAmount.toFixed(2) }}
      </p>
    </div>

    <!-- Notes -->
    <div class="bg-white rounded-xl shadow-sm p-5 space-y-2">
      <h2 class="text-sm font-semibold text-gray-700">Notes</h2>
      <textarea
        v-model="notes"
        rows="2"
        class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
      />
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap gap-3">
      <button class="btn-primary text-sm" :disabled="saving" @click="saveChanges">
        {{ saving ? 'Saving…' : 'Save corrections' }}
      </button>
      <select
        v-model="newStatus"
        class="rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
        @change="updateStatus"
      >
        <option value="">Change status…</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { ordersApi } from '@/api/orders';
import type { Order, OrderItem, OrderStatus } from '@/types';
import OrderStatusBadge from '@/components/OrderStatusBadge.vue';

const route = useRoute();
const order = ref<Order | null>(null);
const loading = ref(true);
const saving = ref(false);
const editableItems = ref<OrderItem[]>([]);
const notes = ref('');
const newStatus = ref('');

const statuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

onMounted(async () => {
  const { data } = await ordersApi.get(route.params.id as string);
  order.value = data;
  editableItems.value = data.items.map((i) => ({ ...i }));
  notes.value = data.notes ?? '';
  loading.value = false;
});

async function saveChanges() {
  if (!order.value) return;
  saving.value = true;
  try {
    const { data } = await ordersApi.saveCorrection(order.value._id, {
      items: editableItems.value
        .filter((i) => i.product)
        .map((i) => ({
          product: i.product,
          quantity: i.quantity,
          price: i.price,
          description: i.description,
          sku: i.sku,
          category: i.category,
          imageUrl: i.imageUrl,
        })),
      notes: notes.value,
    });
    order.value = data;
  } finally {
    saving.value = false;
  }
}

async function updateStatus() {
  if (!order.value || !newStatus.value) return;
  const { data } = await ordersApi.updateStatus(order.value._id, newStatus.value);
  order.value = data;
  newStatus.value = '';
}
</script>
