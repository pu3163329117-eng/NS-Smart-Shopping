<script setup>
import { useUserProfile } from '../store/userProfile';
import { useFavorites } from '../store/favorites';
import { useProducts } from '../store/products';
import { useToast } from '../composables/useToast';
import { computed, ref, onMounted, defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { UserService } from '../services/api';
import EditProfileModal from '../components/EditProfileModal.vue';
import PublishModal from '../components/PublishModal.vue';
import IncomeModal from '../components/IncomeModal.vue';
import OrderCenterModal from '../components/OrderCenterModal.vue';
import InteractionModal from '../components/InteractionModal.vue';
import WalletModal from '../components/WalletModal.vue';
import AddressModal from '../components/AddressModal.vue';
import SellerModal from '../components/SellerModal.vue';
import ActivityModal from '../components/ActivityModal.vue';
import ServiceModal from '../components/ServiceModal.vue';
import MakerDashboard from './maker/MakerDashboard.vue';
import MakerServices from './maker/MakerServices.vue';
import MakerOrders from './maker/MakerOrders.vue';
import MakerWallet from './maker/MakerWallet.vue';
import MakerProjects from './maker/MakerProjects.vue';

// ECharts
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';

use([
  CanvasRenderer,
  PieChart,
  TooltipComponent,
  LegendComponent
]);

// Provide theme
const VChartComponent = defineComponent({
  components: { VChart },
  setup() {
    return { THEME_KEY };
  }
});

const { userProfile, fetchProfile, updateProfile, dailyCheckin } = useUserProfile();
const { favorites } = useFavorites();
const { products } = useProducts();
const { show: showToast } = useToast();

const handleCheckin = async () => {
  try {
    const result = await dailyCheckin();
    showToast(`签到成功！获得 ${result.award.points} 积分和 ${result.award.exp} 经验`, 'success');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      showToast('今天已经签到过了哦', 'info');
    } else {
      showToast('签到失败，请稍后再试', 'error');
    }
  }
};

const router = useRouter();
const { t } = useI18n();

const isEditModalOpen = ref(false);
const isPublishModalOpen = ref(false);
const isIncomeModalOpen = ref(false);
const isOrderModalOpen = ref(false);
const currentOrderTab = ref('all');
const isInteractionModalOpen = ref(false);
const currentInteractionTab = ref('want');
const isWalletModalOpen = ref(false);
const currentWalletTab = ref('balance');
const isAddressModalOpen = ref(false);
const isSellerModalOpen = ref(false);
const currentSellerTab = ref('personal');
const isActivityModalOpen = ref(false);
const isServiceModalOpen = ref(false);
const currentServiceTab = ref('help');
const activeTab = ref('personal'); // 'personal' or 'maker'
const currentMakerTab = ref('dashboard');

const makerMenuItems = [
  { id: 'dashboard', name: '工作室概览', icon: '🎮' },
  { id: 'services', name: '我的作品/服务', icon: '🎨' },
  { id: 'orders', name: '接单任务', icon: '📜' },
  { id: 'projects', name: 'AI 孵化记录', icon: '🧪' },
  { id: 'wallet', name: '零花钱钱包', icon: '💰' },
];

// Reactive order counts from backend
const orderCounts = ref({
  pendingPay: 0,
  pendingShip: 0,
  pendingRecv: 0,
  review: 0,
  refund: 0
});

// Fetch orders on mount
onMounted(async () => {
  // Fetch user profile data
  await fetchProfile();
  
  // If still guest after fetch (and not first load), redirect or show login
  if (userProfile.userInfo.name === 'Guest') {
    // Optionally redirect to login or show toast
    // router.push('/login');
    showToast('登录状态已失效，请重新登录', 'warning');
  }

  try {
    const orders = await UserService.getMyOrders();
    // Calculate counts based on order status
    orderCounts.value = {
      pendingPay: orders.filter(o => o.status === 'pending_payment').length,
      pendingShip: orders.filter(o => o.status === 'pending_shipment').length,
      pendingRecv: orders.filter(o => o.status === 'shipped').length,
      review: orders.filter(o => o.status === 'completed' && !o.reviewed).length,
      refund: orders.filter(o => o.status === 'refunded').length
    };
  } catch (e) {
    console.error('Failed to fetch orders:', e);
  }
});

