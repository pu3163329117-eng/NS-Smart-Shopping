<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '../composables/useToast';

const props = defineProps({
  show: Boolean,
  initialTab: {
    type: String,
    default: 'personal'
  }
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { show: showToast } = useToast();

const activeTab = ref(props.initialTab);
const agreed = ref(false);
const form = ref({
  name: '',
  idCard: '',
  phone: '',
  category: '',
  shopName: ''
});

const tabs = computed(() => [
  { id: 'personal', label: t('sellerModal.tabs.personal') },
  { id: 'enterprise', label: t('sellerModal.tabs.enterprise') }
]);

const categories = computed(() => [
  t('sellerModal.categories.handmade'),
  t('sellerModal.categories.secondHand'),
  t('sellerModal.categories.agriculture'),
  t('sellerModal.categories.design'),
  t('sellerModal.categories.other')
]);

watch(
  () => props.initialTab,
  (tab) => {
    activeTab.value = tab;
  }
);

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      activeTab.value = props.initialTab;
    }
  }
);

const resetForm = () => {
  form.value = {
    name: '',
    idCard: '',
    phone: '',
    category: '',
    shopName: ''
  };
  agreed.value = false;
};

const handleSubmit = () => {
  if (!form.value.name || !form.value.phone || !form.value.category) {
    showToast(t('sellerModal.feedback.incomplete'), 'error');
    return;
  }

  if (!agreed.value) {
    showToast(t('sellerModal.feedback.agreeRequired'), 'error');
    return;
  }

  window.setTimeout(() => {
    showToast(t('sellerModal.feedback.submitted'), 'success');
    emit('close');
    resetForm();
  }, 500);
};

const closeModal = () => {
  emit('close');
};

const handleCardMouseMove = (event) => {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * -10;
  const rotateY = ((x - centerX) / centerX) * 10;

  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.1, 1.1, 1.1)`;
};

const handleCardMouseLeave = (event) => {
  event.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

    <div class="relative flex h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-gray-50 shadow-2xl sm:h-[750px] sm:w-[480px] sm:rounded-3xl">
      <div class="z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <h2 class="text-lg font-bold text-slate-900">{{ t('sellerModal.title') }}</h2>
        <button class="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" @click="closeModal">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="z-10 flex justify-center border-b border-gray-100 bg-white px-2 pt-2">
        <div class="flex w-full max-w-xs rounded-xl bg-gray-100 p-1">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="flex-1 rounded-lg py-2 text-sm font-bold transition-all"
            :class="activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto bg-gray-50 p-6 scrollbar-hide">
        <div class="mb-8 text-center">
          <div
            class="mx-auto mb-4 flex h-20 w-20 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl text-white shadow-lg shadow-blue-500/30 transition-transform duration-200 ease-out will-change-transform"
            @mousemove="handleCardMouseMove"
            @mouseleave="handleCardMouseLeave"
          >
            <span>{{ activeTab === 'personal' ? 'P' : 'B' }}</span>
          </div>
          <h3 class="text-xl font-bold text-slate-900">
            {{ activeTab === 'personal' ? t('sellerModal.hero.personalTitle') : t('sellerModal.hero.enterpriseTitle') }}
          </h3>
          <p class="mt-2 px-8 text-sm text-gray-500">
            {{ activeTab === 'personal' ? t('sellerModal.hero.personalDescription') : t('sellerModal.hero.enterpriseDescription') }}
          </p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              {{ activeTab === 'personal' ? t('sellerModal.fields.personalName') : t('sellerModal.fields.enterpriseName') }}
            </label>
            <input
              v-model="form.name"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm transition focus:border-transparent focus:ring-2 focus:ring-slate-900"
              :placeholder="t('sellerModal.placeholders.name')"
            >
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">
              {{ activeTab === 'personal' ? t('sellerModal.fields.personalId') : t('sellerModal.fields.enterpriseId') }}
            </label>
            <input
              v-model="form.idCard"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm transition focus:border-transparent focus:ring-2 focus:ring-slate-900"
              :placeholder="t('sellerModal.placeholders.id')"
            >
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('sellerModal.fields.phone') }}</label>
            <input
              v-model="form.phone"
              type="tel"
              class="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm transition focus:border-transparent focus:ring-2 focus:ring-slate-900"
              :placeholder="t('sellerModal.placeholders.phone')"
            >
          </div>

          <div v-if="activeTab === 'enterprise'">
            <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('sellerModal.fields.shopName') }}</label>
            <input
              v-model="form.shopName"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm transition focus:border-transparent focus:ring-2 focus:ring-slate-900"
              :placeholder="t('sellerModal.placeholders.shopName')"
            >
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('sellerModal.fields.category') }}</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="category in categories"
                :key="category"
                type="button"
                class="rounded-lg border px-3 py-1.5 text-sm transition"
                :class="form.category === category ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'"
                @click="form.category = category"
              >
                {{ category }}
              </button>
            </div>
          </div>
        </div>

        <div class="mt-8 flex items-start gap-2">
          <input
            id="seller-agree"
            v-model="agreed"
            type="checkbox"
            class="mt-1 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
          >
          <label for="seller-agree" class="text-xs text-gray-500">
            {{ t('sellerModal.agreement.prefix') }}
            <a href="#" class="text-blue-600">{{ t('sellerModal.agreement.merchant') }}</a>
            {{ t('sellerModal.agreement.and') }}
            <a href="#" class="text-blue-600">{{ t('sellerModal.agreement.deposit') }}</a>
          </label>
        </div>
      </div>

      <div class="border-t border-gray-100 bg-white p-4">
        <button
          class="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
          @click="handleSubmit"
        >
          {{ t('sellerModal.actions.submit') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
