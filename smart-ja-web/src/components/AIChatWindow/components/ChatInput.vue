<template>
  <div class="chat-input-container">
    <div class="input-area">
      <textarea
        ref="textareaRef"
        v-model="inputValue"
        :placeholder="placeholder"
        class="chat-textarea"
        @keydown="handleKeyDown"
      />
      
      <button
        @click="handleSend"
        :disabled="!canSendMessage"
        class="send-button"
      >
        发送
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  placeholder?: string;
}

interface Emits {
  (e: 'send', content: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '输入消息...'
});

const emit = defineEmits<Emits>();

const inputValue = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const canSendMessage = computed(() => {
  return inputValue.value.trim().length > 0;
});

const handleSend = () => {
  if (!canSendMessage.value) return;
  
  const content = inputValue.value.trim();
  emit('send', content);
  inputValue.value = '';
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};
</script>

<style scoped>
.chat-input-container {
  @apply bg-white border-t border-gray-200 p-4;
}

.input-area {
  @apply flex items-end gap-2;
}

.chat-textarea {
  @apply flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none;
  min-height: 44px;
}

.send-button {
  @apply px-6 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>