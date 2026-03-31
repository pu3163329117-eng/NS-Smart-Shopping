<template>
  <div class="relative min-h-screen overflow-hidden bg-[#050505] px-4 pt-24 pb-12 text-white sm:px-6 lg:px-8">
    <div class="pointer-events-none absolute -left-52 -top-20 h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[130px]"></div>
    <div class="pointer-events-none absolute right-[-220px] top-[160px] h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[130px]"></div>
    <div class="pointer-events-none absolute bottom-[-220px] left-[28%] h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[135px]"></div>

    <div v-if="product" class="relative z-10 mx-auto max-w-7xl">
      <div class="mb-8 flex items-center gap-2 text-sm text-white/55">
        <router-link to="/gushi" class="transition hover:text-white">{{ $t('gushi.detail.breadcrumbMarket') }}</router-link>
        <span>/</span>
        <span class="text-white/80">{{ product.ipName }}</span>
        <span>/</span>
        <span class="font-medium text-white">{{ product.characterName }}</span>
      </div>

      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div class="space-y-6">
          <div class="gushi-detail-hero glass-card flex aspect-square items-center justify-center overflow-hidden p-5">
            <img :src="product.officialImage" class="max-h-full max-w-full object-contain" />
          </div>

          <div class="gushi-detail-hero glass-card space-y-5 p-8">
            <div>
              <p class="text-[10px] font-light uppercase tracking-[0.24em] text-white/45">{{ $t('gushi.detail.priceTrend') }}</p>
              <h1 class="mt-2 text-2xl font-semibold tracking-tight">{{ product.characterName }} {{ product.variantName || '' }}</h1>
              <p class="mt-1 text-sm text-white/55">{{ product.seriesName }} | {{ product.category }}</p>
            </div>

            <div class="flex items-end justify-between border-t border-white/10 pt-4">
              <div>
                <p class="mb-1 text-xs uppercase tracking-[0.14em] text-white/40">{{ $t('gushi.detail.latestTradePrice') }}</p>
                <div class="text-3xl font-semibold tracking-tight">CNY {{ formatPrice(latestTradePrice) }}</div>
              </div>
              <div class="text-right">
                <p class="mb-1 text-xs uppercase tracking-[0.14em] text-white/40">{{ $t('gushi.detail.change24h') }}</p>
                <div class="text-lg font-medium" :class="getChangeColor(product.priceSnapshot?.changePercentDaily)">
                  {{ formatChange(product.priceSnapshot?.changePercentDaily) }}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div>
                <p class="text-[10px] uppercase tracking-[0.14em] text-white/40">{{ $t('gushi.detail.floorPrice') }}</p>
                <p class="mt-1 text-sm text-white/85">CNY {{ formatPrice(product.priceSnapshot?.floorPrice) }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-[0.14em] text-white/40">{{ $t('gushi.detail.ref7d') }}</p>
                <p class="mt-1 text-sm text-white/85">CNY {{ formatPrice(product.priceSnapshot?.referencePrice7d) }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-[0.14em] text-white/40">{{ $t('gushi.detail.volume24h') }}</p>
                <p class="mt-1 text-sm text-white/85">{{ Number(product.priceSnapshot?.volume24h || 0) }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-[0.14em] text-white/40">{{ $t('gushi.detail.officialPrice') }}</p>
                <p class="mt-1 text-sm text-white/85">CNY {{ formatPrice(product.officialPrice) }}</p>
              </div>
            </div>

            <router-link :to="`/gushi/sell?productId=${product.id}`" class="gushi-pill-btn block w-full py-3 text-center text-sm font-medium text-white">
              {{ $t('gushi.detail.listForSale') }}
            </router-link>
          </div>
        </div>

        <div class="space-y-8 lg:col-span-2">
          <div class="gushi-detail-chart glass-card p-8">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="inline-flex items-center gap-2 text-lg font-medium tracking-tight">
                <svg class="h-5 w-5 text-cyan-200/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 17l6-6 4 4 6-8" />
                </svg>
                {{ $t('gushi.detail.priceTrend') }}
              </h2>
              <span class="text-xs text-white/45">{{ $t('gushi.detail.lastSnapshots', { count: chartRows.length }) }}</span>
            </div>

            <div v-if="hasChartData" class="h-80">
              <v-chart class="h-full w-full" :option="chartOption" autoresize />
            </div>

            <div
              v-else
              class="flex h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-white/12 bg-white/[0.015] p-6 text-center"
            >
              <div class="mb-4 h-16 w-16 rounded-full border border-white/10 bg-white/[0.04]"></div>
              <p class="text-sm text-white/82">{{ $t('gushi.detail.emptyChartTitle') }}</p>
              <p class="mt-2 text-xs text-white/45">{{ $t('gushi.detail.emptyChartDesc') }}</p>
            </div>
          </div>

          <div class="glass-card p-8">
            <h2 class="mb-5 flex items-center justify-between text-lg font-medium tracking-tight">
              <span class="inline-flex items-center gap-2">
                <svg class="h-5 w-5 text-violet-200/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 6h18M3 12h18M3 18h18" />
                </svg>
                {{ $t('gushi.detail.activeListings') }}
              </span>
              <div class="flex items-center gap-2">
                <span class="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/65">
                  {{ $t('gushi.detail.availableCount', { count: listings.length }) }}
                </span>
                <button @click="openOfferModal" class="gushi-pill-btn-emerald px-4 py-1.5 text-xs font-medium text-white">
                  {{ $t('gushi.detail.placeBid') }}
                </button>
              </div>
            </h2>

            <div class="mb-6">
              <h3 class="mb-3 text-sm font-medium text-white/75">{{ $t('gushi.detail.topBids') }}</h3>
              <div v-if="loadingOffers" class="text-xs text-white/45">{{ $t('gushi.detail.loadingBids') }}</div>
              <div v-else-if="!offers.length" class="rounded-2xl border border-dashed border-white/12 bg-white/[0.015] p-4 text-center">
                <p class="text-xs text-white/45">{{ $t('gushi.detail.emptyBids') }}</p>
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="offer in offers"
                  :key="offer.id"
                  class="gushi-offer-item glass-sub-card flex items-center justify-between p-3"
                >
                  <div>
                    <p class="text-sm font-medium text-white">CNY {{ formatPrice(offer.price) }} x {{ offer.quantity }}</p>
                    <p class="text-xs text-white/45">{{ $t('gushi.detail.bidBy') }}: {{ offer.buyer?.username || $t('gushi.detail.anonymousSeller') }}</p>
                  </div>
                  <button
                    v-if="isAuthenticated && offer.buyerId !== currentUserId"
                    @click="fulfillBid(offer)"
                    :disabled="fulfillingOfferId === offer.id"
                    class="gushi-pill-btn px-4 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                  >
                    {{ fulfillingOfferId === offer.id ? $t('gushi.detail.processing') : $t('gushi.detail.fulfillBid') }}
                  </button>
                </div>
              </div>
            </div>

            <div v-if="loadingListings" class="py-12 text-center text-white/45 animate-pulse">{{ $t('gushi.detail.loadingListings') }}</div>

            <div
              v-else-if="!listings.length"
              class="rounded-3xl border border-dashed border-white/12 bg-white/[0.015] p-10 text-center"
            >
              <div class="mx-auto mb-4 h-16 w-16 rounded-full border border-white/10 bg-white/[0.04]"></div>
              <p class="text-sm text-white/82">{{ $t('gushi.detail.emptyListingsTitle') }}</p>
              <p class="mt-2 text-xs text-white/45">{{ $t('gushi.detail.emptyListingsDesc') }}</p>
            </div>

            <div v-else class="space-y-4">
              <article
                v-for="l in listings"
                :key="l.id"
                class="gushi-listing-item glass-sub-card flex items-center justify-between gap-4 p-4"
              >
                <div class="flex items-center gap-4">
                  <img :src="l.images?.[0] || product.officialImage" class="h-16 w-16 rounded-2xl object-cover" />
                  <div>
                    <div class="mb-1 flex items-center gap-2">
                      <span class="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">{{ $t('gushi.detail.gradeLabel', { grade: l.conditionGrade }) }}</span>
                      <span v-if="l.isOpened" class="rounded-full bg-rose-500/20 px-2.5 py-1 text-xs text-rose-200">{{ $t('gushi.detail.opened') }}</span>
                      <span v-else class="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-200">{{ $t('gushi.detail.sealed') }}</span>
                    </div>
                    <p class="line-clamp-1 max-w-xs text-sm text-white/60">{{ l.defectNotes || $t('gushi.detail.noDefectNotes') }}</p>
                    <p class="mt-1 text-xs text-white/45">{{ $t('gushi.detail.seller') }}: {{ l.seller?.username || $t('gushi.detail.anonymousSeller') }}</p>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <div class="text-xl font-semibold tracking-tight text-white">CNY {{ formatPrice(l.price) }}</div>
                  <button
                    @click="buyListing(l)"
                    :disabled="buying === l.id"
                    class="gushi-pill-btn-light px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {{ buying === l.id ? $t('gushi.detail.processing') : $t('gushi.detail.buyNow') }}
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="relative z-10 flex items-center justify-center py-32">
      <div class="text-white/45 animate-pulse">{{ $t('gushi.detail.loadingProduct') }}</div>
    </div>

    <transition name="gushi-fade">
      <div v-if="showOfferModal" class="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
        <div class="glass-card w-full max-w-md p-7">
          <h3 class="text-lg font-semibold tracking-tight">{{ $t('gushi.detail.placeBidTitle') }}</h3>
          <p class="mt-1 text-sm text-white/58">{{ $t('gushi.detail.placeBidDesc') }}</p>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-[11px] uppercase tracking-[0.16em] text-white/45">{{ $t('gushi.detail.bidPrice') }}</label>
              <input v-model.number="offerForm.price" type="number" min="0.01" step="0.01" class="gushi-input w-full px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label class="mb-1 block text-[11px] uppercase tracking-[0.16em] text-white/45">{{ $t('gushi.detail.bidQuantity') }}</label>
              <input v-model.number="offerForm.quantity" type="number" min="1" step="1" class="gushi-input w-full px-3 py-2.5 text-sm" />
            </div>
          </div>
          <p class="mt-3 text-xs text-white/45">
            {{ $t('gushi.detail.bidFreezeHint', { amount: formatPrice((offerForm.price || 0) * (offerForm.quantity || 1)) }) }}
          </p>
          <div class="mt-5 flex justify-end gap-3">
            <button @click="closeOfferModal" class="rounded-full border border-white/20 bg-white/[0.03] px-4 py-2 text-sm text-white/75 transition hover:border-white/35 hover:text-white">
              {{ $t('gushi.detail.bidCancel') }}
            </button>
            <button @click="submitOffer" :disabled="placingOffer" class="gushi-pill-btn-emerald px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
              {{ placingOffer ? $t('gushi.detail.processing') : $t('gushi.detail.bidSubmit') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import gsap from 'gsap';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import { useGushiStore } from '../store/gushi';
import { GushiService } from '../services/api';
import { useToast } from '../composables/useToast';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useGushiStore();
const { show: showToast } = useToast();

const productId = computed(() => route.params.productId);
const product = computed(() => store.productMap[productId.value]);
const loading = computed(() => store.loadingStates.productDetail);
const chartRows = computed(() => (Array.isArray(product.value?.chartData) ? product.value.chartData : []));
const hasChartData = computed(() => chartRows.value.some((item) => item?.latestPrice !== null && item?.latestPrice !== undefined));

const listings = ref([]);
const loadingListings = ref(false);
const buying = ref(null);
const trades = ref([]);
const offers = ref([]);
const loadingOffers = ref(false);
const placingOffer = ref(false);
const fulfillingOfferId = ref('');
const showOfferModal = ref(false);
const offerForm = ref({ price: null, quantity: 1 });
const currentUserId = ref(null);
const isAuthenticated = computed(() => Boolean(currentUserId.value));
const latestTradePrice = computed(() => {
  const latestTrade = trades.value?.[0];
  const fromTrade = Number(latestTrade?.items?.[0]?.price ?? latestTrade?.amount);
  if (Number.isFinite(fromTrade) && fromTrade > 0) return fromTrade;
  return product.value?.priceSnapshot?.latestPrice || product.value?.officialPrice;
});

let liveRefreshTimer = null;

const chartOption = computed(() => {
  const labels = chartRows.value.map((item) => formatChartDate(item.capturedAt));
  const prices = chartRows.value.map((item) => (item?.latestPrice ?? item?.referencePrice7d ?? null));
  const volumes = chartRows.value.map((item) => Number(item?.volume24h || 0));

  return {
    backgroundColor: 'transparent',
    grid: { left: 18, right: 18, top: 20, bottom: 28, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(2, 6, 23, 0.92)',
      borderColor: 'rgba(148, 163, 184, 0.26)',
      textStyle: { color: '#e2e8f0' },
      axisPointer: { type: 'line', lineStyle: { color: 'rgba(56, 189, 248, 0.35)' } },
      formatter: (params) => {
        const first = Array.isArray(params) ? params[0] : params;
        const index = first?.dataIndex || 0;
        const price = prices[index];
        const volume = volumes[index];
        return [
          `<div style="font-weight:600;margin-bottom:4px;">${labels[index] || '--'}</div>`,
          `${t('gushi.detail.tooltipPrice')}: CNY ${formatPrice(price)}`,
          `${t('gushi.detail.tooltipVolume')}: ${volume}`
        ].join('<br/>');
      }
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.35)' } },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11, formatter: (value) => `CNY ${Number(value).toFixed(0)}` },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.14)' } }
    },
    series: [
      {
        type: 'line',
        smooth: true,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 6,
        data: prices,
        lineStyle: { width: 2, color: '#38bdf8' },
        itemStyle: { color: '#7dd3fc' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(56, 189, 248, 0.45)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.02)' }
            ]
          }
        }
      }
    ]
  };
});

