<template>
  <div class="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-12 text-white sm:px-6 lg:px-8">
    <div class="pointer-events-none absolute -left-48 -top-20 h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[130px]"></div>
    <div class="pointer-events-none absolute right-[-220px] top-[160px] h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[130px]"></div>
    <div class="pointer-events-none absolute bottom-[-220px] left-[28%] h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[135px]"></div>

    <div class="relative z-10 mx-auto max-w-7xl space-y-8">
      <div class="flex items-center justify-between gap-6">
        <div class="space-y-2">
          <p class="inline-flex items-center gap-2 text-[10px] font-light uppercase tracking-[0.28em] text-white/50">
            <svg class="h-3.5 w-3.5 text-cyan-300/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {{ $t('gushi.cabinet.title') }}
          </p>
          <h1 class="text-3xl font-semibold tracking-tight">{{ $t('gushi.cabinet.title') }}</h1>
        </div>
        <router-link to="/gushi/sell" class="gushi-pill-btn px-5 py-2.5 text-sm font-medium text-white">
          {{ $t('gushi.cabinet.sellItem') }}
        </router-link>
      </div>

      <div class="glass-sub-card inline-flex gap-2 p-2">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="rounded-full px-4 py-2 text-xs font-medium transition"
          :class="activeTab === tab.key ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/8 hover:text-white'"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="isTabLoading" class="glass-card flex justify-center py-16 text-white/55 animate-pulse">
        {{ activeTab === 'offers' ? $t('gushi.cabinet.loadingOffers') : $t('gushi.cabinet.loading') }}
      </div>

      <div v-else>
        <div v-if="activeTab === 'listings'" class="space-y-4">
          <div
            v-if="!store.myListings.length"
            class="glass-card rounded-3xl border-dashed border-white/15 bg-white/[0.015] p-12 text-center"
          >
            <div class="mx-auto mb-4 h-16 w-16 rounded-full border border-white/10 bg-white/[0.04]"></div>
            <p class="text-sm text-white/85">{{ $t('gushi.cabinet.emptyListingsTitle') }}</p>
            <p class="mt-2 text-xs text-white/45">{{ $t('gushi.cabinet.emptyListingsDesc') }}</p>
          </div>

          <article
            v-for="listing in store.myListings"
            :key="listing.id"
            class="glass-card flex items-center justify-between gap-4 p-6"
          >
            <div class="flex items-center gap-4">
              <img :src="listing.product?.officialImage" class="h-16 w-16 rounded-2xl object-cover" />
              <div>
                <h3 class="flex items-center gap-2 font-medium text-white">
                  {{ listing.product?.characterName }}
                  <span class="rounded-full px-2.5 py-1 text-[11px]" :class="statusClass(listing.status, listing.auditStatus)">
                    {{ formatListingStatus(listing.status, listing.auditStatus) }}
                  </span>
                </h3>
                <p class="text-sm text-white/60">
                  {{ $t('gushi.cabinet.condition') }}: {{ listing.conditionGrade }} |
                  {{ $t('gushi.cabinet.stock') }}: {{ listing.availableQuantity }} / {{ listing.quantity }}
                </p>
                <p class="mt-1 text-xs text-white/40">{{ $t('gushi.cabinet.listedOn') }} {{ formatDate(listing.createdAt) }}</p>
              </div>
            </div>
            <div class="text-right">
              <div class="font-mono text-xl font-semibold text-white">CNY {{ formatPrice(listing.price) }}</div>
              <button
                v-if="listing.status === 'active'"
                @click="unpublish(listing.id)"
                class="mt-2 rounded-full border border-rose-300/30 px-3 py-1 text-xs text-rose-200 transition hover:border-rose-200/50 hover:text-rose-100"
              >
                {{ $t('gushi.cabinet.unpublish') }}
              </button>
            </div>
          </article>
        </div>

        <div v-if="activeTab === 'bought'" class="space-y-4">
          <div
            v-if="!boughtOrders.length"
            class="glass-card rounded-3xl border-dashed border-white/15 bg-white/[0.015] p-12 text-center"
          >
            <div class="mx-auto mb-4 h-16 w-16 rounded-full border border-white/10 bg-white/[0.04]"></div>
            <p class="text-sm text-white/85">{{ $t('gushi.cabinet.emptyBoughtTitle') }}</p>
            <p class="mt-2 text-xs text-white/45">{{ $t('gushi.cabinet.emptyBoughtDesc') }}</p>
          </div>

          <router-link
            v-for="order in boughtOrders"
            :key="order.id"
            :to="`/gushi/orders/${order.id}`"
            class="glass-card block p-6 transition hover:border-white/20"
          >
            <div class="mb-4 flex items-start justify-between">
              <span class="text-xs text-white/45">{{ $t('gushi.cabinet.orderId') }}: {{ order.id }}</span>
              <span class="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs text-blue-200">{{ formatOrderStatus(order.status) }}</span>
            </div>
            <div class="flex items-center gap-4">
              <img :src="order.items?.[0]?.image" class="h-16 w-16 rounded-2xl object-cover" />
              <div>
                <h3 class="font-medium text-white">{{ order.items?.[0]?.title }}</h3>
                <p class="text-sm text-white/60">{{ $t('gushi.cabinet.quantity') }}: {{ order.items?.[0]?.quantity }}</p>
              </div>
              <div class="ml-auto text-right font-mono font-semibold text-white">CNY {{ formatPrice(order.amount) }}</div>
            </div>
          </router-link>
        </div>

        <div v-if="activeTab === 'sold'" class="space-y-4">
          <div
            v-if="!soldOrders.length"
            class="glass-card rounded-3xl border-dashed border-white/15 bg-white/[0.015] p-12 text-center"
          >
            <div class="mx-auto mb-4 h-16 w-16 rounded-full border border-white/10 bg-white/[0.04]"></div>
            <p class="text-sm text-white/85">{{ $t('gushi.cabinet.emptySoldTitle') }}</p>
            <p class="mt-2 text-xs text-white/45">{{ $t('gushi.cabinet.emptySoldDesc') }}</p>
          </div>

          <router-link
            v-for="order in soldOrders"
            :key="order.id"
            :to="`/gushi/orders/${order.id}`"
            class="glass-card block p-6 transition hover:border-white/20"
          >
            <div class="mb-4 flex items-start justify-between">
              <span class="text-xs text-white/45">{{ $t('gushi.cabinet.orderId') }}: {{ order.id }}</span>
              <span class="rounded-full bg-purple-500/20 px-2.5 py-1 text-xs text-purple-200">{{ formatOrderStatus(order.status) }}</span>
            </div>
            <div class="flex items-center gap-4">
              <img :src="order.items?.[0]?.image" class="h-16 w-16 rounded-2xl object-cover" />
              <div>
                <h3 class="font-medium text-white">{{ order.items?.[0]?.title }}</h3>
                <p class="text-sm text-white/60">{{ $t('gushi.cabinet.earned') }}: CNY {{ formatPrice(order.amount) }}</p>
              </div>
              <div class="ml-auto flex items-center">
                <span v-if="order.status === 'paid'" class="rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs text-yellow-200">{{ $t('gushi.cabinet.needsShipping') }}</span>
                <span
                  v-else-if="order.status === 'completed'"
                  class="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-200"
                >
                  {{ $t('gushi.cabinet.settled') }}
                </span>
              </div>
            </div>
          </router-link>
        </div>

        <div v-if="activeTab === 'offers'" class="space-y-4">
          <div
            v-if="!myOffers.length"
            class="glass-card rounded-3xl border-dashed border-white/15 bg-white/[0.015] p-12 text-center"
          >
            <div class="mx-auto mb-4 h-16 w-16 rounded-full border border-white/10 bg-white/[0.04]"></div>
            <p class="text-sm text-white/85">{{ $t('gushi.cabinet.emptyOffersTitle') }}</p>
            <p class="mt-2 text-xs text-white/45">{{ $t('gushi.cabinet.emptyOffersDesc') }}</p>
          </div>

          <article
            v-for="offer in myOffers"
            :key="offer.id"
            class="glass-card flex items-center justify-between gap-4 p-6"
          >
            <div class="flex items-center gap-4">
              <img :src="offer.product?.officialImage" class="h-16 w-16 rounded-2xl object-cover" />
              <div>
                <h3 class="font-medium text-white">{{ offer.product?.ipName }} | {{ offer.product?.characterName }}</h3>
                <p class="text-sm text-white/60">
                  {{ $t('gushi.cabinet.offerPrice') }}: CNY {{ formatPrice(offer.price) }} |
                  {{ $t('gushi.cabinet.offerQuantity') }}: {{ offer.quantity }}
                </p>
                <p class="text-sm text-white/60">{{ $t('gushi.cabinet.offerFrozen') }}: CNY {{ formatPrice(offer.frozenAmount) }}</p>
                <p class="mt-1 text-xs text-white/40">{{ $t('gushi.cabinet.offerCreatedAt') }} {{ formatDate(offer.createdAt) }}</p>
              </div>
            </div>
            <div class="text-right">
              <div class="mb-2">
                <span class="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-200">{{ formatOrderStatus(offer.status) }}</span>
              </div>
              <button
                @click="cancelOffer(offer.id)"
                :disabled="cancelingOfferId === offer.id"
                class="rounded-full border border-rose-300/30 px-3 py-1 text-xs text-rose-200 transition hover:border-rose-200/50 hover:text-rose-100 disabled:opacity-50"
              >
                {{ cancelingOfferId === offer.id ? $t('gushi.cabinet.loadingOffers') : $t('gushi.cabinet.cancelOffer') }}
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGushiStore } from '../store/gushi';
import { GushiService } from '../services/api';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const store = useGushiStore();
const { show: showToast } = useToast();

