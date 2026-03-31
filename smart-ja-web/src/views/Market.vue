<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useI18n } from 'vue-i18n';
import { MarketService } from '../services/api';
import { useInfiniteScroll, useDebounceFn } from '@vueuse/core';

gsap.registerPlugin(ScrollTrigger);

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const services = ref([]);
const loading = ref(false);
const hasMore = ref(true);
const currentCursor = ref(null);
const errorMessage = ref('');
const searchQuery = ref(route.query.q || '');
const sortBy = ref(route.query.sortBy || 'latest');
const activeCategory = ref(route.query.category || '');

const categories = computed(() => [
  { id: '', name: t('market.categories.all') },
  { id: 'service', name: t('market.categories.service') },
  { id: 'goods', name: t('market.categories.goods') },
  { id: '3d', name: t('market.categories.3d') },
  { id: 'custom', name: t('market.categories.custom') }
]);

const animateCards = () => {
  gsap.fromTo(
    '.market-card',
    { y: 28, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.48, stagger: 0.05, ease: 'power3.out' }
  );
};

const loadServices = async (isLoadMore = false) => {
  if (loading.value || (!hasMore.value && isLoadMore)) return;

  loading.value = true;
  if (!isLoadMore) {
    currentCursor.value = null;
    services.value = [];
  }

  try {
    const res = await MarketService.getAllServices({
      q: searchQuery.value,
      sortBy: sortBy.value,
      limit: 12,
      cursor: currentCursor.value,
      category: activeCategory.value
    });
    const records = Array.isArray(res.data) ? res.data : [];
    const processed = records.map((service) => ({
      ...service,
      provider: service.provider || 'NS Studio'
    }));

    if (isLoadMore) services.value.push(...processed);
    else services.value = processed;

    currentCursor.value = res.nextCursor;
    hasMore.value = Boolean(res.nextCursor);
    errorMessage.value = '';

    setTimeout(() => {
      ScrollTrigger.refresh();
      animateCards();
    }, 90);
  } catch (error) {
    errorMessage.value = error?.message || 'Failed to load services';
  } finally {
    loading.value = false;
  }
};

const debouncedSearch = useDebounceFn(() => {
  router.replace({ query: { ...route.query, q: searchQuery.value } });
  loadServices(false);
}, 450);

watch(searchQuery, debouncedSearch);

watch([sortBy, activeCategory], () => {
  router.replace({ query: { q: searchQuery.value, sortBy: sortBy.value, category: activeCategory.value } });
  loadServices(false);
});

onMounted(() => {
  loadServices(false);
});

useInfiniteScroll(
  document,
  () => {
    if (hasMore.value && !loading.value) loadServices(true);
  },
  { distance: 320 }
);

const openProduct = (id) => {
  router.push(`/product/${id}`);
};

const formatPrice = (price) => `¥${Number(price || 0).toFixed(2)}`;
</script>

