<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useProducts } from '../store/products';
import { useSocial } from '../store/social';
import { useAIChat } from '../store/aiChat';
import { callDeepseekAPIStream } from '../services/aiService';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const router = useRouter();
const { products } = useProducts();
const { chatMessages, addChatMessage, friendsList, getPrivateChat, sendPrivateMessage } = useSocial();
const { aiChatState, setActiveTab, setActiveFriend } = useAIChat();

const activeTab = computed({
  get: () => aiChatState.value.activeTab || 'ai',
  set: (value) => setActiveTab(value)
});

const activeFriend = computed(() => {
  if (!aiChatState.value.activeFriendId) return null;
  return friendsList.value.find((friend) => friend.id === aiChatState.value.activeFriendId) || null;
});

const currentPrivateMessages = computed(() => {
  if (!activeFriend.value) return [];
  return getPrivateChat(activeFriend.value.id).value;
});

const isExpanded = ref(false);
const isTyping = ref(false);
const inputMessage = ref('');
const showShareMenu = ref(false);
const chatContainer = ref(null);

const messages = ref([
  {
    id: 1,
    role: 'ai',
    type: 'text',
    content: t('aiChatWindow.welcome')
  }
]);

const suggestedQuestions = computed(() => [
  t('aiChatWindow.suggestions.findGift'),
  t('aiChatWindow.suggestions.bestSeller'),
  t('aiChatWindow.suggestions.creatorPick')
]);

const aiBrand = computed(() => t('aiChatWindow.brand'));

const aiInputPlaceholder = computed(() => {
  if (activeTab.value === 'ai') return t('aiChatWindow.placeholders.askAi');
  if (activeTab.value === 'friends' && activeFriend.value) return t('aiChatWindow.placeholders.privateMessage');
  return t('aiChatWindow.placeholders.worldChannel');
});

const resetWelcomeMessage = () => {
  if (messages.value.length === 1 && messages.value[0].id === 1) {
    messages.value[0].content = t('aiChatWindow.welcome');
  }
};

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      scrollToBottom();
    } else {
      showShareMenu.value = false;
    }
  }
);

watch(
  () => [chatMessages.value.length, messages.value.length, activeFriend.value?.id, currentPrivateMessages.value.length],
  () => {
    if (props.isOpen) {
      scrollToBottom();
    }
  }
);

watch(activeTab, () => {
  showShareMenu.value = false;
});

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  window.setTimeout(scrollToBottom, 250);
};

const openPrivateChat = (friend) => {
  setActiveFriend(friend.id);
  showShareMenu.value = false;
  window.setTimeout(scrollToBottom, 100);
};

const backToFriendList = () => {
  setActiveFriend(null);
  showShareMenu.value = false;
};

const normalizeProduct = (product) => {
  if (!product) return null;

  return {
    id: product.id,
    name: product.name || product.title,
    price: product.price || 0,
    description: product.desc || product.description || product.summary || '',
    image: product.img || product.image || product.cover || ''
  };
};

const addAiProductList = () => {
  const topProducts = products.value.slice(0, 3).map(normalizeProduct).filter(Boolean);
  if (topProducts.length === 0) return;

  messages.value.push({
    id: Date.now() + 2,
    role: 'ai',
    type: 'product-list',
    content: t('aiChatWindow.productListTitle'),
    products: topProducts
  });
};

const sendAiMessage = async (userMessage) => {
  messages.value.push({
    id: Date.now(),
    role: 'user',
    type: 'text',
    content: userMessage
  });

  isTyping.value = true;
  await scrollToBottom();

  const history = messages.value
    .filter((message) => message.type === 'text')
    .slice(-6)
    .map((message) => ({
      role: message.role === 'ai' ? 'assistant' : 'user',
      content: message.content
    }));

  const replyId = Date.now() + 1;
  messages.value.push({
    id: replyId,
    role: 'ai',
    type: 'text',
    content: ''
  });

  try {
    await callDeepseekAPIStream(
      [
        { role: 'system', content: t('aiChatWindow.systemPrompt') },
        ...history,
        { role: 'user', content: userMessage }
      ],
      'sales',
      (_, buffer) => {
        const target = messages.value.find((message) => message.id === replyId);
        if (target) {
          target.content = buffer;
        }
        scrollToBottom();
      }
    );

    if (products.value.length > 0 && messages.value.length < 8) {
      addAiProductList();
    }
  } catch (error) {
    console.error(error);
    const target = messages.value.find((message) => message.id === replyId);
    if (target) {
      target.content = t('aiChatWindow.errors.unavailable');
    }
  } finally {
    isTyping.value = false;
    scrollToBottom();
  }
};

