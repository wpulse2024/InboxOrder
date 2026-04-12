import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { notificationsApi } from '@/api/notifications';
import type { Notification } from '@/types';

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([]);
  const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length);

  async function fetchNotifications() {
    const { data } = await notificationsApi.list();
    notifications.value = data;
  }

  async function markRead(id: string) {
    await notificationsApi.markRead(id);
    const n = notifications.value.find((x) => x._id === id);
    if (n) n.read = true;
  }

  function onNew(notification: Notification) {
    notifications.value.unshift(notification);
  }

  return { notifications, unreadCount, fetchNotifications, markRead, onNew };
});
