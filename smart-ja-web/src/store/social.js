import { reactive, computed } from 'vue';
import { SocialService } from '../services/api';

const parseArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizePost = (post = {}) => {
  const author = post.author || post.user || {};
  return {
    id: String(post.id || ''),
    content: post.content || post.description || '',
    images: parseArray(post.images).filter(Boolean),
    tags: parseArray(post.tags),
    likes: Number(post.likes || 0),
    commentsCount: Number(post.commentsCount || post.comments || 0),
    createdAt: post.createdAt || post.date || '',
    likedByMe: Boolean(post.likedByMe || post.isLiked),
    author: {
      id: String(author.id || post.userId || ''),
      username: author.username || author.name || post.userName || 'Anonymous',
      avatar:
        author.avatar ||
        post.userAvatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(author.username || post.userName || 'user')}`
    }
  };
};

const extractPostList = (response) => {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  if (Array.isArray(response?.posts)) {
    return response.posts;
  }
  if (Array.isArray(response?.items)) {
    return response.items;
  }
  return [];
};

const extractNextCursor = (response) => response?.nextCursor || response?.cursor || null;

const state = reactive({
  posts: [],
  nextCursor: null,
  hasMorePosts: true,
  loadingPosts: false,
  creatingPost: false,

  chatMessages: [
    { id: 1, user: 'System', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=System', content: '欢迎来到 NS 社区。', type: 'system' }
  ],
  users: [],
  friends: [],
  privateChats: {}
});

const getCurrentUserId = () => {
  try {
    const raw = localStorage.getItem('user_info');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.id || 'current_user';
  } catch {
    return 'current_user';
  }
};

export const useSocial = () => {
  const posts = computed(() => state.posts);
  const friendsList = computed(() => state.users.filter((user) => state.friends.includes(user.id)));
  const chatMessages = computed(() => state.chatMessages);
  const users = computed(() => state.users);

  const getPrivateChat = (friendId) => computed(() => state.privateChats[friendId] || []);

  const sendPrivateMessage = (friendId, message) => {
    if (!state.privateChats[friendId]) {
      state.privateChats[friendId] = [];
    }
    state.privateChats[friendId].push({
      id: Date.now(),
      senderId: getCurrentUserId(),
      timestamp: Date.now(),
      ...message
    });
  };

  const addFriend = (userId) => {
    if (!userId || state.friends.includes(userId)) {
      return false;
    }
    state.friends.push(userId);
    return true;
  };

  const addChatMessage = (message) => {
    state.chatMessages.push({
      id: Date.now(),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=System',
      ...message
    });
  };

  const fetchPosts = async ({ reset = false, limit = 12 } = {}) => {
    if (state.loadingPosts) {
      return;
    }

    if (reset) {
      state.nextCursor = null;
      state.hasMorePosts = true;
      state.posts = [];
    } else if (!state.hasMorePosts) {
      return;
    }

    state.loadingPosts = true;
    try {
      const response = await SocialService.getPosts({
        limit,
        cursor: state.nextCursor
      });

      const list = extractPostList(response).map(normalizePost);
      state.posts = reset ? list : [...state.posts, ...list];
      state.nextCursor = extractNextCursor(response);
      state.hasMorePosts = Boolean(state.nextCursor) || list.length === limit;
      return list;
    } finally {
      state.loadingPosts = false;
    }
  };

  const createPost = async ({ content, images = [], tags = [] }) => {
    state.creatingPost = true;
    try {
      const response = await SocialService.createPost({ content, images, tags });
      const created = normalizePost(response?.post || response?.data || response);
      if (created.id) {
        state.posts = [created, ...state.posts];
      }
      return created;
    } finally {
      state.creatingPost = false;
    }
  };

  const likePost = async (postId) => {
    const post = state.posts.find((item) => item.id === String(postId));
    if (!post) {
      return null;
    }

    const prevLikes = post.likes;
    post.likedByMe = true;
    post.likes = Math.max(0, prevLikes + 1);

    try {
      const response = await SocialService.likePost(post.id);

      const payload = response?.post || response?.data || response;
      if (payload && typeof payload.likes !== 'undefined') {
        post.likes = Number(payload.likes || 0);
      }
      if (payload && typeof payload.likedByMe !== 'undefined') {
        post.likedByMe = Boolean(payload.likedByMe);
      }
      return post;
    } catch (error) {
      post.likedByMe = false;
      post.likes = prevLikes;
      throw error;
    }
  };

  const deletePost = async (postId) => {
    try {
      await SocialService.deletePost(postId);
      state.posts = state.posts.filter((item) => item.id !== String(postId));
      return true;
    } catch (error) {
      throw error;
    }
  };

  // Compatibility methods for old callers
  const uploadVideo = async (videoData) =>
    createPost({
      content: videoData?.description || '',
      images: videoData?.videoUrl ? [videoData.videoUrl] : [],
      tags: videoData?.productId ? [`product:${videoData.productId}`] : []
    });

  const interact = async (postId, type) => {
    if (type === 'like') {
      return likePost(postId);
    }
    return null;
  };

  const addComment = () => {};

  return {
    posts,
    loadingPosts: computed(() => state.loadingPosts),
    hasMorePosts: computed(() => state.hasMorePosts),
    creatingPost: computed(() => state.creatingPost),
    fetchPosts,
    createPost,
    toggleLike: likePost,
    likePost,
    deletePost,

    // compatibility exports
    videos: posts,
    uploadVideo,
    interact,
    addComment,
    addChatMessage,
    addFriend,
    friendsList,
    chatMessages,
    users,
    getPrivateChat,
    sendPrivateMessage
  };
};
