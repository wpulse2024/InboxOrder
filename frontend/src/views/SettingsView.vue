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
        <h2 class="text-sm font-semibold text-gray-700">Facebook Pages</h2>

        <p v-if="banner" :class="banner.type === 'error' ? 'text-sm text-red-600' : 'text-sm text-green-600'">
          {{ banner.text }}
        </p>

        <!-- Connected pages list -->
        <ul v-if="pages.length" class="divide-y divide-gray-100 rounded-md border border-gray-200">
          <li v-for="p in pages" :key="p.pageId" class="flex items-center justify-between gap-3 px-3 py-2">
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ p.pageName }}</p>
              <p class="text-xs text-gray-400 font-mono truncate">{{ p.pageId }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="p.webhookSubscribed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'"
              >
                {{ p.webhookSubscribed ? 'Webhook active' : 'Webhook pending' }}
              </span>
              <button
                class="text-xs text-red-600 hover:underline"
                :disabled="removingPageId === p.pageId"
                @click="removePage(p.pageId)"
              >
                {{ removingPageId === p.pageId ? 'Removing…' : 'Disconnect' }}
              </button>
            </div>
          </li>
        </ul>

        <!-- Pick which page(s) to connect (Facebook returned multiple managed pages) -->
        <div v-if="pendingPages.length" class="space-y-2">
          <p class="text-sm text-gray-600">Which page(s) should InboxOrder connect to?</p>
          <label
            v-for="p in pendingPages"
            :key="p.pageId"
            class="flex items-center gap-2 text-sm rounded-md border border-gray-300 px-3 py-2 hover:border-brand-500 hover:bg-brand-50 cursor-pointer"
          >
            <input type="checkbox" :value="p.pageId" v-model="selectedPageIds" class="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            {{ p.pageName }}
          </label>
          <button
            class="btn-primary text-sm"
            :disabled="selecting || selectedPageIds.length === 0"
            @click="confirmSelection"
          >
            {{ selecting ? 'Connecting…' : `Connect ${selectedPageIds.length || ''} page${selectedPageIds.length === 1 ? '' : 's'}` }}
          </button>
        </div>

        <!-- One-click OAuth — always available so more pages can be added later -->
        <div v-if="!pendingPages.length" class="space-y-3">
          <p class="text-sm text-gray-500">
            {{ pages.length ? 'Connect another Facebook Page in one click.' : 'Connect your Facebook Page(s) in one click — no Page ID or access token to copy anywhere.' }}
          </p>
          <button class="btn-primary text-sm" :disabled="connecting" @click="startOAuth">
            {{ connecting ? 'Redirecting…' : 'Connect with Facebook' }}
          </button>

          <details class="text-xs text-gray-400">
            <summary class="cursor-pointer select-none">Advanced: connect with a Page ID + token manually</summary>
            <div class="mt-2 space-y-2">
              <input v-model="fbPageId" placeholder="Page ID" class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
              <input v-model="fbPageName" placeholder="Page name" class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
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
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { settingsApi } from '@/api/settings';
import { facebookApi, type ConnectedPage } from '@/api/facebook';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const connecting = ref(false);
const selecting = ref(false);
const removingPageId = ref('');
const fbPageId = ref('');
const fbPageName = ref('');
const fbToken = ref('');
const form = ref({ autoConfirmOrders: false, aiParserEnabled: true });
const pages = ref<ConnectedPage[]>([]);
const pendingPages = ref<{ pageId: string; pageName: string }[]>([]);
const selectedPageIds = ref<string[]>([]);
const banner = ref<{ type: 'success' | 'error'; text: string } | null>(null);

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Facebook login was cancelled.',
  missing_code: 'Facebook did not return a login code — please try again.',
  invalid_state: 'That login link expired — please try connecting again.',
  no_pages: "No Facebook Pages found for that account. You need to be an admin of at least one Page.",
  oauth_failed: 'Something went wrong talking to Facebook. Please try again.',
};

onMounted(async () => {
  await loadSettings();
  await loadPages();
  await handleOAuthRedirect();
  loading.value = false;
});

async function loadSettings() {
  const { data } = await settingsApi.get();
  form.value = { ...(data as { settings: typeof form.value }).settings };
}

async function loadPages() {
  const { data } = await facebookApi.listPages();
  pages.value = data.pages;
}

async function handleOAuthRedirect() {
  const { fb_connected, fb_error, fb_select, page } = route.query;

  if (fb_connected) {
    banner.value = { type: 'success', text: `Connected to "${page ?? 'your Page'}".` };
    await loadPages();
  } else if (fb_error) {
    const code = String(fb_error);
    banner.value = { type: 'error', text: OAUTH_ERROR_MESSAGES[code] ?? 'Could not connect to Facebook.' };
  } else if (fb_select) {
    const { data } = await settingsApi.getPendingFacebookPages();
    pendingPages.value = (data as { pages: typeof pendingPages.value }).pages;
    selectedPageIds.value = pendingPages.value.map((p) => p.pageId);
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

async function confirmSelection() {
  selecting.value = true;
  try {
    const { data } = await settingsApi.selectFacebookPages(selectedPageIds.value);
    const result = data as { pages: { pageId: string; pageName: string }[] };
    pendingPages.value = [];
    selectedPageIds.value = [];
    const names = result.pages.map((p) => p.pageName).join(', ');
    banner.value = { type: 'success', text: `Connected: ${names}.` };
    await loadPages();
  } finally {
    selecting.value = false;
  }
}

async function connectFacebookManually() {
  await facebookApi.addPage(fbPageId.value, fbPageName.value, fbToken.value);
  fbPageId.value = '';
  fbPageName.value = '';
  fbToken.value = '';
  await loadPages();
}

async function removePage(pageId: string) {
  removingPageId.value = pageId;
  try {
    await facebookApi.removePage(pageId);
    await loadPages();
  } finally {
    removingPageId.value = '';
  }
}
</script>
