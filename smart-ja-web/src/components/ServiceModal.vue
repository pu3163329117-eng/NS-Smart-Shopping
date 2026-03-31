<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  show: Boolean,
  initialTab: {
    type: String,
    default: 'help'
  }
});

const emit = defineEmits(['close']);

const { t } = useI18n();

const activeTab = ref(props.initialTab);
const inputMessage = ref('');

const tabs = computed(() => [
  { id: 'help', label: t('serviceModal.tabs.help') },
  { id: 'contact', label: t('serviceModal.tabs.contact') }
]);

const faqs = computed(() => [
  {
    q: t('serviceModal.faq.address.question'),
    a: t('serviceModal.faq.address.answer')
  },
  {
    q: t('serviceModal.faq.shipping.question'),
    a: t('serviceModal.faq.shipping.answer')
  },
  {
    q: t('serviceModal.faq.refund.question'),
    a: t('serviceModal.faq.refund.answer')
  },
  {
    q: t('serviceModal.faq.points.question'),
    a: t('serviceModal.faq.points.answer')
  }
]);

const chatMessages = ref([]);

const resetMessages = () => {
  chatMessages.value = [
    {
      id: 1,
      type: 'system',
      text: t('serviceModal.chat.welcome')
    }
  ];
};

resetMessages();

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
      if (chatMessages.value.length === 0) {
        resetMessages();
      }
    }
  }
);

const sendMessage = () => {
  const value = inputMessage.value.trim();
  if (!value) return;

  chatMessages.value.push({
    id: Date.now(),
    type: 'user',
    text: value
  });

  inputMessage.value = '';

  window.setTimeout(() => {
    chatMessages.value.push({
      id: Date.now() + 1,
      type: 'system',
      text: t('serviceModal.chat.reply', { message: value })
    });
  }, 800);
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
  const rotateX = ((y - centerY) / centerY) * -3;
  const rotateY = ((x - centerX) / centerX) * 3;

  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
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
        <h2 class="text-lg font-bold text-slate-900">{{ t('serviceModal.title') }}</h2>
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

      <div class="relative flex-1 overflow-y-auto bg-gray-50 scrollbar-hide">
        <div v-if="activeTab === 'help'" class="space-y-4 p-4">
          <div class="overflow-hidden rounded-xl bg-white shadow-sm">
            <div class="border-b border-gray-50 px-4 py-3 font-bold text-slate-900">{{ t('serviceModal.faqTitle') }}</div>
            <div class="divide-y divide-gray-50">
              <div
                v-for="(item, index) in faqs"
                :key="index"
                class="cursor-pointer p-4 transition hover:bg-gray-50"
              >
                <h4 class="mb-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                  <span class="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">Q</span>
                  {{ item.q }}
                </h4>
                <p class="pl-6 text-xs text-gray-500">{{ item.a }}</p>
              </div>
            </div>
          </div>

          <div
            class="flex cursor-pointer items-center justify-between rounded-xl bg-blue-50 p-4 transition-transform duration-200 ease-out will-change-transform"
            @mousemove="handleCardMouseMove"
            @mouseleave="handleCardMouseLeave"
          >
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  ></path>
                </svg>
              </div>
              <div>
                <div class="text-sm font-bold text-slate-900">{{ t('serviceModal.hotline.title') }}</div>
                <div class="text-xs text-gray-500">{{ t('serviceModal.hotline.hours') }}</div>
              </div>
            </div>
            <button class="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-600">
              {{ t('serviceModal.hotline.call') }}
            </button>
          </div>
        </div>

        <div v-else class="flex h-full flex-col">
          <div class="flex-1 space-y-4 overflow-y-auto p-4">
            <div
              v-for="message in chatMessages"
              :key="message.id"
              class="flex"
              :class="message.type === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[80%] rounded-2xl px-4 py-2 text-sm"
                :class="message.type === 'user' ? 'rounded-tr-none bg-slate-900 text-white' : 'rounded-tl-none bg-white text-slate-800 shadow-sm'"
              >
                {{ message.text }}
              </div>
            </div>
          </div>

          <div class="flex gap-2 border-t border-gray-100 bg-white p-3">
            <input
              v-model="inputMessage"
              type="text"
              class="flex-1 rounded-full bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
              :placeholder="t('serviceModal.chat.placeholder')"
              @keyup.enter="sendMessage"
            >
            <button class="rounded-full bg-slate-900 p-2 text-white transition hover:bg-slate-800" @click="sendMessage">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </button>
          </div>
        </div>
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
