<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from '../composables/useToast';
import { AdminService } from '../services/api';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);

const router = useRouter();
const { t } = useI18n();
const { show: showToast } = useToast();

const currentTab = ref('overview');
const isLoading = ref(false);

// Live data from backend
const stats = ref({ gmv: 0, orders: 0, users: 0, activeProviders: 0, pendingServices: 0 });
const orders = ref([]);
const userRows = ref([]);

const loadStats = async () => {
  isLoading.value = true;
  try {
    const data = await AdminService.getStats();
    stats.value = data.stats;
    orders.value = data.recentOrders || [];
    userRows.value = data.recentUsers || [];
  } catch (err) {
    showToast(t('dataCenter.feedback.loadFailed', '加载数据失败'), 'error');
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadStats);

const pendingServices = ref([]);
const activeServices = ref([]);

const systemStatus = ref({
  cpu: '—',
  memory: '—',
  dbConnections: '—',
  lastBackup: '—'
});

const systemLogs = ref([]);

const tabs = computed(() => [
  { id: 'overview', label: t('dataCenter.tabs.overview') },
  { id: 'services', label: t('dataCenter.tabs.services') },
  { id: 'orders', label: t('dataCenter.tabs.orders') },
  { id: 'users', label: t('dataCenter.tabs.users') },
  { id: 'system', label: t('dataCenter.tabs.system') }
]);

const formatCurrency = (value) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const revenueOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(10,10,12,0.92)',
    borderColor: 'rgba(255,255,255,0.08)',
    textStyle: { color: 'rgba(255,255,255,0.82)' }
  },
  grid: { top: 18, left: 20, right: 20, bottom: 20 },
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    axisLabel: { color: 'rgba(255,255,255,0.35)' },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: 'rgba(255,255,255,0.35)' },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
  },
  series: [
    {
      name: t('dataCenter.overview.revenueChart'),
      type: 'line',
      smooth: true,
      data: [820, 932, 901, 934, 1290, 1330, 1320],
      itemStyle: { color: '#ffffff' },
      lineStyle: { width: 2, color: 'rgba(255,255,255,0.8)' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255,255,255,0.14)' },
            { offset: 1, color: 'rgba(255,255,255,0)' }
          ]
        }
      }
    }
  ]
}));

const getOrderStatus = (status) =>
  ({
    processing: t('dataCenter.status.processing'),
    pending: t('dataCenter.status.pending'),
    paid: t('dataCenter.status.paid'),
    completed: t('dataCenter.status.completed'),
    shipped: t('dataCenter.status.shipped')
  }[status] || status);

const getOrderStatusClass = (status) =>
  ({
    processing: 'text-white/55',
    pending: 'text-yellow-500/55',
    paid: 'text-blue-500/55',
    completed: 'text-white/75',
    shipped: 'text-white/62'
  }[status] || 'text-white/45');

const handleApprove = (id) => {
  const index = pendingServices.value.findIndex((item) => item.id === id);
  if (index === -1) return;

  const service = pendingServices.value[index];
  pendingServices.value.splice(index, 1);
  activeServices.value.push({ ...service, sales: 0, rating: 0 });
  showToast(t('dataCenter.feedback.approved', { name: service.name }), 'success');
};

