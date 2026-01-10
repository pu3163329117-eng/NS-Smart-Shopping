import { reactive, computed } from 'vue';
import { useToast } from '../composables/useToast';

const { show: showToast } = useToast();

// Initial Mock Data
const initialVideos = [
  {
    id: 1,
    userId: 'user_001',
    userName: 'GreenLife_Official',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Green',
    description: '看我们的 EcoFuture 笔记本是如何长出花朵的！🌱 #环保 #创意',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    likes: 1205,
    dislikes: 12,
    comments: 45,
    productId: 1, // Linked to EcoFuture Notebook
    status: 'approved'
  },
  {
    id: 2,
    userId: 'user_002',
    userName: 'TechKid_Demo',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tech',
    description: '机械臂搭建教程，8岁小朋友也能轻松上手！🤖 #编程 #教育',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4', // Placeholder
    likes: 892,
    dislikes: 5,
    comments: 23,
    productId: 2, // Linked to TechKid Kit
    status: 'approved'
  },
  {
    id: 3,
    userId: 'user_003',
    userName: 'ArtDesign_Student',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Art',
    description: '我的 AI 设计卫衣到了，这质感太绝了！✨ #OOTD #AI设计',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', // Placeholder
    likes: 3400,
    dislikes: 150,
    comments: 128,
    productId: 3, // Linked to ArtSpace Hoodie
    status: 'approved'
  }
];

const state = reactive({
  videos: [...initialVideos],
  chatMessages: [
    { id: 1, user: 'TechMaster', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', content: '有人买了那个编程套件吗？好玩吗？', type: 'text' },
    { id: 2, user: 'EcoGirl', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka', content: '我买了！超级推荐，特别是那个机械臂。', type: 'text' }
  ],
  // Mock Users Database
  users: [
    { id: 'user_001', name: 'GreenLife_Official', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Green', bio: '专注环保生活方式分享 🌿' },
    { id: 'user_002', name: 'TechKid_Demo', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tech', bio: '编程改变世界 💻' },
    { id: 'user_003', name: 'ArtDesign_Student', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Art', bio: '艺术是生活的解药 🎨' },
    { id: 'user_004', name: 'CoffeeLover', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Coffee', bio: '每天一杯拿铁 ☕️' }
  ],
  // Current User's Friends (List of User IDs)
  friends: ['user_001', 'user_002'], 
  // Private Chats: { 'user_id': [messages] }
  privateChats: {
    'user_001': [
      { id: 1, senderId: 'user_001', type: 'text', content: '你好！我也很喜欢那个环保笔记本。', timestamp: Date.now() - 100000 },
      { id: 2, senderId: 'current_user', type: 'text', content: '是吗？我觉得设计很有创意！', timestamp: Date.now() - 80000 }
    ],
    'user_002': [
       { id: 1, senderId: 'user_002', type: 'text', content: '想看更多机械臂的视频吗？', timestamp: Date.now() - 500000 }
    ]
  }
});

// Mock AI Audit Function
const mockAIAudit = async (video) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simple mock logic: fail if description contains "bad"
      if (video.description.includes('bad') || video.description.includes('违禁')) {
        resolve(false);
      } else {
        resolve(true);
      }
    }, 2000); // 2 seconds delay
  });
};

export const useSocial = () => {
  const getAllVideos = computed(() => state.videos.filter(v => v.status === 'approved'));
  const friendsList = computed(() => state.users.filter(u => state.friends.includes(u.id)));
  
  const getPrivateChat = (friendId) => computed(() => state.privateChats[friendId] || []);

  const sendPrivateMessage = (friendId, message) => {
    if (!state.privateChats[friendId]) {
      state.privateChats[friendId] = [];
    }
    state.privateChats[friendId].push({
      id: Date.now(),
      senderId: 'current_user',
      timestamp: Date.now(),
      ...message
    });
  };

  const addFriend = (userId) => {
    if (!state.friends.includes(userId)) {
      state.friends.push(userId);
      return true;
    }
    return false;
  };
  
  const uploadVideo = async (videoData) => {
    // 1. Create temporary video object
    const newVideo = {
      id: Date.now(),
      userId: 'current_user',
      userName: '我 (Me)',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me',
      ...videoData,
      likes: 0,
      dislikes: 0,
      comments: 0,
      status: 'auditing' // Initial status
    };
    
    // Add to state immediately (visible in "My Videos" or just general feed with "Auditing" tag)
    state.videos.unshift(newVideo);
    
    // 2. Perform AI Audit
    showToast('AI 正在审核您的视频...', 'info');
    const passed = await mockAIAudit(newVideo);
    
    if (passed) {
      newVideo.status = 'approved';
      showToast('AI 审核通过！视频已发布。', 'success');
      
      // Auto-share to chat
      addChatMessage({
        user: 'System',
        content: `🎉 用户 ${newVideo.userName} 发布了新视频：${newVideo.description}`,
        type: 'system'
      });
    } else {
      newVideo.status = 'rejected';
      showToast('AI 审核未通过：内容可能包含违规信息。', 'error');
    }
  };

  const interact = (videoId, type) => {
    const video = state.videos.find(v => v.id === videoId);
    if (!video) return;
    
    if (type === 'like') video.likes++;
    if (type === 'dislike') video.dislikes++;
  };

  const addComment = (videoId, content) => {
    const video = state.videos.find(v => v.id === videoId);
    if (!video) return;

    if (!video.commentsList) video.commentsList = [];
    
    video.commentsList.unshift({
      id: Date.now(),
      user: '我 (Me)',
      content: content,
      time: '刚刚'
    });
    video.comments++;
  };

  const addChatMessage = (msg) => {
    state.chatMessages.push({
      id: Date.now(),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=System',
      ...msg
    });
  };

  return {
    videos: getAllVideos,
    chatMessages: computed(() => state.chatMessages),
    users: computed(() => state.users),
    friendsList,
    getPrivateChat,
    sendPrivateMessage,
    addFriend,
    uploadVideo,
    interact,
    addComment,
    addChatMessage
  };
};