const animateDetail = () => {
  gsap.fromTo(
    '.gushi-detail-hero',
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: 0.48, ease: 'power3.out', stagger: 0.08 }
  );

  gsap.fromTo('.gushi-detail-chart', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.52, ease: 'power3.out' });
  gsap.fromTo('.gushi-offer-item', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.38, ease: 'power3.out', stagger: 0.04 });
  gsap.fromTo('.gushi-listing-item', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.42, ease: 'power3.out', stagger: 0.06, delay: 0.08 });
};

const resolveUserIdFromToken = () => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id || payload.userId || null;
  } catch (error) {
    return null;
  }
};

const loadListings = async () => {
  loadingListings.value = true;
  try {
    const res = await GushiService.getListings(productId.value);
    if (res.success) listings.value = res.data || [];
  } catch (error) {
    showToast(error?.message || t('gushi.detail.loadListingsFailed'), 'error');
  } finally {
    loadingListings.value = false;
  }
};

const loadOffers = async () => {
  loadingOffers.value = true;
  try {
    const res = await GushiService.getOffers(productId.value, { limit: 10 });
    if (res.success) offers.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    showToast(error?.message || t('gushi.detail.loadBidsFailed'), 'error');
  } finally {
    loadingOffers.value = false;
  }
};

const loadTrades = async () => {
  try {
    const res = await GushiService.getTrades(productId.value, { limit: 20 });
    if (res.success) {
      trades.value = Array.isArray(res.data) ? res.data : [];
    }
  } catch (error) {
    // Ignore silent refresh errors here to avoid interrupting core trading actions.
  }
};

