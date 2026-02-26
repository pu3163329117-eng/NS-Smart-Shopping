<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useOrderStore } from '../../store/order';
import { useUserProfile } from '../../store/userProfile';
import { useToast } from '../../composables/useToast';
import { MakerService } from '../../services/api';
import ServiceWizard from './ServiceWizard.vue';

const orderStore = useOrderStore();
const { userProfile } = useUserProfile();
const { t } = useI18n();
const { show: showToast } = useToast();
const showServiceWizard = ref(false);
const dashboardStats = ref({
  earnings: 0,
  views: 0,
  orders: 0
});

const handleQrScan = () => {
  const code = window.prompt(t('maker.promptScan'), 'VERIFY-123');
  if (code === 'VERIFY-123') {
    showToast(t('maker.verifySuccess'), 'success');
  } else if (code) {
    showToast(t('maker.verifyFail'), 'error');
  }
};

const handleAiGenerate = () => {
  if (window.confirm(t('maker.confirmGenerate'))) {
    showToast(t('maker.thinking'), 'info');
    setTimeout(() => {
      showServiceWizard.value = true;
    }, 1000);
  }
};

const activeTasks = ref([
  { id: 1, title: '发布你的第一个服务', reward: '50 EXP', status: 'completed' },
  { id: 2, title: '完成首单交易', reward: '100 EXP', status: 'pending' },
  { id: 3, title: '获得 5 星好评', reward: '神秘勋章', status: 'pending' }
]);

const opportunities = ref([
  {
    id: 'opp-1',
    title: 'AIUNI 青少年科技节 - 需3D打印教具',
    matchScore: 98,
    tags: ['3D打印', '批量'],
    budget: '¥5,000',
    deadline: '7天后'
  },
  {
    id: 'opp-2',
    title: '智能花盆原型外壳定制',
    matchScore: 92,
    tags: ['外壳设计', 'ABS材质'],
    budget: '¥800',
    deadline: '3天后'
  }
]);

onMounted(async () => {
  orderStore.fetchMakerOrders();
  try {
    const stats = await MakerService.getDashboardStats();
    dashboardStats.value = stats;
  } catch (e) {
    console.error('Failed to fetch dashboard stats', e);
  }
});

const recentOrders = computed(() => {
  return orderStore.orders.map(order => ({
    id: order.id,
    item: order.service?.title || t('maker.unknownService'),
    buyer: order.buyer?.username || t('maker.anonymousUser'),
    amount: order.amount,
    status: order.status,
    time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })).slice(0, 5); // Show top 5
});

const stats = computed(() => {
  const totalEarnings = orderStore.orders.reduce((sum, order) => sum + Number(order.amount), 0);
  const totalOrders = orderStore.orders.length;
  // Mock views for now
  return {
    earnings: totalEarnings,
    views: 1280 + totalOrders * 15,
    orders: totalOrders
  };
});
</script>

