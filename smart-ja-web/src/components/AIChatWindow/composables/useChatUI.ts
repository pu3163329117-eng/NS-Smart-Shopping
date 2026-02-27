/**
 * 聊天UI组合式函数
 * 提取自AIChatWindow.vue的UI相关逻辑
 */

import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue';
import type { ChatTab } from '../types/chat.types';

/**
 * 聊天UI状态管理
 */
export function useChatUI() {
  // UI状态
  const isExpanded = ref(false);
  const showShareMenu = ref(false);
  const showEmojiPicker = ref(false);
  const showProductSuggestions = ref(false);
  const scrollPosition = ref(0);
  
  // 标签页状态
  const activeTab = ref<ChatTab>('ai');
  
  // DOM引用
  const chatContainer = ref<HTMLElement | null>(null);
  const inputElement = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

  /**
   * 切换展开状态
   */
  const toggleExpand = () => {
    isExpanded.value = !isExpanded.value;
    if (isExpanded.value) {
      setTimeout(scrollToBottom, 300);
    }
  };

  /**
   * 滚动到底部
   */
  const scrollToBottom = async () => {
    await nextTick();
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
      scrollPosition.value = chatContainer.value.scrollTop;
    }
  };

  /**
   * 滚动到顶部
   */
  const scrollToTop = () => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = 0;
      scrollPosition.value = 0;
    }
  };

  /**
   * 处理滚动事件
   */
  const handleScroll = () => {
    if (chatContainer.value) {
      scrollPosition.value = chatContainer.value.scrollTop;
    }
  };

  /**
   * 切换标签页
   */
  const switchTab = (tab: ChatTab) => {
    activeTab.value = tab;
    
    // 切换标签后滚动到底部
    setTimeout(() => {
      if (tab === 'ai' || tab === 'social') {
        scrollToBottom();
      }
    }, 100);
  };

  /**
   * 显示分享菜单
   */
  const openShareMenu = () => {
    showShareMenu.value = true;
    // 点击外部关闭
    setTimeout(() => {
      const handler = (e: MouseEvent) => {
        if (!(e.target as HTMLElement).closest('.share-menu')) {
          showShareMenu.value = false;
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 0);
  };

  /**
   * 关闭分享菜单
   */
  const closeShareMenu = () => {
    showShareMenu.value = false;
  };

  /**
   * 切换表情选择器
   */
  const toggleEmojiPicker = () => {
    showEmojiPicker.value = !showEmojiPicker.value;
    if (showEmojiPicker.value) {
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

  /**
   * 选择表情
   */
  const selectEmoji = (emoji: string, inputRef: { value: string }) => {
    inputRef.value += emoji;
    showEmojiPicker.value = false;
    
    // 聚焦输入框
    if (inputElement.value) {
      inputElement.value.focus();
    }
  };

  /**
   * 切换产品建议
   */
  const toggleProductSuggestions = () => {
    showProductSuggestions.value = !showProductSuggestions.value;
  };

  /**
   * 聚焦输入框
   */
  const focusInput = () => {
    if (inputElement.value) {
      inputElement.value.focus();
    }
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: KeyboardEvent, sendMessage: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    
    // ESC键关闭各种菜单
    if (e.key === 'Escape') {
      if (showShareMenu.value) {
        showShareMenu.value = false;
        e.stopPropagation();
      }
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

  /**
   * 格式化时间
   */
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  /**
   * 格式化消息时间
   */
  const formatMessageTime = (date: Date): string => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  /**
   * 检查是否在视口内
   */
  const isInViewport = (element: HTMLElement): boolean => {
    if (!chatContainer.value) return false;
    
    const containerRect = chatContainer.value.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    return (
      elementRect.top >= containerRect.top &&
      elementRect.bottom <= containerRect.bottom
    );
  };

  /**
   * 滚动到消息
   */
  const scrollToMessage = (messageId: number) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement && chatContainer.value) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  /**
   * 计算滚动位置百分比
   */
  const scrollPercentage = computed(() => {
    if (!chatContainer.value) return 0;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainer.value;
    if (scrollHeight <= clientHeight) return 100;
    
    return Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
  });

  /**
   * 检查是否在底部
   */
  const isAtBottom = computed(() => {
    if (!chatContainer.value) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainer.value;
    const threshold = 50; // 像素阈值
    
    return Math.abs(scrollHeight - clientHeight - scrollTop) < threshold;
  });

  // 监听滚动
  onMounted(() => {
    if (chatContainer.value) {
      chatContainer.value.addEventListener('scroll', handleScroll);
    }
  });

  onUnmounted(() => {
    if (chatContainer.value) {
      chatContainer.value.removeEventListener('scroll', handleScroll);
    }
  });

  // 监听标签切换，自动滚动
  watch(activeTab, (newTab) => {
    if (newTab === 'ai' || newTab === 'social') {
      setTimeout(scrollToBottom, 100);
    }
  });

  // 监听展开状态
  watch(isExpanded, (expanded) => {
    if (expanded) {
      // 展开时聚焦输入框
      setTimeout(focusInput, 350);
    }
  });

  return {
    // UI状态
    isExpanded,
    showShareMenu,
    showEmojiPicker,
    showProductSuggestions,
    scrollPosition,
    activeTab,
    
    // DOM引用
    chatContainer,
    inputElement,
    
    // 计算属性
    scrollPercentage,
    isAtBottom,
    
    // 方法
    toggleExpand,
    scrollToBottom,
    scrollToTop,
    switchTab,
    openShareMenu,
    closeShareMenu,
    toggleEmojiPicker,
    selectEmoji,
    toggleProductSuggestions,
    focusInput,
    handleKeyDown,
    formatTime,
    formatMessageTime,
    isInViewport,
    scrollToMessage,
    handleScroll
  };
}

// 计算属性需要单独导出
import { computed } from 'vue';
export { computed };