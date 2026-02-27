<template>
  <div class="chat-header">
    <!-- 左侧：标题和状态 -->
    <div class="header-left">
      <div class="header-title">
        <span class="title-icon">💬</span>
        <h2 class="title-text">智能聊天</h2>
      </div>
      
      <div class="header-status">
        <span v-if="activeTab === 'ai'" class="status-badge ai-status">
          <span class="status-dot"></span>
          AI在线
        </span>
        <span v-else-if="activeTab === 'social'" class="status-badge social-status">
          <span class="status-dot"></span>
          社交聊天
        </span>
        <span v-else class="status-badge friends-status">
          <span class="status-dot"></span>
          好友列表
        </span>
        
        <span v-if="hasUnread" class="unread-badge">
          {{ unreadCount }}
        </span>
      </div>
    </div>

    <!-- 中间：标签页切换 -->
    <div class="header-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="$emit('switch-tab', tab.id)"
        :class="[
          'tab-button',
          { 'active': activeTab === tab.id }
        ]"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.id === 'social' && hasUnread" class="tab-badge"></span>
      </button>
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="header-actions">
      <button
        @click="$emit('toggle-expand')"
        class="action-button"
        :title="isExpanded ? '最小化' : '最大化'"
      >
        {{ isExpanded ? '➖' : '➕' }}
      </button>
      
      <button
        @click="$emit('close')"
        class="action-button close-button"
        title="关闭"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatTab } from '../types/chat.types';

interface Props {
  activeTab: ChatTab;
  isExpanded?: boolean;
  hasUnread?: boolean;
  unreadCount?: number;
}

interface Emits {
  (e: 'toggle-expand'): void;
  (e: 'switch-tab', tab: ChatTab): void;
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  isExpanded: false,
  hasUnread: false,
  unreadCount: 0
});

const emit = defineEmits<Emits>();

// 标签页配置
const tabs = [
  { id: 'ai' as ChatTab, icon: '🤖', label: 'AI导购' },
  { id: 'social' as ChatTab, icon: '💬', label: '社交' },
  { id: 'friends' as ChatTab, icon: '👥', label: '好友' }
];
</script>

<style scoped>
.chat-header {
  @apply flex items-center justify-between p-4 border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-blue-50/30;
}

.header-left {
  @apply flex flex-col gap-1;
}

.header-title {
  @apply flex items-center gap-2;
}

.title-icon {
  @apply text-2xl;
}

.title-text {
  @apply text-lg font-bold text-gray-800;
}

.header-status {
  @apply flex items-center gap-2;
}

.status-badge {
  @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium;
}

.ai-status {
  @apply bg-gradient-to-r from-green-100 to-emerald-100 text-green-700;
}

.social-status {
  @apply bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700;
}

.friends-status {
  @apply bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700;
}

.status-dot {
  @apply w-2 h-2 rounded-full;
}

.ai-status .status-dot {
  @apply bg-green-500;
}

.social-status .status-dot {
  @apply bg-blue-500;
}

.friends-status .status-dot {
  @apply bg-purple-500;
}

.unread-badge {
  @apply w-5 h-5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs flex items-center justify-center;
}

.header-tabs {
  @apply flex gap-1 bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-gray-200/50;
}

.tab-button {
  @apply flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 relative;
}

.tab-button:not(.active) {
  @apply text-gray-600 hover:bg-gray-100;
}

.tab-button.active {
  @apply bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md;
}

.tab-icon {
  @apply text-lg;
}

.tab-label {
  @apply text-sm font-medium;
}

.tab-badge {
  @apply absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full;
}

.header-actions {
  @apply flex gap-1;
}

.action-button {
  @apply w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:shadow-sm transition-all;
}

.close-button {
  @apply hover:bg-red-50 hover:text-red-600 hover:border-red-300;
}

/* 动画效果 */
.chat-header {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .chat-header {
    @apply p-3;
  }
  
  .header-tabs {
    @apply hidden; /* 在小屏幕上隐藏标签页，通过其他方式切换 */
  }
  
  .tab-label {
    @apply hidden; /* 在小屏幕上只显示图标 */
  }
}
</style>