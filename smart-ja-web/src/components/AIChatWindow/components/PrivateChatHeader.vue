<template>
  <div class="private-chat-header">
    <button @click="$emit('back')" class="back-button" title="返回好友列表">
      ←
    </button>
    
    <div class="friend-info" @click="$emit('info')">
      <div class="friend-avatar">
        <div v-if="friend.avatar" class="avatar-image">
          <img :src="friend.avatar" :alt="friend.name" />
        </div>
        <div v-else class="avatar-placeholder">
          {{ friend.name.charAt(0) }}
        </div>
        <div v-if="friend.online" class="online-indicator"></div>
      </div>
      
      <div class="friend-details">
        <div class="friend-name">{{ friend.name }}</div>
        <div class="friend-status">
          <span v-if="friend.online" class="status-online">在线</span>
          <span v-else class="status-offline">
            最后在线: {{ formatLastSeen(friend.lastSeen) }}
          </span>
        </div>
      </div>
    </div>
    
    <div class="header-actions">
      <button @click="$emit('call')" class="action-button" title="语音通话">
        📞
      </button>
      <button @click="$emit('video')" class="action-button" title="视频通话">
        🎥
      </button>
      <button @click="$emit('more')" class="action-button" title="更多">
        ⋮
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Friend } from '../types/chat.types';

interface Props {
  friend: Friend;
}

interface Emits {
  (e: 'back'): void;
  (e: 'info'): void;
  (e: 'call'): void;
  (e: 'video'): void;
  (e: 'more'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const formatLastSeen = (lastSeen?: Date): string => {
  if (!lastSeen) return '未知';
  
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) {
    return '刚刚';
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return lastSeen.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  }
};
</script>

<style scoped>
.private-chat-header {
  @apply flex items-center justify-between p-4 border-b border-gray-200 bg-white;
}

.back-button {
  @apply w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-xl;
}

.friend-info {
  @apply flex items-center gap-3 flex-1 cursor-pointer;
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

.friend-details {
  @apply flex-1;
}

.friend-name {
  @apply font-bold text-gray-800 text-lg;
}

.friend-status {
  @apply text-sm;
}

.status-online {
  @apply text-green-600;
}

.status-offline {
  @apply text-gray-500;
}

.header-actions {
  @apply flex gap-1;
}

.action-button {
  @apply w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors;
}
</style>