<template>
  <div ref="containerRef" class="message-list-container">
    <div v-if="messages.length === 0" class="empty-message">
      还没有消息，开始聊天吧！
    </div>
    
    <div v-else class="messages">
      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
    </div>
    
    <div v-if="isTyping" class="typing-indicator">
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span class="typing-text">AI正在输入...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import MessageItem from './MessageItem.vue';
import type { Message, SocialMessage } from '../types/chat.types';

interface Props {
  messages: (Message | SocialMessage)[];
  isTyping?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isTyping: false
});

const containerRef = ref<HTMLElement | null>(null);

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight;
  }
};

// 监听消息变化，自动滚动
watch(() => props.messages.length, () => {
  if (props.messages.length > 0) {
    setTimeout(scrollToBottom, 100);
  }
}, { immediate: true });

// 监听打字状态
watch(() => props.isTyping, (isTyping) => {
  if (isTyping) {
    setTimeout(scrollToBottom, 300);
  }
});

onMounted(() => {
  if (props.messages.length > 0) {
    setTimeout(scrollToBottom, 300);
  }
});

// 暴露方法给父组件
defineExpose({
  scrollToBottom
});
</script>

<style scoped>
.message-list-container {
  @apply flex-1 overflow-y-auto p-4;
  max-height: 400px;
}

.empty-message {
  @apply h-full flex items-center justify-center text-gray-400;
}

.messages {
  @apply space-y-4;
}

.typing-indicator {
  @apply flex items-center gap-2 mt-4 p-3 bg-gray-100 rounded-xl;
}

.typing-dots {
  @apply flex gap-1;
}

.typing-dots span {
  @apply w-2 h-2 bg-gray-400 rounded-full animate-pulse;
}

.typing-dots span:nth-child(1) {
  animation-delay: 0s;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

.typing-text {
  @apply text-sm text-gray-600;
}

/* 滚动条样式 */
.message-list-container::-webkit-scrollbar {
  width: 6px;
}

.message-list-container::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded-full;
}

.message-list-container::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full;
}

.message-list-container::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}
</style>