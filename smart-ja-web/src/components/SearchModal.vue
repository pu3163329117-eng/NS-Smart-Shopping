<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useProducts } from '../store/products';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close']);
const router = useRouter();
const { t } = useI18n();
const { products, refreshProducts } = useProducts();

const searchInput = ref(null);
const query = ref('');

const history = ref([
  t('search.historyDefaults.earbuds'),
  t('search.historyDefaults.keyboard')
]);

const trending = computed(() => {
  if (products.value.length === 0) {
    return [
      { text: t('search.fallback.smartHome'), trend: 'up' },
      { text: t('search.fallback.camera'), trend: 'steady' },
      { text: t('search.fallback.print3d'), trend: 'up' },
      { text: t('search.fallback.aiLearning'), trend: 'new' }
    ];
  }

  const picked = [...products.value].sort(() => 0.5 - Math.random()).slice(0, 4);
  return picked.map((product, index) => ({
    text: product.name,
    trend: index === 0 ? 'up' : index === 1 ? 'new' : 'steady'
  }));
});

const suggestions = computed(() => {
  if (!query.value) return [];

  return [
    { text: `${query.value} ${t('search.suffix.accessories')}`, type: t('search.types.category') },
    { text: `${query.value} ${t('search.suffix.review')}`, type: t('search.types.article') },
    { text: `${t('search.suffix.secondHand')} ${query.value}`, type: t('search.types.market') }
  ];
});

const close = () => {
  emit('close');
  query.value = '';
};

const handleSearch = (text) => {
  if (!text) return;

  if (!history.value.includes(text)) {
    history.value.unshift(text);
    if (history.value.length > 5) history.value.pop();
  }

  close();
  router.push({ path: '/market', query: { q: text } });
};

const clearHistory = () => {
  history.value = [];
};

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      void refreshProducts();
      window.setTimeout(() => searchInput.value?.focus(), 100);
    }
  }
);

const handleKeydown = (event) => {
  if (event.key === 'Escape' && props.isOpen) close();
};

onMounted(() => {
  void refreshProducts();
  window.addEventListener('keydown', handleKeydown);
});
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-20 sm:pt-24">
        <div class="absolute inset-0 bg-black/75 backdrop-blur-md" @click="close"></div>

        <div class="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0c]/95">
          <div class="flex items-center gap-3 border-b border-white/10 px-5 py-4">
            <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0a6.5 6.5 0 0 1 13 0Z"></path>
            </svg>
            <input
              ref="searchInput"
              v-model="query"
              type="text"
              :placeholder="$t('search.placeholder')"
              class="h-12 flex-1 bg-transparent text-lg text-white placeholder:text-white/28 focus:outline-none"
              @keyup.enter="handleSearch(query)"
            >
            <button class="rounded-full border border-white/10 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-white/45 transition hover:bg-white/[0.04] hover:text-white/70" @click="close">
              ESC
            </button>
          </div>

          <div class="min-h-[320px] bg-white/[0.02] p-6">
            <div v-if="query" class="space-y-3">
              <button
                v-for="(item, index) in suggestions"
                :key="index"
                class="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.05]"
                @click="handleSearch(item.text)"
              >
                <span class="text-sm font-medium text-white">{{ item.text }}</span>
                <span class="text-[11px] uppercase tracking-[0.18em] text-white/35">{{ item.type }}</span>
              </button>
            </div>

            <div v-else class="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <div class="mb-4 flex items-center justify-between">
                  <h3 class="text-[11px] uppercase tracking-[0.24em] text-white/35">{{ $t('search.recent') }}</h3>
                  <button v-if="history.length" class="text-xs uppercase tracking-[0.18em] text-white/35 transition hover:text-white/65" @click="clearHistory">
                    {{ $t('search.clear') }}
                  </button>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="item in history"
                    :key="item"
                    class="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/72 transition hover:bg-white/[0.05]"
                    @click="handleSearch(item)"
                  >
                    {{ item }}
                  </button>
                  <span v-if="!history.length" class="text-sm italic text-white/35">{{ $t('search.noRecent') }}</span>
                </div>
              </div>

              <div>
                <h3 class="mb-4 text-[11px] uppercase tracking-[0.24em] text-white/35">{{ $t('search.trending') }}</h3>
                <div class="space-y-3">
                  <button
                    v-for="(item, index) in trending"
                    :key="index"
                    class="flex w-full items-center justify-between gap-3 text-left"
                    @click="handleSearch(item.text)"
                  >
                    <div class="flex items-center gap-3">
                      <span class="w-4 text-xs font-medium text-white/28">{{ index + 1 }}</span>
                      <span class="text-sm font-medium text-white/72">{{ item.text }}</span>
                    </div>
                    <span v-if="item.trend === 'up'" class="text-[11px] uppercase tracking-[0.18em] text-white/45">{{ $t('search.rising') }}</span>
                    <span v-else-if="item.trend === 'new'" class="text-[11px] uppercase tracking-[0.18em] text-white/45">{{ $t('search.new') }}</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h4 class="text-sm font-medium text-white">{{ $t('search.tipTitle') }}</h4>
              <p class="mt-2 text-xs leading-6 text-white/45">{{ $t('search.tipBody') }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
