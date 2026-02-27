<template>
  <div class="maker-dashboard">
    <!-- 创客模式切换 -->
    <div class="maker-mode-header">
      <div class="maker-title">
        <span class="maker-icon">🎨</span>
        <h2 class="maker-title-text">创客工作室</h2>
      </div>
      <button 
        @click="$emit('switch-to-personal')"
        class="switch-mode-button"
      >
        切换个人模式
      </button>
    </div>

    <!-- 创客菜单 -->
    <div class="maker-menu">
      <button
        v-for="item in menuItems"
        :key="item.id"
        :class="[
          'maker-menu-item',
          { 'active': activeTab === item.id }
        ]"
        @click="$emit('switch-tab', item.id)"
      >
        <span class="menu-icon">{{ item.icon }}</span>
        <span class="menu-label">{{ item.name }}</span>
        <span v-if="hasNotifications(item.id)" class="notification-badge"></span>
      </button>
    </div>

    <!-- 创客统计 -->
    <div class="maker-stats">
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">¥{{ stats.totalEarnings.toLocaleString() }}</div>
          <div class="stat-label">总收入</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.completedOrders }}</div>
          <div class="stat-label">完成订单</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">🎨</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeServices }}</div>
          <div class="stat-label">活跃作品</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.rating.toFixed(1) }}</div>
          <div class="stat-label">平均评分</div>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="maker-content">
      <slot>
        <!-- 默认显示概览 -->
        <div class="overview-content">
          <h3 class="content-title">工作室概览</h3>
          <p class="content-description">
            欢迎来到你的创客工作室！在这里你可以管理作品、接单任务、查看收入。
          </p>
          
          <!-- 快速操作 -->
          <div class="quick-actions">
            <button 
              @click="$emit('create-service')"
              class="quick-action-button bg-gradient-to-r from-blue-500 to-cyan-500"
            >
              <span class="action-icon">➕</span>
              <span class="action-text">新建作品</span>
            </button>
            
            <button 
              @click="$emit('view-orders')"
              class="quick-action-button bg-gradient-to-r from-green-500 to-emerald-500"
            >
              <span class="action-icon">📋</span>
              <span class="action-text">查看订单</span>
            </button>
            
            <button 
              @click="$emit('withdraw-earnings')"
              class="quick-action-button bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <span class="action-icon">💳</span>
              <span class="action-text">提现收入</span>
            </button>
          </div>

          <!-- 待办事项 -->
          <div v-if="pendingTasks.length > 0" class="pending-tasks">
            <h4 class="tasks-title">待办事项</h4>
            <div class="tasks-list">
              <div 
                v-for="task in pendingTasks"
                :key="task.id"
                class="task-item"
              >
                <span class="task-icon">{{ task.icon }}</span>
                <div class="task-content">
                  <div class="task-title">{{ task.title }}</div>
                  <div class="task-description">{{ task.description }}</div>
                </div>
                <button 
                  @click="$emit('handle-task', task.id)"
                  class="task-action-button"
                >
                  处理
                </button>
              </div>
            </div>
          </div>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface MenuItem {
  id: string;
  name: string;
  icon: string;
}

interface MakerStats {
  totalEarnings: number;
  completedOrders: number;
  activeServices: number;
  pendingProjects: number;
  rating: number;
}

interface PendingTask {
  id: number;
  icon: string;
  title: string;
  description: string;
}

interface Props {
  activeTab?: string;
  menuItems?: MenuItem[];
  stats?: MakerStats;
  pendingTasks?: PendingTask[];
}

