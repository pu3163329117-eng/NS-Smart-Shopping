<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useOrderStore } from '../../store/order';
import { useToast } from '../../composables/useToast';

const { t } = useI18n();
const orderStore = useOrderStore();
const { show: showToast } = useToast();

const activeFilter = ref('all');
const actionOrderId = ref(null);
const shellRef = ref(null);
const sheenState = ref({ x: 50, y: 24 });
const showFulfillModal = ref(false);
const fulfilling = ref(false);
const fulfillOrderTarget = ref(null);
const fulfillForm = ref({
  trackingCompany: '',
  trackingNumber: ''
});
let sheenRaf = null;

const expressOptions = [
  '顺丰速运',
  '中通快递',
  '圆通速递',
  '韵达快递',
  '京东物流',
  'DHL',
  'UPS'
];

const filters = computed(() => {
  return [
    { id: 'all', name: t('makerOrders.filters.all') },
    { id: 'pending', name: t('makerOrders.filters.pending') },
    { id: 'paid', name: t('makerOrders.filters.paid') },
    { id: 'shipped', name: t('makerOrders.filters.shipped') },
    { id: 'completed', name: t('makerOrders.filters.completed') }
  ];
});

const queryStatus = computed(() => (activeFilter.value === 'all' ? undefined : activeFilter.value));

const loadOrders = async () => {
  await orderStore.fetchMakerOrders(queryStatus.value);
};

onMounted(() => {
  void loadOrders();
  applySheen(sheenState.value.x, sheenState.value.y);
});

watch(queryStatus, () => {
  void loadOrders();
});

const filteredOrders = computed(() => {
  if (activeFilter.value === 'all') {
    return orderStore.orders;
  }

  return orderStore.orders.filter((order) => order.status === activeFilter.value);
});

const getOrderTitle = (order) => {
  const firstItem = Array.isArray(order.items) ? order.items[0] : null;

  return (
    firstItem?.title ||
    firstItem?.name ||
    firstItem?.serviceTitle ||
    (order.serviceId
      ? t('makerOrders.fallback.service', { id: order.serviceId })
      : t('makerOrders.fallback.unnamedService'))
  );
};

const getBuyerName = (order) => order.buyer?.username || t('makerOrders.fallback.buyer');

const getStatusText = (status) => {
  switch (status) {
    case 'pending':
      return t('makerOrders.status.pending');
    case 'paid':
      return t('makerOrders.status.paid');
    case 'shipped':
      return t('makerOrders.status.shipped');
    case 'completed':
      return t('makerOrders.status.completed');
    default:
      return status || t('makerOrders.status.unknown');
  }
};

const getTrackingCompany = (order) =>
  order?.trackingCompany ||
  order?.expressCompany ||
  order?.logisticsCompany ||
  order?.shippingCompany ||
  '';

const getTrackingNumber = (order) =>
  order?.trackingNumber ||
  order?.expressNo ||
  order?.waybillNo ||
  order?.logisticsNo ||
  '';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/15 dark:bg-amber-400/10 dark:text-amber-100';
    case 'paid':
      return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white';
    case 'shipped':
      return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-300/15 dark:bg-violet-300/10 dark:text-violet-100';
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/15 dark:bg-emerald-300/10 dark:text-emerald-100';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/8 dark:bg-white/[0.03] dark:text-slate-300';
  }
};

const getPrimaryAction = (order) => {
  if (order.status === 'paid') {
    return {
      label: t('makerOrders.actions.fulfill'),
      type: 'fulfill'
    };
  }

  if (order.status === 'shipped') {
    return {
      label: t('makerOrders.actions.markCompleted'),
      nextStatus: 'completed',
      type: 'complete',
      successMessage: t('makerOrders.toast.markCompletedSuccess')
    };
  }

  if (order.status === 'pending') {
    return {
      label: t('makerOrders.actions.completeDirectly'),
      nextStatus: 'completed',
      type: 'complete',
      successMessage: t('makerOrders.toast.completeDirectlySuccess')
    };
  }

  return null;
};

const isActingOn = (orderId) => actionOrderId.value === orderId;