const activeTab = ref('listings');
const currentUserId = ref(null);
const myOffers = ref([]);
const loadingOffers = ref(false);
const cancelingOfferId = ref('');

const tabs = computed(() => [
  { key: 'listings', label: t('gushi.cabinet.tabListings') },
  { key: 'bought', label: t('gushi.cabinet.tabBought') },
  { key: 'sold', label: t('gushi.cabinet.tabSold') },
  { key: 'offers', label: t('gushi.cabinet.tabOffers') }
]);

const loading = computed(() => store.loadingStates.myCabinet);
const isTabLoading = computed(() => (activeTab.value === 'offers' ? loadingOffers.value : loading.value));
const boughtOrders = computed(() => store.myOrders.filter((order) => order.buyerId === currentUserId.value));
const soldOrders = computed(() => store.myOrders.filter((order) => order.providerId === currentUserId.value));

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

const loadMyOffers = async () => {
  loadingOffers.value = true;
  try {
    const res = await GushiService.getMyOffers({ status: 'active' });
    myOffers.value = Array.isArray(res?.data) ? res.data : [];
  } catch (error) {
    myOffers.value = [];
  } finally {
    loadingOffers.value = false;
  }
};

onMounted(async () => {
  currentUserId.value = resolveUserIdFromToken();
  await Promise.all([store.loadMyCabinet(), loadMyOffers()]);
});

