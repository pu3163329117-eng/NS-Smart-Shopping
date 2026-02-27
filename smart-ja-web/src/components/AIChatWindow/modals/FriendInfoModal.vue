<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h2 class="modal-title">好友信息</h2>
        <button @click="$emit('close')" class="close-button">
          ×
        </button>
      </div>
      
      <div class="modal-content">
        <div class="friend-avatar-large">
          <div v-if="friend.avatar" class="avatar-image">
            <img :src="friend.avatar" :alt="friend.name" />
          </div>
          <div v-else class="avatar-placeholder">
            {{ friend.name.charAt(0) }}
          </div>
          <div v-if="friend.online" class="online-indicator-large"></div>
        </div>
        
        <div class="friend-details">
          <h3 class="friend-name">{{ friend.name }}</h3>
          
          <div class="detail-item">
            <span class="detail-label">状态:</span>
            <span v-if="friend.online" class="status-online">在线</span>
            <span v-else class="status-offline">离线</span>
          </div>
          
          <div v-if="friend.lastSeen" class="detail-item">
            <span class="detail-label">最后在线:</span>
            <span class="detail-value">{{ formatLastSeen(friend.lastSeen) }}</span>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">未读消息:</span>
            <span class="detail-value">{{ friend.unreadCount }}条</span>
          </div>
        </div>
      </div>
      
      <div class="modal-actions">
        <button @click="handleMessage" class="action-button message-button">
          发送消息
        </button>
        <button @click="handleCall" class="action-button call-button">
          语音通话
        </button>
        <button @click="handleRemove" class="action-button remove-button">
          删除好友
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Friend } from '../types/chat.types';

interface Props {
  friend: Friend;
}

interface Emits {
  (e: 'close'): void;
  (e: 'message'): void;
  (e: 'call'): void;
  (e: 'remove'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const formatLastSeen = (lastSeen: Date): string => {
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
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
};

const handleMessage = () => {
  emit('message');
  emit('close');
};

const handleCall = () => {
  emit('call');
  emit('close');
};

const handleRemove = () => {
  if (confirm(`确定要删除好友 "${props.friend.name}" 吗？`)) {
    emit('remove');
    emit('close');
  }
};
</script>

<style scoped>
.modal-overlay {
  @apply fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50;
}

.modal-container {
  @apply bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden;
}

.modal-header {
  @apply flex items-center justify-between p-6 border-b border-gray-200;
}

.modal-title {
  @apply text-2xl font-bold text-gray-800;
}

.close-button {
  @apply text-3xl text-gray-400 hover:text-gray-600 transition-colors;
}

.modal-content {
  @apply p-6 text-center;
}

.friend-avatar-large {
  @apply relative inline-block mb-4;
}

.avatar-image {
  @apply w-24 h-24 rounded-full overflow-hidden mx-auto;
}

.avatar-image img {
  @apply w-full h-full object-cover;
}

.avatar-placeholder {
  @apply w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold text-3xl mx-auto;
}

.online-indicator-large {
  @apply absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white;
}

.friend-details {
  @apply space-y-3;
}

.friend-name {
  @apply text-xl font-bold text-gray-800 mb-4;
}

.detail-item {
  @apply flex justify-between items-center py-2 border-b border-gray-100;
}

.detail-label {
  @apply text-gray-600;
}

.detail-value {
  @apply text-gray-800 font-medium;
}

.status-online {
  @apply text-green-600 font-medium;
}

.status-offline {
  @apply text-gray-500 font-medium;
}

.modal-actions {
  @apply flex flex-col gap-2 p-6 border-t border-gray-200;
}

.action-button {
  @apply px-6 py-3 rounded-lg font-medium transition-colors;
}

.message-button {
  @apply bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg;
}

.call-button {
  @apply bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg;
}

.remove-button {
  @apply bg-gradient-to-r from-red-500 to-pink-500 text-white hover:shadow-lg;
}
</style>