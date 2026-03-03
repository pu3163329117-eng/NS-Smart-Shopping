<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useOrderStore } from '../../store/order';
import { useToast } from '../../composables/useToast';

const orderStore = useOrderStore();
const { show: showToast } = useToast();

const activeFilter = ref('all');
const actionOrderId = ref(null);

const filters = [
  { id: 'all', name: '全部' },
  { id: 'pending', name: '待确认' },
  { id: 'paid', name: '待发货' },
  { id: 'shipped', name: '已发货' },
  { id: 'completed', name: '已完成' }
];

const queryStatus = computed(() => (activeFilter.value === 'all' ? undefined : activeFilter.value));

const loadOrders = async () => {
  await orderStore.fetchMakerOrders(queryStatus.value);
};

onMounted(() => {
  void loadOrders();
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
    (order.serviceId ? `服务 ${order.serviceId}` : '未命名服务')
  );
};

const getBuyerName = (order) => order.buyer?.username || '匿名买家';

const getStatusText = (status) => {
  switch (status) {
    case 'pending':
      return '待确认';
    case 'paid':
      return '待发货';
    case 'shipped':
      return '已发货';
    case 'completed':
      return '已完成';
    default:
      return status || '未知状态';
  }
};

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
      label: '标记发货',
      nextStatus: 'shipped',
      successMessage: '订单已标记为已发货。'
    };
  }

  if (order.status === 'shipped') {
    return {
      label: '标记完成',
      nextStatus: 'completed',
      successMessage: '订单已标记为已完成。'
    };
  }

  if (order.status === 'pending') {
    return {
      label: '直接完成',
      nextStatus: 'completed',
      successMessage: '订单已直接完成。'
    };
  }

  return null;
};

const isActingOn = (orderId) => actionOrderId.value === orderId;

const formatAmount = (value) => `¥${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) {
    return '刚刚';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '时间未知';
  }

  return date.toLocaleString();
};

const handlePrimaryAction = async (order) => {
  const action = getPrimaryAction(order);
  if (!action) {
    return;
  }

  const confirmed = window.confirm(`确认将订单 ${order.id} 更新为“${getStatusText(action.nextStatus)}”吗？`);
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
    showToast(error?.message || '订单状态更新失败。', 'error');
  } finally {
    actionOrderId.value = null;
  }
};

const handleContactBuyer = (order) => {
  showToast(`准备联系 ${getBuyerName(order)}。`, 'info');
};
</script>

<template>
  <div class="space-y-6 text-slate-900 transition-colors duration-500 dark:text-white">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-400 dark:text-slate-500">Order Center</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">创客订单</h1>
        <p class="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
          用更清晰的状态流转管理每一笔订单，白天保持清爽，夜间切换为克制的控制台视图。
        </p>
      </div>

      <div class="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm backdrop-blur-xl transition-colors dark:border-white/5 dark:bg-white/[0.02]">
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
      class="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl"
    >
      <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700 dark:border-white/10 dark:border-t-white/70"></div>
      <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">正在同步订单数据...</p>
    </div>

    <div
      v-else-if="orderStore.error"
      class="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl"
    >
      <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-400 dark:text-slate-500">Signal Lost</p>
      <h2 class="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">订单加载失败</h2>
      <p class="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">{{ orderStore.error }}</p>
      <button
        type="button"
        class="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-100"
        @click="loadOrders"
      >
        重新加载
      </button>
    </div>

    <div
      v-else-if="filteredOrders.length === 0"
      class="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm transition-colors dark:border-white/10 dark:bg-white/[0.02] dark:backdrop-blur-xl"
    >
      <div class="text-5xl text-slate-300 dark:text-white/30">+</div>
      <h2 class="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">当前筛选下暂无订单</h2>
      <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">切换筛选，或等待新的订单进入此工作台。</p>
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="order in filteredOrders"
        :key="order.id"
        class="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-white/5 dark:bg-white/[0.02] dark:shadow-[0_24px_70px_rgba(0,0,0,0.32)] dark:backdrop-blur-xl dark:hover:border-white/10"
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
              <span class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">{{ order.id }}</span>
              <span class="text-xs text-slate-400 dark:text-slate-500">{{ formatDate(order.createdAt) }}</span>
            </div>

            <div>
              <h2 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ getOrderTitle(order) }}</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">买家：{{ getBuyerName(order) }}</p>
            </div>

            <div class="grid gap-3 md:grid-cols-3">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-white/5 dark:bg-white/[0.03]">
                <p class="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">订单金额</p>
                <p class="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{{ formatAmount(order.amount) }}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-white/5 dark:bg-white/[0.03]">
                <p class="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">服务 ID</p>
                <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{{ order.serviceId || '未关联' }}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-white/5 dark:bg-white/[0.03]">
                <p class="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">商品数量</p>
                <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{{ Array.isArray(order.items) ? order.items.length : 0 }}</p>
              </div>
            </div>
          </div>

          <div class="flex min-w-[240px] flex-col justify-between gap-4 rounded-[1.8rem] border border-slate-200 bg-slate-50 p-5 transition-colors dark:border-white/5 dark:bg-white/[0.03]">
            <div>
              <p class="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">预计收入</p>
              <p class="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">+{{ formatAmount(order.amount) }}</p>
            </div>

            <div class="space-y-3">
              <button
                v-if="getPrimaryAction(order)"
                type="button"
                class="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-slate-100"
                :disabled="isActingOn(order.id)"
                @click="handlePrimaryAction(order)"
              >
                {{ isActingOn(order.id) ? '处理中...' : getPrimaryAction(order).label }}
              </button>

              <button
                type="button"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.06]"
                @click="handleContactBuyer(order)"
              >
                联系买家
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