<template>
  <div class="relative min-h-screen overflow-x-clip bg-[#050505] pb-32 pt-24 text-slate-900 dark:text-white">
    <div class="pointer-events-none absolute -left-56 -top-16 h-[520px] w-[520px] rounded-full bg-indigo-500/18 blur-[130px]"></div>
    <div class="pointer-events-none absolute right-[-220px] top-28 h-[500px] w-[500px] rounded-full bg-cyan-500/12 blur-[130px]"></div>
    <div class="pointer-events-none absolute bottom-[-220px] left-[30%] h-[540px] w-[540px] rounded-full bg-emerald-500/10 blur-[145px]"></div>

    <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mb-14 text-center">
        <p class="text-[10px] uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400 dark:text-white/45">Market Grid</p>
        <h1 class="mt-3 text-5xl font-semibold tracking-tight md:text-7xl">{{ $t('market.title') }}</h1>
        <p class="mx-auto mt-5 max-w-3xl text-base text-slate-600 dark:text-white/55 md:text-lg">{{ $t('market.subtitle') }}</p>
      </div>

      <section class="market-glass mb-10 rounded-[2rem] p-3 md:p-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="no-scrollbar flex w-full gap-2 overflow-x-auto pb-1 lg:w-auto">
            <button
              v-for="cat in categories"
              :key="cat.id"
              @click="activeCategory = cat.id"
              class="market-pill whitespace-nowrap px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em]"
              :class="activeCategory === cat.id ? 'bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.2)]' : 'text-slate-600 dark:text-white/62 hover:text-slate-900 dark:text-white'"
            >
              {{ cat.name }}
            </button>
          </div>

          <div class="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div class="relative min-w-0 sm:w-72">
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="$t('market.searchPlaceholder')"
                class="market-input w-full py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-600 dark:text-white/40"
              />
              <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400 dark:text-white/45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-4.2-4.2m1.4-5.1a7 7 0 1 1-14 0a7 7 0 0 1 14 0z" />
              </svg>
            </div>

            <select
              v-model="sortBy"
              class="market-input appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206l6-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat py-2.5 pl-4 pr-10 text-sm text-slate-900 dark:text-white"
            >
              <option class="text-black" value="latest">{{ $t('market.sort.latest') }}</option>
              <option class="text-black" value="sales_desc">{{ $t('market.sort.popular') }}</option>
              <option class="text-black" value="price_asc">{{ $t('market.sort.priceAsc') }}</option>
              <option class="text-black" value="price_desc">{{ $t('market.sort.priceDesc') }}</option>
            </select>
          </div>
        </div>
      </section>

      <p v-if="errorMessage" class="mb-4 text-center text-sm text-rose-300/90">{{ errorMessage }}</p>

      <div v-if="services.length > 0" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <article
          v-for="service in services"
          :key="service.id"
          class="market-card group relative cursor-pointer overflow-hidden rounded-[2rem]"
          @click="openProduct(service.id)"
        >
          <div class="relative aspect-[4/5] overflow-hidden">
            <img
              v-if="service.image"
              :src="service.image"
              class="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/[0.08] to-black/60 text-6xl font-semibold text-slate-600 dark:text-white/12"
            >
              {{ service.title?.charAt(0) }}
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
            <span
              v-if="service.tags?.[0]"
              class="absolute right-4 top-4 rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-600 dark:text-white/78 backdrop-blur-xl"
            >
              {{ $t(`market.tags.${service.tags[0]}`) !== `market.tags.${service.tags[0]}` ? $t(`market.tags.${service.tags[0]}`) : service.tags[0] }}
            </span>
          </div>

          <div class="relative z-10 p-6">
            <h3 class="line-clamp-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{{ service.title }}</h3>
            <p class="mt-1 text-[10px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400 dark:text-white/45">{{ service.provider }}</p>
            <p class="mt-3 line-clamp-2 min-h-[2.8rem] text-sm leading-6 text-slate-600 dark:text-white/62">{{ service.description }}</p>
            <div class="mt-5 flex items-end justify-between">
              <span class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ formatPrice(service.price) }}</span>
              <span class="market-pill inline-flex h-10 w-10 items-center justify-center text-slate-600 dark:text-white/85 transition group-hover:text-slate-900 dark:text-white">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 17 17 7M9 7h8v8" />
                </svg>
              </span>
            </div>
          </div>
        </article>
      </div>

      <div v-if="services.length === 0 && !loading" class="market-glass mt-4 rounded-[2rem] px-6 py-16 text-center">
        <div class="mx-auto mb-5 h-20 w-20 rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.03]"></div>
        <p class="text-lg text-slate-600 dark:text-white/85">{{ $t('market.noResults') }}</p>
        <p class="mt-2 text-sm text-slate-600 dark:text-white/48">{{ $t('market.noResultsDesc') }}</p>
        <button
          @click="
            searchQuery = '';
            activeCategory = '';
          "
          class="market-pill mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-white/78 hover:text-slate-900 dark:text-white"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 4v5h.6m14.8 2A8 8 0 0 0 4.6 9m0 0H9m11 11v-5h-.6m0 0a8 8 0 0 1-14.8-2M19.4 15H15" />
          </svg>
          {{ $t('market.resetSearch') }}
        </button>
      </div>

      <div v-if="loading" class="py-12">
        <div class="flex justify-center gap-2">
          <span class="h-2 w-2 animate-bounce rounded-full bg-white/45"></span>
          <span class="h-2 w-2 animate-bounce rounded-full bg-white/45 [animation-delay:120ms]"></span>
          <span class="h-2 w-2 animate-bounce rounded-full bg-white/45 [animation-delay:240ms]"></span>
        </div>
      </div>

      <div v-if="!hasMore && services.length > 0" class="py-8 text-center text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-white/40">
        {{ $t('market.endOfList') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.market-glass {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(24px);
  box-shadow:
    0 8px 32px 0 rgba(0, 0, 0, 0.34),
    inset 0 1px 1px rgba(255, 255, 255, 0.08);
}

.market-input {
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
  transition: all 0.25s ease;
}

.market-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.05);
}

.market-pill {
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(18px);
  transition: all 0.25s ease;
}

.market-card {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(24px);
  box-shadow:
    0 10px 36px rgba(0, 0, 0, 0.32),
    inset 0 1px 1px rgba(255, 255, 255, 0.08);
  transition: transform 0.32s ease, box-shadow 0.32s ease, border-color 0.32s ease;
}

.market-card:hover {
  transform: scale(1.02);
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow:
    0 20px 48px rgba(0, 0, 0, 0.45),
    0 0 30px rgba(255, 255, 255, 0.1),
    inset 0 1px 1px rgba(255, 255, 255, 0.12);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
