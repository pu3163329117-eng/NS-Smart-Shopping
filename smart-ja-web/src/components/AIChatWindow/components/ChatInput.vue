<template>
  <div class="chat-input-container">
    <!-- 快速回复建议 -->
    <div v-if="showQuickReplies && quickReplies.length > 0" class="quick-replies">
      <div class="quick-replies-label">快速回复：</div>
      <div class="quick-replies-list">
        <button
          v-for="(reply, index) in quickReplies"
          :key="index"
          @click="handleQuickReply(reply)"
          class="quick-reply-button"
        >
          {{ reply }}
        </button>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <!-- 左侧操作按钮 -->
      <div class="input-left-actions">
        <button
          @click="toggleEmojiPicker"
          class="action-button"
          :class="{ 'active': showEmojiPicker }"
          title="表情"
        >
          😊
        </button>
        <button
          @click="toggleProductSuggestions"
          class="action-button"
          :class="{ 'active': showProductSuggestions }"
          title="商品建议"
        >
          🎯
        </button>
        <button
          v-if="canAttach"
          @click="handleAttach"
          class="action-button"
          title="附件"
        >
          📎
        </button>
      </div>

      <!-- 主输入框 -->
      <div class="input-wrapper">
        <textarea
          ref="textareaRef"
          v-model="inputValue"
          :placeholder="placeholder"
          :rows="minRows"
          :max-rows="maxRows"
          class="chat-textarea"
          @keydown="handleKeyDown"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
        />
        
        <!-- 输入提示 -->
        <div v-if="showInputHint" class="input-hint">
          {{ inputHint }}
        </div>
      </div>

      <!-- 右侧操作按钮 -->
      <div class="input-right-actions">
        <button
          v-if="canSend"
          @click="handleSend"
          :disabled="!canSendMessage"
          class="send-button"
          :class="{ 'disabled': !canSendMessage }"
          title="发送"
        >
          <span v-if="isSending" class="sending-spinner"></span>
          <span v-else>发送</span>
        </button>
        <button
          v-else
          @click="handleRecord"
          class="record-button"
          title="语音输入"
        >
          🎤
        </button>
      </div>
    </div>

    <!-- 表情选择器 -->
    <div v-if="showEmojiPicker" class="emoji-picker">
      <div class="emoji-categories">
        <button
          v-for="category in emojiCategories"
          :key="category.name"
          @click="switchEmojiCategory(category.name)"
          :class="{ 'active': activeEmojiCategory === category.name }"
          class="emoji-category-button"
        >
          {{ category.icon }}
        </button>
      </div>
      <div class="emoji-grid">
        <button
          v-for="emoji in currentEmojis"
          :key="emoji"
          @click="selectEmoji(emoji)"
          class="emoji-button"
        >
          {{ emoji }}
        </button>
      </div>
    </div>

    <!-- 产品建议 -->
    <div v-if="showProductSuggestions && productSuggestions.length > 0" class="product-suggestions">
      <div class="suggestions-header">
        <span class="suggestions-title">商品建议：</span>
        <button @click="toggleProductSuggestions" class="close-suggestions">
          ×
        </button>
      </div>
      <div class="suggestions-list">
        <button
          v-for="product in productSuggestions"
          :key="product.id"
          @click="selectProductSuggestion(product)"
          class="product-suggestion-button"
        >
          <span class="product-icon">🛒</span>
          <span class="product-name">{{ product.name }}</span>
          <span class="product-price">¥{{ product.price }}</span>
        </button>
      </div>
    </div>

    <!-- 输入统计 -->
    <div v-if="showStats" class="input-stats">
      <span class="char-count">{{ charCount }}/{{ maxLength }}</span>
      <span v-if="typingSpeed > 0" class="typing-speed">
        速度: {{ typingSpeed }}字/分
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import type { Product } from '../types/chat.types';

interface Props {
  placeholder?: string;
  quickReplies?: string[];
  productSuggestions?: Product[];
  minRows?: number;
  maxRows?: number;
  maxLength?: number;
  showQuickReplies?: boolean;
  showStats?: boolean;
  canAttach?: boolean;
  canSend?: boolean;
  canRecord?: boolean;
  isSending?: boolean;
  autoFocus?: boolean;
}