const handleReject = (id) => {
  const index = pendingServices.value.findIndex((item) => item.id === id);
  if (index === -1) return;

  pendingServices.value.splice(index, 1);
  showToast(t('dataCenter.feedback.rejected'), 'info');
};
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0c] text-white">
    <header class="sticky top-0 z-20 border-b border-white/10 bg-[#0a0a0c]/90 px-6 py-4 backdrop-blur-2xl">
      <div class="mx-auto flex max-w-[1400px] items-center justify-between">
        <div>
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/35">{{ $t('dataCenter.header.label') }}</p>
          <h1 class="mt-2 text-2xl font-medium tracking-tight">{{ $t('dataCenter.header.title') }}</h1>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-white/45">{{ $t('dataCenter.header.admin') }}</span>
          <button class="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/[0.04]" @click="router.push('/')">
            {{ $t('dataCenter.header.back') }}
          </button>
        </div>
      </div>
    </header>

    <div class="mx-auto flex max-w-[1400px] gap-5 px-4 py-5 sm:px-6">
      <aside class="w-full max-w-[240px] rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-2 backdrop-blur-2xl">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="mb-1 w-full rounded-[1rem] px-4 py-3 text-left text-sm font-medium transition last:mb-0"
          :class="currentTab === tab.id ? 'bg-white text-black' : 'text-white/58 hover:bg-white/[0.04] hover:text-white/82'"
          @click="currentTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </aside>

      <main class="min-w-0 flex-1 space-y-5">
        <template v-if="currentTab === 'overview'">
          <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article class="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
              <p class="text-[11px] uppercase tracking-[0.2em] text-white/35">{{ $t('dataCenter.overview.gmv') }}</p>
              <p class="mt-3 text-3xl font-medium tracking-tighter">{{ formatCurrency(stats.gmv) }}</p>
            </article>
            <article class="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
              <p class="text-[11px] uppercase tracking-[0.2em] text-white/35">{{ $t('dataCenter.overview.orders') }}</p>
              <p class="mt-3 text-3xl font-medium tracking-tighter">{{ stats.orders }}</p>
            </article>
            <article class="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
              <p class="text-[11px] uppercase tracking-[0.2em] text-white/35">{{ $t('dataCenter.overview.users') }}</p>
              <p class="mt-3 text-3xl font-medium tracking-tighter">{{ stats.users }}</p>
            </article>
            <article class="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
              <p class="text-[11px] uppercase tracking-[0.2em] text-white/35">{{ $t('dataCenter.overview.providers') }}</p>
              <p class="mt-3 text-3xl font-medium tracking-tighter">{{ stats.activeProviders }}</p>
            </article>
          </section>

          <section class="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
            <h3 class="text-lg font-medium tracking-tight">{{ $t('dataCenter.overview.revenueChart') }}</h3>
            <v-chart class="mt-5 h-96 w-full" :option="revenueOption" autoresize />
          </section>
        </template>

        <template v-if="currentTab === 'services'">
          <section class="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-medium tracking-tight">{{ $t('dataCenter.services.pending') }}</h3>
              <span class="text-xs uppercase tracking-[0.18em] text-white/35">{{ pendingServices.length }}</span>
            </div>
            <div v-if="pendingServices.length === 0" class="rounded-xl border border-white/8 bg-black/20 px-4 py-6 text-center text-sm text-white/35">
              {{ $t('dataCenter.services.emptyPending') }}
            </div>
            <div v-else class="space-y-3">
              <article v-for="service in pendingServices" :key="service.id" class="rounded-xl border border-white/8 bg-black/20 p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium">{{ service.name }}</p>
                    <p class="mt-1 text-xs text-white/35">{{ service.provider }} · {{ service.date }}</p>
                  </div>
                  <p class="text-sm font-medium">{{ formatCurrency(service.price) }}</p>
                </div>
                <div class="mt-3 flex justify-end gap-2">
                  <button class="rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/55" @click="handleReject(service.id)">
                    {{ $t('dataCenter.services.reject') }}
                  </button>
                  <button class="rounded-full bg-white px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-black" @click="handleApprove(service.id)">
                    {{ $t('dataCenter.services.approve') }}
                  </button>
                </div>
              </article>
            </div>
          </section>

          <section class="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
            <h3 class="mb-4 text-lg font-medium tracking-tight">{{ $t('dataCenter.services.active') }}</h3>
            <div class="space-y-3">
              <article v-for="service in activeServices" :key="service.id" class="rounded-xl border border-white/8 bg-black/20 p-4">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium">{{ service.name }}</p>
                    <p class="mt-1 text-xs text-white/35">{{ service.provider }}</p>
                  </div>
                  <div class="text-right text-xs text-white/45">
                    <p>{{ $t('dataCenter.services.sales', { count: service.sales }) }}</p>
                    <p class="mt-1">{{ $t('dataCenter.services.rating', { value: service.rating }) }}</p>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </template>

        <template v-if="currentTab === 'orders'">
          <section class="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
            <h3 class="mb-4 text-lg font-medium tracking-tight">{{ $t('dataCenter.orders.title') }}</h3>
            <div class="space-y-3">
              <article v-for="order in orders" :key="order.id" class="rounded-xl border border-white/8 bg-black/20 p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium">{{ order.id }}</p>
                    <p class="mt-1 text-xs text-white/35">{{ order.user }} · {{ order.item }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-medium">{{ formatCurrency(order.amount) }}</p>
                    <p class="mt-1 text-[11px] uppercase tracking-[0.18em]" :class="getOrderStatusClass(order.status)">
                      {{ getOrderStatus(order.status) }}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </template>

        <template v-if="currentTab === 'users'">
          <section class="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
            <h3 class="mb-4 text-lg font-medium tracking-tight">{{ $t('dataCenter.users.title') }}</h3>
            <div class="space-y-3">
              <article v-for="user in userRows" :key="user.id" class="rounded-xl border border-white/8 bg-black/20 p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium">{{ user.name }}</p>
                    <p class="mt-1 text-xs text-white/35">{{ user.id }} · {{ user.joinedAt }}</p>
                  </div>
                  <div class="text-right text-xs text-white/45">
                    <p>{{ $t('dataCenter.users.role', { role: user.role }) }}</p>
                    <p class="mt-1">{{ $t('dataCenter.users.orders', { count: user.orders }) }}</p>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </template>

        <template v-if="currentTab === 'system'">
          <section class="grid gap-5 xl:grid-cols-2">
            <article class="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl">
              <h3 class="mb-4 text-lg font-medium tracking-tight">{{ $t('dataCenter.system.status') }}</h3>
              <div class="space-y-4">
                <div>
                  <div class="mb-2 flex justify-between text-xs uppercase tracking-[0.18em] text-white/35">
                    <span>CPU</span>
                    <span>{{ systemStatus.cpu }}%</span>
                  </div>
                  <div class="h-2 rounded-full bg-white/10"><div class="h-2 rounded-full bg-white/70" :style="{ width: `${systemStatus.cpu}%` }"></div></div>
                </div>
                <div>
                  <div class="mb-2 flex justify-between text-xs uppercase tracking-[0.18em] text-white/35">
                    <span>Memory</span>
                    <span>{{ systemStatus.memory }}%</span>
                  </div>
                  <div class="h-2 rounded-full bg-white/10"><div class="h-2 rounded-full bg-white/70" :style="{ width: `${systemStatus.memory}%` }"></div></div>
                </div>
                <p class="text-xs uppercase tracking-[0.18em] text-white/35">
                  {{ $t('dataCenter.system.dbConnections', { count: systemStatus.dbConnections }) }}
                </p>
                <p class="text-xs uppercase tracking-[0.18em] text-white/35">
                  {{ $t('dataCenter.system.lastBackup', { value: systemStatus.lastBackup }) }}
                </p>
              </div>
            </article>

            <article class="rounded-[1.5rem] border border-white/10 bg-black/70 p-5 font-mono text-xs text-white/62">
              <h3 class="mb-4 text-sm font-medium tracking-tight text-white">{{ $t('dataCenter.system.logs') }}</h3>
              <div class="space-y-2">
                <p v-for="(log, index) in systemLogs" :key="index">
                  <span class="text-white/35">[{{ log.time }}]</span>
                  <span class="ml-2 text-white/70">{{ log.level }}</span>
                  <span class="ml-2">{{ log.msg }}</span>
                </p>
              </div>
            </article>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>
