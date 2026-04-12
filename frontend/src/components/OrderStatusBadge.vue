<template>
  <span class="badge" :class="colorClass">{{ status }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OrderStatus } from '@/types';

const props = defineProps<{ status: OrderStatus }>();

const colorClass = computed(() => ({
  'bg-yellow-100 text-yellow-700': props.status === 'pending',
  'bg-green-100 text-green-700': props.status === 'confirmed',
  'bg-blue-100 text-blue-700': props.status === 'processing',
  'bg-indigo-100 text-indigo-700': props.status === 'shipped',
  'bg-emerald-100 text-emerald-700': props.status === 'delivered',
  'bg-red-100 text-red-700': props.status === 'cancelled',
}));
</script>
