<template>
  <div class="user-profile-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">个人中心</h1>
      <p class="page-subtitle">管理你的账户、订单和创客工作室</p>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧：用户信息和操作 -->
      <div class="left-column">
        <UserBasicInfo 
          :user="user"
          :stats="userStats"
          @edit="openEditModal"
        />
        
        <UserStats 
          :stats="userStats"
          :achievements="achievements"
          :checkin-streak="checkinStreak"
          @checkin="handleCheckin"
          @view-orders="openOrderModal"
          @view-favorites="viewFavorites"
          @view-achievements="viewAchievements"
        />
        
        <UserActions 
          :is-maker-mode="activeTab === 'maker'"
          :recent-actions="recentActions"
          @edit-profile="openEditModal"
          @publish-work="openPublishModal"
          @view-income="openIncomeModal"
          @view-orders="openOrderModal"
          @view-interactions="openInteractionModal"
          @view-wallet="openWalletModal"
          @manage-address="openAddressModal"
          @seller-center="openSellerModal"
          @view-activities="openActivityModal"
          @customer-service="openServiceModal"
          @open-settings="openSettings"
          @toggle-mode="toggleTab"
          @repeat-action="repeatAction"
        />
      </div>

      <!-- 右侧：订单和创客内容 -->
      <div class="right-column">
        <!-- 个人模式：订单概览 -->
        <div v-if="activeTab === 'personal'">
          <OrderSummary 
            :order-counts="orderCounts"
            :recent-orders="recentOrders"
            :order-trend="orderTrend"
            @view-all-orders="openOrderModal"
            @view-pending-pay="viewPendingPay"
            @view-pending-ship="viewPendingShip"
            @view-pending-recv="viewPendingRecv"
            @view-pending-review="viewPendingReview"
            @view-order="viewOrderDetail"
            @go-shopping="goShopping"
          />
        </div>

        <!-- 创客模式：工作室 -->
        <div v-else>
          <MakerDashboard 
            :active-tab="currentMakerTab"
            :stats="makerStats"
            @switch-to-personal="toggleTab('personal')"
            @switch-tab="switchMakerTab"
            @create-service="createService"
            @view-orders="viewMakerOrders"
            @withdraw-earnings="withdrawEarnings"
            @handle-task="handleMakerTask"
          />
        </div>
      </div>
    </div>

    <!-- 模态框组件 -->
    <EditProfileModal 
      v-if="showEditModal"
      :user="user"
      @close="closeEditModal"
      @save="saveProfile"
    />
    
    <!-- 其他模态框会根据需要添加 -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserProfile, useMakerStudio } from './composables/useUserProfile';
import { useUserOrders } from './composables/useUserOrders';

// 组件导入
import UserBasicInfo from './components/UserBasicInfo.vue';
import UserStats from './components/UserStats.vue';
import UserActions from './components/UserActions.vue';
import OrderSummary from './components/OrderSummary.vue';
import MakerDashboard from './components/MakerDashboard.vue';
import EditProfileModal from './modals/EditProfileModal.vue';

// 使用组合式函数
const {
  userProfile,
  userLevelInfo,
  userStats,
  activeTab,
  currentMakerTab,
  handleCheckin,
  openEditModal,
  closeEditModal,
  toggleTab,
  switchMakerTab
} = useUserProfile();

const { makerStats, fetchMakerStats } = useMakerStudio();
const { orderCounts, recentOrders, orderTrend, fetchOrders } = useUserOrders();

// 本地状态
const showEditModal = ref(false);
const showPublishModal = ref(false);
const showOrderModal = ref(false);

// 用户数据
const user = computed(() => ({
  id: userProfile.value?.id || 1,
  name: userProfile.value?.name || '用户',
  avatar: userProfile.value?.avatar,
  bio: userProfile.value?.bio,
  verified: userProfile.value?.verified || false,
  level: userLevelInfo.value.level,
  exp: userLevelInfo.value.exp
}));

// 成就数据
const achievements = ref([
  { id: 1, name: '初来乍到', icon: '🎯', description: '首次登录平台' },
  { id: 2, name: '收藏达人', icon: '❤️', description: '收藏10个商品' },
  { id: 3, name: '订单先锋', icon: '📦', description: '完成第一个订单' },
  { id: 4, name: '签到之星', icon: '⭐', description: '连续签到7天' },
]);

// 连续签到天数
const checkinStreak = ref(5);

// 最近操作
const recentActions = ref([
  { id: 1, icon: '📦', title: '下单购买了智能花盆', time: '2小时前', repeatable: true },
  { id: 2, icon: '❤️', title: '收藏了编程学习套件', time: '昨天', repeatable: true },
  { id: 3, icon: '💬', title: '回复了AI导购的问题', time: '3天前', repeatable: false },
  { id: 4, icon: '⭐', title: '完成了每日签到', time: '今天 08:30', repeatable: true },
]);

// 生命周期
onMounted(async () => {
  await Promise.all([
    fetchMakerStats(),
    fetchOrders()
  ]);
});

// 事件处理函数
const openPublishModal = () => {
  showPublishModal.value = true;
  console.log('打开发布作品模态框');
};

const openOrderModal = () => {
  showOrderModal.value = true;
  console.log('打开订单中心模态框');
};

const openIncomeModal = () => {
  console.log('打开我的收入模态框');
};

const openInteractionModal = () => {
  console.log('打开我的互动模态框');
};

const openWalletModal = () => {
  console.log('打开我的钱包模态框');
};

const openAddressModal = () => {
  console.log('打开收货地址模态框');
};

const openSellerModal = () => {
  console.log('打开卖家中心模态框');
};

const openActivityModal = () => {
  console.log('打开活动中心模态框');
};

const openServiceModal = () => {
  console.log('打开客服帮助模态框');
};

const openSettings = () => {
  console.log('打开设置页面');
};

const viewFavorites = () => {
  console.log('查看收藏');
};

const viewAchievements = () => {
  console.log('查看成就');
};

const viewPendingPay = () => {
  console.log('查看待付款订单');
};

const viewPendingShip = () => {
  console.log('查看待发货订单');
};

const viewPendingRecv = () => {
  console.log('查看待收货订单');
};

const viewPendingReview = () => {
  console.log('查看待评价订单');
};

const viewOrderDetail = (orderId: number) => {
  console.log('查看订单详情:', orderId);
};

const goShopping = () => {
  console.log('去购物');
};

const createService = () => {
  console.log('创建新作品');
};

const viewMakerOrders = () => {
  console.log('查看创客订单');
};

const withdrawEarnings = () => {
  console.log('提现收入');
};

const handleMakerTask = (taskId: number) => {
  console.log('处理创客任务:', taskId);
};

const repeatAction = (action: any) => {
  console.log('重复操作:', action);
};

const saveProfile = (updatedUser: any) => {
  console.log('保存用户资料:', updatedUser);
  // 这里应该调用API保存数据
};
</script>

<style scoped>
.user-profile-container {
  @apply min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6;
}

.page-header {
  @apply mb-8;
}

.page-title {
  @apply text-3xl font-bold text-gray-800 mb-2;
}

.page-subtitle {
  @apply text-gray-600;
}

.main-content {
  @apply grid grid-cols-1 lg:grid-cols-3 gap-6;
}

.left-column {
  @apply lg:col-span-2 space-y-6;
}

.right-column {
  @apply space-y-6;
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .main-content {
    @apply grid-cols-1;
  }
  
  .left-column,
  .right-column {
    @apply col-span-1;
  }
}

/* 动画效果 */
.user-profile-container {
  animation: pageEnter 0.5s ease-out;
}

@keyframes pageEnter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>