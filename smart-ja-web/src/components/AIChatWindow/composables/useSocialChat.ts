/**
 * 社交聊天组合式函数
 * 提取自AIChatWindow.vue的社交聊天逻辑
 */

import { ref, computed } from 'vue';
import type { Friend, SocialMessage } from '../types/chat.types';

/**
 * 社交聊天状态管理
 */
export function useSocialChat() {
  // 好友列表
  const friends = ref<Friend[]>([
    { id: 1, name: '小明同学', online: true, unreadCount: 2 },
    { id: 2, name: '小红创客', online: true, unreadCount: 0 },
    { id: 3, name: '技术导师', online: false, unreadCount: 1 },
    { id: 4, name: '产品经理', online: true, unreadCount: 5 },
    { id: 5, name: '设计同学', online: false, unreadCount: 0 }
  ]);

  // 私聊消息存储
  const privateChats = ref<Record<number, SocialMessage[]>>({
    1: [
      { id: 1, senderId: 1, receiverId: 0, content: '你好！你的作品很棒！', timestamp: new Date('2026-02-26 10:30'), status: 'read' },
      { id: 2, senderId: 0, receiverId: 1, content: '谢谢！你的建议很有帮助', timestamp: new Date('2026-02-26 10:35'), status: 'delivered' }
    ],
    3: [
      { id: 3, senderId: 3, receiverId: 0, content: '项目进度如何了？', timestamp: new Date('2026-02-27 09:00'), status: 'read' }
    ],
    4: [
      { id: 4, senderId: 4, receiverId: 0, content: '新版本设计完成了', timestamp: new Date('2026-02-27 11:00'), status: 'sent' },
      { id: 5, senderId: 4, receiverId: 0, content: '请查看设计稿', timestamp: new Date('2026-02-27 11:05'), status: 'sent' }
    ]
  });

  // 当前活跃好友
  const activeFriendId = ref<number | null>(null);

  /**
   * 获取私聊消息
   */
  const getPrivateChat = (friendId: number) => {
    return computed(() => privateChats.value[friendId] || []);
  };

  /**
   * 发送私聊消息
   */
  const sendPrivateMessage = (friendId: number, content: string): SocialMessage => {
    if (!content.trim()) {
      throw new Error('消息内容不能为空');
    }

    const newMessage: SocialMessage = {
      id: Date.now(),
      senderId: 0, // 0表示当前用户
      receiverId: friendId,
      content: content.trim(),
      timestamp: new Date(),
      status: 'sent',
      isMine: true
    };

    // 添加到聊天记录
    if (!privateChats.value[friendId]) {
      privateChats.value[friendId] = [];
    }
    privateChats.value[friendId].push(newMessage);

    // 模拟对方回复（实际项目中应该通过WebSocket接收）
    setTimeout(() => {
      simulateFriendReply(friendId);
    }, 1000 + Math.random() * 2000);

    return newMessage;
  };

  /**
   * 模拟好友回复
   */
  const simulateFriendReply = (friendId: number) => {
    const friend = friends.value.find(f => f.id === friendId);
    if (!friend) return;

    const replies = [
      '好的，明白了！',
      '这个想法不错！',
      '我需要考虑一下',
      '可以详细说说吗？',
      '谢谢分享！',
      '我同意你的观点',
      '我们什么时候讨论？',
      '这个方案可行'
    ];

    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    
    const replyMessage: SocialMessage = {
      id: Date.now(),
      senderId: friendId,
      receiverId: 0,
      content: randomReply,
      timestamp: new Date(),
      status: 'delivered',
      isMine: false
    };

    if (!privateChats.value[friendId]) {
      privateChats.value[friendId] = [];
    }
    privateChats.value[friendId].push(replyMessage);

    // 更新未读计数
    updateUnreadCount(friendId, 1);
  };

  /**
   * 标记消息为已读
   */
  const markAsRead = (friendId: number, messageId?: number) => {
    if (!privateChats.value[friendId]) return;

    if (messageId) {
      // 标记单条消息
      const message = privateChats.value[friendId].find(m => m.id === messageId);
      if (message && message.status !== 'read') {
        message.status = 'read';
      }
    } else {
      // 标记所有消息
      privateChats.value[friendId].forEach(message => {
        if (message.senderId !== 0 && message.status !== 'read') {
          message.status = 'read';
        }
      });
    }

    // 重置未读计数
    const friend = friends.value.find(f => f.id === friendId);
    if (friend) {
      friend.unreadCount = 0;
    }
  };

  /**
   * 更新未读计数
   */
  const updateUnreadCount = (friendId: number, increment: number) => {
    const friend = friends.value.find(f => f.id === friendId);
    if (friend) {
      friend.unreadCount = Math.max(0, friend.unreadCount + increment);
    }
  };

  /**
   * 添加新好友
   */
  const addFriend = (name: string, avatar?: string): Friend => {
    const newFriend: Friend = {
      id: Date.now(),
      name,
      avatar,
      online: true,
      unreadCount: 0
    };

    friends.value.push(newFriend);
    return newFriend;
  };

  /**
   * 移除好友
   */
  const removeFriend = (friendId: number): boolean => {
    const index = friends.value.findIndex(f => f.id === friendId);
    if (index !== -1) {
      friends.value.splice(index, 1);
      delete privateChats.value[friendId];
      if (activeFriendId.value === friendId) {
        activeFriendId.value = null;
      }
      return true;
    }
    return false;
  };

  /**
   * 搜索好友
   */
  const searchFriends = (query: string): Friend[] => {
    if (!query.trim()) return friends.value;
    
    const lowerQuery = query.toLowerCase();
    return friends.value.filter(friend =>
      friend.name.toLowerCase().includes(lowerQuery)
    );
  };

  /**
   * 设置活跃好友
   */
  const setActiveFriend = (friendId: number | null) => {
    activeFriendId.value = friendId;
    
    // 切换到好友时标记消息为已读
    if (friendId !== null) {
      markAsRead(friendId);
    }
  };

  // 计算属性
  const activeFriend = computed(() => {
    if (!activeFriendId.value) return null;
    return friends.value.find(f => f.id === activeFriendId.value) || null;
  });

  const currentPrivateMessages = computed(() => {
    if (!activeFriendId.value) return [];
    return privateChats.value[activeFriendId.value] || [];
  });

  const onlineFriends = computed(() => {
    return friends.value.filter(friend => friend.online);
  });

  const offlineFriends = computed(() => {
    return friends.value.filter(friend => !friend.online);
  });

  const totalUnreadCount = computed(() => {
    return friends.value.reduce((total, friend) => total + friend.unreadCount, 0);
  });

  const hasUnreadMessages = computed(() => {
    return totalUnreadCount.value > 0;
  });

  const sortedFriends = computed(() => {
    return [...friends.value].sort((a, b) => {
      // 在线状态优先
      if (a.online !== b.online) return a.online ? -1 : 1;
      // 未读消息多的优先
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      // 按名称排序
      return a.name.localeCompare(b.name);
    });
  });

  return {
    // 状态
    friends,
    privateChats,
    activeFriendId,
    
    // 计算属性
    activeFriend,
    currentPrivateMessages,
    onlineFriends,
    offlineFriends,
    totalUnreadCount,
    hasUnreadMessages,
    sortedFriends,
    
    // 方法
    getPrivateChat,
    sendPrivateMessage,
    markAsRead,
    updateUnreadCount,
    addFriend,
    removeFriend,
    searchFriends,
    setActiveFriend
  };
}