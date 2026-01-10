<script setup>
import { ref } from 'vue';
import { useSocial } from '../store/social';

const props = defineProps({
  isOpen: Boolean,
  product: Object
});

const emit = defineEmits(['close']);
const { addChatMessage, sendPrivateMessage, friendsList } = useSocial();

const showToast = ref(false);
const toastMessage = ref('');

const handleShare = (platform) => {
  if (platform === 'world') {
    addChatMessage({
      user: '我 (Me)',
      content: `[分享商品] ${props.product.name} - 💰${props.product.price}`,
      type: 'text'
    });
    toastMessage.value = '已分享到世界频道';
  } else if (platform === 'friend') {
    if (friendsList.value.length > 0) {
      // Demo: Share to the first friend
      const friend = friendsList.value[0];
      sendPrivateMessage(friend.id, {
        type: 'text',
        content: `看看这个好东西：${props.product.name}`
      });
      toastMessage.value = `已分享给好友 ${friend.name}`;
    } else {
      toastMessage.value = '暂无好友可分享';
    }
  } else if (platform === 'copy') {
    // Copy to clipboard
    navigator.clipboard.writeText(`Check out ${props.product.name} at smart-ja-web!`);
    toastMessage.value = '链接已复制';
  }

  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
    emit('close');
  }, 1500);
};

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  // Stronger tilt for small buttons
  const rotateX = ((y - centerY) / centerY) * -15;
  const rotateY = ((x - centerX) / centerX) * 15;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
};

const handleCardMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity" @click="$emit('close')"></div>

    <!-- Modal Content -->
    <div class="bg-white w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl p-6 pointer-events-auto transform transition-transform duration-300 ease-out translate-y-0 relative">
      <div class="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden"></div>
      
      <h3 class="text-lg font-bold text-center mb-6 text-slate-900">分享至</h3>

      <div class="grid grid-cols-4 gap-4 mb-6">
        <button 
          @click="handleShare('world')" 
          @mousemove="handleCardMouseMove"
          @mouseleave="handleCardMouseLeave"
          class="flex flex-col items-center gap-2 group transition-all duration-100 ease-out will-change-transform"
        >
          <div class="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
          </div>
          <span class="text-xs text-gray-600">世界频道</span>
        </button>

        <button 
          @click="handleShare('friend')" 
          @mousemove="handleCardMouseMove"
          @mouseleave="handleCardMouseLeave"
          class="flex flex-col items-center gap-2 group transition-all duration-100 ease-out will-change-transform"
        >
          <div class="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <span class="text-xs text-gray-600">私聊好友</span>
        </button>

        <button 
          @click="handleShare('copy')" 
          @mousemove="handleCardMouseMove"
          @mouseleave="handleCardMouseLeave"
          class="flex flex-col items-center gap-2 group transition-all duration-100 ease-out will-change-transform"
        >
          <div class="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
          </div>
          <span class="text-xs text-gray-600">复制链接</span>
        </button>

        <button 
          @mousemove="handleCardMouseMove"
          @mouseleave="handleCardMouseLeave"
          class="flex flex-col items-center gap-2 group transition-all duration-100 ease-out will-change-transform"
        >
           <div class="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
          </div>
          <span class="text-xs text-gray-600">更多</span>
        </button>
      </div>

      <button @click="$emit('close')" class="w-full py-3 bg-gray-100 rounded-xl font-medium text-slate-600 hover:bg-gray-200 transition">
        取消
      </button>
      
      <!-- Toast Notification -->
      <div v-if="showToast" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm backdrop-blur pointer-events-none whitespace-nowrap">
        {{ toastMessage }}
      </div>
    </div>
  </div>
</template>
