<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { graphic, init, use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);

const props = defineProps({
  show: Boolean
});

const emit = defineEmits(['close']);
const { t } = useI18n();

const chartRef = ref(null);
const showAnalysis = ref(false);
const isAnalyzing = ref(false);
const analysisResult = ref('');

const incomeSummary = {
  totalAssets: 12580,
  todayIncome: 128.5,
  monthIncome: 3450,
  pending: 560
};

const transactions = ref([
  { id: 1, type: 'income', title: t('incomeModal.items.salePhone'), amount: 3500, date: '2026-01-05 14:30', status: t('incomeModal.status.completed') },
  { id: 2, type: 'income', title: t('incomeModal.items.creatorReward'), amount: 50, date: '2026-01-04 10:00', status: t('incomeModal.status.completed') },
  { id: 3, type: 'withdraw', title: t('incomeModal.items.withdrawWechat'), amount: -1000, date: '2026-01-03 09:15', status: t('incomeModal.status.processing') },
  { id: 4, type: 'income', title: t('incomeModal.items.saleKeyboard'), amount: 450, date: '2026-01-02 16:45', status: t('incomeModal.status.completed') },
  { id: 5, type: 'income', title: t('incomeModal.items.cashback'), amount: 20, date: '2026-01-01 11:20', status: t('incomeModal.status.completed') }
]);

let chartInstance = null;

const formatCurrency = (value) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const initChart = () => {
  if (!chartRef.value) return;

  chartInstance?.dispose();
  chartInstance = init(chartRef.value);
  chartInstance.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,10,12,0.92)',
      borderColor: 'rgba(255,255,255,0.08)',
      textStyle: { color: 'rgba(255,255,255,0.82)' }
    },
    grid: { top: 18, left: 10, right: 10, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['1-01', '1-02', '1-03', '1-04', '1-05', '1-06', '1-07'],
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(255,255,255,0.32)', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
      axisLabel: { show: false }
    },
    series: [
      {
        name: t('incomeModal.chart.series'),
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        itemStyle: { color: '#ffffff' },
        lineStyle: { width: 2, color: 'rgba(255,255,255,0.8)' },
        areaStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255,255,255,0.14)' },
            { offset: 1, color: 'rgba(255,255,255,0)' }
          ])
        },
        data: [120, 450, 150, 50, 3500, 200, 128]
      }
    ]
  });
};

watch(
  () => props.show,
  (open) => {
    if (open) {
      nextTick(initChart);
    }
  }
);

const handleAnalysis = () => {
  showAnalysis.value = true;
  isAnalyzing.value = true;
  analysisResult.value = '';

  window.setTimeout(() => {
    isAnalyzing.value = false;
    analysisResult.value = t('incomeModal.analysis.report');
  }, 1200);
};

const close = () => {
  emit('close');
};

onBeforeUnmount(() => {
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-md" @click="close"></div>

    <div class="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0c]/95 shadow-2xl">
      <div class="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-6 py-5">
        <div>
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/35">{{ t('incomeModal.modalLabel') }}</p>
          <h2 class="mt-2 text-2xl font-medium tracking-tight text-white">{{ t('incomeModal.title') }}</h2>
        </div>
        <button class="rounded-full border border-white/10 p-2 text-white/45 transition hover:bg-white/[0.04] hover:text-white/75" @click="close">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18 18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="space-y-6 overflow-y-auto px-6 py-6 scrollbar-hide">
        <section class="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl">
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('incomeModal.summary.totalAssets') }}</p>
          <p class="mt-4 text-5xl font-medium tracking-tighter text-white">{{ formatCurrency(incomeSummary.totalAssets) }}</p>
          <div class="mt-6 grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-white/35">{{ t('incomeModal.summary.today') }}</p>
              <p class="mt-2 text-2xl font-medium tracking-tight text-white">+{{ formatCurrency(incomeSummary.todayIncome) }}</p>
            </div>
            <div class="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-white/35">{{ t('incomeModal.summary.month') }}</p>
              <p class="mt-2 text-2xl font-medium tracking-tight text-white">+{{ formatCurrency(incomeSummary.monthIncome) }}</p>
            </div>
            <div class="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-white/35">{{ t('incomeModal.summary.pending') }}</p>
              <p class="mt-2 text-2xl font-medium tracking-tight text-white">{{ formatCurrency(incomeSummary.pending) }}</p>
            </div>
          </div>
        </section>

        <section class="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('incomeModal.chart.label') }}</p>
              <h3 class="mt-2 text-xl font-medium tracking-tight text-white">{{ t('incomeModal.chart.title') }}</h3>
            </div>
            <button class="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/60 transition hover:bg-white/[0.04]" @click="handleAnalysis">
              {{ t('incomeModal.chart.analysis') }}
            </button>
          </div>
          <div ref="chartRef" class="mt-6 h-44 w-full"></div>
        </section>

        <section v-if="showAnalysis" class="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl">
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('incomeModal.analysis.label') }}</p>
          <h3 class="mt-2 text-xl font-medium tracking-tight text-white">{{ t('incomeModal.analysis.title') }}</h3>
          <div v-if="isAnalyzing" class="mt-5 flex items-center gap-3 text-sm text-white/55">
            <svg class="h-4 w-4 animate-spin text-white/65" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z"></path>
            </svg>
            <span>{{ t('incomeModal.analysis.loading') }}</span>
          </div>
          <p v-else class="mt-5 whitespace-pre-line text-sm leading-7 text-white/55">{{ analysisResult }}</p>
        </section>

        <section class="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('incomeModal.records.label') }}</p>
              <h3 class="mt-2 text-xl font-medium tracking-tight text-white">{{ t('incomeModal.records.title') }}</h3>
            </div>
          </div>

          <div class="mt-6 space-y-3">
            <div v-for="item in transactions" :key="item.id" class="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 p-4">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-white">{{ item.title }}</p>
                <p class="mt-1 text-xs text-white/35">{{ item.date }}</p>
              </div>
              <div class="ml-4 text-right">
                <p class="text-sm font-medium text-white">{{ item.amount > 0 ? '+' : '' }}{{ formatCurrency(item.amount) }}</p>
                <p class="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/35">{{ item.status }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="flex gap-3 border-t border-white/10 bg-white/[0.02] px-6 py-5">
        <button class="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/55 transition hover:bg-white/[0.04] hover:text-white/70">
          {{ t('incomeModal.actions.withdraw') }}
        </button>
        <button class="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90">
          {{ t('incomeModal.actions.earnMore') }}
        </button>
      </div>
    </div>
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
