<template>
  <div 
    :class="[
      'message-item',
      `message-${message.role}`,
      { 'message-mine': isMine }
    ]"
    :data-message-id="message.id"
  >
    <!-- 消息头像 -->
    <div v-if="showAvatar" class="message-avatar">
      <img 
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="senderName"
        class="avatar-image"
      />
      <div v-else class="avatar-placeholder">
        {{ avatarPlaceholder }}
      </div>
    </div>

    <!-- 消息内容 -->
    <div class="message-content">
      <!-- 发送者名称 -->
      <div v-if="showSenderName" class="sender-name">
        {{ senderName }}
      </div>

      <!-- 消息气泡 -->
      <div class="message-bubble">
        <!-- 文本消息 -->
        <div v-if="message.type === 'text'" class="message-text">
          {{ message.content }}
        </div>

        <!-- 产品推荐消息 -->
        <div v-else-if="message.type === 'product'" class="message-product">
          <div class="product-header">
            <span class="product-icon">🎯</span>
            <span class="product-title">商品推荐</span>
          </div>
          <div class="product-content">
            {{ message.content }}
          </div>
        </div>

        <!-- 系统消息 -->
        <div v-else-if="message.type === 'system'" class="message-system">
          <span class="system-icon">ℹ️</span>
          <span class="system-text">{{ message.content }}</span>
        </div>

        <!-- 消息时间 -->
        <div v-if="showTimestamp" class="message-time">
          {{ formattedTime }}
        </div>

        <!-- 消息状态 -->
        <div v-if="showStatus" class="message-status">
          <span v-if="status === 'sent'" class="status-sent">✓</span>
          <span v-if="status === 'delivered'" class="status-delivered">✓✓</span>
          <span v-if="status === 'read'" class="status-read">✓✓</span>
        </div>
      </div>

      <!-- 消息操作 -->
      <div v-if="showActions" class="message-actions">
        <button 
          v-if="canCopy"
          @click="handleCopy"
          class="action-button"
          title="复制"
        >
          📋
        </button>
        <button 
          v-if="canShare"
          @click="handleShare"
          class="action-button"
          title="分享"
        >
          ↗️
        </button>
        <button 
          v-if="canReply"
          @click="handleReply"
          class="action-button"
          title="回复"
        >
          ↩️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Message, SocialMessage } from '../types/chat.types';

interface Props {
  message: Message | SocialMessage;
  showAvatar?: boolean;
  showSenderName?: boolean;
  showTimestamp?: boolean;
  showStatus?: boolean;
  showActions?: boolean;
  avatarUrl?: string;
  senderName?: string;
  timestamp?: Date;
  status?: 'sent' | 'delivered' | 'read';
  isMine?: boolean;
}

interface Emits {
  (e: 'copy'): void;
  (e: 'share'): void;
  (e: 'reply'): void;
  (e: 'click'): void;
}

const props = withDefaults(defineProps<Props>(), {
  showAvatar: true,
  showSenderName: true,
  showTimestamp: true,
  showStatus: true,
  showActions: true,
  isMine: false
});

const emit = defineEmits<Emits>();

// 计算属性
const formattedTime = computed(() => {
  if (props.timestamp) {
    return formatTime(props.timestamp);
  }
  
  if ('timestamp' in props.message && props.message.timestamp) {
    return formatTime(props.message.timestamp);
  }
  
  return '刚刚';
});

const avatarPlaceholder = computed(() => {
  if (props.senderName) {
    return props.senderName.charAt(0).toUpperCase();
  }
  
  if (props.message.role === 'ai') {
    return 'AI';
  }
  
  return 'U';
});

const canCopy = computed(() => {
  return 'content' in props.message && props.message.content;
});

const canShare = computed(() => {
  return 'content' in props.message && props.message.content;
});

const canReply = computed(() => {
  return props.message.role !== 'system';
});

// 格式化时间
const formatTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) {
    return '刚刚';
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
};

// 事件处理
const handleCopy = () => {
  if ('content' in props.message) {
    navigator.clipboard.writeText(props.message.content)
      .then(() => {
        console.log('消息已复制');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  }
  emit('copy');
};

const handleShare = () => {
  if ('content' in props.message && navigator.share) {
    navigator.share({
      title: '聊天消息',
      text: props.message.content,
      url: window.location.href
    }).catch(err => {
      console.error('分享失败:', err);
    });
  }
  emit('share');
};

const handleReply = () => {
  emit('reply');
};
</script>

<style scoped>
.message-item {
  @apply flex gap-3 mb-4 transition-all duration-200;
}

.message-item:hover {
  @apply transform -translate-y-0.5;
}

.message-ai {
  @apply flex-row;
}

.message-user {
  @apply flex-row-reverse;
}

.message-mine {
  @apply flex-row-reverse;
}

.message-avatar {
  @apply flex-shrink-0;
}

.avatar-image {
  @apply w-10 h-10 rounded-full border-2 border-white shadow-sm;
}

.avatar-placeholder {
  @apply w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm;
}

.message-content {
  @apply max-w-[70%];
}

.message-user .message-content,
.message-mine .message-content {
  @apply flex flex-col items-end;
}

.sender-name {
  @apply text-xs text-gray-500 mb-1 px-2;
}

.message-bubble {
  @apply relative rounded-2xl px-4 py-3 shadow-sm;
  transition: all 0.2s ease;
}

.message-bubble:hover {
  @apply shadow-md;
}

.message-ai .message-bubble {
  @apply bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200;
}

.message-user .message-bubble,
.message-mine .message-bubble {
  @apply bg-gradient-to-br from-blue-500 to-purple-500 text-white;
}

.message-text {
  @apply text-gray-800 whitespace-pre-wrap break-words;
}

.message-user .message-text,
.message-mine .message-text {
  @apply text-white;
}

.message-product {
  @apply bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3;
}

.product-header {
  @apply flex items-center gap-2 mb-2;
}

.product-icon {
  @apply text-lg;
}

.product-title {
  @apply font-semibold text-green-700;
}

.product-content {
  @apply text-green-800;
}

.message-system {
  @apply bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 text-center;
}

.system-icon {
  @apply mr-2;
}

.system-text {
  @apply text-yellow-800;
}

.message-time {
  @apply text-xs text-gray-400 mt-2 text-right;
}

.message-user .message-time,
.message-mine .message-time {
  @apply text-white/70;
}

.message-status {
  @apply absolute -bottom-5 right-2 text-xs;
}

.status-sent {
  @apply text-gray-400;
}

.status-delivered {
  @apply text-blue-400;
}

.status-read {
  @apply text-green-400;
}

.message-actions {
  @apply flex gap-1 mt-2 opacity-0 transition-opacity duration-200;
}

.message-item:hover .message-actions {
  @apply opacity-100;
}

.action-button {
  @apply w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm transition-all;
}

.message-user .action-button,
.message-mine .action-button {
  @apply bg-white/20 text-white border-white/30 hover:bg-white/30;
}

/* 动画效果 */
@keyframes messageAppear {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-item {
  animation: messageAppear 0.3s ease-out;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .message-content {
    @apply max-w-[85%];
  }
  
  .message-bubble {
    @apply px-3 py-2;
  }
}
</style>