const loadPageData = async () => {
  await store.loadProduct(productId.value);
  await Promise.all([loadListings(), loadOffers(), loadTrades()]);
  await nextTick();
  animateDetail();
};

const stopLiveRefresh = () => {
  if (liveRefreshTimer) {
    clearInterval(liveRefreshTimer);
    liveRefreshTimer = null;
  }
};

const startLiveRefresh = () => {
  stopLiveRefresh();
  liveRefreshTimer = setInterval(async () => {
    if (!productId.value) return;
    await Promise.all([store.loadProduct(productId.value), loadTrades()]);
  }, 15000);
};

const handleSettlementEvent = async (event) => {
  const settledProductId = event?.detail?.productId;
  if (!settledProductId || settledProductId !== productId.value) return;
  await loadPageData();
};

onMounted(() => {
  currentUserId.value = resolveUserIdFromToken();
  loadPageData();
  startLiveRefresh();
  window.addEventListener('gushi:settled', handleSettlementEvent);
});

onBeforeUnmount(() => {
  stopLiveRefresh();
  window.removeEventListener('gushi:settled', handleSettlementEvent);
});

watch(
  () => productId.value,
  async () => {
    await loadPageData();
  }
);

const openOfferModal = () => {
  if (!isAuthenticated.value) {
    showToast(t('gushi.detail.bidNeedLogin'), 'info');
    router.push('/login');
    return;
  }
  offerForm.value = {
    price: product.value?.priceSnapshot?.latestPrice || product.value?.officialPrice || null,
    quantity: 1
  };
  showOfferModal.value = true;
};