interface Emits {
  (e: 'switch-to-personal'): void;
  (e: 'switch-tab', tabId: string): void;
  (e: 'create-service'): void;
  (e: 'view-orders'): void;
  (e: 'withdraw-earnings'): void;
  (e: 'handle-task', taskId: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  activeTab: 'dashboard',
  menuItems: () => [
    { id: 'dashboard', name: '工作室概览', icon: '🎮' },
    { id: 'services', name: '我的作品/服务', icon: '🎨' },
    { id: 'orders', name: '接单任务', icon: '📜' },
    { id: 'projects', name: 'AI 孵化记录', icon: '🧪' },
    { id: 'wallet', name: '零花钱钱包', icon: '💰' },
  ],
  stats: () => ({
    totalEarnings: 1250,
    completedOrders: 24,
    activeServices: 5,
    pendingProjects: 3,
    rating: 4.5
  }),
  pendingTasks: () => [
    { id: 1, icon: '📦', title: '待发货订单', description: '有2个订单需要发货' },
    { id: 2, icon: '💬', title: '客户咨询', description: '3条未回复的客户消息' },
    { id: 3, icon: '⭐', title: '待评价订单', description: '5个订单等待你的评价' }
  ]
});

const emit = defineEmits<Emits>();

// 检查是否有通知
const hasNotifications = (tabId: string) => {
  const notifications: Record<string, boolean> = {
    'orders': true,
    'projects': true
  };
  return notifications[tabId] || false;
};
</script>

<style scoped>
.maker-dashboard {
  animation: fadeIn 0.5s ease-out;
}

.maker-mode-header {
  @apply flex items-center justify-between mb-6;
}

.maker-title {
  @apply flex items-center gap-3;
}

.maker-icon {
  @apply text-3xl;
}

.maker-title-text {
  @apply text-2xl font-bold text-gray-800;
}

.switch-mode-button {
  @apply px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-lg font-medium hover:shadow-lg transition-shadow;
}

.maker-menu {
  @apply flex flex-wrap gap-2 mb-8;
}

.maker-menu-item {
  @apply flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 relative;
  @apply bg-white/60 backdrop-blur-sm border border-gray-200/50;
  @apply hover:bg-white hover:shadow-md hover:-translate-y-0.5;
}

.maker-menu-item.active {
  @apply bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent;
}

.menu-icon {
  @apply text-lg;
}

.menu-label {
  @apply font-medium;
}

.notification-badge {
  @apply absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full;
}

.maker-stats {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4 mb-8;
}

.stat-card {
  @apply p-4 rounded-xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-sm;
  transition: all 0.3s ease;
}

.stat-card:hover {
  @apply shadow-md transform -translate-y-1;
}

.stat-icon {
  @apply text-2xl mb-2;
}

.stat-value {
  @apply text-xl font-bold text-gray-800;
}

.stat-label {
  @apply text-sm text-gray-600;
}

.maker-content {
  @apply bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/50;
}

.overview-content {
  animation: slideUp 0.5s ease-out;
}

.content-title {
  @apply text-xl font-bold text-gray-800 mb-2;
}

.content-description {
  @apply text-gray-600 mb-6;
}

.quick-actions {
  @apply flex flex-wrap gap-3 mb-8;
}

.quick-action-button {
  @apply flex items-center gap-2 px-4 py-3 text-white rounded-lg font-medium hover:shadow-lg transition-shadow;
}

.action-icon {
  @apply text-lg;
}

.action-text {
  @apply text-sm;
}

.pending-tasks {
  @apply mt-8;
}

.tasks-title {
  @apply text-lg font-semibold text-gray-700 mb-4;
}

.tasks-list {
  @apply space-y-3;
}

.task-item {
  @apply flex items-center gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50;
  transition: all 0.2s ease;
}

.task-item:hover {
  @apply bg-white shadow-sm;
}

.task-icon {
  @apply text-xl;
}

.task-content {
  @apply flex-1;
}

.task-title {
  @apply font-medium text-gray-700;
}

.task-description {
  @apply text-sm text-gray-500;
}

.task-action-button {
  @apply px-3 py-1 text-sm bg-gradient-to-r from-blue-400 to-cyan-500 text-white rounded-full hover:shadow-md transition-shadow;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
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