<template>
  <div class="max-w-xl space-y-6">
    <h1 class="text-2xl font-bold text-gray-900">Settings</h1>

    <div v-if="loading" class="text-sm text-gray-500">Loading…</div>

    <template v-else>
      <!-- General settings -->
      <div class="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 class="text-sm font-semibold text-gray-700">General</h2>
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="form.autoConfirmOrders"
            type="checkbox"
            class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span class="text-sm text-gray-700">Auto-confirm orders</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="form.aiParserEnabled"
            type="checkbox"
            class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span class="text-sm text-gray-700">Enable AI parser fallback</span>
        </label>
        <button class="btn-primary text-sm" :disabled="saving" @click="saveSettings">
          {{ saving ? 'Saving…' : 'Save settings' }}
        </button>
      </div>

      <!-- Facebook integration -->
      <div class="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 class="text-sm font-semibold text-gray-700">Facebook Page</h2>
        <div v-if="pageId && !pageId.startsWith('pending') && !pageId.startsWith('disconnected')" class="space-y-2">
          <p class="text-sm text-gray-600">Connected page ID: <span class="font-mono font-medium">{{ pageId }}</span></p>
          <button class="btn-secondary text-sm text-red-600 border-red-300 hover:bg-red-50" @click="disconnect">Disconnect</button>
        </div>
        <div v-else class="space-y-3">
          <input v-model="fbPageId" placeholder="Page ID" class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
          <input v-model="fbToken" placeholder="Page Access Token" type="password" class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
          <button class="btn-primary text-sm" @click="connectFacebook">Connect page</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { settingsApi } from '@/api/settings';

const loading = ref(true);
const saving = ref(false);
const pageId = ref('');
const fbPageId = ref('');
const fbToken = ref('');
const form = ref({ autoConfirmOrders: false, aiParserEnabled: true });

onMounted(async () => {
  const { data } = await settingsApi.get();
  const d = data as { pageId: string; settings: typeof form.value };
  pageId.value = d.pageId;
  form.value = { ...d.settings };
  loading.value = false;
});

async function saveSettings() {
  saving.value = true;
  try {
    await settingsApi.update({ settings: form.value });
  } finally {
    saving.value = false;
  }
}

async function connectFacebook() {
  await settingsApi.connectFacebook(fbPageId.value, fbToken.value);
  pageId.value = fbPageId.value;
  fbPageId.value = '';
  fbToken.value = '';
}

async function disconnect() {
  await settingsApi.disconnectFacebook();
  pageId.value = `disconnected_${Date.now()}`;
}
</script>
