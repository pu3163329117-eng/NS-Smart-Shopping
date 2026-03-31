<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '../composables/useToast';

defineProps({
  show: Boolean
});

const emit = defineEmits(['close']);
const { t } = useI18n();
const { show: showToast } = useToast();

const isAdding = ref(false);
const addresses = ref([
  {
    id: 1,
    name: t('addressModal.items.one.name'),
    phone: '138****8888',
    region: t('addressModal.items.one.region'),
    detail: t('addressModal.items.one.detail'),
    isDefault: true
  },
  {
    id: 2,
    name: t('addressModal.items.two.name'),
    phone: '139****9999',
    region: t('addressModal.items.two.region'),
    detail: t('addressModal.items.two.detail'),
    isDefault: false
  }
]);

const newAddress = ref({
  name: '',
  phone: '',
  region: '',
  detail: '',
  isDefault: false
});

const resetForm = () => {
  newAddress.value = {
    name: '',
    phone: '',
    region: '',
    detail: '',
    isDefault: false
  };
};

const handleSave = () => {
  if (!newAddress.value.name || !newAddress.value.phone || !newAddress.value.detail) {
    showToast(t('addressModal.feedback.incomplete'), 'error');
    return;
  }

  if (newAddress.value.isDefault) {
    addresses.value = addresses.value.map((item) => ({
      ...item,
      isDefault: false
    }));
  }

  addresses.value.push({
    id: Date.now(),
    ...newAddress.value,
    region: newAddress.value.region || t('addressModal.defaultRegion')
  });

  showToast(t('addressModal.feedback.saved'), 'success');
  isAdding.value = false;
  resetForm();
};

const closeModal = () => {
  emit('close');
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-md" @click="closeModal"></div>

    <div class="relative flex h-[82vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#0a0a0c]/95 sm:h-[760px] sm:w-[560px] sm:rounded-[2rem]">
      <div class="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
        <div class="flex items-center gap-3">
          <button
            v-if="isAdding"
            class="rounded-full border border-white/10 p-2 text-white/45 transition hover:bg-white/[0.04] hover:text-white/75"
            @click="isAdding = false"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19 8 12l7-7"></path>
            </svg>
          </button>
          <div>
            <p class="text-[11px] uppercase tracking-[0.24em] text-white/35">{{ t('addressModal.modalLabel') }}</p>
            <h2 class="mt-2 text-2xl font-medium tracking-tight text-white">
              {{ isAdding ? t('addressModal.addTitle') : t('addressModal.title') }}
            </h2>
          </div>
        </div>
        <button class="rounded-full border border-white/10 p-2 text-white/45 transition hover:bg-white/[0.04] hover:text-white/75" @click="closeModal">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18 18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide sm:px-5">
        <div v-if="!isAdding" class="space-y-3">
          <article
            v-for="item in addresses"
            :key="item.id"
            class="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-lg font-medium tracking-tight text-white">{{ item.name }}</h3>
                  <span class="text-sm text-white/42">{{ item.phone }}</span>
                </div>
                <p class="mt-3 text-sm leading-7 text-white/48">{{ item.region }} {{ item.detail }}</p>
              </div>
              <span
                v-if="item.isDefault"
                class="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/55"
              >
                {{ t('addressModal.defaultTag') }}
              </span>
            </div>
          </article>
        </div>

        <div v-else class="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
          <div class="space-y-2">
            <label class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('addressModal.fields.name') }}</label>
            <input
              v-model="newAddress.name"
              type="text"
              class="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition placeholder:text-white/22 focus:border-white/20 focus:bg-white/[0.05]"
              :placeholder="t('addressModal.placeholders.name')"
            >
          </div>

          <div class="space-y-2">
            <label class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('addressModal.fields.phone') }}</label>
            <input
              v-model="newAddress.phone"
              type="tel"
              class="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition placeholder:text-white/22 focus:border-white/20 focus:bg-white/[0.05]"
              :placeholder="t('addressModal.placeholders.phone')"
            >
          </div>

          <div class="space-y-2">
            <label class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('addressModal.fields.region') }}</label>
            <input
              v-model="newAddress.region"
              type="text"
              class="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition placeholder:text-white/22 focus:border-white/20 focus:bg-white/[0.05]"
              :placeholder="t('addressModal.placeholders.region')"
            >
          </div>

          <div class="space-y-2">
            <label class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('addressModal.fields.detail') }}</label>
            <textarea
              v-model="newAddress.detail"
              rows="4"
              class="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition placeholder:text-white/22 focus:border-white/20 focus:bg-white/[0.05]"
              :placeholder="t('addressModal.placeholders.detail')"
            ></textarea>
          </div>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            @click="newAddress.isDefault = !newAddress.isDefault"
          >
            <span class="text-sm font-medium text-white/68">{{ t('addressModal.fields.default') }}</span>
            <span
              class="relative h-6 w-11 rounded-full transition-colors"
              :class="newAddress.isDefault ? 'bg-white/75' : 'bg-white/12'"
            >
              <span
                class="absolute left-1 top-1 h-4 w-4 rounded-full bg-[#0a0a0c] transition-transform"
                :class="newAddress.isDefault ? 'translate-x-5' : ''"
              ></span>
            </span>
          </button>

          <button
            class="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            @click="handleSave"
          >
            {{ t('addressModal.actions.save') }}
          </button>
        </div>
      </div>

      <div v-if="!isAdding" class="border-t border-white/10 bg-white/[0.02] px-5 py-5">
        <button
          class="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
          @click="isAdding = true"
        >
          {{ t('addressModal.actions.addNew') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
