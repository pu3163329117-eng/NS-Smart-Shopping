<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useOrderStore } from '../store/order';
import { useToast } from '../composables/useToast';
import { buildOrderGroups } from '../utils/orderGrouping';

const router = useRouter();
const { t } = useI18n();
const orderStore = useOrderStore();
const { show: showToast } = useToast();

onMounted(() => {
  orderStore.fetchMyOrders();
});

const orders = computed(() => orderStore.orders || []);
const groupedOrders = computed(() => buildOrderGroups(orders.value));
const isLoading = computed(() => orderStore.isLoading);
const batchFilter = ref('all');
const quickFocus = ref('all');

const batchFilterOptions = [
  { id: 'all', label: t('myOrders.filters.batchAll') },
  { id: 'pending', label: t('myOrders.filters.pending') },
  { id: 'in_progress', label: t('myOrders.filters.inProgress') },
  { id: 'completed', label: t('myOrders.filters.completed') },
  { id: 'refunded', label: t('myOrders.status.refunded') },
  { id: 'cancelled', label: t('myOrders.status.cancelled') }
];

const quickFocusOptions = [
  { id: 'all', label: t('myOrders.filters.quickAll') },
  { id: 'unshipped', label: t('myOrders.filters.unshipped') },
  { id: 'need_confirm', label: t('myOrders.filters.needConfirm') }
];

const matchQuickFocus = (group) => {
  if (quickFocus.value === 'all') return true;
  if (quickFocus.value === 'unshipped') {
    return (
      group.shippedOrCompletedCount < group.orderCount &&
      !['refunded', 'cancelled'].includes(group.progressStatus)
    );
  }
  if (quickFocus.value === 'need_confirm') {
    return group.shippedOrCompletedCount > 0 && group.completedCount < group.orderCount;
  }
  return true;
};

const filteredGroupedOrders = computed(() => {
  let groups = groupedOrders.value;
  if (batchFilter.value !== 'all') {
    groups = groups.filter((group) => group.progressStatus === batchFilter.value);
  }
  return groups.filter(matchQuickFocus);
});

const batchStats = computed(() => {
  const groups = groupedOrders.value;
  return {
    total: groups.length,
    pending: groups.filter((group) => group.progressStatus === 'pending').length,
    inProgress: groups.filter((group) => group.progressStatus === 'in_progress').length,
    completed: groups.filter((group) => group.progressStatus === 'completed').length,
    refunded: groups.filter((group) => group.progressStatus === 'refunded').length,
    cancelled: groups.filter((group) => group.progressStatus === 'cancelled').length
  };
});

const quickStats = computed(() => {
  const groups = groupedOrders.value;
  return {
    unshipped: groups.filter(
      (group) =>
        group.shippedOrCompletedCount < group.orderCount &&
        !['refunded', 'cancelled'].includes(group.progressStatus)
    ).length,
    needConfirm: groups.filter(
      (group) => group.shippedOrCompletedCount > 0 && group.completedCount < group.orderCount
    ).length
  };
});

const groupProgressLabel = (group) =>
  ({
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    refunded: 'Refunded',
    cancelled: 'Cancelled'
  }[group?.progressStatus] || 'Pending');

const groupCardClass = (group) => {
  if (group.progressStatus === 'pending') {
    return 'border-amber-400/30 bg-amber-400/10';
  }
  if (group.progressStatus === 'in_progress') {
    return 'border-indigo-400/25 bg-indigo-400/10';
  }
  if (group.progressStatus === 'completed') {
    return 'border-emerald-400/25 bg-emerald-400/10';
  }
  if (group.progressStatus === 'cancelled') {
    return 'border-rose-400/25 bg-rose-400/10';
  }
  if (group.progressStatus === 'refunded') {
    return 'border-slate-400/25 bg-slate-400/10';
  }
  return 'border-slate-400/25 bg-slate-400/10';
};

