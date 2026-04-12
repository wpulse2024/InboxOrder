<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <!-- Sidebar -->
    <aside
      :class="['fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-sm transition-transform lg:static lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full']"
    >
      <div class="flex h-16 items-center px-6 border-b">
        <span class="text-xl font-bold text-brand-600">InboxOrder</span>
      </div>
      <nav class="mt-4 px-3 space-y-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="item.to"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-brand-600 transition-colors"
          active-class="bg-brand-50 text-brand-700"
          @click="sidebarOpen = false"
        >
          <component :is="item.icon" class="h-5 w-5 shrink-0" />
          {{ item.name }}
        </RouterLink>
      </nav>
    </aside>

    <!-- Overlay for mobile -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-black/30 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Main content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Topbar -->
      <header class="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
        <button class="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100" @click="sidebarOpen = !sidebarOpen">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div class="ml-auto flex items-center gap-4">
          <!-- Notification bell -->
          <button class="relative p-2 rounded-md text-gray-500 hover:bg-gray-100" @click="showNotifications = !showNotifications">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span
              v-if="notificationsStore.unreadCount > 0"
              class="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center"
            >{{ notificationsStore.unreadCount }}</span>
          </button>
          <!-- User menu -->
          <span class="text-sm text-gray-700">{{ authStore.user?.name }}</span>
          <button class="btn-secondary text-xs" @click="handleLogout">Logout</button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';
import { useSocket } from '@/composables/useSocket';

const authStore = useAuthStore();
const notificationsStore = useNotificationsStore();
const router = useRouter();
const { disconnect } = useSocket();

const sidebarOpen = ref(false);
const showNotifications = ref(false);

notificationsStore.fetchNotifications();

const navItems = [
  { name: 'Dashboard', to: '/dashboard', icon: 'svg' },
  { name: 'Orders', to: '/orders', icon: 'svg' },
  { name: 'Customers', to: '/customers', icon: 'svg' },
  { name: 'Settings', to: '/settings', icon: 'svg' },
];

function handleLogout() {
  disconnect();
  authStore.logout();
  router.push({ name: 'login' });
}
</script>
