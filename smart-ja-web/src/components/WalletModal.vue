<script setup>
import { ref, computed } from 'vue';
import { useUserProfile } from '../store/userProfile';
import { useToast } from '../composables/useToast';

const props = defineProps({
  show: Boolean,
  initialTab: {
    type: String,
    default: 'balance'
  }
});

const emit = defineEmits(['close']);

const { userProfile } = useUserProfile();
const { show: showToast } = useToast();

const activeTab = ref(props.initialTab);

const tabs = [
  { id: 'balance', name: '余额' },
  { id: 'points', name: '积分' },
  { id: 'coupons', name: '优惠券' }
];

// Mock Data
const transactions = ref([
  { id: 1, type: '支出', title: '购买商品-霸芒留声玩偶', amount: -29.90, date: '2026-01-15 14:30' },
  { id: 2, type: '收入', title: '闲置出售-旧书', amount: 45.00, date: '2026-01-12 09:15' },
  { id: 3, type: '充值', title: '账户充值', amount: 100.00, date: '2026-01-10 18:20' },
]);

const pointHistory = ref([
  { id: 1, type: 'gain', title: '签到奖励', amount: +10, date: '2026-01-16' },
  { id: 2, type: 'gain', title: '购买商品奖励', amount: +29, date: '2026-01-15' },
  { id: 3, type: 'use', title: '抵扣现金', amount: -50, date: '2026-01-15' },
]);

const coupons = ref([
  { id: 1, name: '新人专享券', amount: 10, min: 0, desc: '无门槛使用', expire: '2026-02-01', status: 'available' },
  { id: 2, name: '满减优惠券', amount: 20, min: 199, desc: '满199可用', expire: '2026-02-15', status: 'available' },
  { id: 3, name: '运费抵扣券', amount: 8, min: 0, desc: '抵扣运费', expire: '2026-01-20', status: 'used' },
]);

const closeModal = () => {
  emit('close');
};

const handleTopUp = () => {
  showToast('充值功能开发中...', 'info');
};