const statusKeyMap = {
  pending: 'myOrders.status.pending',
  pending_payment: 'myOrders.status.pendingPayment',
  pending_shipment: 'myOrders.status.pendingShipment',
  shipped: 'myOrders.status.shipped',
  paid: 'myOrders.status.paid',
  processing: 'myOrders.status.processing',
  completed: 'myOrders.status.completed',
  refunded: 'myOrders.status.refunded',
  cancelled: 'myOrders.status.cancelled'
};

const getStatusText = (status) => t(statusKeyMap[status] || 'myOrders.status.unknown');

const getStatusClass = (status) =>
  ({
    pending: 'text-white/45',
    pending_payment: 'text-white/45',
    pending_shipment: 'text-white/62',
    shipped: 'text-white/62',
    paid: 'text-white/62',
    processing: 'text-white/62',
    completed: 'text-white/80',
    refunded: 'text-white/45',
    cancelled: 'text-white/45'
  }[status] || 'text-white/45');

const formatCurrency = (value) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN');
};

const confirmingOrderId = ref('');
const cancellingOrderId = ref('');
const refundingOrderId = ref('');

const serviceTitle = (order) => order.service?.title || order.items?.[0]?.name || order.items?.[0]?.title || t('myOrders.fallback.service');
const serviceNotes = (order) => order.notes || t('myOrders.fallback.notes');
const serviceId = (order) => order.service_id || order.serviceId || '--';
const trackingCompany = (order) =>
  order?.trackingCompany ||
  order?.expressCompany ||
  order?.logisticsCompany ||
  order?.shippingCompany ||
  '';
const trackingNumber = (order) =>
  order?.trackingNumber ||
  order?.expressNo ||
  order?.waybillNo ||
  order?.logisticsNo ||
  '';
const canShowTracking = (order) =>
  String(order?.status || '').toLowerCase() === 'shipped' && Boolean(trackingNumber(order));

const openMarket = () => {
  router.push('/market');
};

const contactSupport = () => {
  router.push('/help');
};

const copyTrackingNumber = async (order) => {
  const number = trackingNumber(order);
  if (!number) {
    showToast(t('myOrders.tracking.copyEmpty'), 'warning');
    return;
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(number);
    } else {
      const input = document.createElement('textarea');
      input.value = number;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.focus();
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    showToast(t('myOrders.tracking.copySuccess'), 'success');
  } catch (error) {
    showToast(t('myOrders.tracking.copyFailed'), 'error');
  }
};

const handleConfirmReceipt = async (order) => {
  confirmingOrderId.value = order.id;
  try {
    await orderStore.confirmReceipt(order.id);
    showToast(t('myOrders.toast.confirmSuccess'), 'success');
  } catch (error) {
    showToast(error?.message || t('myOrders.toast.confirmFailed'), 'error');
  } finally {
    confirmingOrderId.value = '';
  }
};

const handleCancelOrder = async (order) => {
  if (!window.confirm(t('orderModal.confirm.cancel'))) return;

  cancellingOrderId.value = order.id;
  try {
    await orderStore.cancelOrder(order.id);
    showToast(t('orderModal.feedback.cancelled'), 'success');
  } catch (error) {
    showToast(error?.message || t('orderModal.feedback.actionFailed', { message: '' }), 'error');
  } finally {
    cancellingOrderId.value = '';
  }
};