const handleSaveProfile = async (newData) => {
  const success = await updateProfile(newData);
  if (success) {
    showToast(t('common.profileUpdated') || 'Profile updated', 'success');
    isEditModalOpen.value = false;
  } else {
    showToast(t('common.profileUpdateFailed') || 'Update failed', 'error');
  }
};

// Sync 'want' count with actual favorites
const wantCount = computed(() => favorites.items.length);

const menuItems = computed(() => [
  { name: t('profile.publish'), icon: '📷', color: 'blue', action: 'publish' },
  { name: t('profile.dataCenter'), icon: '📊', color: 'purple', action: 'data' },
  { name: t('profile.myIncome'), icon: '💰', color: 'yellow', action: 'income' },
  { name: t('profile.activity'), icon: '🚩', color: 'red', action: 'activity' }
]);

const handleCreatorAction = (item) => {
  if (item.action === 'publish') {
    isPublishModalOpen.value = true;
  } else if (item.action === 'data') {
    router.push('/data-center');
  } else if (item.action === 'income') {
    isIncomeModalOpen.value = true;
  } else if (item.action === 'activity') {
    isActivityModalOpen.value = true;
  }
};

const handlePublishSelect = (type) => {
  isPublishModalOpen.value = false;
  showToast(`已选择发布: ${type.name}`, 'success');
  // In real app, navigate to specific creation page
  // router.push(`/create/${type.id}`);
};

const openWallet = (tab) => {
  currentWalletTab.value = tab;
  isWalletModalOpen.value = true;
};

const openSeller = (tab) => {
  currentSellerTab.value = tab;
  isSellerModalOpen.value = true;
};

const handleServiceAction = (item) => {
  if (item.icon === 'map-pin') {
    isAddressModalOpen.value = true;
  } else if (item.icon === 'headphones') {
    currentServiceTab.value = 'contact';
    isServiceModalOpen.value = true;
  } else if (item.icon === 'settings') {
    router.push('/settings');
  } else if (item.icon === 'help-circle') {
    currentServiceTab.value = 'help';
    isServiceModalOpen.value = true;
  }
};

const serviceItems = computed(() => [
  { name: t('profile.address'), icon: 'map-pin', color: 'orange' },
  { name: t('profile.customerService'), icon: 'headphones', color: 'blue' },
  { name: t('profile.settings'), icon: 'settings', color: 'gray' },
  { name: t('profile.help'), icon: 'help-circle', color: 'green' }
]);

const orderStatus = computed(() => [
  { id: 'pendingPay', name: t('profile.pendingPay'), icon: 'credit-card', count: orderCounts.value.pendingPay },
  { id: 'pendingShip', name: t('profile.pendingShip'), icon: 'box', count: orderCounts.value.pendingShip },
  { id: 'pendingRecv', name: t('profile.pendingRecv'), icon: 'truck', count: orderCounts.value.pendingRecv },
  { id: 'review', name: t('profile.review'), icon: 'message-square', count: orderCounts.value.review },
  { id: 'refund', name: t('profile.refund'), icon: 'shield', count: orderCounts.value.refund }
]);

const openOrderCenter = (tab = 'all') => {
  currentOrderTab.value = tab;
  isOrderModalOpen.value = true;
};

const openInteraction = (tab) => {
  currentInteractionTab.value = tab;
  isInteractionModalOpen.value = true;
};

const interactItems = computed(() => [
  { id: 'want', name: t('profile.want'), count: wantCount.value, icon: 'heart' },
  { id: 'owned', name: t('profile.owned'), count: userProfile.interactionCounts.owned, icon: 'check-circle' },
  { id: 'footprints', name: t('profile.footprints'), count: userProfile.interactionCounts.footprints, icon: 'footprints' },
  { id: 'following', name: t('profile.brandFollowing'), count: userProfile.interactionCounts.brandFollowing, icon: 'tag' }
]);


const goProduct = (id) => {
  router.push(`/product/${id}`);
};

