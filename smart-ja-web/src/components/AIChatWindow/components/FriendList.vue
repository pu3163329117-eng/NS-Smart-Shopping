<template>
  <div class="friend-list-container">
    <div class="friend-list-header">
      <h3 class="header-title">好友列表</h3>
      <div class="header-stats">
        <span class="online-count">{{ onlineCount }}人在线</span>
        <span class="total-count">共{{ friends.length }}人</span>
      </div>
    </div>
    
    <div v-if="friends.length === 0" class="empty-friends">
      还没有好友，快去添加吧！
    </div>
    
    <div v-else class="friends">
      <div
        v-for="friend in friends"
        :key="friend.id"
        class="friend-item"
        :class="{ 'active': friend.id === activeFriendId }"
        @click="$emit('select-friend', friend)"
      >
        <div class="friend-avatar">
          <div v-if="friend.avatar" class="avatar-image">
            <img :src="friend.avatar" :alt="friend.name" />
          </div>
          <div v-else class="avatar-placeholder">
            {{ friend.name.charAt(0) }}
          </div>
          <div v-if="friend.online" class="online-indicator"></div>
        </div>
        
        <div class="friend-info">
          <div class="friend-name">{{ friend.name }}</div>
          <div class="friend-status">
            <span v-if="friend.online" class="status-online">在线</span>
            <span v-else class="status-offline">离线</span>
          </div>
        </div>
        
        <div v-if="friend.unreadCount > 0" class="unread-badge">
          {{ friend.unreadCount }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Friend } from '../types/chat.types';

interface Props {
  friends: Friend[];
  activeFriendId?: number;
}

interface Emits {
  (e: 'select-friend', friend: Friend): void;
}

const props = withDefaults(defineProps<Props>(), {
  activeFriendId: null
});

const emit = defineEmits<Emits>();

const onlineCount = computed(() => {
  return props.friends.filter(friend => friend.online).length;
});
</script>

<style scoped>
.friend-list-container {
  @apply h-full overflow-y-auto p-4;
}

.friend-list-header {
  @apply mb-6 pb-4 border-b border-gray-200;
}

.header-title {
  @apply text-xl font-bold text-gray-800 mb-2;
}

.header-stats {
  @apply flex gap-4 text-sm text-gray-600;
}

.online-count {
  @apply text-green-600 font-medium;
}

.total-count {
  @apply text-gray-500;
}

.empty-friends {
  @apply h-full flex items-center justify-center text-gray-400;
}

.friends {
  @apply space-y-2;
}

.friend-item {
  @apply flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-gray-50;
}

.friend-item.active {
  @apply bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200;
}

.friend-avatar {
  @apply relative;
}

.avatar-image {
  @apply w-12 h-12 rounded-full overflow-hidden;
}

.avatar-image img {
  @apply w-full h-full object-cover;
}

.avatar-placeholder {
  @apply w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold text-lg;
}

.online-indicator {
  @apply absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white;
}

.friend-info {
  @apply flex-1;
}

.friend-name {
  @apply font-medium text-gray-800;
}

.friend-status {
  @apply text-sm;
}

.status-online {
  @apply text-green-600;
}

.status-offline {
  @apply text-gray-400;
}

.unread-badge {
  @apply w-6 h-6 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs flex items-center justify-center;
}

/* 滚动条样式 */
.friend-list-container::-webkit-scrollbar {
  width: 6px;
}

.friend-list-container::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded-full;
}

.friend-list-container::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full;
}

.friend-list-container::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}
</style>