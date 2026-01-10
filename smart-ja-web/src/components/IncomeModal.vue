<script setup>
import { ref, nextTick, watch } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  show: Boolean
});

const emit = defineEmits(['close']);

const chartRef = ref(null);
let myChart = null;

// Mock data
const incomeSummary = {
  totalAssets: 12580.00,
  todayIncome: 128.50,
  monthIncome: 3450.00,
  pending: 560.00
};

const transactions = ref([
  { id: 1, type: 'income', title: '出售 - 闲置 iPhone 13', amount: 3500.00, date: '2026-01-05 14:30', status: '已到账' },
  { id: 2, type: 'income', title: '创作奖励 - 热门笔记', amount: 50.00, date: '2026-01-04 10:00', status: '已到账' },
  { id: 3, type: 'withdraw', title: '提现至微信零钱', amount: -1000.00, date: '2026-01-03 09:15', status: '处理中' },
  { id: 4, type: 'income', title: '出售 - 机械键盘 Keychron', amount: 450.00, date: '2026-01-02 16:45', status: '已到账' },
  { id: 5, type: 'income', title: '活动返现', amount: 20.00, date: '2026-01-01 11:20', status: '已到账' },
]);

const initChart = () => {
  if (!chartRef.value) return;
  
  // Dispose existing instance if any
  if (echarts.getInstanceByDom(chartRef.value)) {
    echarts.getInstanceByDom(chartRef.value).dispose();
  }
  
  myChart = echarts.init(chartRef.value);
  
  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      textStyle: { color: '#333' }
    },
    grid: {
      top: '10%',
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['1-01', '1-02', '1-03', '1-04', '1-05', '1-06', '1-07'],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#999', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
      axisLabel: { show: false }
    },
    series: [
      {
        name: '收益',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#F59E0B' },
        lineStyle: { width: 3, color: '#F59E0B' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 158, 11, 0.2)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0)' }
          ])
        },
        data: [120, 450, 150, 50, 3500, 200, 128]
      }
    ]
  };
  
  myChart.setOption(option);
};

// Watch for show prop to init chart
watch(() => props.show, (newVal) => {
  if (newVal) {
    nextTick(() => {
      initChart();
    });
  } else {
    // We don't necessarily need to dispose here if we want to keep state, 
    // but cleaning up is good practice if the modal is destroyed. 
    // Since v-if is used in parent or here, let's handle it.
  }
});

const showAnalysis = ref(false);
const analysisResult = ref('');
const isAnalyzing = ref(false);

const handleAnalysis = () => {
  showAnalysis.value = true;
  isAnalyzing.value = true;
  analysisResult.value = '';
  
  // Simulate AI loading
  setTimeout(() => {
    isAnalyzing.value = false;
    analysisResult.value = `【CIO 财务分析报告】\n\n1. **收益趋势**：本周收益波动较大，主要受单笔大额交易（出售闲置 iPhone 13）拉动，建议保持活跃度以维持日常稳定收益。\n\n2. **来源构成**：目前收益主要依赖“二手出售”（占 95%），“创作奖励”占比较低。建议增加高质量内容发布，提升创作收益占比，构建多元化收入结构。\n\n3. **提现建议**：近期有提现操作，建议关注平台提现手续费优惠活动（每月 15 日），合理规划资金流转。`;
  }, 1500);
};

const close = () => {
  emit('close');
  // Reset analysis state slightly delayed or keep it
  setTimeout(() => {
    showAnalysis.value = false;
  }, 300);
};

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -5;
  const rotateY = ((x - centerX) / centerX) * 5;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (e) => {
  const card = e.currentTarget;
  card.style.transform = '';
};

const handleModalMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -2;
  const rotateY = ((x - centerX) / centerX) * 2;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
};