const formatAmount = (value) => `${t('makerOrders.currencySymbol')}${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) {
    return t('makerOrders.time.justNow');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t('makerOrders.time.unknown');
  }

  return date.toLocaleString();
};

const handlePrimaryAction = async (order) => {
  const action = getPrimaryAction(order);
  if (!action) {
    return;
  }

  if (action.type === 'fulfill') {
    fulfillOrderTarget.value = order;
    fulfillForm.value = {
      trackingCompany: getTrackingCompany(order) || '',
      trackingNumber: getTrackingNumber(order) || ''
    };
    showFulfillModal.value = true;
    return;
  }

  const confirmed = window.confirm(
    t('makerOrders.confirm.statusUpdate', {
      id: order.id,
      status: getStatusText(action.nextStatus)
    })
  );
  if (!confirmed) {
    return;
  }

  actionOrderId.value = order.id;

  try {
    if (action.nextStatus === 'completed') {
      await orderStore.completeMakerOrder(order.id);
    } else {
      await orderStore.updateMakerOrderStatus(order.id, action.nextStatus);
    }

    showToast(action.successMessage, 'success');
  } catch (error) {
    showToast(error?.message || t('makerOrders.toast.updateFailed'), 'error');
  } finally {
    actionOrderId.value = null;
  }
};

const handleContactBuyer = (order) => {
  showToast(
    t('makerOrders.toast.contactBuyer', {
      buyer: getBuyerName(order)
    }),
    'info'
  );
};

const closeFulfillModal = (force = false) => {
  if (fulfilling.value && !force) {
    return;
  }
  showFulfillModal.value = false;
  fulfillOrderTarget.value = null;
  fulfillForm.value = {
    trackingCompany: '',
    trackingNumber: ''
  };
};

const submitFulfillOrder = async () => {
  if (!fulfillOrderTarget.value) {
    return;
  }
  if (!fulfillForm.value.trackingCompany.trim() || !fulfillForm.value.trackingNumber.trim()) {
    showToast(t('makerOrders.toast.fillTracking'), 'warning');
    return;
  }

  fulfilling.value = true;
  actionOrderId.value = fulfillOrderTarget.value.id;
  try {
    await orderStore.fulfillMakerOrder(fulfillOrderTarget.value.id, {
      trackingCompany: fulfillForm.value.trackingCompany.trim(),
      trackingNumber: fulfillForm.value.trackingNumber.trim()
    });
    showToast(t('makerOrders.toast.fulfillSuccess'), 'success');
    closeFulfillModal(true);
  } catch (error) {
    showToast(error?.message || t('makerOrders.toast.fulfillFailed'), 'error');
  } finally {
    fulfilling.value = false;
    actionOrderId.value = null;
  }
};

const applySheen = (xPercent, yPercent) => {
  if (!shellRef.value) return;
  shellRef.value.style.setProperty('--glass-x', `${xPercent}%`);
  shellRef.value.style.setProperty('--glass-y', `${yPercent}%`);
};

const scheduleSheenUpdate = (nextX, nextY) => {
  sheenState.value = { x: nextX, y: nextY };
  if (sheenRaf) return;
  sheenRaf = requestAnimationFrame(() => {
    applySheen(sheenState.value.x, sheenState.value.y);
    sheenRaf = null;
  });
};

const handleShellPointerMove = (event) => {
  if (!shellRef.value) return;
  const rect = shellRef.value.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  scheduleSheenUpdate(Math.max(6, Math.min(94, x)), Math.max(8, Math.min(90, y)));
};

const resetSheen = () => {
  scheduleSheenUpdate(50, 24);
};

onUnmounted(() => {
  if (sheenRaf) {
    cancelAnimationFrame(sheenRaf);
    sheenRaf = null;
  }
});
</script>

<template>
  <div
    ref="shellRef"
    class="maker-orders-shell space-y-6 text-slate-900 transition-colors duration-500 dark:text-white"
    @pointermove="handleShellPointerMove"
    @pointerleave="resetSheen"
  >
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-700 dark:text-slate-400">{{ t('makerOrders.header.kicker') }}</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">{{ t('makerOrders.header.title') }}</h1>
        <p class="mt-2 text-sm leading-7 text-slate-800 dark:text-slate-300">
          {{ t('makerOrders.header.subtitle') }}
        </p>
      </div>

      <div class="liquid-surface flex flex-wrap gap-2 rounded-2xl p-2 transition-colors">
        <button
          v-for="filter in filters"
          :key="filter.id"
          type="button"
          class="rounded-xl px-4 py-2 text-sm font-semibold transition"
          :class="
            activeFilter === filter.id
              ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-black'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white'
          "
          @click="activeFilter = filter.id"
        >
          {{ filter.name }}
        </button>
      </div>
    </div>

    <div
      v-if="orderStore.isLoading"
      class="liquid-panel rounded-[2rem] p-12 text-center transition-colors"
    >
      <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700 dark:border-white/10 dark:border-t-white/70"></div>
      <p class="mt-4 text-sm text-slate-700 dark:text-slate-300">{{ t('makerOrders.state.loading') }}</p>
    </div>

    <div
      v-else-if="orderStore.error"
      class="liquid-panel rounded-[2rem] p-10 text-center transition-colors"
    >
      <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-600 dark:text-slate-400">{{ t('makerOrders.state.signalLost') }}</p>
      <h2 class="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ t('makerOrders.state.loadFailedTitle') }}</h2>
      <p class="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">{{ orderStore.error }}</p>
      <button
        type="button"
        class="liquid-cta mt-6 rounded-full px-5 py-3 text-sm font-semibold text-white transition dark:text-black"
        @click="loadOrders"
      >
        {{ t('makerOrders.actions.reload') }}
      </button>
    </div>

    <div
      v-else-if="filteredOrders.length === 0"
      class="liquid-panel rounded-[2rem] border-dashed p-12 text-center transition-colors"
    >
      <div class="text-5xl text-slate-300 dark:text-white/30">+</div>
      <h2 class="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ t('makerOrders.state.emptyTitle') }}</h2>
      <p class="mt-3 text-sm text-slate-700 dark:text-slate-300">{{ t('makerOrders.state.emptyDescription') }}</p>
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="order in filteredOrders"
        :key="order.id"
        class="liquid-panel overflow-hidden rounded-[2.2rem] p-6 transition-all hover:-translate-y-0.5"
      >
        <div class="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div class="space-y-4">
            <div class="flex flex-wrap items-center gap-3">
              <span
                class="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]"
                :class="getStatusColor(order.status)"
              >
                {{ getStatusText(order.status) }}
              </span>
              <span class="text-xs font-medium uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">{{ order.id }}</span>
              <span class="text-xs text-slate-600 dark:text-slate-400">{{ formatDate(order.createdAt) }}</span>
            </div>

            <div>
              <h2 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ getOrderTitle(order) }}</h2>
              <p class="mt-2 text-sm text-slate-700 dark:text-slate-300">{{ t('makerOrders.labels.buyer', { name: getBuyerName(order) }) }}</p>
            </div>

            <div class="grid gap-3 md:grid-cols-3">
              <div class="liquid-tile rounded-2xl p-4 transition-colors">
                <p class="text-xs uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">{{ t('makerOrders.stats.orderAmount') }}</p>
                <p class="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{{ formatAmount(order.amount) }}</p>
              </div>
              <div class="liquid-tile rounded-2xl p-4 transition-colors">
                <p class="text-xs uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">{{ t('makerOrders.stats.serviceId') }}</p>
                <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{{ order.serviceId || t('makerOrders.fallback.serviceUnlinked') }}</p>
              </div>
              <div class="liquid-tile rounded-2xl p-4 transition-colors">
                <p class="text-xs uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">{{ t('makerOrders.stats.itemCount') }}</p>
                <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{{ Array.isArray(order.items) ? order.items.length : 0 }}</p>
              </div>
            </div>

            <div v-if="getTrackingCompany(order) || getTrackingNumber(order)" class="liquid-tile rounded-2xl p-4 transition-colors">
              <p class="text-xs uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">{{ t('makerOrders.stats.trackingInfo') }}</p>
              <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span class="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">{{ getTrackingCompany(order) || t('makerOrders.tracking.companyPending') }}</span>
                <span class="font-semibold tracking-wide text-slate-900 dark:text-white">{{ getTrackingNumber(order) || t('makerOrders.tracking.numberPending') }}</span>
              </div>
            </div>
          </div>

          <div class="liquid-tile flex min-w-[240px] flex-col justify-between gap-4 rounded-[1.8rem] p-5 transition-colors">
            <div>
              <p class="text-xs uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">{{ t('makerOrders.stats.estimatedIncome') }}</p>
              <p class="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">+{{ formatAmount(order.amount) }}</p>
            </div>

            <div class="space-y-3">
              <button
                v-if="getPrimaryAction(order)"
                type="button"
                class="liquid-cta w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 dark:text-black"
                :disabled="isActingOn(order.id)"
                @click="handlePrimaryAction(order)"
              >
                {{ isActingOn(order.id) ? t('makerOrders.processing') : getPrimaryAction(order).label }}
              </button>

              <button
                type="button"
                class="liquid-pill w-full rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition dark:text-white"
                @click="handleContactBuyer(order)"
              >
                {{ t('makerOrders.actions.contactBuyer') }}
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div v-if="showFulfillModal" class="fixed inset-0 z-[1200] flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="closeFulfillModal"></div>
      <div class="liquid-panel relative w-full max-w-lg rounded-[2rem] p-6 transition-colors">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">{{ t('makerOrders.fulfill.kicker') }}</p>
            <h3 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ t('makerOrders.fulfill.title') }}</h3>
            <p class="mt-2 text-sm text-slate-700 dark:text-slate-300">
              {{ t('makerOrders.fulfill.subtitle', { id: fulfillOrderTarget ? fulfillOrderTarget.id : '--' }) }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-full border border-white/10 p-2 text-slate-500 transition hover:bg-white/[0.06] dark:text-slate-300"
            :disabled="fulfilling"
            @click="closeFulfillModal"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18 18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="mt-6 space-y-4">
          <label class="block">
            <span class="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">{{ t('makerOrders.fulfill.companyLabel') }}</span>
            <select
              v-model="fulfillForm.trackingCompany"
              class="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:focus:border-white/20"
            >
              <option value="">{{ t('makerOrders.fulfill.companyPlaceholder') }}</option>
              <option v-for="name in expressOptions" :key="name" :value="name">{{ name }}</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">{{ t('makerOrders.fulfill.numberLabel') }}</span>
            <input
              v-model.trim="fulfillForm.trackingNumber"
              type="text"
              class="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/35 dark:focus:border-white/20"
              :placeholder="t('makerOrders.fulfill.numberPlaceholder')"
            >
          </label>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="liquid-pill rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition dark:text-white"
            :disabled="fulfilling"
            @click="closeFulfillModal"
          >
            {{ t('makerOrders.actions.cancel') }}
          </button>
          <button
            type="button"
            class="liquid-cta rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 dark:text-black"
            :disabled="fulfilling"
            @click="submitFulfillOrder"
          >
            {{ fulfilling ? t('makerOrders.fulfill.submitting') : t('makerOrders.actions.confirmFulfill') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.maker-orders-shell {
  position: relative;
  --glass-x: 50%;
  --glass-y: 24%;
}

.liquid-panel,
.liquid-tile,
.liquid-pill,
.liquid-surface {
  position: relative;
  overflow: hidden;
}

.liquid-panel {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(122deg, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.055) 35%, rgba(255, 255, 255, 0.02) 100%);
  box-shadow:
    0 24px 55px rgba(0, 0, 0, 0.36),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
}

.liquid-surface {
  border: 1px solid rgba(255, 255, 255, 0.11);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px) saturate(125%);
  -webkit-backdrop-filter: blur(20px) saturate(125%);
}

.liquid-tile {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  box-shadow:
    0 16px 34px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(18px) saturate(122%);
  -webkit-backdrop-filter: blur(18px) saturate(122%);
}

.liquid-pill {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(14px) saturate(120%);
  -webkit-backdrop-filter: blur(14px) saturate(120%);
}

.liquid-cta {
  background: rgba(15, 17, 24, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.28);
}

:global(.dark) .liquid-cta {
  background: #fff;
}

.liquid-panel::before,
.liquid-tile::before,
.liquid-pill::before,
.liquid-surface::before {
  content: '';
  position: absolute;
  inset: -34%;
  pointer-events: none;
  background: radial-gradient(circle at var(--glass-x) var(--glass-y), rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.09) 22%, transparent 58%);
  opacity: 0.24;
  transition: opacity 0.35s ease;
}

.liquid-panel:hover::before,
.liquid-tile:hover::before,
.liquid-pill:hover::before,
.liquid-surface:hover::before {
  opacity: 0.34;
}

.liquid-panel::after,
.liquid-tile::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.19), rgba(255, 255, 255, 0) 32%);
  opacity: 0.13;
}

:global(html:not(.dark)) .maker-orders-shell .liquid-panel {
  border-color: rgba(15, 23, 42, 0.12);
  background: linear-gradient(122deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.68) 35%, rgba(255, 255, 255, 0.42) 100%);
  box-shadow:
    0 16px 40px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.94);
}

:global(html:not(.dark)) .maker-orders-shell .liquid-surface,
:global(html:not(.dark)) .maker-orders-shell .liquid-tile,
:global(html:not(.dark)) .maker-orders-shell .liquid-pill {
  border-color: rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.7);
}

:global(html:not(.dark)) .maker-orders-shell .liquid-cta {
  background: #0f172a;
  border-color: rgba(15, 23, 42, 0.08);
}

:global(html:not(.dark)) .maker-orders-shell .liquid-cta.dark\:text-black {
  color: #fff !important;
}

@media (max-width: 768px) {
  .liquid-panel,
  .liquid-surface {
    backdrop-filter: blur(18px) saturate(122%);
    -webkit-backdrop-filter: blur(18px) saturate(122%);
  }

  .liquid-tile,
  .liquid-pill {
    backdrop-filter: blur(14px) saturate(116%);
    -webkit-backdrop-filter: blur(14px) saturate(116%);
  }
}
</style>
