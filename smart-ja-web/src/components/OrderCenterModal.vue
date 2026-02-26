<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useToast } from '../composables/useToast';
import { useOrderStore } from '../store/order';
import PaymentModal from './PaymentModal.vue';

const props = defineProps({
  show: Boolean,
  initialTab: {
    type: String,
    default: 'all'
  }
});

const emit = defineEmits(['close']);
const { show: showToast } = useToast();
const orderStore = useOrderStore();

const activeTab = ref('all');
const showPayment = ref(false);
const currentPayingOrder = ref(null);

watch(() => props.show, (newVal) => {
  if (newVal) {
    activeTab.value = props.initialTab || 'all';
    orderStore.fetchMyOrders();
  }
});

const tabs = [
  { id: 'all', name: '全部' },
  { id: 'pending_payment', name: '待付款' },
  { id: 'pending_shipment', name: '待发货' },
  { id: 'shipped', name: '待收货' },
  { id: 'completed', name: '已完成' },
  { id: 'refunded', name: '退款/售后' }
];

const filteredOrders = computed(() => {
  const orders = orderStore.orders || [];
  if (activeTab.value === 'all') return orders;
  return orders.filter(o => o.status === activeTab.value);
});

const getStatusText = (status) => {
  const map = {
    pending_payment: '等待买家付款',
    pending_shipment: '买家已付款',
    shipped: '卖家已发货',
    completed: '交易成功',
    refunded: '退款/售后'
  };
  return map[status] || status;
};

// Actions
const openPayment = (order) => {
  currentPayingOrder.value = order;
  showPayment.value = true;
};

const handlePaymentComplete = async (orderId) => {
  showPayment.value = false;
  try {
    await orderStore.updateOrderStatus(orderId, 'paid');
    showToast('支付成功！正在安排发货', 'success');
    activeTab.value = 'pending_shipment';
  } catch (e) {
    showToast('支付失败: ' + e.message, 'error');
  }
};

const handleCancel = async (order) => {
  if (confirm('确定要取消订单吗？')) {
    // In real app, call cancel API
    showToast('订单已取消', 'info');
  }
};

const handleRemind = () => {
  showToast('已提醒商家尽快发货', 'success');
};

const handleConfirmRecv = async (order) => {
  if (confirm('确认已收到商品？')) {
    try {
      await orderStore.updateOrderStatus(order.id, 'completed');
      showToast('收货成功，快去评价吧', 'success');
      activeTab.value = 'completed';
    } catch (e) {
      showToast('操作失败: ' + e.message, 'error');
    }
  }
};

const handleLogistics = () => {
  showToast('物流详情：已到达配送站，派送员正在派送中', 'info');
};

const handleReview = (order) => {
  // Simple simulation
  showToast('评价发布成功！', 'success');
  // In a real app, this would probably move it to a "completed" or "archived" state or just keep it in review/done
  // Let's just remove it from "review" list to "completed" implicitly by keeping it but maybe changing UI.
  // For now, let's just leave it or simulate archiving
};

const handleRefundDetail = () => {
  showToast('退款已原路退回至支付账户', 'info');
};