const sendSocialMessage = (userMessage) => {
  addChatMessage({
    user: t('aiChatWindow.me'),
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me',
    content: userMessage,
    type: 'text'
  });
};

const sendPrivateChatMessage = (userMessage) => {
  if (!activeFriend.value) return;

  sendPrivateMessage(activeFriend.value.id, {
    type: 'text',
    content: userMessage
  });
};

const sendMessage = async () => {
  const userMessage = inputMessage.value.trim();
  if (!userMessage) return;

  inputMessage.value = '';

  if (activeTab.value === 'ai') {
    await sendAiMessage(userMessage);
    return;
  }

  if (activeTab.value === 'social') {
    sendSocialMessage(userMessage);
    scrollToBottom();
    return;
  }

  if (activeTab.value === 'friends' && activeFriend.value) {
    sendPrivateChatMessage(userMessage);
    scrollToBottom();
  }
};

const handleShareMock = (type) => {
  showShareMenu.value = false;
  if (!activeFriend.value) return;

  if (type === 'image') {
    sendPrivateMessage(activeFriend.value.id, {
      type: 'image',
      content: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=300'
    });
  }

  if (type === 'video') {
    sendPrivateMessage(activeFriend.value.id, {
      type: 'video',
      content: t('aiChatWindow.share.videoShared')
    });
  }

  if (type === 'product') {
    const product = normalizeProduct(products.value[0]);
    if (product) {
      sendPrivateMessage(activeFriend.value.id, {
        type: 'product',
        productId: product.id,
        content: product
      });
    }
  }

  scrollToBottom();
};

const openMarket = () => {
  router.push('/market');
};

const openSocial = () => {
  router.push('/social');
};

