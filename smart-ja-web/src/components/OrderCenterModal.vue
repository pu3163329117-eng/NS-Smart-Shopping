<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '../composables/useToast';
import { useOrderStore } from '../store/order';
import { buildOrderGroups } from '../utils/orderGrouping';
import PaymentModal from './PaymentModal.vue';

const props = defineProps({
  show: Boolean,
  initialTab: {
    type: String,
    default: 'all'
  }
});

const emit = defineEmits(['close']);
const { t } = useI18n();
const { show: showToast } = useToast();
const orderStore = useOrderStore();

const activeTab = ref('all');
const showPayment = ref(false);
const currentPayingOrder = ref(null);
const batchScope = ref('all');
const quickFocus = ref('all');
const cancellingOrderId = ref('');
const confirmingOrderId = ref('');
const refundingOrderId = ref('');

watch(
  () => props.show,
  (open) => {
    if (open) {
      activeTab.value = props.initialTab || 'all';
      batchScope.value = 'all';
      quickFocus.value = 'all';
      orderStore.fetchMyOrders();
    }
  }
);

watch(
  () => props.initialTab,
  (tab) => {
    if (tab) activeTab.value = tab;
  }
);

const tabs = computed(() => [
  { id: 'all', name: t('orderModal.tabs.all') },
  { id: 'pending_payment', name: t('orderModal.tabs.pendingPayment') },
  { id: 'pending_shipment', name: t('orderModal.tabs.pendingShipment') },
  { id: 'shipped', name: t('orderModal.tabs.shipped') },
  { id: 'completed', name: t('orderModal.tabs.completed') },
  { id: 'refunded', name: t('orderModal.tabs.refunded') },
  { id: 'cancelled', name: t('gushi.status.cancelled') }
]);

const filteredOrders = computed(() => {
  const orders = orderStore.orders || [];
  if (activeTab.value === 'all') return orders;
  return orders.filter((item) => {
    const status = String(item?.status || '').trim();
    if (activeTab.value === 'pending_payment') {
      return status === 'pending_payment' || status === 'pending';
    }
    if (activeTab.value === 'pending_shipment') {
      return status === 'pending_shipment' || status === 'paid';
    }
    return status === activeTab.value;
  });
});

const groupedFilteredOrders = computed(() => buildOrderGroups(filteredOrders.value));

const batchScopeOptions = [
  { id: 'all', label: 'All Batches' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'refunded', label: t('gushi.status.refunded') },
  { id: 'cancelled', label: t('gushi.status.cancelled') }
];