interface Emits {
  (e: 'send', content: string): void;
  (e: 'quick-reply', reply: string): void;
  (e: 'product-suggestion', product: Product): void;
  (e: 'attach'): void;
  (e: 'record'): void;
  (e: 'input', value: string): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '输入消息...',
  quickReplies: () => [],
  productSuggestions: () => [],
  minRows: 1,
  maxRows: 4,
  maxLength: 1000,
  showQuickReplies: true,
  showStats: false,
  canAttach: true,
  canSend: true,
  canRecord: false,
  isSending: false,
  autoFocus: false
});

const emit = defineEmits<Emits>();

// 状态
const inputValue = ref('');
const showEmojiPicker = ref(false);
const showProductSuggestions = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const isFocused = ref(false);
const charCount = ref(0);
const typingSpeed = ref(0);
const lastTypingTime = ref(0);
const activeEmojiCategory = ref('smileys');

// 表情分类
const emojiCategories = [
  { name: 'smileys', icon: '😊' },
  { name: 'people', icon: '👋' },
  { name: 'animals', icon: '🐶' },
  { name: 'food', icon: '🍎' },
  { name: 'activities', icon: '⚽' },
  { name: 'objects', icon: '💡' },
  { name: 'symbols', icon: '❤️' },
  { name: 'flags', icon: '🚩' }
];

// 表情数据（简化版）
const emojis = {
  smileys: ['😊', '😂', '🥰', '😎', '🤔', '😢', '😡', '🤯', '🥳', '😴'],
  people: ['👋', '👍', '👏', '🙏', '💪', '👀', '👂', '👃', '👄', '💋'],
  animals: ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁'],
  food: ['🍎', '🍌', '🍇', '🍓', '🍕', '🍔', '🍟', '🍦', '🍩', '🍺'],
  activities: ['⚽', '🏀', '🎾', '🎸', '🎮', '🎨', '🎭', '🎪', '🎬', '🎤'],
  objects: ['💡', '📱', '💻', '📷', '🎥', '📚', '✏️', '🎁', '💎', '💰'],
  symbols: ['❤️', '⭐', '✨', '🔥', '💧', '🌈', '☀️', '☁️', '❄️', '🌸'],
  flags: ['🚩', '🎌', '🏴', '🏳️', '🇨🇳', '🇺🇸', '🇯🇵', '🇰🇷', '🇬🇧', '🇫🇷']
};

// 计算属性
const currentEmojis = computed(() => {
  return emojis[activeEmojiCategory.value as keyof typeof emojis] || [];
});

const canSendMessage = computed(() => {
  return inputValue.value.trim().length > 0 && !props.isSending;
});

const charCount = computed(() => {
  return inputValue.value.length;
});

const inputHint = computed(() => {
  if (charCount.value >= props.maxLength * 0.9) {
    return `还剩${props.maxLength - charCount.value}字`;
  }
  return '';
});

const showInputHint = computed(() => {
  return inputHint.value.length > 0;
});

const textareaRows = computed(() => {
  const lines = inputValue.value.split('\n').length;
  return Math.min(Math.max(lines, props.minRows), props.maxRows);
});

// 方法
const handleSend = () => {
  if (!canSendMessage.value) return;
  
  const content = inputValue.value.trim();
  emit('send', content);
  inputValue.value = '';
  showEmojiPicker.value = false;
  showProductSuggestions.value = false;
};

const handleQuickReply = (reply: string) => {
  emit('quick-reply', reply);
};

const handleKeyDown = (e: KeyboardEvent) => {
  // Enter发送，Shift+Enter换行
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
  
  // ESC关闭各种选择器
  if (e.key === 'Escape') {
    if (showEmojiPicker.value) {
      showEmojiPicker.value = false;
      e.stopPropagation();
    }
    if (showProductSuggestions.value) {
      showProductSuggestions.value = false;
      e.stopPropagation();
    }
  }
};

const handleInput = () => {
  emit('input', inputValue.value);
  
  // 计算打字速度
  const now = Date.now();
  if (lastTypingTime.value > 0) {
    const timeDiff = now - lastTypingTime.value;
    if (timeDiff < 1000) { // 1秒内的输入
      typingSpeed.value = Math.round((60 / (timeDiff / 1000)) * (charCount.value / 100));
    }
  }
  lastTypingTime.value = now;
  
  // 自动调整高度
  adjustTextareaHeight();
};

const handleFocus = () => {
  isFocused.value = true;
  emit('focus');
};

const handleBlur = () => {
  isFocused.value = false;
  emit('blur');
};

