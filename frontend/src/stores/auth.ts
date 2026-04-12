import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
import type { AuthUser } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<AuthUser | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  async function login(email: string, password: string) {
    const { data } = await authApi.login(email, password);
    token.value = data.token;
    localStorage.setItem('token', data.token);
    await fetchMe();
  }

  async function fetchMe() {
    const { data } = await authApi.me();
    user.value = data;
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
  }

  return { token, user, isAuthenticated, login, fetchMe, logout };
});
