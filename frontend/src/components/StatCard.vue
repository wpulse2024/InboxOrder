<template>
  <div class="bg-white rounded-xl shadow-sm p-5">
    <p class="text-sm text-gray-500">{{ label }}</p>
    <p class="mt-1 text-2xl font-bold text-gray-900">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number }>();
</script>
