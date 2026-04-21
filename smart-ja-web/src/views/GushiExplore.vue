<template>
  <div class="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-24 pb-12 text-white sm:px-6 lg:px-8">
    <div class="pointer-events-none absolute -left-56 top-0 h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[130px]"></div>
    <div class="pointer-events-none absolute right-[-200px] top-[180px] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[130px]"></div>
    <div class="pointer-events-none absolute bottom-[-220px] left-[28%] h-[520px] w-[520px] rounded-full bg-purple-600/15 blur-[140px]"></div>

    <div class="relative z-10 mx-auto max-w-7xl space-y-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div class="space-y-2">
          <p class="inline-flex items-center gap-2 text-[10px] font-light uppercase tracking-[0.28em] text-white/50">
            <svg class="h-3.5 w-3.5 text-cyan-300/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 12h16M12 4v16" />
            </svg>
            {{ $t('gushi.explore.title') }}
          </p>
          <h1 class="text-4xl font-semibold tracking-tight">{{ $t('gushi.explore.title') }}</h1>
          <p class="text-sm text-white/60">{{ $t('gushi.explore.subtitle') }}</p>
        </div>

        <div class="w-full max-w-xl">
          <div class="glass-sub-card flex gap-2 p-2">
            <input
              v-model.trim="query"
              type="text"
              :placeholder="$t('gushi.explore.searchPlaceholder')"
              class="gushi-input w-full px-4 py-3 text-sm"
              @keyup.enter="applyFilters"
            />
            <button @click="applyFilters" class="gushi-pill-btn px-5 py-3 text-sm font-medium">
              {{ $t('gushi.explore.searchAction') }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="item in categoryOptions"
          :key="item.value"
          @click="changeCategory(item.value)"
          class="rounded-full border px-4 py-1.5 text-xs font-medium transition"
          :class="activeCategory === item.value ? 'border-white/25 bg-white/12 text-white' : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white'"
        >
          {{ item.label }}
        </button>
      </div>

      <div v-if="loading" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="i in 8" :key="i" class="glass-card h-80 animate-pulse"></div>
      </div>

      <template v-else>
        <div v-if="products.length" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <router-link
            v-for="item in products"
            :key="item.id"
            :to="`/gushi/${item.id}`"
            class="gushi-explore-card glass-card group overflow-hidden p-3 transition hover:border-white/20"
          >
            <div class="aspect-square overflow-hidden rounded-2xl">
              <img
                v-if="hasDisplayImage(item)"
                :src="item.officialImage"
                class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
                @error="markImageError(item.id)"
              />
              <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/[0.08] to-black/60 text-4xl font-semibold text-white/35">
                {{ (item.characterName || '?').charAt(0) }}
              </div>
            </div>
            <div class="space-y-2 p-3">
              <p class="text-[10px] font-light uppercase tracking-[0.22em] text-white/45">{{ item.category }}</p>
              <h3 class="line-clamp-1 text-base font-medium text-white">{{ item.characterName }}</h3>
              <p class="line-clamp-1 text-xs text-white/55">{{ item.ipName }}</p>
              <div class="flex items-end justify-between pt-2">
                <div>
                  <p class="text-[10px] uppercase tracking-[0.16em] text-white/40">{{ $t('gushi.explore.latestPrice') }}</p>
                  <p class="font-mono text-lg font-semibold">CNY {{ formatPrice(item.priceSnapshot?.latestPrice || item.officialPrice) }}</p>
                </div>
                <span class="text-xs font-mono" :class="getChangeColor(item.priceSnapshot?.changePercentDaily)">
                  {{ formatChange(item.priceSnapshot?.changePercentDaily) }}
                </span>
              </div>
            </div>
          </router-link>
        </div>

        <div
          v-else
          class="glass-card rounded-3xl border-dashed border-white/15 bg-white/[0.015] p-14 text-center"
        >
          <div class="mx-auto mb-5 h-16 w-16 rounded-full border border-white/10 bg-white/[0.04]"></div>
          <p class="text-sm text-white/85">{{ emptyTitle }}</p>
          <p class="mt-2 text-xs text-white/45">{{ emptyDescription }}</p>
        </div>

        <div v-if="products.length" class="pt-2 text-center">
          <button
            v-if="hasMore"
            @click="loadMore"
            :disabled="loadingMore"
            class="rounded-full border border-white/15 bg-white/[0.03] px-7 py-3 text-sm text-white/80 transition hover:border-white/35 hover:text-white disabled:opacity-60"
          >
            {{ loadingMore ? $t('gushi.explore.loadingMore') : $t('gushi.explore.loadMore') }}
          </button>
          <p v-else class="text-xs text-white/45">{{ $t('gushi.explore.endOfList') }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import gsap from 'gsap';
import { GushiService } from '../services/api';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const { show: showToast } = useToast();

const LIMIT = 20;
const products = ref([]);
const cursor = ref(null);
const hasMore = ref(false);
const loading = ref(true);
const loadingMore = ref(false);
const query = ref('');
const activeCategory = ref('all');
const brokenImageMap = ref({});

const categoryOptions = computed(() => [
  { value: 'all', label: t('gushi.explore.categoryAll') },
  { value: 'Badge', label: t('gushi.explore.categoryBadge') },
  { value: 'Figure', label: t('gushi.explore.categoryFigure') },
  { value: 'Plush', label: t('gushi.explore.categoryPlush') }
]);
const hasActiveFilters = computed(() => Boolean(query.value?.trim() || activeCategory.value !== 'all'));
const emptyTitle = computed(() => (hasActiveFilters.value ? t('gushi.explore.emptyTitle') : t('gushi.explore.emptyMarketTitle')));
const emptyDescription = computed(() => (hasActiveFilters.value ? t('gushi.explore.emptyDesc') : t('gushi.explore.emptyMarketDesc')));

const animateCards = () => {
  gsap.fromTo(
    '.gushi-explore-card',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.42, ease: 'power3.out', stagger: 0.045 }
  );
};

const fetchProducts = async ({ reset = false } = {}) => {
  if (reset) {
    loading.value = true;
    cursor.value = null;
    products.value = [];
  } else {
    loadingMore.value = true;
  }

  try {
    const params = {
      limit: LIMIT,
      q: query.value || undefined,
      category: activeCategory.value === 'all' ? undefined : activeCategory.value,
      cursor: reset ? undefined : cursor.value
    };
    const res = await GushiService.getProducts(params);
    if (res.success) {
      const chunk = Array.isArray(res.data) ? res.data : [];
      products.value = reset ? chunk : [...products.value, ...chunk];
      cursor.value = res.nextCursor || null;
      hasMore.value = Boolean(res.nextCursor);
      await nextTick();
      animateCards();
    }
  } catch (error) {
    showToast(error?.message || t('gushi.explore.loadFailed'), 'error');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const applyFilters = async () => {
  await fetchProducts({ reset: true });
};

const changeCategory = async (value) => {
  if (value === activeCategory.value) return;
  activeCategory.value = value;
  await applyFilters();
};

const loadMore = async () => {
  if (!hasMore.value || loadingMore.value) return;
  await fetchProducts({ reset: false });
};

onMounted(async () => {
  await fetchProducts({ reset: true });
});

const formatPrice = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return Number(value).toFixed(2);
};

const getChangeColor = (value) => {
  if (value === null || value === undefined) return 'text-white/45';
  return value > 0 ? 'text-rose-300' : value < 0 ? 'text-emerald-300' : 'text-white/60';
};

const formatChange = (value) => {
  if (value === null || value === undefined) return '0.00%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(2)}%`;
};

const hasDisplayImage = (item) => Boolean(item?.officialImage) && !brokenImageMap.value[item.id];
const markImageError = (itemId) => {
  brokenImageMap.value[itemId] = true;
};
</script>

<style scoped>
.glass-card {
  border-radius: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(24px);
  box-shadow:
    0 8px 32px 0 rgba(0, 0, 0, 0.3),
    inset 0 1px 1px rgba(255, 255, 255, 0.08);
}

.glass-sub-card {
  border-radius: 1.35rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(18px);
  box-shadow:
    0 8px 30px rgba(0, 0, 0, 0.26),
    inset 0 1px 1px rgba(255, 255, 255, 0.06);
}

.gushi-pill-btn {
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-image: linear-gradient(to right, rgba(37, 99, 235, 0.82), rgba(79, 70, 229, 0.82));
  color: #fff;
  box-shadow: 0 12px 26px rgba(30, 58, 138, 0.22);
  transition: all 0.25s ease;
}

.gushi-pill-btn:hover {
  background-image: linear-gradient(to right, rgba(59, 130, 246, 0.95), rgba(99, 102, 241, 0.95));
}

.gushi-input {
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
  color: #fff;
  outline: none;
  transition: all 0.2s ease;
}

.gushi-input:focus {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
}
</style>
