<template>
  <div 
    :class="[
      'ai-chat-window',
      { 'expanded': isExpanded },
      { 'minimized': !isOpen }
    ]"
  >
    <!-- 聊天窗口头部 -->
    <ChatHeader
      :active-tab="activeTab"
      :is-expanded="isExpanded"
      :has-unread="hasUnreadMessages"
      @toggle-expand="toggleExpand"
      @switch-tab="switchTab"
      @close="$emit('close')"
    />

    <!-- 主要内容区域 -->
    <div v-if="isOpen" class="chat-main">
      <!-- AI聊天面板 -->
      <div v-if="activeTab === 'ai'" class="chat-panel">
        <MessageList
          :messages="aiMessages"
          :is-typing="isTyping"
          @scroll-to-bottom="scrollToBottom"
        />
        
        <ChatInput
          v-model="inputMessage"
          :quick-replies="quickReplies"
          :is-sending="isLoading"
          @send="sendAIMessage"
          @quick-reply="handleQuickReply"
        />
      </div>

      <!-- 社交聊天面板 -->
      <div v-else-if="activeTab === 'social'" class="chat-panel">
        <!-- 好友列表视图 -->
        <div v-if="!activeFriendId" class="friend-list-view">
          <FriendList
            :friends="sortedFriends"
            :search-query="friendSearchQuery"
            @select-friend="openPrivateChat"
            @search="updateFriendSearch"
          />
        </div>

        <!-- 私聊视图 -->
        <div v-else class="private-chat-view">
          <PrivateChatHeader
            :friend="activeFriend"
            @back="backToFriendList"
            @info="showFriendInfo"
          />
          
          <MessageList
            :messages="currentPrivateMessages"
            :show-avatar="true"
            :show-sender-name="true"
            @scroll-to-bottom="scrollToBottom"
          />
          
          <ChatInput
            v-model="socialInputMessage"
            @send="sendPrivateMessage"
          />
        </div>
      </div>

      <!-- 好友列表面板 -->
      <div v-else class="friends-panel">
        <FriendList
          :friends="sortedFriends"
          :show-actions="true"
          @select-friend="openPrivateChat"
          @add-friend="showAddFriendModal"
          @remove-friend="confirmRemoveFriend"
        />
      </div>
    </div>

    <!-- 模态框 -->
    <AddFriendModal
      v-if="showAddFriendModal"
      @close="closeAddFriendModal"
      @add="handleAddFriend"
    />

    <FriendInfoModal
      v-if="showFriendInfoModal && activeFriend"
      :friend="activeFriend"
      @close="closeFriendInfoModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { ChatTab, Friend } from './types/chat.types';

// 组合式函数
import { useAIChat } from './composables/useAIChat';
import { useSocialChat } from './composables/useSocialChat';
import { useChatUI } from './composables/useChatUI';

// 组件
import ChatHeader from './components/ChatHeader.vue';
import MessageList from './components/MessageList.vue';
import ChatInput from './components/ChatInput.vue';
import FriendList from './components/FriendList.vue';
import PrivateChatHeader from './components/PrivateChatHeader.vue';
import AddFriendModal from './modals/AddFriendModal.vue';
import FriendInfoModal from './modals/FriendInfoModal.vue';

interface Props {
  isOpen: boolean;
  initialTab?: ChatTab;
  initialFriendId?: number;
}

interface Emits {
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialTab: 'ai',
  initialFriendId: null
});

const emit = defineEmits<Emits>();

// 模拟产品数据（实际应该从store获取）
const mockProducts = [
  {
    id: 1,
    name: '智能编程机器人',
    price: 299,
    company: '创客科技',
    desc: '适合初学者的编程学习工具',
    longDesc: '这款智能编程机器人专为青少年设计，通过图形化编程界面，让学习编程变得简单有趣。支持多种传感器和扩展模块。'
  },
  {
    id: 2,
    name: '3D打印笔套装',
    price: 159,
    company: '创意工坊',
    desc: '将创意变为现实的3D绘画工具',
    longDesc: '无需电脑，直接在空气中作画。安全环保的PLA材料，适合儿童和初学者使用。'
  }
];

// 使用组合式函数
const {
  messages: aiMessages,
  inputMessage,
  isTyping,
  isLoading,
  quickReplies,
  sendMessage: sendAIMessage,
  suggestProducts,
  clearChat
} = useAIChat(mockProducts);

