<template>
  <div class="min-h-screen bg-black px-4 py-12 text-white sm:px-6 lg:px-8">
    <div class="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">{{ $t('gushi.request.title') }}</h1>
        <p class="mt-2 text-sm text-gray-400">{{ $t('gushi.request.subtitle') }}</p>
      </div>

      <form @submit.prevent="submitRequest" class="space-y-6 rounded-2xl border border-white/10 bg-[#0a0a0d] p-6">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-sm text-gray-300">{{ $t('gushi.request.ipName') }}</label>
            <input
              v-model.trim="form.ipName"
              type="text"
              required
              :placeholder="$t('gushi.request.ipNamePlaceholder')"
              class="w-full rounded-xl border border-white/20 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm text-gray-300">{{ $t('gushi.request.characterName') }}</label>
            <input
              v-model.trim="form.characterName"
              type="text"
              required
              :placeholder="$t('gushi.request.characterNamePlaceholder')"
              class="w-full rounded-xl border border-white/20 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-sm text-gray-300">{{ $t('gushi.request.category') }}</label>
            <select
              v-model="form.category"
              required
              class="w-full rounded-xl border border-white/20 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
            >
              <option value="">{{ $t('gushi.request.categoryPlaceholder') }}</option>
              <option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-sm text-gray-300">{{ $t('gushi.request.seriesName') }}</label>
            <input
              v-model.trim="form.seriesName"
              type="text"
              :placeholder="$t('gushi.request.seriesNamePlaceholder')"
              class="w-full rounded-xl border border-white/20 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label class="mb-2 block text-sm text-gray-300">{{ $t('gushi.request.officialImage') }}</label>
          <input
            v-model.trim="form.officialImage"
            type="url"
            required
            :placeholder="$t('gushi.request.officialImagePlaceholder')"
            class="w-full rounded-xl border border-white/20 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
          />
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-sm text-gray-300">{{ $t('gushi.request.officialPrice') }}</label>
            <input
              v-model.number="form.officialPrice"
              type="number"
              step="0.01"
              min="0"
              :placeholder="$t('gushi.request.officialPricePlaceholder')"
              class="w-full rounded-xl border border-white/20 bg-black px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>
          <div class="flex items-end justify-end">
            <button type="submit" :disabled="submitting" class="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60 md:w-auto">
              {{ submitting ? $t('gushi.request.submitting') : $t('gushi.request.submit') }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { GushiService } from '../services/api';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const router = useRouter();
const { show: showToast } = useToast();

const categories = computed(() => [
  { value: 'Badge', label: t('gushi.request.categoryBadge') },
  { value: 'Figure', label: t('gushi.request.categoryFigure') },
  { value: 'Plush', label: t('gushi.request.categoryPlush') },
  { value: 'Acrylic', label: t('gushi.request.categoryAcrylic') },
  { value: 'Shikishi', label: t('gushi.request.categoryShikishi') },
  { value: 'Other', label: t('gushi.request.categoryOther') }
]);
const submitting = ref(false);
const form = reactive({
  ipName: '',
  characterName: '',
  category: '',
  seriesName: '',
  officialImage: '',
  officialPrice: null
});

const submitRequest = async () => {
  submitting.value = true;
  try {
    const payload = {
      ipName: form.ipName,
      characterName: form.characterName,
      category: form.category,
      seriesName: form.seriesName || undefined,
      officialImage: form.officialImage,
      officialPrice: form.officialPrice ?? undefined
    };
    const res = await GushiService.createProductRequest(payload);
    if (res.success) {
      showToast(t('gushi.request.submitSuccess'), 'success');
      router.push('/gushi/sell');
    }
  } catch (error) {
    showToast(error?.message || t('gushi.request.submitFailed'), 'error');
  } finally {
    submitting.value = false;
  }
};
</script>