<template>
  <div class="space-y-8">
    
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
      <div class="absolute right-0 top-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      
      <div class="relative z-10">
        <h1 class="text-3xl font-bold mb-2">{{ $t('maker.welcome', { name: userProfile.userInfo.name }) }}</h1>
        <p class="text-indigo-100 opacity-90">{{ $t('maker.subtitle') }}</p>
        
        <div class="mt-8 grid grid-cols-3 gap-4">
          <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div class="text-xs text-indigo-200 uppercase tracking-wider mb-1">{{ $t('maker.earnings') }}</div>
            <div class="text-2xl font-bold">¥{{ dashboardStats.earnings }}</div>
          </div>
          <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div class="text-xs text-indigo-200 uppercase tracking-wider mb-1">{{ $t('maker.views') }}</div>
            <div class="text-2xl font-bold">{{ dashboardStats.views }}</div>
          </div>
          <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div class="text-xs text-indigo-200 uppercase tracking-wider mb-1">{{ $t('maker.orders') }}</div>
            <div class="text-2xl font-bold">{{ dashboardStats.orders }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Left Column: Tasks & Orders -->
      <div class="lg:col-span-2 space-y-8">
        
        <!-- AI Business Opportunities -->
        <section class="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden group">
           <div class="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:opacity-10 transition-opacity"></div>
           
           <div class="flex items-center justify-between mb-6 relative z-10">
            <h2 class="text-xl font-bold flex items-center gap-2">
              ⚡ 智能商机推荐
              <span class="text-xs bg-yellow-400 text-black px-2 py-0.5 rounded-full font-bold animate-pulse">NEW</span>
            </h2>
            <button class="text-sm text-indigo-200 font-bold hover:text-white transition-colors">查看全部</button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            <div v-for="opp in opportunities" :key="opp.id" class="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/20 transition-all cursor-pointer">
              <div class="flex justify-between items-start mb-2">
                <span class="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {{ opp.matchScore }}% 匹配
                </span>
                <span class="text-xs text-indigo-200">{{ opp.deadline }}</span>
              </div>
              <h3 class="font-bold text-lg mb-1 line-clamp-1">{{ opp.title }}</h3>
              <div class="flex gap-2 mb-3">
                <span v-for="tag in opp.tags" :key="tag" class="text-xs text-gray-300 bg-black/20 px-2 py-0.5 rounded">{{ tag }}</span>
              </div>
              <div class="flex justify-between items-end border-t border-white/10 pt-3">
                <div class="text-xs text-indigo-200">预算</div>
                <div class="font-bold text-yellow-300 text-lg">{{ opp.budget }}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Mission Center -->
        <section class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
              🚀 {{ $t('maker.tasks') }}
            </h2>
            <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">{{ $t('maker.inProgress') }}</span>
          </div>
          
          <div class="space-y-3">
            <div v-for="task in activeTasks" :key="task.id" 
                 class="flex items-center justify-between p-4 rounded-2xl transition-colors"
                 :class="task.status === 'completed' ? 'bg-gray-50 opacity-60' : 'bg-indigo-50 border border-indigo-100'"
            >
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-full flex items-center justify-center" 
                     :class="task.status === 'completed' ? 'bg-green-500 text-white' : 'bg-white border-2 border-indigo-200 text-transparent'">
                  ✓
                </div>
                <span class="font-bold text-gray-700" :class="{ 'line-through': task.status === 'completed' }">{{ task.title }}</span>
              </div>
              <span class="text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded-lg shadow-sm">
                🎁 {{ task.reward }}
              </span>
            </div>
          </div>
        </section>

        <!-- Recent Orders -->
        <section class="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">📦 {{ $t('maker.recentOrders') }}</h2>
            <button class="text-sm text-indigo-600 font-bold hover:underline">{{ $t('common.viewAll') }}</button>
          </div>
          
          <div class="space-y-4">
            <div v-for="order in recentOrders" :key="order.id" class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                  {{ order.item.slice(0,1) }}
                </div>
                <div>
                  <div class="font-bold text-gray-800">{{ order.item }}</div>
                  <div class="text-xs text-gray-500">{{ $t('maker.buyer') }}: {{ order.buyer }} • {{ order.time }}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold text-gray-900">+¥{{ order.amount }}</div>
                <div class="text-xs font-bold uppercase" 
                     :class="order.status === 'completed' ? 'text-green-500' : 'text-orange-500'">
                  {{ order.status }}
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      <!-- Right Column: Quick Actions & Tips -->
      <div class="space-y-8">
        
        <!-- Quick Actions -->
        <div class="grid grid-cols-2 gap-4">
          <button @click="showServiceWizard = true" class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group text-left">
            <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">✨</div>
            <div class="font-bold text-gray-800">{{ $t('maker.newService') }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ $t('maker.earnMore') }}</div>
          </button>
          <button @click="handleQrScan" class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group text-left">
            <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">📱</div>
            <div class="font-bold text-gray-800">{{ $t('maker.scanVerify') }}</div>
            <div class="text-xs text-gray-400 mt-1">{{ $t('maker.offlineServiceOnly') }}</div>
          </button>
        </div>

        <!-- AI Mentor -->
        <div class="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 text-8xl opacity-10">💡</div>
          <h3 class="font-bold text-lg mb-2 flex items-center gap-2">
            🤖 {{ $t('maker.aiMentor') }}
          </h3>
          <p class="text-sm text-gray-300 leading-relaxed mb-4">
            "{{ $t('maker.aiSuggestion') }}"
          </p>
          <button @click="handleAiGenerate" class="w-full py-2 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-sm font-bold transition-colors">
            {{ $t('maker.generateOutline') }}
          </button>
        </div>

      </div>

    </div>

    <!-- Service Wizard Modal -->
    <ServiceWizard 
      v-if="showServiceWizard" 
      @close="showServiceWizard = false"
      @success="orderStore.fetchMakerOrders()" 
    />
  </div>
</template>