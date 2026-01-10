<script setup>
import { ref, onMounted } from 'vue';
import { useSocial } from '../store/social';
import { useProducts } from '../store/products';
import { useCart } from '../store/cart';
import { useToast } from '../composables/useToast';
import { useAIChat } from '../store/aiChat';
import ProductDetail from '../components/ProductDetail.vue';

const { videos, uploadVideo, interact, addChatMessage, addFriend, friendsList, addComment } = useSocial();
const { products } = useProducts();
const { addToCart } = useCart();
const { show: showToast } = useToast();
const { openChatWith } = useAIChat();

const showUploadModal = ref(false);
const showProductDetail = ref(false);
const selectedProduct = ref(null);
const showCommentsDrawer = ref(false);
const currentVideoId = ref(null);
const currentVideoComments = ref([]);
const newCommentContent = ref('');

const likeAnimationVideoId = ref(null);
const videoRefs = ref({});
const videoProgress = ref(0);

const setVideoRef = (el, index) => {
  if (el) {
    videoRefs.value[index] = el;
  }
};

const uploadForm = ref({
  description: '',
  productId: '',
  videoUrl: '' // In real app, this would be a file upload
});

const activeVideoIndex = ref(0);

const handleScroll = (e) => {
  const { scrollTop, clientHeight } = e.target;
  activeVideoIndex.value = Math.round(scrollTop / clientHeight);
  videoProgress.value = 0; // Reset progress on scroll
};

const handleTimeUpdate = (e) => {
  const { currentTime, duration } = e.target;
  if (duration) {
    videoProgress.value = (currentTime / duration) * 100;
  }
};

const handleDoubleTap = (video) => {
  handleLike(video);
  likeAnimationVideoId.value = video.id;
  setTimeout(() => {
    likeAnimationVideoId.value = null;
  }, 800);
};

const openComments = (video) => {
  currentVideoId.value = video.id;
  currentVideoComments.value = video.commentsList || [];
  showCommentsDrawer.value = true;
};

const submitComment = () => {
  if (!newCommentContent.value.trim()) return;
  addComment(currentVideoId.value, newCommentContent.value.trim());
  newCommentContent.value = '';
  // Refresh local comments
  const video = videos.value.find(v => v.id === currentVideoId.value);
  if (video) {
    currentVideoComments.value = video.commentsList;
  }
};

const handleLike = (video) => {
  interact(video.id, 'like');
  showToast('点赞成功 +1', 'success');
};

const handleDislike = (video) => {
  interact(video.id, 'dislike');
  showToast('已踩', 'info');
};

const handleShare = (video) => {
  addChatMessage({
    user: '我 (Me)',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me',
    content: `分享了一个视频：${video.description}`,
    type: 'share',
    videoId: video.id
  });
  showToast('已转发到世界频道', 'success');
};

const isFriend = (userId) => {
  return friendsList.value.some(f => f.id === userId);
};

const handleAddFriend = (video) => {
  const success = addFriend(video.userId);
  if (success) {
    showToast(`已添加 ${video.userName} 为好友`, 'success');
  } else {
    showToast('你们已经是好友了', 'info');
  }
};

const handleChat = (video) => {
  if (!isFriend(video.userId)) {
    addFriend(video.userId);
    showToast(`已自动添加 ${video.userName} 为好友`, 'success');
  }
  openChatWith(video.userId);
};

const submitUpload = async () => {
  if (!uploadForm.value.description || !uploadForm.value.videoUrl) {
    showToast('请填写完整信息', 'warning');
    return;
  }
  
  showUploadModal.value = false;
  await uploadVideo({
    description: uploadForm.value.description,
    productId: uploadForm.value.productId,
    videoUrl: uploadForm.value.videoUrl
  });
  
  // Reset form
  uploadForm.value = { description: '', productId: '', videoUrl: '' };
};

const getProductInfo = (pid) => {
  return products.value.find(p => p.id === pid);
};

const openProductDetail = (productId) => {
  const product = getProductInfo(productId);
  if (product) {
    selectedProduct.value = product;
    showProductDetail.value = true;
  }
};

