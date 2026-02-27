<script setup>
import { ref, nextTick, onMounted, watch, computed } from 'vue';
import { useProducts } from '../store/products';
import { useSocial } from '../store/social';
import { useAIChat } from '../store/aiChat';
import { useRouter } from 'vue-router';
import { callDeepseekAPI } from '../services/aiService';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close']);

const { products } = useProducts();
const { chatMessages, addChatMessage, friendsList, getPrivateChat, sendPrivateMessage } = useSocial();
const { aiChatState, setActiveTab, setActiveFriend } = useAIChat();
const router = useRouter();

// Tab State: 'ai' | 'social' | 'friends'
const activeTab = computed({
  get: () => aiChatState.value.activeTab || 'ai',
  set: (val) => setActiveTab(val)
});

const activeFriend = computed(() => {
  if (!aiChatState.value.activeFriendId) return null;
  return friendsList.value.find(f => f.id === aiChatState.value.activeFriendId) || null;
});

const isExpanded = ref(false);
const messages = ref([
  {
    id: 1,
    role: 'ai',
    content: '你好！我是 NS Smart Shopping 的 AI 智能导购。我可以为你推荐商品，或者解答关于我们学生公司的任何问题。请问有什么可以帮你的吗？',
    type: 'text'
  }
]);
const inputMessage = ref('');
const isTyping = ref(false);
const chatContainer = ref(null);

// Mock Share State
const showShareMenu = ref(false);


const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  setTimeout(scrollToBottom, 300);
};

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    scrollToBottom();
  }
});

// Watch messages to scroll
watch(() => [chatMessages.value.length, messages.value.length, activeFriend.value], () => {
  if (props.isOpen) {
    scrollToBottom();
  }
});

// Computed for private messages
const currentPrivateMessages = computed(() => {
  if (!activeFriend.value) return [];
  return getPrivateChat(activeFriend.value.id).value;
});

const openPrivateChat = (friend) => {
  setActiveFriend(friend.id);
  setTimeout(scrollToBottom, 100);
};

const backToFriendList = () => {
  setActiveFriend(null);
};



const generateSystemPrompt = () => {
  const productContext = products.value.map(p => 
    `- 商品名：${p.name}\n  价格：¥${p.price}\n  公司：${p.company}\n  描述：${p.desc}\n  详细介绍：${p.longDesc}`
  ).join('\n\n');

  return `你是一个名为“NS Smart Shopping 智能导购”的 AI 助手。你的任务是帮助用户了解和购买“学生模拟公司”平台上的商品。
  
以下是当前上架的商品列表：
${productContext}

请遵循以下规则：
1. 语气热情、专业且富有鼓励性。
2. 总是根据用户的需求推荐最合适的商品，并引用具体价格和描述。
3. 如果用户问候，礼貌回应。
4. 回答要简洁明了，不要长篇大论，除非用户询问详细信息。
5. 你的名字是“NS Smart Shopping AI”，你是由 Deepseek 提供技术支持的大模型。
6. 如果用户询问列表以外的商品，礼貌地说明目前只有这些商品。`;
};

const sendMessage = async () => {
  if (!inputMessage.value.trim()) return;

  const userMsg = inputMessage.value;
  inputMessage.value = '';

  if (activeTab.value === 'ai') {
    // AI Logic
    messages.value.push({
      id: Date.now(),
      role: 'user',
      content: userMsg,
      type: 'text'
    });
    scrollToBottom();

    isTyping.value = true;

    try {
      const history = messages.value.slice(-6).map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content
      }));

      const apiMessages = [
        { role: 'system', content: generateSystemPrompt() },
        ...history,
        { role: 'user', content: userMsg }
      ];

      const response = await callDeepseekAPI(apiMessages);
      
      messages.value.push({
        id: Date.now() + 1,
        role: 'ai',
        content: response,
        type: 'text'
      });
    } catch (e) {
      console.error(e);
      messages.value.push({
        id: Date.now() + 1,
        role: 'ai',
        content: '抱歉，我的大脑连接有点不稳定。请稍后再试，或者直接问我关于商品的问题。',
        type: 'text'
      });
    } finally {
      isTyping.value = false;
      scrollToBottom();
    }
  } else if (activeTab.value === 'social') {
    // Social Logic
    addChatMessage({
      user: '我 (Me)',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me',
      content: userMsg,
      type: 'text'
    });
    scrollToBottom();
  } else if (activeTab.value === 'friends' && activeFriend.value) {
    // Private Message Logic
    sendPrivateMessage(activeFriend.value.id, {
      type: 'text',
      content: userMsg
    });
    scrollToBottom();
  }
};

