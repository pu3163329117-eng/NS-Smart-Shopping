import { reactive, computed } from 'vue';

const state = reactive({
  isOpen: false,
  activeTab: 'chat', // 'chat' or 'friends'
  activeFriendId: null
});

const toggleAIChat = () => {
  state.isOpen = !state.isOpen;
};

const openAIChat = () => {
  state.isOpen = true;
};

const closeAIChat = () => {
  state.isOpen = false;
};

const openChatWith = (friendId) => {
  state.isOpen = true;
  state.activeTab = 'friends';
  state.activeFriendId = friendId;
};

const setActiveTab = (tab) => {
  state.activeTab = tab;
};

const setActiveFriend = (friendId) => {
  state.activeFriendId = friendId;
};

export const useAIChat = () => {
  return {
    aiChatState: computed(() => state),
    toggleAIChat,
    openAIChat,
    closeAIChat,
    openChatWith,
    setActiveTab,
    setActiveFriend
  };
};