const {
  friends,
  activeFriendId,
  activeFriend,
  currentPrivateMessages,
  sortedFriends,
  totalUnreadCount,
  hasUnreadMessages,
  sendPrivateMessage: sendSocialMessage,
  setActiveFriend,
  addFriend,
  removeFriend,
  searchFriends
} = useSocialChat();

const {
  isExpanded,
  activeTab,
  chatContainer,
  toggleExpand,
  switchTab,
  scrollToBottom,
  focusInput
} = useChatUI();

// 本地状态
const socialInputMessage = ref('');
const friendSearchQuery = ref('');
const showAddFriendModal = ref(false);
const showFriendInfoModal = ref(false);

// 计算属性
const currentPrivateMessages = computed(() => {
  if (!activeFriendId.value) return [];
  // 这里应该调用getPrivateChat，简化处理
  return [];
});

// 初始化
onMounted(() => {
  if (props.initialTab) {
    switchTab(props.initialTab);
  }
  
  if (props.initialFriendId) {
    setActiveFriend(props.initialFriendId);
    switchTab('social');
  }
});

// 监听isOpen变化
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // 打开时聚焦输入框
    setTimeout(focusInput, 300);
    
    // 滚动到底部
    setTimeout(scrollToBottom, 100);
  }
});

// 监听activeTab变化
watch(activeTab, (newTab) => {
  if (newTab === 'social' && !activeFriendId.value) {
    // 切换到社交但没有活跃好友，显示好友列表
    console.log('显示好友列表');
  }
});

// 方法
const openPrivateChat = (friend: Friend) => {
  setActiveFriend(friend.id);
  switchTab('social');
  
  // 滚动到底部
  setTimeout(scrollToBottom, 100);
};

const backToFriendList = () => {
  setActiveFriend(null);
};

const sendPrivateMessage = (content: string) => {
  if (!activeFriendId.value || !content.trim()) return;
  
  sendSocialMessage(activeFriendId.value, content);
  socialInputMessage.value = '';
  
  // 滚动到底部
  setTimeout(scrollToBottom, 100);
};

const handleQuickReply = (reply: string) => {
  inputMessage.value = reply;
  sendAIMessage();
};

const updateFriendSearch = (query: string) => {
  friendSearchQuery.value = query;
  // 这里可以调用searchFriends，但为了简化直接使用计算属性
};

const showAddFriendModalFunc = () => {
  showAddFriendModal.value = true;
};

const closeAddFriendModal = () => {
  showAddFriendModal.value = false;
};

const handleAddFriend = (name: string, avatar?: string) => {
  const newFriend = addFriend(name, avatar);
  closeAddFriendModal();
  
  // 自动打开新好友的聊天
  openPrivateChat(newFriend);
};

const showFriendInfo = () => {
  if (activeFriend.value) {
    showFriendInfoModal.value = true;
  }
};

const closeFriendInfoModal = () => {
  showFriendInfoModal.value = false;
};

const confirmRemoveFriend = (friendId: number) => {
  if (confirm('确定要删除这个好友吗？')) {
    removeFriend(friendId);
  }
};

// 暴露方法给父组件（如果需要）
defineExpose({
  clearChat,
  switchTab,
  setActiveFriend
});
</script>

<style scoped>
.ai-chat-window {
  @apply fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200/50 backdrop-blur-sm;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
}

.ai-chat-window.expanded {
  @apply h-[600px];
}

.ai-chat-window:not(.expanded) {
  @apply h-[500px];
}

.ai-chat-window.minimized {
  @apply hidden;
}

.chat-main {
  @apply h-[calc(100%-60px)] flex flex-col;
}

.chat-panel {
  @apply flex-1 flex flex-col;
}

.friend-list-view,
.private-chat-view,
.friends-panel {
  @apply flex-1 flex flex-col;
}

/* 动画效果 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.ai-chat-window {
  animation: slideIn 0.3s ease-out;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .ai-chat-window {
    @apply bottom-0 right-0 w-full max-w-none rounded-b-none rounded-t-2xl;
    height: 70vh !important;
  }
  
  .ai-chat-window.expanded {
    height: 85vh !important;
  }
}

/* 滚动条样式 */
.chat-main ::-webkit-scrollbar {
  width: 6px;
}

.chat-main ::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded-full;
}

.chat-main ::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full;
}

.chat-main ::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}
</style>