const handleShareMock = (type) => {
  showShareMenu.value = false;
  if (!activeFriend.value) return;

  if (type === 'image') {
    sendPrivateMessage(activeFriend.value.id, {
      type: 'image',
      content: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=300' // Mock Image
    });
  } else if (type === 'video') {
    sendPrivateMessage(activeFriend.value.id, {
      type: 'video',
      content: '分享了一个视频' // Mock Video
    });
  } else if (type === 'product') {
    // Share a random product for demo
    const p = products.value[0];
    sendPrivateMessage(activeFriend.value.id, {
      type: 'product',
      productId: p.id,
      content: p
    });
  }
  scrollToBottom();
};

const goToVideo = (videoId) => {
  router.push('/social');
};

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * -5;
  const rotateY = ((x - centerX) / centerX) * 5;

  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (e) => {
  const card = e.currentTarget;
  card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div 
    v-if="isOpen" 
    :class="[
      'fixed z-50 bg-white/90 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden border border-white/50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
      isExpanded 
        ? 'inset-4 rounded-3xl' 
        : 'bottom-28 right-8 w-96 h-[600px] rounded-3xl'
    ]"
  >
    <!-- Header with Tabs -->
    <div class="h-16 px-4 flex justify-between items-center border-b border-gray-100/50 bg-white/50 backdrop-blur-md sticky top-0 z-10">
      
      <!-- Tabs (Hidden when in private chat detail) -->
      <div v-if="!(activeTab === 'friends' && activeFriend)" class="flex space-x-1 bg-gray-100/50 p-1 rounded-xl">
        <button 
          @click="activeTab = 'ai'"
          :class="[
            'px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300',
            activeTab === 'ai' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'
          ]"
        >
          AI 导购
        </button>
        <button 
          @click="activeTab = 'social'"
          :class="[
            'px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300',
            activeTab === 'social' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'
          ]"
        >
          社区
        </button>
        <button 
          @click="activeTab = 'friends'"
          :class="[
            'px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300',
            activeTab === 'friends' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'
          ]"
        >
          好友
        </button>
      </div>

      <!-- Private Chat Header -->
      <div v-else class="flex items-center space-x-2 flex-1">
        <button @click="backToFriendList" class="p-1 hover:bg-gray-100 rounded-full">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <img :src="activeFriend.avatar" class="w-8 h-8 rounded-full border border-gray-200">
        <span class="font-bold text-sm text-gray-800">{{ activeFriend.name }}</span>
      </div>

      <div class="flex items-center space-x-2">
        <button 
          @click="toggleExpand" 
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          :title="isExpanded ? '缩小' : '放大'"
        >
          <svg v-if="!isExpanded" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        </button>
        <button 
          @click="$emit('close')" 
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>

    <!-- Chat Area -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
      
      <!-- AI Chat -->
      <template v-if="activeTab === 'ai'">
        <div v-for="msg in messages" :key="msg.id" :class="['flex w-full', msg.role === 'user' ? 'justify-end' : 'justify-start']">
          <div :class="[
            'max-w-[85%] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm transition-all duration-200',
            msg.role === 'user' 
              ? 'bg-black text-white rounded-[20px] rounded-tr-sm hover:shadow-md' 
              : 'bg-white text-gray-800 rounded-[20px] rounded-tl-sm border border-gray-100 hover:shadow-md'
          ]">
            <div v-if="msg.role === 'ai' && msg.type !== 'product-list'" class="flex items-center space-x-2 mb-2 opacity-50 text-[10px] font-bold tracking-wider uppercase select-none">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              <span>NS Smart Shopping AI</span>
            </div>
            
            <!-- Text Content -->
            <div v-if="msg.type === 'text'" class="whitespace-pre-wrap font-medium">{{ msg.content }}</div>

            <!-- Product List Content -->
            <div v-else-if="msg.type === 'product-list'" class="space-y-3">
              <div class="text-sm text-gray-500 mb-2">{{ msg.content }}</div>
              <div v-for="prod in msg.products" :key="prod.id" 
                 class="bg-gray-50 rounded-xl p-3 flex gap-3 cursor-pointer hover:bg-blue-50 transition-all duration-200 ease-out will-change-transform border border-gray-100 group" 
                 @click="router.push('/market')"
                 @mousemove="handleCardMouseMove"
                 @mouseleave="handleCardMouseLeave">
                 <img :src="prod.img" class="w-16 h-16 rounded-lg object-cover bg-white">
                 <div class="flex-1 min-w-0">
                   <div class="font-bold text-gray-900 truncate">{{ prod.name }}</div>
                   <div class="text-xs text-gray-500 line-clamp-2 mt-0.5">{{ prod.desc }}</div>
                   <div class="flex items-center justify-between mt-1.5">
                     <span class="font-bold text-blue-600">¥{{ prod.price }}</span>
                     <span class="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500 group-hover:border-blue-200 group-hover:text-blue-500">点击查看</span>
                   </div>
                 </div>
              </div>
            </div>

          </div>
        </div>
        
        <!-- Typing Indicator -->
        <div v-if="isTyping" class="flex justify-start w-full">
          <div class="bg-white border border-gray-100 rounded-[20px] rounded-tl-sm px-5 py-4 shadow-sm">
            <div class="flex space-x-1.5">
              <div class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
              <div class="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
              <div class="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
            </div>
          </div>
        </div>

        <!-- Quick Questions (When idle) -->
        <div v-if="!isTyping && messages.length < 5" class="flex flex-wrap gap-2 mt-4 justify-center">
          <button 
            v-for="q in suggestedQuestions" 
            :key="q"
            @click="inputMessage = q; sendMessage()"
            class="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 rounded-full border border-gray-200 transition-colors"
          >
            {{ q }}
          </button>
        </div>
      </template>

      <!-- Social Chat (World) -->
      <template v-else-if="activeTab === 'social'">
        <div v-for="msg in chatMessages" :key="msg.id" class="flex w-full justify-start mb-4">
           <img :src="msg.avatar" class="w-8 h-8 rounded-full mr-3 border border-gray-200" />
           <div class="flex flex-col max-w-[85%]">
             <span class="text-[10px] text-gray-400 mb-1 ml-1">{{ msg.user }}</span>
             
             <div v-if="msg.type === 'text'" 
                  @mousemove="handleCardMouseMove"
                  @mouseleave="handleCardMouseLeave"
                  class="bg-white border border-gray-100 text-gray-800 rounded-[20px] rounded-tl-sm px-4 py-3 shadow-sm transition-all duration-100 ease-out will-change-transform hover:shadow-md">
               {{ msg.content }}
             </div>

             <div v-else-if="msg.type === 'system'" 
                  @mousemove="handleCardMouseMove"
                  @mouseleave="handleCardMouseLeave"
                  class="bg-blue-50 border border-blue-100 text-blue-800 rounded-[20px] px-4 py-3 shadow-sm text-xs transition-all duration-100 ease-out will-change-transform hover:shadow-md">
               {{ msg.content }}
             </div>

             <div v-else-if="msg.type === 'share'" 
                  @mousemove="handleCardMouseMove"
                  @mouseleave="handleCardMouseLeave"
                  class="bg-black text-white rounded-[20px] rounded-tl-sm p-3 shadow-md cursor-pointer transition-all duration-100 ease-out will-change-transform hover:scale-105" @click="goToVideo(msg.videoId)">
               <div class="flex items-center space-x-3">
                 <div class="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 </div>
                 <div class="flex-1">
                   <div class="text-xs font-bold opacity-70">视频分享</div>
                   <div class="text-sm truncate w-32">{{ msg.content.replace('分享了一个视频：', '') }}</div>
                 </div>
               </div>
             </div>

             <div v-else-if="msg.type === 'product'" 
                  @mousemove="handleCardMouseMove"
                  @mouseleave="handleCardMouseLeave"
                  class="bg-white border border-gray-100 rounded-[20px] rounded-tl-sm p-3 shadow-sm cursor-pointer transition-all duration-100 ease-out will-change-transform hover:shadow-md">
                <div class="flex items-center space-x-3">
                   <img :src="(msg.product || msg.content).img || (msg.product || msg.content).image" class="w-12 h-12 rounded-lg object-cover bg-gray-50 border border-gray-100">
                   <div class="flex-1 overflow-hidden">
                     <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">商品分享</div>
                     <div class="text-sm font-bold text-gray-900 truncate">{{ (msg.product || msg.content).name }}</div>
                     <div class="text-xs text-blue-600 font-bold mt-0.5">¥{{ (msg.product || msg.content).price }}</div>
                   </div>
                </div>
             </div>

           </div>
        </div>
      </template>

      <!-- Friends List & Private Chat -->
      <template v-else-if="activeTab === 'friends'">
        
        <!-- Friend List Mode -->
        <div v-if="!activeFriend" class="space-y-2">
          <div v-if="friendsList.length === 0" class="text-center text-gray-400 mt-10">
             <p>暂无好友</p>
             <p class="text-xs mt-2">去社区动态添加朋友吧！</p>
          </div>
          <div 
            v-for="friend in friendsList" 
            :key="friend.id"
            @click="openPrivateChat(friend)"
            @mousemove="handleCardMouseMove"
            @mouseleave="handleCardMouseLeave"
            class="flex items-center p-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition-all duration-200 ease-out will-change-transform"
          >
            <img :src="friend.avatar" class="w-12 h-12 rounded-full border border-gray-100 mr-4">
            <div class="flex-1">
               <h4 class="font-bold text-gray-800">{{ friend.name }}</h4>
               <p class="text-xs text-gray-400 truncate">{{ friend.bio }}</p>
            </div>
            <div class="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
        </div>

        <!-- Private Chat Mode -->
        <div v-else class="space-y-4">
          <div v-for="msg in currentPrivateMessages" :key="msg.id" :class="['flex w-full', msg.senderId === 'current_user' ? 'justify-end' : 'justify-start']">
             <div :class="[
               'max-w-[85%] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm transition-all duration-200',
               msg.senderId === 'current_user' 
                 ? 'bg-black text-white rounded-[20px] rounded-tr-sm hover:shadow-md' 
                 : 'bg-gray-100 text-gray-800 rounded-[20px] rounded-tl-sm border border-gray-100 hover:bg-white hover:shadow-md'
             ]">
                <!-- Text -->
                <div v-if="msg.type === 'text'" class="whitespace-pre-wrap font-medium">{{ msg.content }}</div>
                
                <!-- Image -->
                <div v-else-if="msg.type === 'image'">
                  <img :src="msg.content" class="rounded-lg max-h-40 object-cover">
                </div>

                <!-- Product Share -->
                <div v-else-if="msg.type === 'product'" class="bg-white/10 p-2 rounded-lg flex items-center space-x-3 mt-1">
                   <img :src="msg.content.img" class="w-12 h-12 rounded object-cover bg-white">
                   <div class="flex-1 overflow-hidden">
                     <div class="text-xs opacity-70">商品分享</div>
                     <div class="text-sm font-bold truncate">{{ msg.content.name }}</div>
                   </div>
                </div>

                <!-- Video Share -->
                 <div v-else-if="msg.type === 'video'" class="flex items-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>{{ msg.content }}</span>
                 </div>
             </div>
          </div>
        </div>

      </template>

    </div>

    <!-- Input Area -->
    <div class="p-5 bg-white/80 backdrop-blur-md border-t border-gray-100 relative">
      
      <!-- Share Menu (Only in Friends Mode) -->
      <div v-if="showShareMenu && activeTab === 'friends' && activeFriend" class="absolute bottom-24 left-5 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex space-x-4 animate-fade-in-up">
        <button @click="handleShareMock('image')" class="flex flex-col items-center p-2 hover:bg-gray-50 rounded-xl transition">
          <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-1">
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <span class="text-[10px] text-gray-500">图片</span>
        </button>
        <button @click="handleShareMock('video')" class="flex flex-col items-center p-2 hover:bg-gray-50 rounded-xl transition">
          <div class="w-10 h-10 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mb-1">
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </div>
          <span class="text-[10px] text-gray-500">视频</span>
        </button>
        <button @click="handleShareMock('product')" class="flex flex-col items-center p-2 hover:bg-gray-50 rounded-xl transition">
          <div class="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-1">
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
          </div>
          <span class="text-[10px] text-gray-500">商品</span>
        </button>
      </div>

      <div class="relative flex items-center bg-gray-50 rounded-full border border-gray-200 focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-md transition-all duration-300">
        
        <!-- Plus Button (Only in Friends Mode) -->
        <button 
          v-if="activeTab === 'friends' && activeFriend"
          @click="showShareMenu = !showShareMenu"
          class="ml-2 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        </button>

        <input 
          v-model="inputMessage" 
          @keyup.enter="sendMessage"
          type="text" 
          :placeholder="activeTab === 'ai' ? '问问 AI...' : (activeTab === 'friends' && activeFriend ? '发送私信...' : '发送到世界频道...')" 
          class="flex-1 bg-transparent border-none outline-none px-6 py-4 text-gray-700 placeholder-gray-400 text-[15px]"
        >
        <button 
          @click="sendMessage"
          :disabled="!inputMessage.trim() || isTyping"
          class="mr-2 w-10 h-10 flex items-center justify-center bg-black text-white rounded-full hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all duration-200 shadow-lg shadow-gray-200"
        >
          <svg class="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"></path></svg>
        </button>
      </div>
      <div class="text-center mt-3">
        <p v-if="activeTab === 'ai'" class="text-[10px] text-gray-400">AI 可能会产生错误，请核实重要信息。</p>
        <p v-else-if="activeTab === 'social'" class="text-[10px] text-gray-400">世界频道内容由用户生成，请注意甄别。</p>
      </div>
    </div>
  </div>
</template>
