<template>
  <div class="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-24 pb-12 text-white sm:px-6 lg:px-8">
    <div class="pointer-events-none absolute -left-48 -top-24 h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[130px]"></div>
    <div class="pointer-events-none absolute right-[-220px] top-[140px] h-[540px] w-[540px] rounded-full bg-emerald-500/10 blur-[140px]"></div>
    <div class="pointer-events-none absolute bottom-[-200px] left-[25%] h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[130px]"></div>

    <div class="relative z-10 mx-auto max-w-7xl space-y-12">
      <div class="flex items-center justify-between gap-6">
        <div class="space-y-2">
          <p class="inline-flex items-center gap-2 text-[10px] font-light uppercase tracking-[0.28em] text-white/50">
            <svg class="h-3.5 w-3.5 text-cyan-300/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4" />
            </svg>
            {{ $t('gushi.home.title') }}
          </p>
          <h1 class="text-4xl font-semibold tracking-tight text-white">{{ $t('gushi.home.title') }}</h1>
          <p class="text-sm text-white/60">{{ $t('gushi.home.subtitle') }}</p>
        </div>
        <router-link to="/gushi/my" class="gushi-pill-btn px-5 py-2.5 text-sm font-medium text-white">
          {{ $t('gushi.home.myCabinet') }}
        </router-link>
      </div>

      <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section class="glass-card p-8">
          <div class="mb-6 flex items-center justify-between">
            <h2 class="inline-flex items-center gap-2 text-lg font-medium tracking-tight">
              <svg class="h-5 w-5 text-blue-200/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3l2.8 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.5 6.3 20.6l1.1-6.4L2.8 9.7l6.4-.9L12 3z" />
              </svg>
              {{ $t('gushi.home.hotProducts') }}
            </h2>
            <router-link to="/gushi/market" class="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:border-white/35 hover:text-white">
              {{ $t('gushi.home.viewAll') }}
            </router-link>
          </div>

          <div v-if="loading" class="space-y-4 animate-pulse">
            <div v-for="i in 5" :key="`hot-skeleton-${i}`" class="h-20 rounded-2xl border border-white/10 bg-white/[0.03]"></div>
          </div>

          <div v-else-if="hotProducts.length" class="space-y-3">
            <router-link
              v-for="item in hotProducts"
              :key="item.id"
              :to="`/gushi/${item.id}`"
              class="gushi-hot-item glass-sub-card group flex items-center justify-between gap-4 p-4 transition hover:border-white/25"
            >
              <div class="flex items-center gap-4">
                <img :src="item.officialImage" class="h-14 w-14 rounded-2xl object-cover" />
                <div>
                  <h3 class="font-medium text-white transition group-hover:text-cyan-200">{{ item.characterName }}</h3>
                  <p class="text-xs text-white/50">{{ item.ipName }} | {{ item.category }}</p>
                </div>
              </div>
              <div class="text-right">
                <div class="font-mono text-sm font-medium text-white">CNY {{ item.priceSnapshot?.latestPrice || item.officialPrice || '--' }}</div>
                <div class="mt-1 text-xs font-mono" :class="getChangeColor(item.priceSnapshot?.changePercentDaily)">
                  {{ formatChange(item.priceSnapshot?.changePercentDaily) }}
                </div>
              </div>
            </router-link>
          </div>

          <div
            v-else
            class="rounded-3xl border border-dashed border-white/15 bg-white/[0.015] p-10 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
          >
            <div class="mx-auto mb-4 h-16 w-16 rounded-full border border-white/10 bg-white/[0.04]"></div>
            <p class="text-sm text-white/80">{{ $t('gushi.home.emptyProductsTitle') }}</p>
            <p class="mt-2 text-xs text-white/45">{{ $t('gushi.home.emptyProductsDesc') }}</p>
          </div>
        </section>

        <section class="glass-card p-8">
          <h2 class="mb-6 inline-flex items-center gap-2 text-lg font-medium tracking-tight">
            <svg class="h-5 w-5 text-emerald-200/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 12h18M7 7l-4 5 4 5m10-10l4 5-4 5" />
            </svg>
            {{ $t('gushi.home.latestTrades') }}
          </h2>

          <div v-if="loading" class="space-y-4 animate-pulse">
            <div v-for="i in 5" :key="`trade-skeleton-${i}`" class="h-20 rounded-2xl border border-white/10 bg-white/[0.03]"></div>
          </div>

          <div v-else-if="latestTrades.length" class="space-y-3">
            <article
              v-for="order in latestTrades"
              :key="order.id"
              class="gushi-trade-item glass-sub-card flex items-center justify-between gap-4 p-4"
            >
              <div class="flex items-center gap-4">
                <img :src="order.items?.[0]?.image" class="h-11 w-11 rounded-2xl object-cover opacity-90" />
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-white/90">{{ order.items?.[0]?.title }}</span>
                  <span class="text-xs text-white/45">{{ formatDate(order.settledAt) }}</span>
                </div>
              </div>
              <div class="text-right">
                <div class="font-mono text-sm font-medium text-emerald-200">CNY {{ order.items?.[0]?.price ?? '--' }}</div>
                <div class="mt-1 text-xs text-white/45">{{ $t('gushi.home.quantity') }}: {{ order.items?.[0]?.quantity ?? 0 }}</div>
              </div>
            </article>
          </div>

          <div
            v-else
            class="rounded-3xl border border-dashed border-white/15 bg-white/[0.015] p-10 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
          >
            <div class="mx-auto mb-4 h-16 w-16 rounded-full border border-white/10 bg-white/[0.04]"></div>
            <p class="text-sm text-white/80">{{ $t('gushi.home.emptyTradesTitle') }}</p>
            <p class="mt-2 text-xs text-white/45">{{ $t('gushi.home.emptyTradesDesc') }}</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed, nextTick, watch } from 'vue';
import gsap from 'gsap';
import { useGushiStore } from '../store/gushi';

const gushiStore = useGushiStore();
const loading = computed(() => gushiStore.loadingStates.home);
const hotProducts = computed(() => gushiStore.homeData.hotProducts || []);
const latestTrades = computed(() => gushiStore.homeData.latestTrades || []);

const animateBoards = () => {
  gsap.fromTo(
    '.gushi-hot-item',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.06 }
  );

  gsap.fromTo(
    '.gushi-trade-item',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.07, delay: 0.05 }
  );
};

watch(
  () => loading.value,
  async (isLoading) => {
    if (isLoading) return;
    await nextTick();
    animateBoards();
  }
);

onMounted(() => {
  gushiStore.loadHome();
});

const getChangeColor = (val) => {
  if (val === null || val === undefined) return 'text-white/45';
  return val > 0 ? 'text-rose-300' : val < 0 ? 'text-emerald-300' : 'text-white/60';
};

const formatChange = (val) => {
  if (val === null || val === undefined) return '0.00%';
  const sign = val > 0 ? '+' : '';
  return `${sign}${Number(val).toFixed(2)}%`;
};

const formatDate = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleString();
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
  border-radius: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(18px);
  box-shadow:
    0 6px 24px rgba(0, 0, 0, 0.25),
    inset 0 1px 1px rgba(255, 255, 255, 0.06);
}

.gushi-pill-btn {
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-image: linear-gradient(to right, rgba(37, 99, 235, 0.8), rgba(79, 70, 229, 0.8));
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 24px rgba(30, 58, 138, 0.2);
  transition: all 0.25s ease;
}

.gushi-pill-btn:hover {
  background-image: linear-gradient(to right, rgba(59, 130, 246, 0.92), rgba(99, 102, 241, 0.92));
}
</style>