const handleBadgeMouseMove = (e) => {
  const badge = e.currentTarget;
  const rect = badge.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -10;
  const rotateY = ((x - centerX) / centerX) * 10;
  
  badge.style.transform = `perspective(500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
};

const handleBadgeMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(500px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};

const handleModalMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -3;
  const rotateY = ((x - centerX) / centerX) * 3;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleModalMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div class="h-screen w-full bg-black text-white pt-16 relative overflow-hidden">
    <!-- Video Feed -->
    <div 
      class="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      @scroll="handleScroll"
    >
      <div 
        v-for="(video, index) in videos" 
        :key="video.id" 
        class="h-full w-full snap-start relative flex items-center justify-center bg-gray-900"
        @dblclick="handleDoubleTap(video)"
      >
        <!-- Like Animation Overlay -->
        <div 
          v-if="likeAnimationVideoId === video.id"
          class="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
        >
          <div class="animate-like">
            <svg class="w-32 h-32 text-red-500 drop-shadow-2xl filter" fill="currentColor" viewBox="0 0 24 24">
               <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </div>

        <!-- Video Player (Simulated) -->
        <video 
          class="h-full w-full object-cover max-w-md mx-auto"
          :src="video.videoUrl"
          loop
          playsinline
          :autoplay="index === activeVideoIndex"
          :muted="index !== activeVideoIndex"
          controls
        ></video>

        <!-- Overlay Info -->
        <div class="absolute bottom-20 left-4 right-16 max-w-md mx-auto pointer-events-none">
          <div class="pointer-events-auto">
            <h3 class="font-bold text-lg shadow-black drop-shadow-md">@{{ video.userName }}</h3>
            <p class="text-sm mt-1 mb-2 shadow-black drop-shadow-md">{{ video.description }}</p>
            
            <!-- Linked Product Badge -->
            <div 
              v-if="video.productId && getProductInfo(video.productId)" 
              @click.stop="openProductDetail(video.productId)"
              @mousemove="handleBadgeMouseMove"
              @mouseleave="handleBadgeMouseLeave"
              class="inline-flex items-center bg-black/60 backdrop-blur-xl rounded-xl p-2.5 border border-white/20 cursor-pointer hover:bg-black/80 transition-all duration-200 ease-out will-change-transform group/product hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20"
            >
              <div class="relative">
                <img :src="getProductInfo(video.productId).img" class="w-10 h-10 rounded-lg object-cover mr-3 border border-white/10">
                <div class="absolute inset-0 rounded-lg bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover/product:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </div>
              <div>
                <div class="text-[10px] text-blue-400 font-bold mb-0.5 flex items-center">
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                  视频同款
                </div>
                <div class="font-bold text-sm truncate w-32 text-white">{{ getProductInfo(video.productId).name }}</div>
              </div>
              <button class="ml-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs px-4 py-2 rounded-full font-bold shadow-lg group-hover/product:shadow-blue-500/30 transform group-hover/product:-translate-y-0.5 transition-all duration-300">
                去看看
              </button>
            </div>
          </div>
        </div>

        <!-- Right Side Actions -->
        <div class="absolute bottom-20 right-4 flex flex-col items-center space-y-6 max-w-md mx-auto w-full pointer-events-none">
           <div class="pointer-events-auto flex flex-col items-center space-y-6 ml-auto w-12">
              <!-- Avatar & Add Friend -->
              <div class="relative">
                <div class="w-12 h-12 rounded-full border-2 border-white overflow-hidden">
                  <img :src="video.userAvatar" class="w-full h-full object-cover">
                </div>
                <!-- Add Friend Badge -->
                <button 
                  v-if="!isFriend(video.userId) && video.userId !== 'current_user'"
                  @click="handleAddFriend(video)"
                  class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-red-500 w-5 h-5 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition"
                >
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                </button>
              </div>

              <!-- Like -->
              <button @click="handleLike(video)" class="flex flex-col items-center group">
                <div class="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center group-hover:bg-red-500/50 transition">
                  <svg class="w-6 h-6 text-white group-hover:text-red-500 transition" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
                <span class="text-xs font-bold mt-1">{{ video.likes }}</span>
              </button>

              <!-- Dislike -->
              <button @click="handleDislike(video)" class="flex flex-col items-center group">
                <div class="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center group-hover:bg-gray-500/50 transition">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"></path></svg>
                </div>
                <span class="text-xs font-bold mt-1">踩</span>
              </button>

              <!-- Share -->
              <button @click="handleShare(video)" class="flex flex-col items-center group">
                <div class="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center group-hover:bg-green-500/50 transition">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                </div>
                <span class="text-xs font-bold mt-1">转发</span>
              </button>

              <!-- Private Chat (New) -->
              <button @click="handleChat(video)" class="flex flex-col items-center group">
                <div class="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center group-hover:bg-blue-500/50 transition">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </div>
                <span class="text-xs font-bold mt-1">私信</span>
              </button>
           </div>
        </div>
      </div>
    </div>

    <!-- Floating Upload Button -->
    <button 
      @click="showUploadModal = true"
      class="absolute top-20 right-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white p-3 rounded-full shadow-lg hover:scale-110 transition z-40"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
    </button>

    <!-- Upload Modal -->
    <div v-if="showUploadModal" class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div 
        class="bg-white text-black rounded-2xl p-6 w-full max-w-md transition-transform duration-100 ease-out"
      >
        <h2 class="text-xl font-bold mb-4">发布新视频</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">视频 URL (演示用)</label>
            <input v-model="uploadForm.videoUrl" type="text" placeholder="输入视频链接 (.mp4)" class="mt-1 w-full border rounded-lg p-2">
            <p class="text-xs text-gray-500 mt-1">试用: https://media.w3.org/2010/05/sintel/trailer.mp4</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">描述</label>
            <textarea v-model="uploadForm.description" rows="3" placeholder="写点什么..." class="mt-1 w-full border rounded-lg p-2"></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">关联商品</label>
            <select v-model="uploadForm.productId" class="mt-1 w-full border rounded-lg p-2">
              <option value="">不关联</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
        </div>

        <div class="mt-6 flex justify-end space-x-3">
          <button @click="showUploadModal = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
          <button @click="submitUpload" class="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">发布 (AI 审核)</button>
        </div>
      </div>
    </div>

    <!-- Comments Drawer -->
    <div 
      v-if="showCommentsDrawer" 
      class="fixed inset-0 z-50 flex items-end justify-center"
      @click.self="showCommentsDrawer = false"
    >
      <div class="bg-white text-black w-full max-w-md h-[60vh] rounded-t-2xl flex flex-col shadow-2xl transform transition-transform duration-300 ease-out" :class="showCommentsDrawer ? 'translate-y-0' : 'translate-y-full'">
        <div class="p-4 border-b flex justify-between items-center">
          <h3 class="font-bold text-lg">评论 ({{ currentVideoComments.length }})</h3>
          <button @click="showCommentsDrawer = false" class="text-gray-500">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div v-if="currentVideoComments.length === 0" class="text-center text-gray-500 py-10">
            暂无评论，快来抢沙发！
          </div>
          <div v-for="comment in currentVideoComments" :key="comment.id" class="flex space-x-3">
            <div class="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
               <img :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user}`" class="w-full h-full object-cover">
            </div>
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <span class="font-bold text-sm text-gray-600">{{ comment.user }}</span>
                <span class="text-xs text-gray-400">{{ comment.time }}</span>
              </div>
              <p class="text-sm mt-1">{{ comment.content }}</p>
            </div>
          </div>
        </div>

        <div class="p-4 border-t bg-gray-50">
          <div class="flex items-center space-x-2">
            <input 
              v-model="newCommentContent" 
              type="text" 
              placeholder="说点好听的..." 
              class="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              @keyup.enter="submitComment"
            >
            <button 
              @click="submitComment" 
              class="bg-blue-600 text-white rounded-full p-2 disabled:opacity-50"
              :disabled="!newCommentContent.trim()"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Detail Modal -->
    <Transition name="fade">
      <ProductDetail 
        v-if="showProductDetail" 
        :product="selectedProduct" 
        @close="showProductDetail = false"
        @add-to-cart="addToCart"
      />
    </Transition>
  </div>
</template>

<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

@keyframes like-heart-animation {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  15% { transform: scale(1.2) rotate(0deg); opacity: 1; }
  30% { transform: scale(0.9); }
  45% { transform: scale(1.1); }
  80% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0) translateY(-50px); opacity: 0; }
}

.animate-like {
  animation: like-heart-animation 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

/* Custom scroll snap behavior */
.snap-mandatory {
  scroll-snap-type: y mandatory;
}
.snap-start {
  scroll-snap-align: start;
}
</style>
