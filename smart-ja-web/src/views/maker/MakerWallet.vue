<script setup>
import { computed, onMounted, ref } from 'vue';
import { useOrderStore } from '../../store/order';
import { useToast } from '../../composables/useToast';

const orderStore = useOrderStore();
const { show: showToast } = useToast();
const period = ref('month');

const chartData = [28, 44, 36, 72, 58, 84, 96];

onMounted(() => {
  void orderStore.fetchMakerOrders();
});

const earnings = computed(() =>
  orderStore.orders.reduce((sum, order) => sum + Number(order.amount || 0), 0)
);

const settledEarnings = computed(() =>
  orderStore.orders
    .filter((order) => order.status === 'completed')
    .reduce((sum, order) => sum + Number(order.amount || 0), 0)
);

const pendingSettlement = computed(() => Math.max(earnings.value - settledEarnings.value, 0));

const recentTransactions = computed(() =>
  orderStore.orders
    .map((order) => ({
      id: order.id,
      title:
        order.items?.[0]?.title ||
        order.items?.[0]?.name ||
        order.items?.[0]?.serviceTitle ||
        '创客服务收入',
      amount: Number(order.amount || 0),
      date: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '刚刚',
      type: order.status === 'completed' ? 'settled' : 'pending'
    }))
    .slice(0, 8)
);

const formatAmount = (value) => `¥${Number(value || 0).toFixed(2)}`;

const handleWithdraw = () => {
  if (earnings.value <= 0) {
    showToast('当前没有可提现余额。', 'error');
    return;
  }

  const confirmed = window.confirm(`确认提现 ${formatAmount(earnings.value)} 到默认收款账户吗？`);
  if (!confirmed) {
    return;
  }

  showToast('提现申请已提交，预计 2 小时内到账。', 'success');
};
</script>

<template>
  <div class="space-y-8 text-slate-900 transition-colors duration-500 dark:text-white">
    <section class="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:shadow-[0_28px_80px_rgba(0,0,0,0.35)] dark:backdrop-blur-xl">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_30%),linear-gradient(135deg,rgba(148,163,184,0.08),transparent_38%,transparent_72%,rgba(15,23,42,0.05))] dark:bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,transparent_72%,rgba(255,255,255,0.02))]"></div>
      <div class="relative z-10">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-400 dark:text-slate-500">Maker Wallet</p>
            <h1 class="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">创客钱包</h1>
            <p class="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
              用更稳定的资产视图管理收入、待结算金额和提现操作。
            </p>
            <div class="mt-6 text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ formatAmount(earnings) }}</div>
          </div>

          <button
            type="button"
            class="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-100"
            @click="handleWithdraw"
          >
            申请提现
          </button>
        </div>

        <div class="mt-8 grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.03] dark:shadow-none">
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">累计收入</p>
            <p class="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{{ formatAmount(earnings) }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.03] dark:shadow-none">
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">已结算</p>
            <p class="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{{ formatAmount(settledEarnings) }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.03] dark:shadow-none">
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">待结算</p>
            <p class="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{{ formatAmount(pendingSettlement) }}</p>
          </div>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <section class="lg:col-span-2 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-xl font-semibold text-slate-900 dark:text-white">收入趋势</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">用一个简洁的周视图观察近期营收波动。</p>
          </div>

          <select
            v-model="period"
            class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:focus:border-white/20"
          >
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="year">全年</option>
          </select>
        </div>

        <div class="grid h-56 grid-cols-7 items-end gap-3">
          <div
            v-for="(value, index) in chartData"
            :key="index"
            class="group flex h-full flex-col justify-end"
          >
            <div
              class="relative rounded-t-2xl bg-slate-200 transition-all duration-300 group-hover:bg-slate-900 dark:bg-white/10 dark:group-hover:bg-white/70"
              :style="{ height: `${value}%` }"
            >
              <span class="absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100 dark:bg-white dark:text-black">
                {{ value }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-7 text-center text-xs text-slate-400 dark:text-slate-500">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </section>

      <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl">
        <div class="mb-5">
          <h2 class="text-xl font-semibold text-slate-900 dark:text-white">最近流水</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">最近 8 笔订单收入会在这里汇总。</p>
        </div>

        <div class="space-y-3">
          <div
            v-for="transaction in recentTransactions"
            :key="transaction.id"
            class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-white/5 dark:bg-white/[0.03]"
          >
            <div class="min-w-0">
              <div class="truncate text-sm font-semibold text-slate-900 dark:text-white">{{ transaction.title }}</div>
              <div class="mt-1 text-xs text-slate-400 dark:text-slate-500">{{ transaction.date }}</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-semibold text-slate-900 dark:text-white">+{{ formatAmount(transaction.amount) }}</div>
              <div
                class="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                :class="
                  transaction.type === 'settled'
                    ? 'text-emerald-600 dark:text-emerald-200'
                    : 'text-amber-600 dark:text-amber-200'
                "
              >
                {{ transaction.type === 'settled' ? '已结算' : '待结算' }}
              </div>
            </div>
          </div>

          <div
            v-if="recentTransactions.length === 0"
            class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400"
          >
            暂无流水记录
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
