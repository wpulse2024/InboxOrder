import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
import type { AuthUser } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'));
  const user = ref<AuthUser | null>(null);

  const isAuthenticated = computed(() => !!accessToken.value);

  async function login(email: string, password: string) {
    const { data } = await authApi.login(email, password);
    accessToken.value = data.accessToken;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    await fetchMe();
  }

  async function fetchMe() {
    const { data } = await authApi.me();
    user.value = data;
  }

  /**
   * Hydrate user profile from an existing stored token (e.g. after page reload).
   * Called by the router guard before the first navigation.
   */
  async function init() {
    if (!accessToken.value) return;
    try {
      await fetchMe();
    } catch {
      // Interceptor handles redirect on unrecoverable 401
    }
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore — clear locally regardless
      }
    }
    accessToken.value = null;
    user.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  return { accessToken, user, isAuthenticated, login, fetchMe, init, logout };
});