const handleCardMouseMove = (e, cardId) => {
  let card;
  if (typeof cardId === 'string') {
    card = document.getElementById(cardId);
  } else {
    card = e.currentTarget;
  }

  if (!card) return;
  
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -2; // Subtle tilt
  const rotateY = ((x - centerX) / centerX) * 2;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
};

const handleCardMouseLeave = (eOrId) => {
  let card;
  if (typeof eOrId === 'string') {
    card = document.getElementById(eOrId);
  } else {
    card = eOrId.currentTarget;
  }

  if (!card) return;
  
  card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};

// Chart Data
const dnaChartOption = computed(() => ({
  color: ['#6366f1', '#ec4899', '#3b82f6', '#f59e0b', '#10b981'],
  tooltip: {
    trigger: 'item'
  },
  series: [
    {
      name: t('profile.preferences'),
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 5,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: [
        { value: 40, name: t('profile.prefDigital') },
        { value: 25, name: t('profile.prefFashion') },
        { value: 15, name: t('profile.prefHome') },
        { value: 12, name: t('profile.prefVirtual') },
        { value: 8, name: t('profile.prefOther') }
      ]
    }
  ]
}));
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    <!-- Top Header Section -->
    <div class="relative pt-20 pb-24 px-6 text-white overflow-hidden bg-cover bg-center transition-all duration-500"
         :style="userProfile.userInfo.backgroundImage ? `background-image: url(${userProfile.userInfo.backgroundImage})` : ''"
         :class="!userProfile.userInfo.backgroundImage ? 'bg-gradient-to-b from-[#2c3e50] to-[#34495e]' : ''">
      
      <!-- Dark overlay for readability when image is set -->
      <div v-if="userProfile.userInfo.backgroundImage" class="absolute inset-0 bg-black/40 z-0"></div>

      <!-- Background Pattern/Decor (only show if no custom image) -->
      <div v-if="!userProfile.userInfo.backgroundImage" class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <!-- Top Bar -->
      <div class="flex justify-between items-center mb-8 relative z-10">
        <div @click="isEditModalOpen = true" class="text-xs opacity-70 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm cursor-pointer hover:bg-black/30 transition">
          {{ $t('profile.changeBg') }}
        </div>
        <div class="flex gap-4">
          <button @click="router.push('/settings')" class="p-2 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-md">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </button>
          <button @click="isEditModalOpen = true" class="p-2 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-md">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
          </button>
        </div>
      </div>


      <!-- User Info -->
      <div class="flex items-center gap-4 relative z-10">
        <div class="relative">
          <img :src="userProfile?.userInfo?.avatar" class="w-20 h-20 rounded-full border-2 border-white/80 shadow-lg object-cover bg-white">
          <div v-if="userProfile.userInfo.gender === 'male'" class="absolute bottom-0 right-0 bg-blue-500 p-1 rounded-full border border-white">
             <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          </div>
        </div>
        
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h1 class="text-2xl font-bold tracking-wide">{{ userProfile.userInfo.name }}</h1>
            <span class="bg-gradient-to-r from-blue-400 to-cyan-300 text-[10px] font-bold px-1.5 py-0.5 rounded text-black flex items-center gap-0.5">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              Lv{{ userProfile.userInfo.level }}
            </span>
            <span class="text-xs text-gray-300 bg-white/10 px-1.5 py-0.5 rounded">{{ $t('profile.reputation') }} {{ userProfile.userInfo.reputation }}</span>
            <button @click="handleCheckin" class="ml-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg hover:scale-105 transition active:scale-95 flex items-center gap-1">
               <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
               签到
            </button>
          </div>
          
          <div class="flex items-center gap-2 text-xs text-gray-300 mb-3">
            <span>{{ userProfile.userInfo.sign }}</span>
          </div>

          <div class="flex gap-6 text-sm font-medium">
            <div class="flex flex-col items-center">
              <span class="font-bold text-white">{{ userProfile.stats.likes }}</span>
              <span class="text-xs text-gray-400 scale-90">{{ $t('profile.likes') }}</span>
            </div>
            <div class="flex flex-col items-center">
              <span class="font-bold text-white">{{ userProfile.stats.following }}</span>
              <span class="text-xs text-gray-400 scale-90">{{ $t('profile.following') }}</span>
            </div>
            <div class="flex flex-col items-center">
              <span class="font-bold text-white">{{ userProfile.stats.followers }}</span>
              <span class="text-xs text-gray-400 scale-90">{{ $t('profile.followers') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area - Overlapping Header -->
    <div class="px-4 -mt-10 relative z-20 space-y-4">

      <!-- Mode Switcher Tabs -->
      <div class="bg-white rounded-2xl p-1.5 flex shadow-sm mb-4">
        <button 
          @click="activeTab = 'personal'"
          class="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2"
          :class="activeTab === 'personal' ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          {{ $t('profile.personalCenter') || 'Personal' }}
        </button>
        <button 
          @click="activeTab = 'maker'"
          class="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2"
          :class="activeTab === 'maker' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
          {{ $t('nav.maker') || 'Maker Center' }}
        </button>
      </div>

      <!-- PERSONAL TAB CONTENT -->
      <div v-if="activeTab === 'personal'" class="space-y-4 animate-fade-in">
      <!-- AI Shopping DNA -->
      <div 
        id="dna-card"
        class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg p-1 transition-transform duration-200 ease-out will-change-transform hover:scale-[1.02]"
      >
        <div class="bg-white/95 backdrop-blur-sm rounded-xl p-4 h-full">
          <div class="flex justify-between items-center mb-3">
            <h2 class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600 text-lg flex items-center gap-2">
              <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
              {{ $t('profile.dna') }}
            </h2>
            <span class="text-[10px] font-bold text-white bg-black/20 px-2 py-1 rounded-full border border-white/20">{{ $t('profile.dnaBeta') }}</span>
          </div>
          <div class="flex items-center gap-4">
            <!-- DNA Visual (Chart) -->
            <div class="relative w-20 h-20 flex-shrink-0">
               <!-- <v-chart class="w-full h-full" :option="dnaChartOption" autoresize /> -->
               <div class="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-400">DNA</div>
            </div>
            
            <!-- DNA Text -->
            <div class="flex-1">
              <div class="flex justify-between items-end mb-1">
                <span class="text-sm font-bold text-slate-800">{{ $t('profile.dnaTitle') }}</span>
                <span class="text-xs text-purple-600 font-bold">{{ $t('profile.dnaRank') }}</span>
              </div>
              <p class="text-xs text-slate-500 leading-relaxed" v-html="$t('profile.dnaDesc')">
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 1. Creation Center -->
      <div 
        id="creation-card"
        @mousemove="(e) => handleCardMouseMove(e, 'creation-card')"
        @mouseleave="() => handleCardMouseLeave('creation-card')"
        class="bg-white rounded-2xl shadow-sm p-4 transition-transform duration-200 ease-out will-change-transform"
      >
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-bold text-slate-900 text-lg flex items-center gap-1">
            {{ $t('profile.creationCenter') }}
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </h2>
        </div>
        <div class="flex justify-between px-2">
          <div v-for="item in menuItems" :key="item.name" @click="handleCreatorAction(item)" class="flex flex-col items-center gap-2 cursor-pointer group">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl transition transform group-hover:scale-110 group-hover:rotate-6 shadow-sm group-hover:shadow"
                 :class="`bg-${item.color}-50 text-${item.color}-500`">
              {{ item.icon }}
            </div>
            <span class="text-xs text-gray-600 font-medium group-hover:text-slate-900 transition-colors">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- 2. Order Center -->
      <div 
        id="order-card"
        @mousemove="(e) => handleCardMouseMove(e, 'order-card')"
        @mouseleave="() => handleCardMouseLeave('order-card')"
        class="bg-white rounded-2xl shadow-sm p-4 transition-transform duration-200 ease-out will-change-transform"
      >
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-bold text-slate-900 text-lg">{{ $t('profile.orders') }}</h2>
          <span @click="openOrderCenter('all')" class="text-xs text-gray-400 flex items-center gap-0.5 cursor-pointer hover:text-slate-600 transition">{{ $t('profile.viewAll') }} <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></span>
        </div>
        <div class="flex justify-between px-1">
          <div v-for="status in orderStatus" :key="status.name" @click="openOrderCenter(status.id)" class="flex flex-col items-center gap-2 cursor-pointer relative group">
            <!-- Icons with round background -->
            <div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 group-hover:text-black group-hover:bg-slate-100 transition transform group-hover:scale-110">
               <svg v-if="status.icon === 'credit-card'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
               <svg v-else-if="status.icon === 'box'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
               <svg v-else-if="status.icon === 'truck'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
               <svg v-else-if="status.icon === 'message-square'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
               <svg v-else-if="status.icon === 'shield'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <span class="text-xs text-gray-600 font-medium group-hover:text-slate-900 transition-colors">{{ status.name }}</span>
            <div v-if="status.count > 0" class="absolute top-0 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 rounded-full border-2 border-white animate-pulse">
              {{ status.count }}
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Interaction Grid -->
      <div class="grid grid-cols-2 gap-4">
        <div v-for="(item, index) in interactItems" 
             :key="item.name" 
             :id="`interaction-card-${index}`"
             @mousemove="(e) => handleCardMouseMove(e, `interaction-card-${index}`)"
             @mouseleave="() => handleCardMouseLeave(`interaction-card-${index}`)"
             @click="openInteraction(item.id)" 
             class="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all duration-200 ease-out will-change-transform">
          <div class="flex items-center gap-3">
             <div class="text-slate-800 transition-transform duration-300 group-hover:scale-110">
               <svg v-if="item.icon === 'heart'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
               <svg v-else-if="item.icon === 'check-circle'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               <svg v-else-if="item.icon === 'footprints'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
               <svg v-else-if="item.icon === 'tag'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
             </div>
             <span class="font-bold text-slate-800">{{ item.name }}</span>
          </div>
          <div class="flex items-center text-gray-400 text-sm">
            <span class="mr-1 font-semibold text-slate-600">{{ item.count }}</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </div>
        </div>
      </div>

      <!-- 4. Wallet Section -->
      <div 
        id="wallet-card"
        @mousemove="(e) => handleCardMouseMove(e, 'wallet-card')"
        @mouseleave="() => handleCardMouseLeave('wallet-card')"
        class="bg-white rounded-2xl shadow-sm p-4 transition-transform duration-200 ease-out will-change-transform"
      >
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-bold text-slate-900 text-lg">{{ $t('profile.wallet') }}</h2>
          <span @click="openWallet('balance')" class="text-xs text-gray-400 flex items-center gap-0.5 cursor-pointer hover:text-slate-600 transition">{{ $t('profile.viewAll') }} <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></span>
        </div>
        <div class="flex justify-around text-center">
          <div @click="openWallet('balance')" class="flex flex-col gap-1 cursor-pointer hover:opacity-80 transition group">
             <span class="font-bold text-lg text-slate-900 group-hover:scale-110 transition-transform">¥{{ userProfile.wallet.balance.toFixed(2) }}</span>
             <span class="text-xs text-gray-500">{{ $t('profile.balance') }}</span>
          </div>
          <div @click="openWallet('points')" class="flex flex-col gap-1 cursor-pointer hover:opacity-80 transition group">
             <span class="font-bold text-lg text-slate-900 group-hover:scale-110 transition-transform">{{ userProfile.wallet.points }}</span>
             <span class="text-xs text-gray-500">{{ $t('profile.points') }}</span>
          </div>
          <div @click="openWallet('coupons')" class="flex flex-col gap-1 cursor-pointer hover:opacity-80 transition group">
            <span class="font-bold text-lg text-slate-900 group-hover:scale-110 transition-transform">{{ userProfile.wallet.coupons }}</span>
            <span class="text-xs text-gray-500">{{ $t('profile.coupons') }}</span>
          </div>
        </div>
      </div>

      <!-- 5. Merchant/Seller Entry -->
      <div 
        id="merchant-card"
        @mousemove="(e) => handleCardMouseMove(e, 'merchant-card')"
        @mouseleave="() => handleCardMouseLeave('merchant-card')"
        class="bg-white rounded-2xl shadow-sm p-0 overflow-hidden flex divide-x divide-gray-100 transition-transform duration-200 ease-out will-change-transform"
      >
        <div @click="openSeller('personal')" class="flex-1 p-4 cursor-pointer hover:bg-gray-50 transition group">
          <div class="flex justify-between items-start mb-1">
            <h3 class="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{{ $t('profile.applyIndividual') }}</h3>
            <svg class="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </div>
          <p class="text-xs text-gray-400">{{ $t('profile.applyIndividualDesc') }}</p>
        </div>
        <div @click="openSeller('enterprise')" class="flex-1 p-4 cursor-pointer hover:bg-gray-50 transition group">
          <div class="flex justify-between items-start mb-1">
            <h3 class="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{{ $t('profile.applyEnterprise') }}</h3>
            <svg class="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </div>
          <p class="text-xs text-gray-400">{{ $t('profile.applyEnterpriseDesc') }}</p>
        </div>
      </div>

      <!-- 6. Service & Tools -->
      <div 
        id="service-card"
        @mousemove="(e) => handleCardMouseMove(e, 'service-card')"
        @mouseleave="() => handleCardMouseLeave('service-card')"
        class="bg-white rounded-2xl shadow-sm p-4 mt-4 transition-transform duration-200 ease-out will-change-transform"
      >
        <h2 class="font-bold text-slate-900 text-lg mb-4">{{ $t('profile.services') }}</h2>
        <div class="flex justify-between px-2">
           <div v-for="item in serviceItems" :key="item.name" @click="handleServiceAction(item)" class="flex flex-col items-center gap-2 cursor-pointer group">
             <div class="w-12 h-12 rounded-2xl flex items-center justify-center transition transform group-hover:scale-110 group-hover:-rotate-6 shadow-sm group-hover:shadow"
                  :class="`bg-${item.color}-50 text-${item.color}-500`">
                 <!-- Icons -->
                 <svg v-if="item.icon === 'map-pin'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                 <svg v-else-if="item.icon === 'headphones'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                 <svg v-else-if="item.icon === 'settings'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                 <svg v-else-if="item.icon === 'help-circle'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <span class="text-xs text-gray-600 font-medium">{{ item.name }}</span>
           </div>
        </div>
      </div>

      <!-- 7. Guess You Like (Waterfall) -->
      <div class="mt-6">
         <div class="flex items-center gap-2 mb-4 px-2">
            <h2 class="font-bold text-slate-900 text-lg">{{ $t('profile.guessLike') }}</h2>
            <span class="text-xs text-gray-400 bg-gray-200 px-1.5 rounded">{{ $t('profile.recommend') }}</span>
         </div>
         
         <div class="grid grid-cols-2 gap-3">
            <div v-for="product in products" :key="product.id" 
                 @click="goProduct(product.id)" 
                 @mousemove="handleCardMouseMove"
                 @mouseleave="handleCardMouseLeave"
                 class="bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer group transition-transform duration-200 ease-out will-change-transform">
               <div class="relative aspect-[4/5] overflow-hidden">
                  <img :src="product.img" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
               </div>
               <div class="p-3">
                  <h3 class="text-sm font-bold text-slate-900 line-clamp-2 mb-1">{{ product.name }}</h3>
                  <div class="flex items-center gap-2 mb-2">
                     <span class="text-[10px] text-blue-500 border border-blue-200 px-1 rounded">{{ $t('profile.new') }}</span>
                     <span class="text-[10px] text-gray-400">{{ product.company }}</span>
                  </div>
                  <div class="flex items-baseline gap-1">
                     <span class="text-xs font-bold text-red-600">¥</span>
                     <span class="text-lg font-bold text-red-600">{{ product.price }}</span>
                     <span class="text-xs text-gray-400 ml-auto">{{ Math.floor(Math.random() * 500) + 100 }}{{ $t('profile.paid') }}</span>
                  </div>
               </div>
            </div>
         </div>
      </div>
      </div> <!-- End of Personal Tab -->

      <!-- MAKER TAB CONTENT -->
      <div v-if="activeTab === 'maker'" class="animate-fade-in pb-8">
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- Maker Sidebar -->
          <aside class="w-full lg:w-64 flex-shrink-0 space-y-4">
            <!-- Gamified Stats Card (Simplified) -->
            <div class="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div class="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
              <div class="relative z-10">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 rounded-full bg-white/20 p-0.5 backdrop-blur-sm">
                    <img :src="userProfile.userInfo.avatar" class="w-full h-full rounded-full bg-indigo-900" />
                  </div>
                  <div>
                    <h2 class="font-bold text-sm">Maker Lv.{{ userProfile.userInfo.level }}</h2>
                    <div class="text-[10px] bg-black/20 px-2 py-0.5 rounded-full inline-block">初级工匠</div>
                  </div>
                </div>
                <!-- EXP Bar -->
                <div class="relative pt-1">
                  <div class="flex mb-1 items-center justify-between text-[10px] opacity-80">
                    <span>EXP</span>
                    <span>350 / 500</span>
                  </div>
                  <div class="overflow-hidden h-1.5 text-xs flex rounded-full bg-black/20">
                    <div style="width: 70%" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-400"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Navigation Menu -->
            <nav class="bg-white rounded-2xl shadow-sm p-2">
              <button 
                v-for="item in makerMenuItems" 
                :key="item.id"
                @click="currentMakerTab = item.id"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left mb-1 last:mb-0"
                :class="currentMakerTab === item.id ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
              >
                <span class="text-xl group-hover:scale-110 transition-transform">{{ item.icon }}</span>
                <span>{{ item.name }}</span>
              </button>
            </nav>
          </aside>

          <!-- Maker Content Area -->
          <main class="flex-1 min-w-0">
            <Transition name="fade" mode="out-in">
              <MakerDashboard v-if="currentMakerTab === 'dashboard'" />
              <MakerServices v-else-if="currentMakerTab === 'services'" />
              <MakerOrders v-else-if="currentMakerTab === 'orders'" />
              <MakerProjects v-else-if="currentMakerTab === 'projects'" />
              <MakerWallet v-else-if="currentMakerTab === 'wallet'" />
            </Transition>
          </main>
        </div>
      </div>

    </div>

    <!-- Edit Profile Modal -->
    <EditProfileModal
      :isOpen="isEditModalOpen"
      :initialData="userProfile.userInfo"
      @close="isEditModalOpen = false"
      @save="handleSaveProfile"
    />

    <!-- Publish Modal -->
    <PublishModal
      :isOpen="isPublishModalOpen"
      @close="isPublishModalOpen = false"
      @select="handlePublishSelect"
    />

    <!-- Income Modal -->
    <IncomeModal
      :show="isIncomeModalOpen"
      @close="isIncomeModalOpen = false"
    />

    <!-- Order Center Modal -->
    <OrderCenterModal
      :show="isOrderModalOpen"
      :initialTab="currentOrderTab"
      @close="isOrderModalOpen = false"
    />

    <!-- Interaction Modal -->
    <InteractionModal
      :show="isInteractionModalOpen"
      :initialTab="currentInteractionTab"
      @close="isInteractionModalOpen = false"
    />

    <!-- Wallet Modal -->
    <WalletModal
      :show="isWalletModalOpen"
      :initialTab="currentWalletTab"
      @close="isWalletModalOpen = false"
    />

    <!-- Address Modal -->
    <AddressModal
      :show="isAddressModalOpen"
      @close="isAddressModalOpen = false"
    />

    <!-- Seller Modal -->
    <SellerModal
      :show="isSellerModalOpen"
      :initialTab="currentSellerTab"
      @close="isSellerModalOpen = false"
    />

    <!-- Activity Modal -->
    <ActivityModal
      :show="isActivityModalOpen"
      @close="isActivityModalOpen = false"
    />

    <!-- Service Modal -->
    <ServiceModal
      :show="isServiceModalOpen"
      :initialTab="currentServiceTab"
      @close="isServiceModalOpen = false"
    />
  </div>
</template>
