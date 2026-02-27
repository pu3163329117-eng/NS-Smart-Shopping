<template>
  <div class="user-stats">
    <!-- 统计卡片网格 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <!-- 积分卡片 -->
      <div class="stat-card bg-gradient-to-br from-yellow-50 to-orange-50">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.points.toLocaleString() }}</div>
          <div class="stat-label">我的积分</div>
        </div>
        <button 
          @click="$emit('checkin')"
          :disabled="stats.todayChecked"
          :class="[
            'stat-button',
            stats.todayChecked 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:shadow-lg'
          ]"
        >
          {{ stats.todayChecked ? '已签到' : '每日签到' }}
        </button>
      </div>

      <!-- 订单卡片 -->
      <div class="stat-card bg-gradient-to-br from-blue-50 to-cyan-50">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.orderCount }}</div>
          <div class="stat-label">我的订单</div>
        </div>
        <button 
          @click="$emit('view-orders')"
          class="stat-button bg-gradient-to-r from-blue-400 to-cyan-500 text-white hover:shadow-lg"
        >
          查看订单
        </button>
      </div>

      <!-- 收藏卡片 -->
      <div class="stat-card bg-gradient-to-br from-pink-50 to-rose-50">
        <div class="stat-icon">❤️</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.favoriteCount }}</div>
          <div class="stat-label">我的收藏</div>
        </div>
        <button 
          @click="$emit('view-favorites')"
          class="stat-button bg-gradient-to-r from-pink-400 to-rose-500 text-white hover:shadow-lg"
        >
          查看收藏
        </button>
      </div>

      <!-- 成就卡片 -->
      <div class="stat-card bg-gradient-to-br from-green-50 to-emerald-50">
        <div class="stat-icon">🏆</div>
        <div class="stat-content">
          <div class="stat-value">{{ achievements.length }}</div>
          <div class="stat-label">我的成就</div>
        </div>
        <button 
          @click="$emit('view-achievements')"
          class="stat-button bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:shadow-lg"
        >
          查看成就
        </button>
      </div>
    </div>

    <!-- 成就徽章展示 -->
    <div v-if="achievements.length > 0" class="mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">已获得成就</h3>
      <div class="flex flex-wrap gap-3">
        <div 
          v-for="achievement in achievements" 
          :key="achievement.id"
          class="achievement-badge"
          :title="achievement.description"
        >
          <span class="achievement-icon">{{ achievement.icon }}</span>
          <span class="achievement-name">{{ achievement.name }}</span>
        </div>
      </div>
    </div>

    <!-- 连续签到 -->
    <div v-if="checkinStreak > 0" class="checkin-streak">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-md font-medium text-gray-700">连续签到</h4>
          <p class="text-2xl font-bold text-amber-600">{{ checkinStreak }} 天</p>
          <p class="text-sm text-gray-500">保持签到可获得额外奖励</p>
        </div>
        <div class="text-4xl">🔥</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Stats {
  points: number;
  todayChecked: boolean;
  orderCount: number;
  favoriteCount: number;
}

interface Achievement {
  id: number;
  name: string;
  icon: string;
  description: string;
}

interface Props {
  stats: Stats;
  achievements?: Achievement[];
  checkinStreak?: number;
}

interface Emits {
  (e: 'checkin'): void;
  (e: 'view-orders'): void;
  (e: 'view-favorites'): void;
  (e: 'view-achievements'): void;
}

const props = withDefaults(defineProps<Props>(), {
  achievements: () => [],
  checkinStreak: 0
});

const emit = defineEmits<Emits>();

// 默认成就数据
const defaultAchievements: Achievement[] = [
  { id: 1, name: '初来乍到', icon: '🎯', description: '首次登录平台' },
  { id: 2, name: '收藏达人', icon: '❤️', description: '收藏10个商品' },
  { id: 3, name: '订单先锋', icon: '📦', description: '完成第一个订单' },
  { id: 4, name: '签到之星', icon: '⭐', description: '连续签到7天' },
];

// 合并成就数据
const achievements = computed(() => {
  return props.achievements.length > 0 ? props.achievements : defaultAchievements;
});
</script>

<style scoped>
.user-stats {
  animation: slideUp 0.5s ease-out;
}

.stat-card {
  @apply p-4 rounded-xl shadow-sm border border-white/50 backdrop-blur-sm;
  transition: all 0.3s ease;
}

.stat-card:hover {
  @apply shadow-md transform -translate-y-1;
}

.stat-icon {
  @apply text-3xl mb-3;
}

.stat-content {
  @apply mb-3;
}

.stat-value {
  @apply text-2xl font-bold text-gray-800;
}

.stat-label {
  @apply text-sm text-gray-600;
}

.stat-button {
  @apply w-full py-2 rounded-lg font-medium transition-all duration-300;
}

.achievement-badge {
  @apply flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200;
  transition: all 0.2s ease;
}

.achievement-badge:hover {
  @apply transform scale-105 shadow-md;
}

.achievement-icon {
  @apply text-lg;
}

.achievement-name {
  @apply text-sm font-medium text-gray-700;
}

.checkin-streak {
  @apply p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200;
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