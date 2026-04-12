<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSocket } from '@/composables/useSocket';

const auth = useAuthStore();

// Connect socket when authenticated
const { connect, disconnect } = useSocket();
if (auth.isAuthenticated) connect();
</script>
