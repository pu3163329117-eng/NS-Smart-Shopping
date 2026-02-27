<template>
  <div class="user-actions">
    <h3 class="section-title">快捷操作</h3>
    
    <!-- 操作按钮网格 -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <!-- 编辑资料 -->
      <ActionButton
        icon="✏️"
        label="编辑资料"
        description="修改个人信息"
        @click="$emit('edit-profile')"
      />

      <!-- 发布作品 -->
      <ActionButton
        icon="🚀"
        label="发布作品"
        description="分享你的创意"
        @click="$emit('publish-work')"
      />

      <!-- 我的收入 -->
      <ActionButton
        icon="💰"
        label="我的收入"
        description="查看收益明细"
        @click="$emit('view-income')"
      />

      <!-- 订单中心 -->
      <ActionButton
        icon="📦"
        label="订单中心"
        description="管理所有订单"
        @click="$emit('view-orders')"
      />

      <!-- 我的互动 -->
      <ActionButton
        icon="💬"
        label="我的互动"
        description="消息和评论"
        @click="$emit('view-interactions')"
      />

      <!-- 我的钱包 -->
      <ActionButton
        icon="💳"
        label="我的钱包"
        description="余额和交易记录"
        @click="$emit('view-wallet')"
      />

      <!-- 收货地址 -->
      <ActionButton
        icon="📍"
        label="收货地址"
        description="管理配送地址"
        @click="$emit('manage-address')"
      />

      <!-- 我是卖家 -->
      <ActionButton
        icon="🏪"
        label="我是卖家"
        description="卖家中心"
        @click="$emit('seller-center')"
      />

      <!-- 活动中心 -->
      <ActionButton
        icon="🎪"
        label="活动中心"
        description="平台活动"
        @click="$emit('view-activities')"
      />

      <!-- 客服帮助 -->
      <ActionButton
        icon="🆘"
        label="客服帮助"
        description="问题与反馈"
        @click="$emit('customer-service')"
      />

      <!-- 设置 -->
      <ActionButton
        icon="⚙️"
        label="设置"
        description="账户设置"
        @click="$emit('open-settings')"
      />

      <!-- 切换创客模式 -->
      <ActionButton
        :icon="isMakerMode ? '👨‍💻' : '🎨'"
        :label="isMakerMode ? '个人模式' : '创客模式'"
        :description="isMakerMode ? '切换到个人视图' : '进入创客工作室'"
        :class="isMakerMode ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'"
        @click="$emit('toggle-mode')"
      />
    </div>

    <!-- 最近操作 -->
    <div v-if="recentActions.length > 0" class="mt-6">
      <h4 class="text-sm font-medium text-gray-600 mb-2">最近操作</h4>
      <div class="space-y-2">
        <div 
          v-for="action in recentActions" 
          :key="action.id"
          class="recent-action"
        >
          <span class="action-icon">{{ action.icon }}</span>
          <div class="flex-1">
            <div class="action-title">{{ action.title }}</div>
            <div class="action-time">{{ action.time }}</div>
          </div>
          <button 
            v-if="action.repeatable"
            @click="$emit('repeat-action', action)"
            class="repeat-button"
          >
            再次操作
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ActionButton from './ActionButton.vue';

interface RecentAction {
  id: number;
  icon: string;
  title: string;
  time: string;
  repeatable?: boolean;
}

interface Props {
  isMakerMode?: boolean;
  recentActions?: RecentAction[];
}

interface Emits {
  (e: 'edit-profile'): void;
  (e: 'publish-work'): void;
  (e: 'view-income'): void;
  (e: 'view-orders'): void;
  (e: 'view-interactions'): void;
  (e: 'view-wallet'): void;
  (e: 'manage-address'): void;
  (e: 'seller-center'): void;
  (e: 'view-activities'): void;
  (e: 'customer-service'): void;
  (e: 'open-settings'): void;
  (e: 'toggle-mode'): void;
  (e: 'repeat-action', action: RecentAction): void;
}

const props = withDefaults(defineProps<Props>(), {
  isMakerMode: false,
  recentActions: () => []
});

const emit = defineEmits<Emits>();

// 默认最近操作
const defaultRecentActions: RecentAction[] = [
  { id: 1, icon: '📦', title: '下单购买了智能花盆', time: '2小时前', repeatable: true },
  { id: 2, icon: '❤️', title: '收藏了编程学习套件', time: '昨天', repeatable: true },
  { id: 3, icon: '💬', title: '回复了AI导购的问题', time: '3天前', repeatable: false },
  { id: 4, icon: '⭐', title: '完成了每日签到', time: '今天 08:30', repeatable: true },
];
</script>

<style scoped>
.user-actions {
  animation: fadeIn 0.6s ease-out;
}

.section-title {
  @apply text-xl font-bold text-gray-800 mb-4;
}

.recent-action {
  @apply flex items-center gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200/50;
  transition: all 0.2s ease;
}

.recent-action:hover {
  @apply bg-white/80 shadow-sm;
}

.action-icon {
  @apply text-xl;
}

.action-title {
  @apply text-sm font-medium text-gray-700;
}

.action-time {
  @apply text-xs text-gray-500;
}

.repeat-button {
  @apply px-3 py-1 text-xs bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full hover:shadow-md transition-shadow;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>