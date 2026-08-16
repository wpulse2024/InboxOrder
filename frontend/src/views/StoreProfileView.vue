<template>
  <div class="max-w-2xl space-y-6">
    <h1 class="text-2xl font-bold text-gray-900">Store Profile</h1>
    <p class="text-sm text-gray-500">
      This information is given to your AI sales agent so it can answer questions and recommend products.
    </p>

    <div v-if="loading" class="text-sm text-gray-500">Loading…</div>

    <template v-else>
      <!-- Business info -->
      <div class="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <h2 class="text-sm font-semibold text-gray-700">Business info</h2>
        <textarea
          v-model="businessInfo"
          rows="5"
          maxlength="4000"
          placeholder="Tell customers about your business — hours, delivery areas, policies, etc."
          class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
        />
      </div>

      <!-- Products -->
      <div class="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-700">Products</h2>
          <button class="text-xs text-brand-600 hover:underline" @click="addProduct">+ Add product</button>
        </div>
        <div v-if="!products.length" class="text-sm text-gray-400">No products added yet.</div>
        <div v-for="(p, i) in products" :key="i" class="flex items-start gap-3 rounded-md border border-gray-200 p-3">
          <img
            v-if="p.imageUrl"
            :src="p.imageUrl"
            class="w-14 h-14 rounded-md object-cover shrink-0 border border-gray-200"
            alt=""
          />
          <div class="flex-1 space-y-2">
            <div class="flex gap-2">
              <input v-model="p.name" placeholder="Product name" class="flex-1 rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
              <input v-model.number="p.price" type="number" min="0" step="0.01" placeholder="Price" class="w-28 rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
            </div>
            <div class="flex gap-2">
              <input v-model="p.sku" placeholder="SKU (optional)" class="w-32 rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
              <input v-model="p.category" placeholder="Category (optional)" class="flex-1 rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
            </div>
            <textarea v-model="p.description" rows="2" placeholder="Description (optional) — shown to customers and used to fill in order details" class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
            <input v-model="p.imageUrl" placeholder="Image URL (optional)" class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
          </div>
          <button class="text-xs text-red-600 hover:underline shrink-0" @click="products.splice(i, 1)">Remove</button>
        </div>
      </div>

      <!-- FAQs -->
      <div class="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-700">FAQs</h2>
          <button class="text-xs text-brand-600 hover:underline" @click="addFaq">+ Add FAQ</button>
        </div>
        <div v-if="!faqs.length" class="text-sm text-gray-400">No FAQs added yet.</div>
        <div v-for="(f, i) in faqs" :key="i" class="flex items-start gap-2 rounded-md border border-gray-200 p-3">
          <div class="flex-1 space-y-2">
            <input v-model="f.question" placeholder="Question" class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
            <textarea v-model="f.answer" rows="2" placeholder="Answer" class="w-full rounded-md border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500" />
          </div>
          <button class="text-xs text-red-600 hover:underline shrink-0" @click="faqs.splice(i, 1)">Remove</button>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button class="btn-primary text-sm" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save store profile' }}
        </button>
        <span v-if="saved" class="text-sm text-green-600">Saved.</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeProfileApi, type StoreProfileProduct, type StoreProfileFaq } from '@/api/storeProfile';

const loading = ref(true);
const saving = ref(false);
const saved = ref(false);
const businessInfo = ref('');
const products = ref<StoreProfileProduct[]>([]);
const faqs = ref<StoreProfileFaq[]>([]);

onMounted(async () => {
  const { data } = await storeProfileApi.get();
  const profile = data as { businessInfo?: string; products: StoreProfileProduct[]; faqs: StoreProfileFaq[] };
  businessInfo.value = profile.businessInfo ?? '';
  products.value = profile.products ?? [];
  faqs.value = profile.faqs ?? [];
  loading.value = false;
});

function addProduct() {
  products.value.push({ name: '', price: 0, description: '', sku: '', category: '', imageUrl: '' });
}

function addFaq() {
  faqs.value.push({ question: '', answer: '' });
}

async function save() {
  saving.value = true;
  saved.value = false;
  try {
    await storeProfileApi.update({
      businessInfo: businessInfo.value,
      products: products.value,
      faqs: faqs.value,
    });
    saved.value = true;
  } finally {
    saving.value = false;
  }
}
</script>
