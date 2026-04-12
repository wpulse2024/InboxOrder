<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-brand-600">InboxOrder</h1>
        <p class="mt-2 text-sm text-gray-600">Sign in to your account</p>
      </div>

      <form class="bg-white shadow rounded-xl p-8 space-y-5" @submit.prevent="handleLogin">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            v-model="form.email"
            type="email"
            required
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            v-model="form.password"
            type="password"
            required
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
          />
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSocket } from '@/composables/useSocket';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { connect } = useSocket();

const form = ref({ email: '', password: '' });
const loading = ref(false);
const error = ref('');

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(form.value.email, form.value.password);
    connect();
    const redirect = (route.query.redirect as string) ?? '/dashboard';
    router.push(redirect);
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    error.value = e.response?.data?.error ?? 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>