const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value;
  if (showEmojiPicker.value) {
    showProductSuggestions.value = false;
    // 点击外部关闭
    setTimeout(() => {
      const handler = (e: MouseEvent) => {
        if (!(e.target as HTMLElement).closest('.emoji-picker')) {
          showEmojiPicker.value = false;
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 0);
  }
};

const toggleProductSuggestions = () => {
  showProductSuggestions.value = !showProductSuggestions.value;
  if (showProductSuggestions.value) {
    showEmojiPicker.value = false;
    // 点击外部关闭
    setTimeout(() => {
      const handler = (e: MouseEvent) => {
        if (!(e.target as HTMLElement).closest('.product-suggestions')) {
          showProductSuggestions.value = false;
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 0);
  }
};

const switchEmojiCategory = (category: string) => {
  activeEmojiCategory.value = category;
};

const selectEmoji = (emoji: string) => {
  inputValue.value += emoji;
  showEmojiPicker.value = false;
  focusTextarea();
};

const selectProductSuggestion = (product: Product) => {
  emit('product-suggestion', product);
  showProductSuggestions.value = false;
};

const handleAttach = () => {
  emit('attach');
};

const handleRecord = () => {
  emit('record');
};

const adjustTextareaHeight = () => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto';
      const newHeight = Math.min(
        textareaRef.value.scrollHeight,
        props.maxRows * 24 // 每行大约24px
      );
      textareaRef.value.style.height = `${newHeight}px`;
    }
  });
};

const focusTextarea = () => {
  if (textareaRef.value) {
    textareaRef.value.focus();
  }
};

// 监听自动聚焦
watch(() => props.autoFocus, (shouldFocus) => {
  if (shouldFocus) {
    setTimeout(focusTextarea, 100);
  }
}, { immediate: true });

// 初始化
onMounted(() => {
  if (props.autoFocus) {
    setTimeout(focusTextarea, 300);
  }
});
</script>

<style scoped>
.chat-input-container {
  @apply bg-white/80 backdrop-blur-sm border-t border-gray-200/50 p-4;
}

.quick-replies {
  @apply mb-3;
}

.quick-replies-label {
  @apply text-sm text-gray-500 mb-2;
}

.quick-replies-list {
  @apply flex flex-wrap gap-2;
}

.quick-reply-button {
  @apply px-3 py-1.5 text-sm bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full hover:shadow-md transition-shadow;
}

.input-area {
  @apply flex items-end gap-2;
}

.input-left-actions {
  @apply flex gap-1;
}

.action-button {
  @apply w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:shadow-sm transition-all;
}

.action-button.active {
  @apply bg-gradient-to-r from-blue-100 to-purple-100 border-blue-300 text-blue-600;
}

.input-wrapper {
  @apply flex-1 relative;
}

.chat-textarea {
  @apply w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all;
  min-height: 44px;
  max-height: 96px; /* 4行 * 24px */
}

.input-hint {
  @apply absolute -top-6 right-0 text-xs text-orange-500;
}

.input-right-actions {
  @apply flex-shrink-0;
}

.send-button {
  @apply px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed;
}

.send-button.disabled {
  @apply bg-gradient-to-r from-gray-400 to-gray-500;
}

.record-button {
  @apply w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center justify-center hover:shadow-lg transition-shadow;
}

.sending-spinner {
  @apply w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin;
}

.emoji-picker {
  @apply absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-10;
  max-height: 300px;
  overflow-y: auto;
}

.emoji-categories {
  @apply flex gap-1 mb-3 pb-2 border-b border-gray-200;
}

.emoji-category-button {
  @apply w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors;
}

.emoji-category-button.active {
  @apply bg-gradient-to-r from-blue-100 to-purple-100;
}

.emoji-grid {
  @apply grid grid-cols-10 gap-1;
}

.emoji-button {
  @apply w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-gray-100 transition-colors;
}

.product-suggestions {
  @apply absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-10;
}

.suggestions-header {
  @apply flex items-center justify-between mb-2 pb-2 border-b border-gray-200;
}

.suggestions-title {
  @apply font-medium text-gray-700;
}

.close-suggestions {
  @apply w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100;
}

.suggestions-list {
  @apply space-y-2;
}

.product-suggestion-button {
  @apply w-full px-3 py-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 flex items-center justify-between hover:shadow-md transition-shadow;
}

.product-icon {
  @apply text-lg;
}

.product-name {
  @apply text-green-700 font-medium;
}

.product-price {
  @apply text-green-600 font-bold;
}

.input-stats {
  @apply flex justify