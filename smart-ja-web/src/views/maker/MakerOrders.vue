<script setup>
import { ref, onMounted, computed } from 'vue';
import { useOrderStore } from '../../store/order';
import { useToast } from '../../composables/useToast';

const orderStore = useOrderStore();
const activeFilter = ref('all');
const { show: showToast } = useToast();

const handleMarkCompleted = async (order) => {
  if (confirm('✅ 确认订单已完成交付？')) {
    // In a real app: await orderStore.updateStatus(order.id, 'completed');
    order.status = 'completed';
    showToast('🎉 订单已完成！资金已解冻', 'success');
  }
};

const handleContactBuyer = (order) => {
  const buyerName = order.buyer?.username || '买家';
  showToast(`💬 已发起与 ${buyerName} 的聊天`, 'info');
};

onMounted(() => {
  orderStore.fetchMakerOrders();
});

const filters = [
  { id: 'all', name: '全部' },
  { id: 'pending', name: '待处理' },
  { id: 'paid', name: '进行中' },
  { id: 'completed', name: '已完成' },
];

const filteredOrders = computed(() => {
  if (activeFilter.value === 'all') return orderStore.orders;
  return orderStore.orders.filter(o => o.status === activeFilter.value);
});

const getStatusColor = (status) => {
  switch(status) {
    case 'pending': return 'bg-orange-100 text-orange-600';
    case 'paid': return 'bg-blue-100 text-blue-600';
    case 'completed': return 'bg-green-100 text-green-600';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const getStatusText = (status) => {
  switch(status) {
    case 'pending': return '待接单';
    case 'paid': return '已支付 / 进行中';
    case 'completed': return '已完成';
    default: return status;
  }
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-800">📜 接单任务管理</h1>
      <div class="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
        <button 
          v-for="filter in filters" 
          :key="filter.id"
          @click="activeFilter = filter.id"
          class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
          :class="activeFilter === filter.id ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-800'"
        >
          {{ filter.name }}
        </button>
      </div>
    </div>

    <!-- Order List -->
    <div v-if="orderStore.isLoading" class="text-center py-12">
      <div class="animate-spin text-4xl mb-2">⏳</div>
      <div class="text-gray-400">正在加载订单...</div>
    </div>

    <div v-else-if="filteredOrders.length === 0" class="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
      <div class="text-6xl mb-4">📭</div>
      <h3 class="text-xl font-bold text-gray-800 mb-2">暂时没有相关订单</h3>
      <p class="text-gray-400">快去发布更多有趣的服务吧！</p>
    </div>

    <div v-else class="space-y-4">
      <div v-for="order in filteredOrders" :key="order.id" class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
        <div class="flex flex-col md:flex-row justify-between gap-4">
          
          <!-- Order Info -->
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-xs font-bold px-2 py-1 rounded-md" :class="getStatusColor(order.status)">
                {{ getStatusText(order.status) }}
              </span>
              <span class="text-xs text-gray-400">订单号: {{ order.id.slice(0, 8) }}...</span>
              <span class="text-xs text-gray-400">📅 {{ new Date(order.createdAt).toLocaleString() }}</span>
            </div>
            
            <h3 class="text-lg font-bold text-gray-900 mb-1">{{ order.service?.title || '未知服务' }}</h3>
            
            <div class="flex items-center gap-2 text-sm text-gray-600 mt-2">
              <span class="bg-gray-100 px-2 py-1 rounded-full text-xs">👤 买家: {{ order.buyer?.username || '匿名用户' }}</span>
              <span v-if="order.buyer?.email" class="bg-gray-100 px-2 py-1 rounded-full text-xs">📧 {{ order.buyer.email }}</span>
            </div>

            <div v-if="order.notes" class="mt-3 bg-yellow-50 p-3 rounded-xl text-sm text-yellow-800 border border-yellow-100">
              📝 备注: {{ order.notes }}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col items-end justify-between min-w-[150px] border-l border-gray-50 pl-6">
            <div class="text-right">
              <div class="text-xs text-gray-400">收入金额</div>
              <div class="text-2xl font-bold text-indigo-600">+¥{{ order.amount }}</div>
            </div>
            
            <div class="flex flex-col gap-2 w-full mt-4">
               <button v-if="order.status === 'paid'" @click="handleMarkCompleted(order)" class="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition">
                 ✅ 标记完成
               </button>
               <button @click="handleContactBuyer(order)" class="w-full py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 transition">
                 💬 联系买家
               </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>