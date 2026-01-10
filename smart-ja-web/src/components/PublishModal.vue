<script setup>
import { ref } from 'vue';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'select']);

const contentTypes = [
  { id: 'video', name: '发视频', icon: '🎥', color: 'bg-red-100 text-red-600', desc: '分享美好生活' },
  { id: 'post', name: '发图文', icon: '🖼️', color: 'bg-blue-100 text-blue-600', desc: '记录精彩瞬间' },
  { id: 'ai', name: 'AI创作', icon: '✨', color: 'bg-indigo-100 text-indigo-600', desc: '一键生成创意' }
];

const handleSelect = (type) => {
  emit('select', type);
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
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>
    
    <!-- Modal Content -->
    <div class="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-slide-up sm:animate-zoom-in">
      
      <!-- Header -->
      <div class="p-6 text-center border-b border-gray-100 relative">
        <h3 class="text-xl font-bold text-slate-800">发布作品</h3>
        <button @click="$emit('close')" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      
      <!-- Body -->
      <div class="p-8">
        <div class="grid grid-cols-3 gap-4">
          <button 
            v-for="type in contentTypes" 
            :key="type.id"
            @click="handleSelect(type)"
            @mousemove="handleCardMouseMove"
            @mouseleave="handleCardMouseLeave"
            class="flex flex-col items-center p-6 rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-lg transition-all duration-200 ease-out will-change-transform group bg-gray-50 hover:bg-white"
          >
            <div :class="`w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3 transition-transform group-hover:scale-110 ${type.color}`">
              {{ type.icon }}
            </div>
            <span class="font-bold text-slate-800 mb-1">{{ type.name }}</span>
            <span class="text-xs text-gray-400">{{ type.desc }}</span>
          </button>
        </div>
      </div>
      
      <!-- Footer (Drafts) -->
      <div class="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center text-sm">
        <div class="flex items-center text-gray-500 cursor-pointer hover:text-slate-900 transition">
          <svg class="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          草稿箱 (0)
        </div>
        <div class="text-xs text-gray-400">
          严禁发布违规内容
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes zoom-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-zoom-in {
  animation: zoom-in 0.2s ease-out;
}
</style>