const quickFocusOptions = [
  { id: 'all', label: 'All' },
  { id: 'unshipped', label: 'Not Fully Shipped' },
  { id: 'need_confirm', label: 'Need Confirm' }
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

const scopedGroupedOrders = computed(() => {
  let groups = groupedFilteredOrders.value;
  if (batchScope.value !== 'all') {
    groups = groups.filter((group) => group.progressStatus === batchScope.value);
  }
  return groups.filter(matchQuickFocus);
});

const groupedStats = computed(() => {
  const groups = groupedFilteredOrders.value;
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
  const groups = groupedFilteredOrders.value;
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
    return 'border-amber-300/30 bg-amber-300/10';
  }
  if (group.progressStatus === 'in_progress') {
    return 'border-indigo-300/20 bg-indigo-300/10';
  }
  if (group.progressStatus === 'completed') {
    return 'border-emerald-300/25 bg-emerald-300/10';
  }
  if (group.progressStatus === 'cancelled') {
    return 'border-rose-300/25 bg-rose-300/10';
  }
  if (group.progressStatus === 'refunded') {
    return 'border-slate-300/25 bg-slate-300/10';
  }
  return 'border-slate-300/25 bg-slate-300/10';
};

const getStatusText = (status) =>
  ({
    pending_payment: t('orderModal.status.pendingPayment'),
    pending: t('orderModal.status.pendingPayment'),
    pending_shipment: t('orderModal.status.pendingShipment'),
    paid: t('orderModal.status.pendingShipment'),
    shipped: t('orderModal.status.shipped'),
    completed: t('orderModal.status.completed'),
    refunded: t('orderModal.status.refunded'),
    cancelled: t('gushi.status.cancelled')
  }[status] || status);

const formatCurrency = (value) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const shopName = (order) => order.shopName || t('orderModal.defaultShop');

const itemImage = (item) => item.img || item.image || '';
const itemName = (item) => item.name || item.title || t('orderModal.defaultItem');
const itemSpecs = (item) => item.specs || item.spec || t('orderModal.defaultSpec');
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

const openPayment = (order) => {
  currentPayingOrder.value = order;
  showPayment.value = true;
};

const handlePaymentComplete = async (orderId) => {
  showPayment.value = false;
  try {
    await orderStore.updateOrderStatus(orderId, 'paid');
    showToast(t('orderModal.feedback.paymentSuccess'), 'success');
    activeTab.value = 'pending_shipment';
  } catch (error) {
    showToast(t('orderModal.feedback.paymentFailed', { message: error.message }), 'error');
  }
};

const handleCancel = async (order) => {
  if (!window.confirm(t('orderModal.confirm.cancel'))) return;

  cancellingOrderId.value = order.id;
  try {
    await orderStore.cancelOrder(order.id);
    showToast(t('orderModal.feedback.cancelled'), 'success');
  } catch (error) {
    showToast(t('orderModal.feedback.actionFailed', { message: error.message }), 'error');
  } finally {
    cancellingOrderId.value = '';
  }
};

const handleRemind = () => {
  showToast(t('orderModal.feedback.reminded'), 'success');
};

const handleConfirmRecv = async (order) => {
  if (!window.confirm(t('orderModal.confirm.receive'))) return;

  confirmingOrderId.value = order.id;
  try {
    await orderStore.confirmReceipt(order.id);
    showToast(t('orderModal.feedback.received'), 'success');
    activeTab.value = 'completed';
  } catch (error) {
    showToast(t('orderModal.feedback.actionFailed', { message: error.message }), 'error');
  } finally {
    confirmingOrderId.value = '';
  }
};

const handleLogistics = () => {
  showToast(t('orderModal.feedback.logistics'), 'info');
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

const handleReview = () => {
  showToast(t('orderModal.feedback.reviewed'), 'success');
};

const handleRefundOrder = async (order) => {
  if (!window.confirm(`${t('profile.refund')}?`)) return;

  refundingOrderId.value = order.id;
  try {
    await orderStore.refundOrder(order.id, { restock: true });
    showToast(t('orderModal.status.refunded'), 'success');
    activeTab.value = 'refunded';
  } catch (error) {
    showToast(t('orderModal.feedback.actionFailed', { message: error.message }), 'error');
  } finally {
    refundingOrderId.value = '';
  }
};

const handleRefundDetail = () => {
  showToast(t('orderModal.feedback.refundDetail'), 'info');
};

const close = () => {
  emit('close');
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
    <div class="absolute inset-0 bg-slate-50 dark:bg-slate-900/40 dark:bg-black/70 backdrop-blur-md" @click="close"></div>

    <div class="relative flex h-full w-full flex-col overflow-hidden border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-white dark:bg-[#0a0a0c]/95 sm:h-[88vh] sm:max-w-4xl sm:rounded-[2rem]">
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.02] px-5 py-4">
        <button class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 p-2 text-slate-500 dark:text-slate-400 dark:text-white/45 transition hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04] hover:text-slate-700 dark:text-slate-400 dark:text-white/75" @click="close">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19 8 12l7-7"></path>
          </svg>
        </button>
        <div class="text-center">
          <p class="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-400 dark:text-white/35">{{ t('orderModal.modalLabel') }}</p>
          <h2 class="mt-2 text-xl font-medium tracking-tight text-slate-900 dark:text-white">{{ t('orderModal.title') }}</h2>
        </div>
        <div class="w-10"></div>
      </div>

      <div class="flex overflow-x-auto border-b border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.02] px-2 pt-2 scrollbar-hide">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="relative flex-none rounded-t-2xl px-4 py-3 text-sm font-medium transition-colors"
          :class="activeTab === tab.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-white/38 hover:text-slate-600 dark:text-white/68'"
          @click="activeTab = tab.id"
        >
          {{ tab.name }}
          <span v-if="activeTab === tab.id" class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-white/80"></span>
        </button>
      </div>

      <div class="border-b border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.02] px-4 py-3 sm:px-5">
        <div class="grid gap-2 sm:grid-cols-5">
          <div class="rounded-xl border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 px-3 py-2 text-center">
            <p class="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 dark:text-white/45">Total</p>
            <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ groupedStats.total }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 px-3 py-2 text-center">
            <p class="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 dark:text-white/45">Pending</p>
            <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ groupedStats.pending }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 px-3 py-2 text-center">
            <p class="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 dark:text-white/45">In Progress</p>
            <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ groupedStats.inProgress }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 px-3 py-2 text-center">
            <p class="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 dark:text-white/45">Completed</p>
            <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ groupedStats.completed }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 px-3 py-2 text-center">
            <p class="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 dark:text-white/45">{{ t('gushi.status.refunded') }}</p>
            <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ groupedStats.refunded }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 px-3 py-2 text-center">
            <p class="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 dark:text-white/45">{{ t('gushi.status.cancelled') }}</p>
            <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ groupedStats.cancelled }}</p>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="option in batchScopeOptions"
            :key="option.id"
            type="button"
            class="rounded-full border px-3 py-1.5 text-xs font-medium transition"
            :class="
              batchScope === option.id
                ? 'border-slate-200 dark:border-slate-200 dark:border-white/35 bg-slate-200 dark:bg-slate-200 dark:bg-white/[0.10] text-slate-900 dark:text-white'
                : 'border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 dark:text-white/65 hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.06]'
            "
            @click="batchScope = option.id"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="option in quickFocusOptions"
            :key="`quick-${option.id}`"
            type="button"
            class="rounded-full border px-3 py-1.5 text-xs font-medium transition"
            :class="
              quickFocus === option.id
                ? 'border-cyan-300/45 bg-cyan-300/18 text-cyan-100'
                : 'border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 dark:text-white/65 hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.06]'
            "
            @click="quickFocus = option.id"
          >
            {{ option.label }}
          </button>
          <div class="flex items-center rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 dark:text-white/65">
            <span>Not Fully Shipped: {{ quickStats.unshipped }}</span>
            <span class="mx-2 text-slate-600 dark:text-white/25">|</span>
            <span>Need Confirm: {{ quickStats.needConfirm }}</span>
          </div>
        </div>
      </div>

      <div class="flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-hide sm:px-5">
        <div v-if="scopedGroupedOrders.length === 0" class="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[1.6rem] border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.03] p-8 text-center backdrop-blur-2xl">
          <p class="text-2xl font-medium tracking-tight text-slate-900 dark:text-white">{{ t('orderModal.empty.title') }}</p>
          <p class="mt-3 max-w-xs text-sm leading-7 text-slate-500 dark:text-slate-400 dark:text-white/45">{{ t('orderModal.empty.body') }}</p>
        </div>

        <template v-else>
          <template v-for="group in scopedGroupedOrders" :key="group.key">
            <div
              v-if="group.isSplit && group.orderCount > 1"
              class="rounded-2xl border px-4 py-3"
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
              <p class="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-600 dark:text-white/70">
                Batch Status: {{ groupProgressLabel(group) }}
              </p>
            </div>

            <article
              v-for="order in group.orders"
              :key="order.id"
              class="rounded-[1.6rem] border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.03] p-5 backdrop-blur-2xl"
            >
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-200 dark:border-white/8 pb-4">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-slate-900 dark:text-white">{{ shopName(order) }}</span>
                <svg class="h-3.5 w-3.5 text-slate-400 dark:text-slate-400 dark:text-white/28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5.25 15.75 12 9 18.75"></path>
                </svg>
              </div>
              <span class="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 dark:text-white/45">{{ getStatusText(order.status) }}</span>
            </div>

            <div class="space-y-3 py-4">
              <div v-for="(item, index) in order.items" :key="index" class="flex gap-4 rounded-2xl border border-slate-200 dark:border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 p-3">
                <div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.03]">
                  <img :src="itemImage(item)" class="h-full w-full object-cover">
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h3 class="line-clamp-2 text-sm font-medium leading-6 text-slate-900 dark:text-white">{{ itemName(item) }}</h3>
                      <p class="mt-2 text-xs text-slate-400 dark:text-slate-400 dark:text-white/35">{{ itemSpecs(item) }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-medium text-slate-900 dark:text-white">{{ formatCurrency(item.price) }}</p>
                      <p class="mt-1 text-xs text-slate-400 dark:text-slate-400 dark:text-white/28">x{{ item.quantity || item.count || 1 }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-200 dark:border-white/8 pt-4">
              <span class="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400 dark:text-white/35">{{ t('orderModal.summary.totalItems', { count: order.items.length }) }}</span>
              <span class="text-sm text-slate-500 dark:text-slate-400 dark:text-white/52">
                {{ t('orderModal.summary.paid') }}
                <span class="ml-1 text-xl font-medium tracking-tight text-slate-900 dark:text-white">{{ formatCurrency(order.amount) }}</span>
              </span>
            </div>

            <div
              v-if="canShowTracking(order)"
              class="mt-4 rounded-2xl border border-indigo-300/20 bg-indigo-300/10 p-3"
            >
              <p class="text-[11px] uppercase tracking-[0.2em] text-indigo-100/80">{{ t('myOrders.tracking.title') }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/15 px-3 py-1 text-xs text-slate-700 dark:text-slate-400 dark:text-white/75">
                  {{ trackingCompany(order) || t('myOrders.tracking.companyPending') }}
                </span>
                <span class="font-mono text-sm font-semibold text-slate-900 dark:text-white">{{ trackingNumber(order) }}</span>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/15 px-3 py-1 text-xs text-slate-600 dark:text-white/70 transition hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.06]"
                  @click="copyTrackingNumber(order)"
                >
                  {{ t('myOrders.tracking.copyNumber') }}
                </button>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap justify-end gap-2">
              <template v-if="order.status === 'pending_payment' || order.status === 'pending'">
                <button
                  class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:text-white/55 transition hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="cancellingOrderId === order.id"
                  @click="handleCancel(order)"
                >
                  {{ cancellingOrderId === order.id ? '...' : t('orderModal.actions.cancel') }}
                </button>
                <button class="rounded-full bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-black transition hover:bg-white/90" @click="openPayment(order)">
                  {{ t('orderModal.actions.payNow') }}
                </button>
              </template>

              <template v-else-if="order.status === 'pending_shipment' || order.status === 'paid'">
                <button
                  class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:text-white/55 transition hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="cancellingOrderId === order.id"
                  @click="handleCancel(order)"
                >
                  {{ cancellingOrderId === order.id ? '...' : t('orderModal.actions.cancel') }}
                </button>
                <button class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:text-white/55 transition hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04]" @click="handleRemind">
                  {{ t('orderModal.actions.remind') }}
                </button>
              </template>

              <template v-else-if="order.status === 'shipped'">
                <button class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:text-white/55 transition hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04]" @click="handleLogistics">
                  {{ t('orderModal.actions.logistics') }}
                </button>
                <button
                  class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:text-white/55 transition hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="refundingOrderId === order.id"
                  @click="handleRefundOrder(order)"
                >
                  {{ refundingOrderId === order.id ? '...' : t('profile.refund') }}
                </button>
                <button
                  class="rounded-full bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="confirmingOrderId === order.id"
                  @click="handleConfirmRecv(order)"
                >
                  {{ confirmingOrderId === order.id ? '...' : t('orderModal.actions.confirm') }}
                </button>
              </template>

              <template v-else-if="order.status === 'completed'">
                <button class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:text-white/55 transition hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04]">
                  {{ t('orderModal.actions.delete') }}
                </button>
                <button
                  class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:text-white/55 transition hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="refundingOrderId === order.id"
                  @click="handleRefundOrder(order)"
                >
                  {{ refundingOrderId === order.id ? '...' : t('profile.refund') }}
                </button>
                <button class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:text-white/55 transition hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04]" @click="handleReview">
                  {{ t('orderModal.actions.review') }}
                </button>
              </template>

              <template v-else-if="order.status === 'refunded'">
                <button class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:text-white/55 transition hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04]" @click="handleRefundDetail">
                  {{ t('orderModal.actions.detail') }}
                </button>
              </template>
            </div>
            </article>
          </template>
        </template>

        <div v-if="scopedGroupedOrders.length > 0" class="py-3 text-center text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-white/25">
          {{ t('orderModal.footer') }}
        </div>
      </div>
    </div>

    <PaymentModal
      v-if="showPayment"
      :is-open="showPayment"
      :order="currentPayingOrder"
      @close="showPayment = false"
      @pay="handlePaymentComplete"
    />
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

