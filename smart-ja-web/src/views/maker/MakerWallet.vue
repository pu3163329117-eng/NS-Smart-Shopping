<script setup>
import { ref, computed, onMounted } from 'vue';
import { useOrderStore } from '../../store/order';
import { useToast } from '../../composables/useToast';

const orderStore = useOrderStore();
const { show: showToast } = useToast();
const period = ref('month');

const handleWithdraw = () => {
  if (earnings.value <= 0) {
    showToast('⚠️ 余额不足，无法提现', 'error');
    return;
  }
  if (confirm(`💸 确认提现 ¥${earnings.value.toFixed(2)} 到微信钱包？`)) {
    showToast('🚀 提现申请已提交，预计 2 小时内到账', 'success');
  }
};

onMounted(() => {
  orderStore.fetchMakerOrders();
});

const earnings = computed(() => {
  return orderStore.orders.reduce((sum, order) => sum + Number(order.amount), 0);
});

const recentTransactions = computed(() => {
  return orderStore.orders.map(o => ({
    id: o.id,
    desc: `销售收入: ${o.service?.title || '未知服务'}`,
    amount: o.amount,
    date: new Date(o.createdAt).toLocaleDateString(),
    type: 'income'
  })).slice(0, 10);
});

// Mock chart data points
const chartData = [20, 45, 30, 80, 55, 90, 120]; 
</script>

<template>
  <div class="space-y-8">
    
    <!-- Balance Card -->
    <div class="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
      <div class="absolute right-0 top-0 w-64 h-64 bg-yellow-500 opacity-10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      
      <div class="flex justify-between items-start relative z-10">
        <div>
          <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">当前可用余额</h2>
          <div class="text-5xl font-bold font-mono">¥{{ earnings.toFixed(2) }}</div>
        </div>
        <button @click="handleWithdraw" class="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/20">
          💸 提现到微信
        </button>
      </div>

      <div class="mt-8 flex gap-8 border-t border-gray-700 pt-6">
        <div>
          <div class="text-xs text-gray-500 mb-1">本月总收入</div>
          <div class="text-xl font-bold text-green-400">+¥{{ earnings.toFixed(2) }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500 mb-1">待结算金额</div>
          <div class="text-xl font-bold text-gray-300">¥0.00</div>
        </div>
      </div>
    </div>

    <!-- Chart & History -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Chart -->
      <div class="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-bold text-lg text-gray-800">📈 收入趋势</h3>
          <select v-model="period" class="bg-gray-50 border-none rounded-lg text-sm font-bold text-gray-600 px-3 py-1">
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="year">全年</option>
          </select>
        </div>
        
        <!-- Simple CSS Bar Chart -->
        <div class="h-48 flex items-end justify-between gap-2 px-4">
          <div v-for="(val, index) in chartData" :key="index" 
               class="w-full bg-indigo-100 rounded-t-lg relative group transition-all hover:bg-indigo-500"
               :style="{ height: `${val}px` }">
            <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              ¥{{ val }}
            </div>
          </div>
        </div>
        <div class="flex justify-between mt-2 text-xs text-gray-400 px-4">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 class="font-bold text-lg text-gray-800 mb-4">💰 收支明细</h3>
        <div class="space-y-4 max-h-[300px] overflow-y-auto">
          <div v-for="tx in recentTransactions" :key="tx.id" class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm">
                ⬇️
              </div>
              <div>
                <div class="text-sm font-bold text-gray-800 truncate w-32">{{ tx.desc }}</div>
                <div class="text-xs text-gray-400">{{ tx.date }}</div>
              </div>
            </div>
            <div class="font-bold text-green-600">+¥{{ tx.amount }}</div>
          </div>
          <div v-if="recentTransactions.length === 0" class="text-center text-gray-400 py-8 text-sm">
            暂无交易记录
          </div>
        </div>
      </div>

    </div>

  </div>
</template>