const closeOfferModal = () => {
  if (placingOffer.value) return;
  showOfferModal.value = false;
  offerForm.value = { price: null, quantity: 1 };
};

const submitOffer = async () => {
  const price = Number(offerForm.value.price);
  const quantity = Number(offerForm.value.quantity);
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
    showToast(t('gushi.detail.bidInvalid'), 'info');
    return;
  }

  placingOffer.value = true;
  try {
    const res = await GushiService.createOffer({
      gushiProductId: productId.value,
      price,
      quantity
    });
    if (res.success) {
      showToast(t('gushi.detail.bidPlacedSuccess'), 'success');
      closeOfferModal();
      await loadOffers();
    }
  } catch (error) {
    showToast(error?.message || t('gushi.detail.bidPlacedFailed'), 'error');
  } finally {
    placingOffer.value = false;
  }
};

const fulfillBid = async (offer) => {
  const ok = window.confirm(
    t('gushi.detail.fulfillBidConfirm', {
      price: formatPrice(offer.price),
      quantity: offer.quantity
    })
  );
  if (!ok) return;

  fulfillingOfferId.value = offer.id;
  try {
    const res = await GushiService.fulfillOffer(offer.id);
    if (res.success) {
      showToast(t('gushi.detail.fulfillBidSuccess'), 'success');
      await loadOffers();
      await loadListings();
      router.push(`/gushi/orders/${res.data.id}`);
    }
  } catch (error) {
    showToast(error?.message || t('gushi.detail.fulfillBidFailed'), 'error');
  } finally {
    fulfillingOfferId.value = '';
  }
};