const close = () => {
  emit('close');
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
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
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
  e.currentTarget.style.transform = '';
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-100/50 backdrop-blur-sm">
    <!-- Mobile Full Screen / Desktop Modal -->
    <div 
      class="bg-gray-50 w-full h-full sm:h-[85vh] sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up transition-transform duration-100 ease-out will-change-transform"
      @mousemove="handleModalMouseMove"
      @mouseleave="handleModalMouseLeave"
    >
      
      <!-- Header -->
      <div class="bg-white px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <button @click="close" class="p-2 hover:bg-gray-100 rounded-full transition">
          <svg class="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <h2 class="text-lg font-bold text-slate-900">我的订单</h2>
        <div class="w-10"></div> <!-- Spacer for centering -->
      </div>
      
      <!-- Tabs -->
      <div class="bg-white px-2 pt-2 border-b border-gray-100 flex overflow-x-auto scrollbar-hide">
        <div v-for="tab in tabs" :key="tab.id" 
             @click="activeTab = tab.id"
             class="flex-none px-4 py-3 text-sm font-medium cursor-pointer relative transition-colors whitespace-nowrap"
             :class="activeTab === tab.id ? 'text-slate-900 font-bold' : 'text-gray-500 hover:text-slate-700'">
          {{ tab.name }}
          <div v-if="activeTab === tab.id" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-slate-900 rounded-t-full"></div>
        </div>
      </div>
      
      <!-- Order List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="filteredOrders.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
           <div class="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-4">
             <span class="text-6xl grayscale opacity-50">📦</span>
           </div>
           <p class="text-lg font-medium text-gray-600">暂无相关订单</p>
           <p class="text-sm mt-2 max-w-[200px] text-center">去市场看看吧，也许能发现心仪的好物</p>
        </div>
        
        <div v-else v-for="order in filteredOrders" :key="order.id" class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <!-- Header -->
          <div class="flex justify-between items-center mb-3 pb-3 border-b border-gray-50">
             <div class="flex items-center gap-2">
               <span class="font-bold text-sm text-slate-800">{{ order.shopName || 'NS 自营' }}</span>
               <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
             </div>
             <span class="text-sm font-bold" :class="{
               'text-orange-500': order.status === 'pending_payment',
               'text-blue-500': order.status === 'pending_shipment' || order.status === 'shipped',
               'text-green-500': order.status === 'completed',
               'text-gray-400': order.status === 'refunded'
             }">{{ getStatusText(order.status) }}</span>
          </div>
          
          <!-- Items -->
          <div v-for="(item, idx) in order.items" :key="idx" class="flex gap-3 mb-3 last:mb-0">
             <div class="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
               <img :src="item.img" class="w-full h-full object-cover">
             </div>
             <div class="flex-1 min-w-0">
               <div class="flex justify-between items-start">
                 <h3 class="text-sm font-bold text-slate-800 line-clamp-2 leading-tight">{{ item.name }}</h3>
                 <div class="text-right ml-4 flex-shrink-0">
                   <div class="text-sm font-bold">¥{{ item.price }}</div>
                   <div class="text-xs text-gray-400">x{{ item.count || 1 }}</div>
                 </div>
               </div>
               <p class="text-xs text-gray-400 mt-1">{{ item.specs || '默认规格' }}</p>
             </div>
          </div>
          
          <!-- Footer -->
          <div class="flex justify-end items-center gap-2 mt-3 pt-3 border-t border-dashed border-gray-100">
             <span class="text-xs text-gray-500">共 {{ order.items.length }} 件商品</span>
             <span class="text-sm text-slate-900">实付 <span class="font-bold text-base">¥{{ order.amount.toFixed(2) }}</span></span>
          </div>
          
          <!-- Actions -->
          <div class="flex justify-end gap-2 border-t border-gray-50 pt-3">
             <template v-if="order.status === 'pending_payment'">
               <button @click="handleCancel(order)" class="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 font-medium hover:bg-gray-50">取消订单</button>
               <button @click="openPayment(order)" class="px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold shadow-sm shadow-orange-200">立即支付</button>
             </template>
             
             <template v-else-if="order.status === 'pending_shipment'">
               <button @click="handleRemind" class="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 font-medium hover:bg-gray-50">提醒发货</button>
             </template>
             
             <template v-else-if="order.status === 'shipped'">
               <button @click="handleLogistics" class="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 font-medium hover:bg-gray-50">查看物流</button>
               <button @click="handleConfirmRecv(order)" class="px-4 py-1.5 rounded-full bg-slate-900 text-white text-sm font-bold shadow-sm">确认收货</button>
             </template>
             
             <template v-else-if="order.status === 'completed'">
               <button class="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 font-medium hover:bg-gray-50">删除订单</button>
               <button @click="handleReview(order)" class="px-4 py-1.5 rounded-full border border-orange-500 text-orange-500 text-sm font-medium hover:bg-orange-50">评价</button>
             </template>
             
             <template v-else-if="order.status === 'refunded'">
               <button @click="handleRefundDetail" class="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 font-medium hover:bg-gray-50">查看详情</button>
             </template>
          </div>
        </div>
        
        <div class="text-center text-xs text-gray-300 py-4">
          — 到底了 —
        </div>
      </div>
      
    </div>

    <!-- Payment Modal -->
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
.animate-slide-up {
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
