<template>
  <div class="max-w-xl space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Platform Configuration</h1>
      <p class="mt-1 text-sm text-gray-500">
        Shared settings for every tenant on this install — Facebook App credentials and AI provider settings.
        Saved changes apply immediately, no restart needed.
      </p>
    </div>

    <div v-if="loading" class="text-sm text-gray-500">Loading…</div>

    <template v-else>
      <p v-if="banner" :class="banner.type === 'error' ? 'text-sm text-red-600' : 'text-sm text-green-600'">
        {{ banner.text }}
      </p>

      <!-- Facebook App -->
      <div class="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 class="text-sm font-semibold text-gray-700">Facebook App</h2>

        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">App ID</label>
          <input
            v-model="form.facebookAppId"
            placeholder="e.g. 1234567890123456"
            class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">
            App Secret
            <span v-if="config?.facebookAppSecretSet" class="text-green-600 font-normal">(configured)</span>
          </label>
          <input
            v-model="form.facebookAppSecret"
            type="password"
            :placeholder="config?.facebookAppSecretSet ? 'Leave blank to keep current secret' : 'Not set'"
            class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">Webhook Verify Token</label>
          <input
            v-model="form.facebookVerifyToken"
            placeholder="Any string — used in Meta's webhook setup screen"
            class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
      </div>

      <!-- URLs -->
      <div class="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 class="text-sm font-semibold text-gray-700">URLs</h2>

        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">App Base URL</label>
          <input
            v-model="form.appBaseUrl"
            placeholder="https://api.yourapp.com"
            class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
          <p class="text-xs text-gray-400">Used to build the Facebook OAuth redirect URI.</p>
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">Frontend URL</label>
          <input
            v-model="form.frontendUrl"
            placeholder="https://app.yourapp.com"
            class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
          <p class="text-xs text-gray-400">Where users land after connecting Facebook; also allowed CORS origin.</p>
        </div>
      </div>

      <!-- AI provider -->
      <div class="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 class="text-sm font-semibold text-gray-700">AI Parser</h2>

        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">
            API Key
            <span v-if="config?.aiApiKeySet" class="text-green-600 font-normal">(configured)</span>
          </label>
          <input
            v-model="form.aiApiKey"
            type="password"
            :placeholder="config?.aiApiKeySet ? 'Leave blank to keep current key' : 'Not set'"
            class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">API URL</label>
          <input
            v-model="form.aiApiUrl"
            class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">Model</label>
          <input
            v-model="form.aiModel"
            class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-600">Timeout (ms)</label>
          <input
            v-model.number="form.aiTimeoutMs"
            type="number"
            min="1"
            class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
      </div>

      <button class="btn-primary text-sm" :disabled="saving" @click="save">
        {{ saving ? 'Saving…' : 'Save configuration' }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { adminApi, type PlatformConfig, type PlatformConfigPatch } from '@/api/admin';

const loading = ref(true);
const saving = ref(false);
const config = ref<PlatformConfig | null>(null);
const banner = ref<{ type: 'success' | 'error'; text: string } | null>(null);

const form = ref({
  facebookAppId: '',
  facebookAppSecret: '',
  facebookVerifyToken: '',
  appBaseUrl: '',
  frontendUrl: '',
  aiApiKey: '',
  aiApiUrl: '',
  aiModel: '',
  aiTimeoutMs: 10000,
});

onMounted(async () => {
  await loadConfig();
  loading.value = false;
});

async function loadConfig() {
  const { data } = await adminApi.getConfig();
  config.value = data;
  form.value = {
    facebookAppId: data.facebookAppId ?? '',
    facebookAppSecret: '',
    facebookVerifyToken: data.facebookVerifyToken ?? '',
    appBaseUrl: data.appBaseUrl,
    frontendUrl: data.frontendUrl,
    aiApiKey: '',
    aiApiUrl: data.aiApiUrl,
    aiModel: data.aiModel,
    aiTimeoutMs: data.aiTimeoutMs,
  };
}

async function save() {
  saving.value = true;
  banner.value = null;
  try {
    // Blank secret fields mean "leave unchanged" — omit them from the patch entirely.
    const patch: PlatformConfigPatch = {
      facebookAppId: form.value.facebookAppId || null,
      facebookVerifyToken: form.value.facebookVerifyToken || null,
      appBaseUrl: form.value.appBaseUrl || null,
      frontendUrl: form.value.frontendUrl || null,
      aiApiUrl: form.value.aiApiUrl || null,
      aiModel: form.value.aiModel || null,
      aiTimeoutMs: form.value.aiTimeoutMs || null,
    };
    if (form.value.facebookAppSecret) patch.facebookAppSecret = form.value.facebookAppSecret;
    if (form.value.aiApiKey) patch.aiApiKey = form.value.aiApiKey;

    await adminApi.updateConfig(patch);
    banner.value = { type: 'success', text: 'Configuration saved.' };
    await loadConfig();
  } catch {
    banner.value = { type: 'error', text: 'Could not save configuration. Please try again.' };
  } finally {
    saving.value = false;
  }
}
</script>
