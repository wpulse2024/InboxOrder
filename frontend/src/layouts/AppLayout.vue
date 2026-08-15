<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <!-- Mobile sidebar overlay -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-40 bg-black/30 lg:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <!-- Logo -->
      <div class="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-5">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <span class="text-base font-bold text-gray-900">InboxOrder</span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <!-- Dashboard -->
        <RouterLink to="/dashboard" :class="navItemClass('/dashboard')" @click="sidebarOpen = false">
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </RouterLink>

        <!-- Orders -->
        <RouterLink to="/orders" :class="navItemClass('/orders')" @click="sidebarOpen = false">
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Orders
        </RouterLink>

        <!-- Customers -->
        <RouterLink to="/customers" :class="navItemClass('/customers')" @click="sidebarOpen = false">
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Customers
        </RouterLink>

        <!-- Settings -->
        <RouterLink to="/settings" :class="navItemClass('/settings')" @click="sidebarOpen = false">
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </RouterLink>

        <!-- Admin config (platform admins only) -->
        <RouterLink
          v-if="authStore.user?.isPlatformAdmin"
          to="/admin/config"
          :class="navItemClass('/admin/config')"
          @click="sidebarOpen = false"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Platform Config
        </RouterLink>
      </nav>

      <!-- User footer -->
      <div class="shrink-0 border-t border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100">
            <span class="text-sm font-semibold text-brand-700">{{ userInitials }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-900">{{ authStore.user?.name ?? 'User' }}</p>
            <p class="truncate text-xs text-gray-500">{{ authStore.user?.tenant?.name ?? '' }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- Topbar -->
      <header class="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
        <!-- Hamburger (mobile only) -->
        <button
          class="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          @click="sidebarOpen = !sidebarOpen"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <!-- Right controls -->
        <div class="ml-auto flex items-center gap-3">
          <!-- Notification bell + dropdown -->
          <div ref="notifRef" class="relative">
            <button
              class="relative rounded-md p-2 text-gray-500 hover:bg-gray-100"
              @click="showNotifications = !showNotifications"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span
                v-if="notificationsStore.unreadCount > 0"
                class="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white"
              >{{ notificationsStore.unreadCount > 9 ? '9+' : notificationsStore.unreadCount }}</span>
            </button>

            <Transition name="dropdown">
              <div
                v-if="showNotifications"
                class="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
              >
                <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <span class="text-sm font-semibold text-gray-900">Notifications</span>
                  <button
                    v-if="notificationsStore.unreadCount > 0"
                    class="text-xs text-brand-600 hover:text-brand-700"
                    @click.stop="markAllRead"
                  >Mark all read</button>
                </div>
                <div class="max-h-72 divide-y divide-gray-50 overflow-y-auto">
                  <p
                    v-if="notificationsStore.notifications.length === 0"
                    class="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    You're all caught up
                  </p>
                  <button
                    v-for="n in notificationsStore.notifications.slice(0, 10)"
                    :key="n._id"
                    class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                    :class="!n.read ? 'bg-brand-50' : ''"
                    @click="notificationsStore.markRead(n._id)"
                  >
                    <div
                      class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      :class="n.read ? 'bg-gray-300' : 'bg-brand-500'"
                    />
                    <div class="min-w-0 flex-1">
                      <p class="text-xs leading-relaxed text-gray-800">{{ n.message }}</p>
                      <p class="mt-0.5 text-[10px] text-gray-400">{{ formatNotifDate(n.createdAt) }}</p>
                    </div>
                  </button>
                </div>
              </div>
            </Transition>
          </div>

          <div class="h-6 w-px bg-gray-200" />

          <!-- User + logout -->
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100">
              <span class="text-xs font-semibold text-brand-700">{{ userInitials }}</span>
            </div>
            <span class="hidden text-sm font-medium text-gray-700 sm:block">{{ authStore.user?.name }}</span>
            <button class="btn-secondary text-xs" @click="handleLogout">Logout</button>
          </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';
import { useSocket } from '@/composables/useSocket';

const authStore = useAuthStore();
const notificationsStore = useNotificationsStore();
const router = useRouter();
const route = useRoute();
const { connect, disconnect } = useSocket();

const notifRef = ref<HTMLElement | null>(null);
const sidebarOpen = ref(false);
const showNotifications = ref(false);

const userInitials = computed(() => {
  const name = authStore.user?.name ?? '';
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
});

// Active state: exact match for /dashboard, prefix match for others
function navItemClass(path: string): string {
  const active =
    path === '/dashboard' ? route.path === path : route.path.startsWith(path);
  return [
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    active
      ? 'bg-brand-50 text-brand-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  ].join(' ');
}

function handleOutsideClick(e: MouseEvent) {
  if (showNotifications.value && notifRef.value && !notifRef.value.contains(e.target as Node)) {
    showNotifications.value = false;
  }
}

async function markAllRead() {
  const unread = notificationsStore.notifications.filter((n) => !n.read);
  await Promise.all(unread.map((n) => notificationsStore.markRead(n._id)));
}

function formatNotifDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function handleLogout() {
  disconnect();
  authStore.logout();
  router.push({ name: 'login' });
}

onMounted(() => {
  connect();
  notificationsStore.fetchNotifications();
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
