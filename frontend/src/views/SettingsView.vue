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

        <p v-if="banner" :class="banner.type === 'error' ? 'text-sm text-red-600' : 'text-sm text-green-600'">
          {{ banner.text }}
        </p>

        <!-- Connected state -->
        <div v-if="isConnected" class="space-y-2">
          <p class="text-sm text-gray-600">Connected page ID: <span class="font-mono font-medium">{{ pageId }}</span></p>
          <button class="btn-secondary text-sm text-red-600 border-red-300 hover:bg-red-50" @click="disconnect">Disconnect</button>
        </div>

        <!-- Pick which page (multiple pages returned by Facebook) -->
        <div v-else-if="pendingPages.length" class="space-y-2">
          <p class="text-sm text-gray-600">Which page should InboxOrder connect to?</p>
          <button
            v-for="p in pendingPages"
            :key="p.pageId"
            class="w-full text-left text-sm rounded-md border border-gray-300 px-3 py-2 hover:border-brand-500 hover:bg-brand-50"
            :disabled="selecting"
            @click="selectPage(p.pageId)"
          >
            {{ p.pageName }}
          </button>
        </div>

        <!-- Not connected — one-click OAuth -->
        <div v-else class="space-y-3">
          <p class="text-sm text-gray-500">
            Connect your Facebook Page in one click — no Page ID or access token to copy anywhere.
          </p>
          <button class="btn-primary text-sm" :disabled="connecting" @click="startOAuth">
            {{ connecting ? 'Redirecting…' : 'Connect with Facebook' }}
          </button>

          <details class="text-xs text-gray-400">
            <summary class="cursor-pointer select-none">Advanced: connect with a Page ID + token manually</summary>
            <div class="mt-2 space-y-2">
              <input v-model="fbPageId" placeholder="Page ID" class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
              <input v-model="fbToken" placeholder="Page Access Token" type="password" class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
              <button class="btn-secondary text-sm" @click="connectFacebookManually">Connect page</button>
            </div>
          </details>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { settingsApi } from '@/api/settings';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const connecting = ref(false);
const selecting = ref(false);
const pageId = ref('');
const fbPageId = ref('');
const fbToken = ref('');
const form = ref({ autoConfirmOrders: false, aiParserEnabled: true });
const pendingPages = ref<{ pageId: string; pageName: string }[]>([]);
const banner = ref<{ type: 'success' | 'error'; text: string } | null>(null);

const isConnected = computed(
  () => !!pageId.value && !pageId.value.startsWith('pending') && !pageId.value.startsWith('disconnected')
);

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Facebook login was cancelled.',
  missing_code: 'Facebook did not return a login code — please try again.',
  invalid_state: 'That login link expired — please try connecting again.',
  no_pages: "No Facebook Pages found for that account. You need to be an admin of at least one Page.",
  oauth_failed: 'Something went wrong talking to Facebook. Please try again.',
};

onMounted(async () => {
  await loadSettings();
  await handleOAuthRedirect();
  loading.value = false;
});

async function loadSettings() {
  const { data } = await settingsApi.get();
  const d = data as { pageId: string; settings: typeof form.value };
  pageId.value = d.pageId;
  form.value = { ...d.settings };
}

async function handleOAuthRedirect() {
  const { fb_connected, fb_error, fb_select, page } = route.query;

  if (fb_connected) {
    banner.value = { type: 'success', text: `Connected to "${page ?? 'your Page'}".` };
    await loadSettings();
  } else if (fb_error) {
    const code = String(fb_error);
    banner.value = { type: 'error', text: OAUTH_ERROR_MESSAGES[code] ?? 'Could not connect to Facebook.' };
  } else if (fb_select) {
    const { data } = await settingsApi.getPendingFacebookPages();
    pendingPages.value = (data as { pages: typeof pendingPages.value }).pages;
  }

  if (fb_connected || fb_error || fb_select) {
    router.replace({ query: {} });
  }
}

async function saveSettings() {
  saving.value = true;
  try {
    await settingsApi.update({ settings: form.value });
  } finally {
    saving.value = false;
  }
}

async function startOAuth() {
  connecting.value = true;
  try {
    const { data } = await settingsApi.startFacebookOAuth();
    window.location.href = (data as { url: string }).url;
  } catch {
    connecting.value = false;
    banner.value = { type: 'error', text: 'Could not start Facebook login. Please try again.' };
  }
}

async function selectPage(id: string) {
  selecting.value = true;
  try {
    const { data } = await settingsApi.selectFacebookPage(id);
    const result = data as { pageId: string; pageName: string };
    pendingPages.value = [];
    banner.value = { type: 'success', text: `Connected to "${result.pageName}".` };
    await loadSettings();
  } finally {
    selecting.value = false;
  }
}

async function connectFacebookManually() {
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