const handleRefundOrder = async (order) => {
  if (!window.confirm(`${t('profile.refund')}?`)) return;

  refundingOrderId.value = order.id;
  try {
    await orderStore.refundOrder(order.id, { restock: true });
    showToast(t('orderModal.status.refunded'), 'success');
  } catch (error) {
    showToast(error?.message || t('orderModal.feedback.actionFailed', { message: '' }), 'error');
  } finally {
    refundingOrderId.value = '';
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0c] px-4 pb-20 pt-24 text-white sm:px-6 lg:px-8">
    <div class="mx-auto max-w-5xl">
      <div class="mb-8">
        <p class="text-[11px] uppercase tracking-[0.24em] text-white/35">{{ $t('myOrders.modalLabel') }}</p>
        <h1 class="mt-3 text-4xl font-medium tracking-tighter">{{ $t('myOrders.title') }}</h1>
      </div>

      <div v-if="isLoading" class="flex justify-center py-24">
        <div class="h-12 w-12 animate-spin rounded-full border border-white/15 border-t-white/70"></div>
        </div>

        <section
        v-else-if="groupedOrders.length === 0"
        class="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-10 text-center backdrop-blur-2xl"
      >
        <h2 class="text-2xl font-medium tracking-tight">{{ $t('myOrders.empty.title') }}</h2>
        <p class="mx-auto mt-3 max-w-md text-sm leading-7 text-white/45">{{ $t('myOrders.empty.body') }}</p>
        <button
          class="mt-6 rounded-full bg-white px-5 py-2 text-xs font-medium uppercase tracking-[0.2em] text-black transition hover:bg-white/90"
          @click="openMarket"
        >
          {{ $t('myOrders.empty.action') }}
        </button>
      </section>

      <div v-else class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p class="text-[11px] uppercase tracking-[0.2em] text-white/40">Total Batches</p>
            <p class="mt-2 text-2xl font-medium tracking-tight">{{ batchStats.total }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p class="text-[11px] uppercase tracking-[0.2em] text-white/40">Pending</p>
            <p class="mt-2 text-2xl font-medium tracking-tight">{{ batchStats.pending }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p class="text-[11px] uppercase tracking-[0.2em] text-white/40">In Progress</p>
            <p class="mt-2 text-2xl font-medium tracking-tight">{{ batchStats.inProgress }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p class="text-[11px] uppercase tracking-[0.2em] text-white/40">Completed</p>
            <p class="mt-2 text-2xl font-medium tracking-tight">{{ batchStats.completed }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p class="text-[11px] uppercase tracking-[0.2em] text-white/40">{{ t('gushi.status.refunded') }}</p>
            <p class="mt-2 text-2xl font-medium tracking-tight">{{ batchStats.refunded }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p class="text-[11px] uppercase tracking-[0.2em] text-white/40">{{ t('gushi.status.cancelled') }}</p>
            <p class="mt-2 text-2xl font-medium tracking-tight">{{ batchStats.cancelled }}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in batchFilterOptions"
            :key="option.id"
            type="button"
            class="rounded-full border px-4 py-2 text-xs font-medium transition"
            :class="
              batchFilter === option.id
                ? 'border-white/35 bg-white/[0.10] text-white'
                : 'border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]'
            "
            @click="batchFilter = option.id"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in quickFocusOptions"
            :key="`quick-${option.id}`"
            type="button"
            class="rounded-full border px-4 py-2 text-xs font-medium transition"
            :class="
              quickFocus === option.id
                ? 'border-cyan-300/45 bg-cyan-300/18 text-cyan-100'
                : 'border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]'
            "
            @click="quickFocus = option.id"
          >
            {{ option.label }}
          </button>
          <div class="flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-white/65">
            <span>Not Fully Shipped: {{ quickStats.unshipped }}</span>
            <span class="mx-2 text-white/25">|</span>
            <span>Need Confirm: {{ quickStats.needConfirm }}</span>
          </div>
        </div>
        <section
          v-if="filteredGroupedOrders.length === 0"
          class="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-10 text-center backdrop-blur-2xl"
        >
          <h2 class="text-2xl font-medium tracking-tight">No Batches Match This Filter</h2>
          <p class="mx-auto mt-3 max-w-md text-sm leading-7 text-white/45">
            Try another filter, or place a new order and check back here.
          </p>
        </section>

        <template v-for="group in filteredGroupedOrders" :key="group.key">
          <div
            v-if="group.isSplit && group.orderCount > 1"
            class="rounded-2xl border p-4"
            :class="groupCardClass(group)"
          >
            <p class="text-[11px] uppercase tracking-[0.2em] text-indigo-100/80">
              Combined Checkout Batch (Batch: {{ group.checkoutId }})
            </p>
            <p class="mt-2 text-sm text-indigo-100/90">
              Includes {{ group.orderCount }} order items, total {{ formatCurrency(group.totalAmount) }}
            </p>
            <p class="mt-1 text-xs text-indigo-100/80">
              Shipping progress: {{ group.shippedOrCompletedCount }}/{{ group.orderCount }} shipped,
              {{ group.completedCount }}/{{ group.orderCount }} completed
            </p>
            <p class="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/70">
              Batch Status: {{ groupProgressLabel(group) }}
            </p>
          </div>

          <article
            v-for="order in group.orders"
            :key="order.id"
            class="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl"
          >
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
              <p class="text-xs uppercase tracking-[0.2em] text-white/35">
                {{ $t('myOrders.meta.orderId', { id: order.id }) }}
              </p>
              <p class="text-xs uppercase tracking-[0.2em]" :class="getStatusClass(order.status)">
                {{ getStatusText(order.status) }}
              </p>
            </div>

            <div class="flex flex-col gap-5 py-4 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0 flex-1">
                <h3 class="text-xl font-medium tracking-tight">{{ serviceTitle(order) }}</h3>
                <p class="mt-3 text-sm leading-7 text-white/45">
                  {{ $t('myOrders.meta.notes') }}: {{ serviceNotes(order) }}
                </p>

                <div class="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-xs text-white/45">
                  <p class="uppercase tracking-[0.18em]">{{ $t('myOrders.meta.serviceId', { id: serviceId(order) }) }}</p>
                  <p class="mt-2 uppercase tracking-[0.18em]">{{ $t('myOrders.meta.createdAt', { date: formatDateTime(order.createdAt) }) }}</p>
                </div>

                <div
                  v-if="canShowTracking(order)"
                  class="mt-4 rounded-2xl border border-indigo-400/25 bg-indigo-400/10 p-4"
                >
                  <p class="text-[11px] uppercase tracking-[0.22em] text-indigo-100/80">{{ $t('myOrders.tracking.title') }}</p>
                  <div class="mt-3 flex flex-wrap items-center gap-3">
                    <span class="rounded-full border border-indigo-200/30 bg-black/20 px-3 py-1 text-xs text-indigo-100/90">
                      {{ trackingCompany(order) || $t('myOrders.tracking.companyPending') }}
                    </span>
                    <span class="font-mono text-sm font-semibold tracking-wide text-white">{{ trackingNumber(order) }}</span>
                    <button
                      type="button"
                      class="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/80 transition hover:bg-white/[0.08]"
                      @click="copyTrackingNumber(order)"
                    >
                      {{ $t('myOrders.tracking.copyNumber') }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="min-w-[180px] border-t border-white/8 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                <p class="text-[11px] uppercase tracking-[0.2em] text-white/35">{{ $t('myOrders.meta.amount') }}</p>
                <p class="mt-2 text-3xl font-medium tracking-tighter">{{ formatCurrency(order.amount) }}</p>
                <div class="mt-5 flex flex-col gap-2">
                  <button
                    class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/62 transition hover:bg-white/[0.04]"
                    @click="contactSupport"
                  >
                    {{ $t('myOrders.actions.support') }}
                  </button>
                  <button
                    v-if="order.status === 'paid'"
                    class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/62 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="cancellingOrderId === order.id"
                    @click="handleCancelOrder(order)"
                  >
                    {{ cancellingOrderId === order.id ? '...' : $t('orderModal.actions.cancel') }}
                  </button>
                  <button
                    v-if="order.status === 'shipped'"
                    class="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="confirmingOrderId === order.id"
                    @click="handleConfirmReceipt(order)"
                  >
                    {{ confirmingOrderId === order.id ? '...' : $t('myOrders.actions.confirmReceipt') }}
                  </button>
                  <button
                    v-if="order.status === 'shipped' || order.status === 'completed'"
                    class="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/62 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="refundingOrderId === order.id"
                    @click="handleRefundOrder(order)"
                  >
                    {{ refundingOrderId === order.id ? '...' : $t('profile.refund') }}
                  </button>
                  <button
                    v-if="order.status === 'completed'"
                    class="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90"
                    @click="router.push(`/product/${order.serviceId}`)"
                  >
                    {{ $t('myOrders.actions.review') }}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </template>
      </div>
    </div>
  </div>
</template>