const handleWithdraw = () => {
  showToast('提现申请已提交', 'success');
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
  <div v-if="show" class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

    <div 
      class="relative bg-gray-50 w-full sm:w-[480px] h-[85vh] sm:h-[800px] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up transition-transform duration-100 ease-out will-change-transform"
      @mousemove="handleModalMouseMove"
      @mouseleave="handleModalMouseLeave"
    >
      
      <!-- Header -->
      <div class="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 z-10">
        <h2 class="text-lg font-bold text-slate-900">我的钱包</h2>
        <button @click="closeModal" class="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="bg-white px-2 pt-2 border-b border-gray-100 flex overflow-x-auto scrollbar-hide shrink-0 z-10">
        <div v-for="tab in tabs" :key="tab.id" 
             @click="activeTab = tab.id"
             class="flex-1 px-4 py-3 text-sm font-medium cursor-pointer relative transition-colors whitespace-nowrap text-center"
             :class="activeTab === tab.id ? 'text-slate-900 font-bold' : 'text-gray-500 hover:text-slate-700'">
          {{ tab.name }}
          <div v-if="activeTab === tab.id" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-slate-900 rounded-t-full"></div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 scrollbar-hide bg-gray-50">
        
        <!-- Balance Tab -->
        <div v-if="activeTab === 'balance'" class="space-y-6">
          <div 
            class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg transition-transform duration-100 ease-out will-change-transform"
            @mousemove.stop="handleCardMouseMove"
            @mouseleave="handleCardMouseLeave"
          >
             <div class="text-sm text-slate-300 mb-1">总资产 (元)</div>
             <div class="text-3xl font-bold tracking-wider mb-6">{{ userProfile.wallet.balance.toFixed(2) }}</div>
             <div class="flex gap-4">
               <button @click="handleTopUp" class="flex-1 bg-white text-slate-900 py-2 rounded-xl font-bold text-sm hover:bg-gray-100 transition">充值</button>
               <button @click="handleWithdraw" class="flex-1 bg-white/10 text-white py-2 rounded-xl font-bold text-sm hover:bg-white/20 transition backdrop-blur-md">提现</button>
             </div>
          </div>

          <div>
            <h3 class="font-bold text-slate-900 mb-3">账单明细</h3>
            <div class="space-y-3">
               <div v-for="item in transactions" :key="item.id" 
                    class="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center transition-transform duration-100 ease-out will-change-transform"
                    @mousemove.stop="handleCardMouseMove"
                    @mouseleave="handleCardMouseLeave"
               >
                 <div>
                   <div class="font-bold text-slate-900 text-sm">{{ item.title }}</div>
                   <div class="text-xs text-gray-400 mt-1">{{ item.date }}</div>
                 </div>
                 <div class="font-bold" :class="item.amount > 0 ? 'text-red-500' : 'text-slate-900'">
                   {{ item.amount > 0 ? '+' : '' }}{{ item.amount.toFixed(2) }}
                 </div>
               </div>
            </div>
          </div>
        </div>

        <!-- Points Tab -->
        <div v-else-if="activeTab === 'points'" class="space-y-6">
           <div class="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
             <div class="absolute -right-4 -top-4 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
             <div class="relative z-10">
               <div class="text-sm text-white/90 mb-1">可用积分</div>
               <div class="text-3xl font-bold tracking-wider mb-4">{{ userProfile.wallet.points }}</div>
               <div class="text-xs text-white/80">100积分 = 1.00元</div>
             </div>
          </div>

          <div>
            <h3 class="font-bold text-slate-900 mb-3">积分明细</h3>
            <div class="space-y-3">
               <div v-for="item in pointHistory" :key="item.id" 
                    class="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center transition-transform duration-100 ease-out will-change-transform"
                    @mousemove.stop="handleCardMouseMove"
                    @mouseleave="handleCardMouseLeave"
               >
                 <div>
                   <div class="font-bold text-slate-900 text-sm">{{ item.title }}</div>
                   <div class="text-xs text-gray-400 mt-1">{{ item.date }}</div>
                 </div>
                 <div class="font-bold" :class="item.amount > 0 ? 'text-orange-500' : 'text-slate-900'">
                   {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}
                 </div>
               </div>
            </div>
          </div>
        </div>

        <!-- Coupons Tab -->
        <div v-else-if="activeTab === 'coupons'" class="space-y-4">
           <div v-for="coupon in coupons" :key="coupon.id" 
                class="relative bg-white rounded-xl shadow-sm overflow-hidden flex transition-transform duration-100 ease-out will-change-transform"
                @mousemove.stop="handleCardMouseMove"
                @mouseleave="handleCardMouseLeave"
           >
              <!-- Left Side -->
              <div class="w-24 bg-gradient-to-br from-red-50 to-red-100 flex flex-col items-center justify-center p-2 text-red-600 border-r border-dashed border-red-200">
                <span class="text-xs font-bold">¥</span>
                <span class="text-2xl font-bold">{{ coupon.amount }}</span>
                <span class="text-[10px]">{{ coupon.min > 0 ? `满${coupon.min}可用` : '无门槛' }}</span>
              </div>
              <!-- Right Side -->
              <div class="flex-1 p-3 flex flex-col justify-between relative">
                 <div>
                   <h3 class="font-bold text-slate-900 text-sm">{{ coupon.name }}</h3>
                   <p class="text-xs text-gray-500 mt-1">{{ coupon.desc }}</p>
                 </div>
                 <div class="flex justify-between items-end mt-2">
                   <span class="text-[10px] text-gray-400">{{ coupon.expire }} 到期</span>
                   <button v-if="coupon.status === 'available'" class="px-3 py-1 bg-red-500 text-white text-xs rounded-full font-medium">去使用</button>
                   <span v-else class="text-xs text-gray-400">已使用</span>
                 </div>
                 
                 <!-- Circle decorations -->
                 <div class="absolute -top-2 -left-2 w-4 h-4 bg-gray-50 rounded-full"></div>
                 <div class="absolute -bottom-2 -left-2 w-4 h-4 bg-gray-50 rounded-full"></div>
              </div>
           </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up {
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>