const handleCardMouseMove = (event) => {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * -5;
  const rotateY = ((x - centerX) / centerX) * 5;

  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (event) => {
  event.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};

watch(
  () => t('aiChatWindow.welcome'),
  () => {
    resetWelcomeMessage();
  }
);
</script>

<template>
  <div
    v-if="isOpen"
    :class="[
      'fixed z-50 flex flex-col overflow-hidden border border-white/50 bg-white/90 shadow-2xl backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
      isExpanded ? 'inset-4 rounded-3xl' : 'bottom-28 right-8 h-[600px] w-96 rounded-3xl'
    ]"
  >
    <div class="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-100/50 bg-white/50 px-4 backdrop-blur-md">
      <div v-if="!(activeTab === 'friends' && activeFriend)" class="flex space-x-1 rounded-xl bg-gray-100/50 p-1">
        <button
          class="rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-300"
          :class="activeTab === 'ai' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'ai'"
        >
          {{ t('aiChatWindow.tabs.ai') }}
        </button>
        <button
          class="rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-300"
          :class="activeTab === 'social' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'social'"
        >
          {{ t('aiChatWindow.tabs.social') }}
        </button>
        <button
          class="rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-300"
          :class="activeTab === 'friends' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'friends'"
        >
          {{ t('aiChatWindow.tabs.friends') }}
        </button>
      </div>

      <div v-else class="flex flex-1 items-center space-x-2">
        <button class="rounded-full p-1 hover:bg-gray-100" @click="backToFriendList">
          <svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        <img :src="activeFriend.avatar" class="h-8 w-8 rounded-full border border-gray-200">
        <span class="text-sm font-bold text-gray-800">{{ activeFriend.name }}</span>
      </div>

      <div class="flex items-center space-x-2">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          :title="isExpanded ? t('aiChatWindow.actions.collapse') : t('aiChatWindow.actions.expand')"
          @click="toggleExpand"
        >
          <svg v-if="!isExpanded" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
          </svg>
          <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
        </button>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          @click="emit('close')"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>

    <div ref="chatContainer" class="flex-1 space-y-6 overflow-y-auto p-6 scroll-smooth">
      <template v-if="activeTab === 'ai'">
        <div
          v-for="message in messages"
          :key="message.id"
          class="flex w-full"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm transition-all duration-200"
            :class="message.role === 'user' ? 'rounded-[20px] rounded-tr-sm bg-black text-white hover:shadow-md' : 'rounded-[20px] rounded-tl-sm border border-gray-100 bg-white text-gray-800 hover:shadow-md'"
          >
            <div
              v-if="message.role === 'ai' && message.type !== 'product-list'"
              class="mb-2 flex select-none items-center space-x-2 text-[10px] font-bold uppercase tracking-wider opacity-50"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
              <span>{{ aiBrand }}</span>
            </div>

            <div v-if="message.type === 'text'" class="whitespace-pre-wrap font-medium">
              {{ message.content }}
            </div>

            <div v-else-if="message.type === 'product-list'" class="space-y-3">
              <div class="mb-2 text-sm text-gray-500">{{ message.content }}</div>
              <div
                v-for="product in message.products"
                :key="product.id"
                class="group flex cursor-pointer gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 transition-all duration-200 ease-out will-change-transform hover:bg-blue-50"
                @click="openMarket"
                @mousemove="handleCardMouseMove"
                @mouseleave="handleCardMouseLeave"
              >
                <img :src="product.image" class="h-16 w-16 rounded-lg bg-white object-cover">
                <div class="min-w-0 flex-1">
                  <div class="truncate font-bold text-gray-900">{{ product.name }}</div>
                  <div class="mt-0.5 line-clamp-2 text-xs text-gray-500">{{ product.description }}</div>
                  <div class="mt-1.5 flex items-center justify-between">
                    <span class="font-bold text-blue-600">{{ product.price }}</span>
                    <span class="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-500 group-hover:border-blue-200 group-hover:text-blue-500">
                      {{ t('aiChatWindow.actions.view') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isTyping" class="flex w-full justify-start">
          <div class="rounded-[20px] rounded-tl-sm border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div class="flex space-x-1.5">
              <div class="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" style="animation-delay: 0s"></div>
              <div class="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400" style="animation-delay: 0.15s"></div>
              <div class="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-400" style="animation-delay: 0.3s"></div>
            </div>
          </div>
        </div>

        <div v-if="!isTyping && messages.length < 5" class="mt-4 flex flex-wrap justify-center gap-2">
          <button
            v-for="question in suggestedQuestions"
            :key="question"
            class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-100"
            @click="inputMessage = question; sendMessage()"
          >
            {{ question }}
          </button>
        </div>
      </template>

      <template v-else-if="activeTab === 'social'">
        <div v-for="message in chatMessages" :key="message.id" class="mb-4 flex w-full justify-start">
          <img :src="message.avatar" class="mr-3 h-8 w-8 rounded-full border border-gray-200">
          <div class="flex max-w-[85%] flex-col">
            <span class="mb-1 ml-1 text-[10px] text-gray-400">{{ message.user }}</span>

            <div
              v-if="message.type === 'text'"
              class="rounded-[20px] rounded-tl-sm border border-gray-100 bg-white px-4 py-3 text-gray-800 shadow-sm transition-all duration-100 ease-out will-change-transform hover:shadow-md"
              @mousemove="handleCardMouseMove"
              @mouseleave="handleCardMouseLeave"
            >
              {{ message.content }}
            </div>

            <div
              v-else-if="message.type === 'system'"
              class="rounded-[20px] bg-blue-50 px-4 py-3 text-xs text-blue-800 shadow-sm transition-all duration-100 ease-out will-change-transform hover:shadow-md"
              @mousemove="handleCardMouseMove"
              @mouseleave="handleCardMouseLeave"
            >
              {{ message.content }}
            </div>

            <div
              v-else-if="message.type === 'share'"
              class="cursor-pointer rounded-[20px] rounded-tl-sm bg-black p-3 text-white shadow-md transition-all duration-100 ease-out will-change-transform hover:scale-105"
              @click="openSocial"
              @mousemove="handleCardMouseMove"
              @mouseleave="handleCardMouseLeave"
            >
              <div class="flex items-center space-x-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800">
                  <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div class="flex-1">
                  <div class="text-xs font-bold opacity-70">{{ t('aiChatWindow.share.video') }}</div>
                  <div class="w-32 truncate text-sm">{{ message.content }}</div>
                </div>
              </div>
            </div>

            <div
              v-else-if="message.type === 'product'"
              class="cursor-pointer rounded-[20px] rounded-tl-sm border border-gray-100 bg-white p-3 shadow-sm transition-all duration-100 ease-out will-change-transform hover:shadow-md"
              @click="openMarket"
              @mousemove="handleCardMouseMove"
              @mouseleave="handleCardMouseLeave"
            >
              <div class="flex items-center space-x-3">
                <img
                  :src="normalizeProduct(message.product || message.content)?.image"
                  class="h-12 w-12 rounded-lg border border-gray-100 bg-gray-50 object-cover"
                >
                <div class="flex-1 overflow-hidden">
                  <div class="mb-0.5 text-[10px] uppercase tracking-wider text-gray-400">{{ t('aiChatWindow.share.product') }}</div>
                  <div class="truncate text-sm font-bold text-gray-900">{{ normalizeProduct(message.product || message.content)?.name }}</div>
                  <div class="mt-0.5 text-xs font-bold text-blue-600">{{ normalizeProduct(message.product || message.content)?.price }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="!activeFriend" class="space-y-2">
          <div v-if="friendsList.length === 0" class="mt-10 text-center text-gray-400">
            <p>{{ t('aiChatWindow.friends.emptyTitle') }}</p>
            <p class="mt-2 text-xs">{{ t('aiChatWindow.friends.emptyBody') }}</p>
          </div>

          <div
            v-for="friend in friendsList"
            :key="friend.id"
            class="flex cursor-pointer items-center rounded-2xl p-3 transition-all duration-200 ease-out will-change-transform hover:bg-gray-50"
            @click="openPrivateChat(friend)"
            @mousemove="handleCardMouseMove"
            @mouseleave="handleCardMouseLeave"
          >
            <img :src="friend.avatar" class="mr-4 h-12 w-12 rounded-full border border-gray-100">
            <div class="flex-1">
              <h4 class="font-bold text-gray-800">{{ friend.name }}</h4>
              <p class="truncate text-xs text-gray-400">{{ friend.bio }}</p>
            </div>
            <div class="h-2 w-2 rounded-full bg-green-500"></div>
          </div>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="message in currentPrivateMessages"
            :key="message.id"
            class="flex w-full"
            :class="message.senderId === 'current_user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[85%] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm transition-all duration-200"
              :class="message.senderId === 'current_user' ? 'rounded-[20px] rounded-tr-sm bg-black text-white hover:shadow-md' : 'rounded-[20px] rounded-tl-sm border border-gray-100 bg-gray-100 text-gray-800 hover:bg-white hover:shadow-md'"
            >
              <div v-if="message.type === 'text'" class="whitespace-pre-wrap font-medium">
                {{ message.content }}
              </div>

              <div v-else-if="message.type === 'image'">
                <img :src="message.content" class="max-h-40 rounded-lg object-cover">
              </div>

              <div v-else-if="message.type === 'product'" class="mt-1 flex items-center space-x-3 rounded-lg bg-white/10 p-2">
                <img :src="normalizeProduct(message.content)?.image" class="h-12 w-12 rounded bg-white object-cover">
                <div class="flex-1 overflow-hidden">
                  <div class="text-xs opacity-70">{{ t('aiChatWindow.share.product') }}</div>
                  <div class="truncate text-sm font-bold">{{ normalizeProduct(message.content)?.name }}</div>
                </div>
              </div>

              <div v-else-if="message.type === 'video'" class="flex items-center space-x-2">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{{ message.content }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="relative border-t border-gray-100 bg-white/80 p-5 backdrop-blur-md">
      <div
        v-if="showShareMenu && activeTab === 'friends' && activeFriend"
        class="absolute bottom-24 left-5 flex space-x-4 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl"
      >
        <button class="flex flex-col items-center rounded-xl p-2 transition hover:bg-gray-50" @click="handleShareMock('image')">
          <div class="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <span class="text-[10px] text-gray-500">{{ t('aiChatWindow.share.image') }}</span>
        </button>

        <button class="flex flex-col items-center rounded-xl p-2 transition hover:bg-gray-50" @click="handleShareMock('video')">
          <div class="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-600">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </div>
          <span class="text-[10px] text-gray-500">{{ t('aiChatWindow.share.video') }}</span>
        </button>

        <button class="flex flex-col items-center rounded-xl p-2 transition hover:bg-gray-50" @click="handleShareMock('product')">
          <div class="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
          </div>
          <span class="text-[10px] text-gray-500">{{ t('aiChatWindow.share.product') }}</span>
        </button>
      </div>

      <div class="relative flex items-center rounded-full border border-gray-200 bg-gray-50 transition-all duration-300 focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-md">
        <button
          v-if="activeTab === 'friends' && activeFriend"
          class="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          @click="showShareMenu = !showShareMenu"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
        </button>

        <input
          v-model="inputMessage"
          type="text"
          class="flex-1 border-none bg-transparent px-6 py-4 text-[15px] text-gray-700 outline-none placeholder-gray-400"
          :placeholder="aiInputPlaceholder"
          @keyup.enter="sendMessage"
        >

        <button
          class="mr-2 flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-lg shadow-gray-200 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
          :disabled="!inputMessage.trim() || isTyping"
          @click="sendMessage"
        >
          <svg class="ml-0.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>

      <div class="mt-3 text-center">
        <p v-if="activeTab === 'ai'" class="text-[10px] text-gray-400">{{ t('aiChatWindow.disclaimer.ai') }}</p>
        <p v-else-if="activeTab === 'social'" class="text-[10px] text-gray-400">{{ t('aiChatWindow.disclaimer.social') }}</p>
      </div>
    </div>
  </div>
</template>