const unpublish = async (listingId) => {
  const ok = window.confirm(t('gushi.cabinet.confirmUnpublish'));
  if (!ok) return;

  try {
    await GushiService.offlineListing(listingId);
    showToast(t('gushi.cabinet.unpublishSuccess'), 'success');
    await store.loadMyCabinet();
  } catch (error) {
    showToast(t('gushi.cabinet.unpublishFailed'), 'error');
  }
};

const cancelOffer = async (offerId) => {
  const ok = window.confirm(t('gushi.cabinet.confirmCancelOffer'));
  if (!ok) return;

  cancelingOfferId.value = offerId;
  try {
    const res = await GushiService.cancelOffer(offerId);
    if (res?.success) {
      showToast(t('gushi.cabinet.cancelOfferSuccess'), 'success');
      await loadMyOffers();
    }
  } catch (error) {
    showToast(error?.message || t('gushi.cabinet.cancelOfferFailed'), 'error');
  } finally {
    cancelingOfferId.value = '';
  }
};

const formatDate = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleDateString();
};

const formatPrice = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return Number(value).toFixed(2);
};

const formatListingStatus = (status, auditStatus) => {
  if (auditStatus === 'pending') return t('gushi.cabinet.statusPendingAudit');
  if (auditStatus === 'rejected') return t('gushi.cabinet.statusRejected');
  return formatOrderStatus(status);
};

const statusClass = (status, auditStatus) => {
  if (auditStatus === 'pending') return 'bg-yellow-500/20 text-yellow-200';
  if (auditStatus === 'rejected') return 'bg-rose-500/20 text-rose-200';
  if (status === 'active') return 'bg-emerald-500/20 text-emerald-200';
  return 'bg-white/10 text-white/70';
};

const formatOrderStatus = (status) => {
  const key = `gushi.status.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
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
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(18px);
  box-shadow:
    0 8px 26px rgba(0, 0, 0, 0.26),
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
</style>
