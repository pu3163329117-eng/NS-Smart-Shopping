<template>
  <div class="user-basic-info">
    <!-- 用户头像和基本信息 -->
    <div class="flex items-center gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg">
      <!-- 头像 -->
      <div class="relative">
        <img 
          :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.name" 
          :alt="user.name"
          class="w-24 h-24 rounded-full border-4 border-white/50 shadow-xl"
        />
        <!-- 等级徽章 -->
        <div class="absolute -bottom-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          Lv.{{ levelInfo.level }}
        </div>
      </div>

      <!-- 用户信息 -->
      <div class="flex-1">
        <div class="flex items-center gap-3 mb-2">
          <h2 class="text-2xl font-bold text-gray-800">{{ user.name }}</h2>
          <span 
            v-if="user.verified" 
            class="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full"
          >
            ✓ 已认证
          </span>
        </div>
        
        <p class="text-gray-600 mb-3">{{ user.bio || '这个人很懒，还没有写简介~' }}</p>
        
        <!-- 社交信息 -->
        <div class="flex items-center gap-6 text-sm text-gray-500">
          <div class="flex items-center gap-1">
            <span class="text-lg">👥</span>
            <span>{{ stats.followerCount }} 粉丝</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-lg">❤️</span>
            <span>{{ stats.followingCount }} 关注</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-lg">⭐</span>
            <span>{{ stats.favoriteCount }} 收藏</span>
          </div>
        </div>
      </div>

      <!-- 编辑按钮 -->
      <button
        @click="$emit('edit')"
        class="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
      >
        编辑资料
      </button>
    </div>

    <!-- 经验进度条 -->
    <div class="mt-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-medium text-gray-700">
          经验值: {{ levelInfo.exp }}/{{ levelInfo.nextLevelExp }}
        </span>
        <span class="text-sm font-bold text-purple-600">
          距离 Lv.{{ levelInfo.level + 1 }} 还需 {{ levelInfo.nextLevelExp - levelInfo.exp }} 经验
        </span>
      </div>
      <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-500"
          :style="{ width: levelInfo.progress + '%' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface User {
  id: number;
  name: string;
  avatar?: string;
  bio?: string;
  verified?: boolean;
  level?: number;
  exp?: number;
}

interface Stats {
  followerCount: number;
  followingCount: number;
  favoriteCount: number;
}

interface Props {
  user: User;
  stats: Stats;
}

interface Emits {
  (e: 'edit'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 计算等级信息
const levelInfo = computed(() => {
  const level = props.user.level || 1;
  const exp = props.user.exp || 0;
  const nextLevelExp = level * 100;
  
  return {
    level,
    exp,
    nextLevelExp,
    progress: Math.min((exp / nextLevelExp) * 100, 100)
  };
});
</script>

<style scoped>
.user-basic-info {
  animation: fadeIn 0.5s ease-out;
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