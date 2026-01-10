<script setup>
import { ref, computed, watch } from 'vue';
import { useToast } from '../composables/useToast';

const props = defineProps({
  show: Boolean,
  initialTab: {
    type: String,
    default: 'all'
  }
});

const emit = defineEmits(['close']);
const { show: showToast } = useToast();

const activeTab = ref('all');

watch(() => props.show, (newVal) => {
  if (newVal) {
    activeTab.value = props.initialTab || 'all';
  }
});

const tabs = [
  { id: 'all', name: '全部' },
  { id: 'pendingPay', name: '待付款' },
  { id: 'pendingShip', name: '待发货' },
  { id: 'pendingRecv', name: '待收货' },
  { id: 'review', name: '评价' },
  { id: 'refund', name: '退款/售后' }
];

// Mock Orders
const orders = ref([
  {
    id: 'ORD-20260105-001',
    shopName: 'Keychron 官方旗舰店',
    status: 'pendingPay',
    items: [
      { name: 'Keychron Q1 Pro 机械键盘 蓝牙双模 客制化套件', img: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=200&h=200&fit=crop', price: 988.00, count: 1, specs: '碳黑色 / 茶轴' }
    ],
    total: 988.00,
    freight: 0
  },
  {
    id: 'ORD-20260104-002',
    shopName: 'NIKE 官方旗舰店',
    status: 'pendingShip',
    items: [
      { name: 'Nike Air Force 1 \'07 空军一号', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop', price: 749.00, count: 1, specs: '白色 / 42.5' }
    ],
    total: 749.00,
    freight: 0
  },
  {
    id: 'ORD-20260103-003',
    shopName: 'Muji 无印良品',
    status: 'pendingRecv',
    items: [
      { name: '无印良品 MUJI 舒适颈枕', img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=200&h=200&fit=crop', price: 128.00, count: 2, specs: '灰色' },
      { name: 'PP收纳盒', img: 'https://images.unsplash.com/photo-1591123120675-6f7f1aae0e5b?w=200&h=200&fit=crop', price: 45.00, count: 4, specs: '大号' }
    ],
    total: 436.00,
    freight: 0
  },
  {
    id: 'ORD-20260101-004',
    shopName: 'Apple Store',
    status: 'review',
    items: [
      { name: 'AirPods Pro (第二代)', img: 'https://images.unsplash.com/photo-1603351154351-5cf99bc32f2d?w=200&h=200&fit=crop', price: 1899.00, count: 1, specs: '白色' }
    ],
    total: 1899.00,
    freight: 0
  },
  {
    id: 'ORD-20261228-005',
    shopName: '优衣库 UNIQLO',
    status: 'refund',
    items: [
      { name: '男装 摇粒绒拉链茄克', img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&h=200&fit=crop', price: 199.00, count: 1, specs: '藏青色 / L' }
    ],
    total: 199.00,
    freight: 0,
    refundStatus: '退款成功'
  }
]);

const filteredOrders = computed(() => {
  if (activeTab.value === 'all') return orders.value;
  return orders.value.filter(o => o.status === activeTab.value);
});

const getStatusText = (status) => {
  const map = {
    pendingPay: '等待买家付款',
    pendingShip: '买家已付款',
    pendingRecv: '卖家已发货',
    review: '交易成功',
    refund: '退款/售后'
  };
  return map[status] || status;
};

// Actions
const handlePay = (order) => {
  showToast('支付成功！正在安排发货', 'success');
  order.status = 'pendingShip';
  activeTab.value = 'pendingShip'; // Auto switch tab to show progress
};

const handleCancel = (order) => {
  if (confirm('确定要取消订单吗？')) {
    orders.value = orders.value.filter(o => o.id !== order.id);
    showToast('订单已取消', 'info');
  }
};

const handleRemind = () => {
  showToast('已提醒商家尽快发货', 'success');
};

const handleConfirmRecv = (order) => {
  if (confirm('确认已收到商品？')) {
    order.status = 'review';
    showToast('收货成功，快去评价吧', 'success');
    activeTab.value = 'review';
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
        <div v-if="filteredOrders.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-400">
           <svg class="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
           <p>暂无相关订单</p>
        </div>

        <div v-for="order in filteredOrders" :key="order.id" 
             class="bg-white rounded-xl p-4 shadow-sm transition-transform duration-200 ease-out will-change-transform"
             @mousemove="handleCardMouseMove"
             @mouseleave="handleCardMouseLeave">
          <!-- Order Header -->
          <div class="flex justify-between items-center mb-3 pb-3 border-b border-gray-50">
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm text-slate-900">{{ order.shopName }}</span>
              <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
            <span class="text-sm font-medium" :class="order.status === 'refund' ? 'text-red-500' : 'text-orange-500'">
              {{ order.refundStatus || getStatusText(order.status) }}
            </span>
          </div>
          
          <!-- Order Items -->
          <div v-for="(item, idx) in order.items" :key="idx" class="flex gap-3 mb-3">
             <div class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
               <img :src="item.img" class="w-full h-full object-cover">
             </div>
             <div class="flex-1 min-w-0">
               <h3 class="text-sm font-medium text-slate-900 line-clamp-2 mb-1">{{ item.name }}</h3>
               <p class="text-xs text-gray-400 bg-gray-50 inline-block px-1.5 py-0.5 rounded mb-1">{{ item.specs }}</p>
             </div>
             <div class="text-right">
               <div class="text-sm font-bold text-slate-900">¥{{ item.price.toFixed(2) }}</div>
               <div class="text-xs text-gray-400">x{{ item.count }}</div>
             </div>
          </div>
          
          <!-- Order Footer Info -->
          <div class="flex justify-end items-center gap-2 mb-4">
             <span class="text-xs text-gray-500">共 {{ order.items.reduce((acc, i) => acc + i.count, 0) }} 件商品</span>
             <span class="text-sm font-medium text-slate-900">合计: <span class="font-bold text-base">¥{{ order.total.toFixed(2) }}</span></span>
          </div>
          
          <!-- Actions -->
          <div class="flex justify-end gap-2 border-t border-gray-50 pt-3">
             <template v-if="order.status === 'pendingPay'">
               <button @click="handleCancel(order)" class="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 font-medium hover:bg-gray-50">取消订单</button>
               <button @click="handlePay(order)" class="px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold shadow-sm shadow-orange-200">立即支付</button>
             </template>
             
             <template v-else-if="order.status === 'pendingShip'">
               <button @click="handleRemind" class="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 font-medium hover:bg-gray-50">提醒发货</button>
             </template>
             
             <template v-else-if="order.status === 'pendingRecv'">
               <button @click="handleLogistics" class="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 font-medium hover:bg-gray-50">查看物流</button>
               <button @click="handleConfirmRecv(order)" class="px-4 py-1.5 rounded-full bg-slate-900 text-white text-sm font-bold shadow-sm">确认收货</button>
             </template>
             
             <template v-else-if="order.status === 'review'">
               <button class="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 font-medium hover:bg-gray-50">删除订单</button>
               <button @click="handleReview(order)" class="px-4 py-1.5 rounded-full border border-orange-500 text-orange-500 text-sm font-medium hover:bg-orange-50">评价</button>
             </template>
             
             <template v-else-if="order.status === 'refund'">
               <button @click="handleRefundDetail" class="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 font-medium hover:bg-gray-50">查看详情</button>
             </template>
          </div>
        </div>
        
        <div class="text-center text-xs text-gray-300 py-4">
          — 到底了 —
        </div>
      </div>
      
    </div>
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