const buyListing = async (listing) => {
  const ok = window.confirm(t('gushi.detail.confirmBuy', { price: formatPrice(listing.price) }));
  if (!ok) return;

  buying.value = listing.id;
  try {
    const res = await store.createOrder({
      listingId: listing.id,
      quantity: 1
    });
    if (res.success) {
      showToast(t('gushi.detail.orderPlacedSuccess'), 'success');
      router.push(`/gushi/orders/${res.data.id}`);
    }
  } catch (error) {
    showToast(error?.message || t('gushi.detail.orderPlacedFailed'), 'error');
  } finally {
    buying.value = null;
  }
};

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

const formatChartDate = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleDateString();
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
  border-radius: 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(18px);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.26),
    inset 0 1px 1px rgba(255, 255, 255, 0.06);
}

.gushi-pill-btn {
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-image: linear-gradient(to right, rgba(37, 99, 235, 0.82), rgba(79, 70, 229, 0.82));
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 24px rgba(30, 58, 138, 0.2);
  transition: all 0.25s ease;
}

.gushi-pill-btn:hover {
  background-image: linear-gradient(to right, rgba(59, 130, 246, 0.95), rgba(99, 102, 241, 0.95));
}

.gushi-pill-btn-emerald {
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background-image: linear-gradient(to right, rgba(16, 185, 129, 0.82), rgba(14, 165, 233, 0.82));
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 24px rgba(6, 95, 70, 0.25);
  transition: all 0.25s ease;
}

.gushi-pill-btn-emerald:hover {
  background-image: linear-gradient(to right, rgba(52, 211, 153, 0.95), rgba(56, 189, 248, 0.95));
}

.gushi-pill-btn-light {
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  transition: all 0.25s ease;
}

.gushi-pill-btn-light:hover {
  background: rgba(255, 255, 255, 0.2);
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

.gushi-fade-enter-active,
.gushi-fade-leave-active {
  transition: opacity 0.18s ease;
}

.gushi-fade-enter-from,
.gushi-fade-leave-to {
  opacity: 0;
}
</style>