const handleModalMouseLeave = (e) => {
  const card = e.currentTarget;
  card.style.transform = '';
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="close"></div>
    
    <!-- Modal -->
    <div 
      class="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up transition-transform duration-100 ease-out will-change-transform"
      @mousemove="handleModalMouseMove"
      @mouseleave="handleModalMouseLeave"
    >
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-white">
        <div>
          <h2 class="text-lg font-bold text-slate-800">我的收益</h2>
          <p class="text-xs text-amber-600 font-medium">财富小管家</p>
        </div>
        <button @click="close" class="p-2 bg-white rounded-full hover:bg-gray-100 transition shadow-sm text-gray-500">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      
      <!-- Scrollable Content -->
      <div class="overflow-y-auto p-6 space-y-6 bg-gray-50/50">
        
        <!-- Total Assets Card -->
        <div 
          class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden transition-transform duration-100 ease-out will-change-transform"
          @mousemove.stop="handleCardMouseMove"
          @mouseleave="handleCardMouseLeave"
        >
          <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div class="relative z-10">
             <div class="text-amber-100 text-sm mb-1">总资产 (元)</div>
             <div class="text-3xl font-bold mb-4">¥ {{ incomeSummary.totalAssets.toFixed(2) }}</div>
             
             <div class="flex gap-4">
               <div class="bg-white/20 rounded-lg px-3 py-2 flex-1 backdrop-blur-sm">
                 <div class="text-xs text-amber-100 opacity-80">今日收益</div>
                 <div class="font-bold">+{{ incomeSummary.todayIncome.toFixed(2) }}</div>
               </div>
               <div class="bg-white/20 rounded-lg px-3 py-2 flex-1 backdrop-blur-sm">
                 <div class="text-xs text-amber-100 opacity-80">本月累计</div>
                 <div class="font-bold">+{{ incomeSummary.monthIncome.toFixed(2) }}</div>
               </div>
             </div>
          </div>
        </div>
        
        <!-- Chart Section -->
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-slate-800 text-sm">近7日收益趋势</h3>
            <button @click="handleAnalysis" class="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium hover:bg-indigo-100 transition flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              AI 分析
            </button>
          </div>
          <div ref="chartRef" class="w-full h-40"></div>
        </div>
        
        <!-- AI Analysis Result (Conditional) -->
        <div v-if="showAnalysis" class="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 animate-fade-in">
           <div class="flex items-center gap-2 mb-2">
             <div class="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs">AI</div>
             <h4 class="font-bold text-indigo-900 text-sm">CIO 分析报告</h4>
           </div>
           
           <div v-if="isAnalyzing" class="flex items-center gap-2 text-sm text-indigo-500 py-4">
             <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             正在生成财务洞察...
           </div>
           <div v-else class="text-sm text-indigo-800 whitespace-pre-line leading-relaxed">
             {{ analysisResult }}
           </div>
        </div>

        <!-- Transactions List -->
        <div>
          <h3 class="font-bold text-slate-800 text-sm mb-3 px-1">最近明细</h3>
          <div class="space-y-3">
            <div v-for="item in transactions" :key="item.id" 
                 class="bg-white p-3 rounded-xl shadow-sm border border-gray-50 flex justify-between items-center transition-transform duration-100 ease-out will-change-transform"
                 @mousemove.stop="handleCardMouseMove"
                 @mouseleave="handleCardMouseLeave"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center" 
                     :class="item.type === 'income' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'">
                   <span class="text-lg font-bold">{{ item.type === 'income' ? '收' : '支' }}</span>
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-800">{{ item.title }}</div>
                  <div class="text-xs text-gray-400">{{ item.date }}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold text-sm" :class="item.type === 'income' ? 'text-green-600' : 'text-slate-900'">
                  {{ item.type === 'income' ? '+' : '' }}{{ item.amount.toFixed(2) }}
                </div>
                <div class="text-[10px] text-gray-400">{{ item.status }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer Actions -->
      <div class="p-4 bg-white border-t border-gray-100 flex gap-3">
        <button class="flex-1 py-3 bg-gray-100 text-slate-700 font-bold rounded-xl hover:bg-gray-200 transition">提现</button>
        <button class="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-200">去赚钱</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
