<script setup>
import { ref } from 'vue';
import { useToast } from '../composables/useToast';

const props = defineProps({
  show: Boolean
});

const emit = defineEmits(['close']);
const { show: showToast } = useToast();

const activities = ref([
  { 
    id: 1, 
    title: '“湘味”文创设计大赛', 
    desc: '百万奖金等你来拿，寻找最美湖南元素', 
    date: '2026.01.15 - 2026.03.15',
    tag: '火热进行中',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1000&auto=format&fit=crop',
    color: 'orange'
  },
  { 
    id: 2, 
    title: '新人创作激励计划', 
    desc: '发布首个作品即可获得 100 积分奖励', 
    date: '长期有效',
    tag: '新人福利',
    image: 'https://images.unsplash.com/photo-1499750310159-525446b0d224?q=80&w=1000&auto=format&fit=crop',
    color: 'blue'
  },
  { 
    id: 3, 
    title: '非遗传承人招募', 
    desc: '加入我们，让传统手艺焕发新生', 
    date: '2026.02.01 截止',
    tag: '即将结束',
    image: 'https://images.unsplash.com/photo-1459749411177-8c275d84360e?q=80&w=1000&auto=format&fit=crop',
    color: 'red'
  }
]);

const handleJoin = (activity) => {
  showToast(`已报名：${activity.title}`, 'success');
};

const handleCardMouseMove = (e) => {
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

const handleCardMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};

const closeModal = () => {
  emit('close');
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

    <div class="relative bg-gray-50 w-full sm:w-[480px] h-[80vh] sm:h-[700px] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
      
      <!-- Header -->
      <div class="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 z-10">
        <h2 class="text-lg font-bold text-slate-900">创作活动</h2>
        <button @click="closeModal" class="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 scrollbar-hide bg-gray-50 space-y-4">
        
        <div v-for="item in activities" :key="item.id" 
             class="bg-white rounded-2xl overflow-hidden shadow-sm group cursor-pointer hover:shadow-md transition will-change-transform"
             @mousemove="handleCardMouseMove"
             @mouseleave="handleCardMouseLeave">
           <div class="h-32 bg-gray-200 relative overflow-hidden">
             <img :src="item.image" class="w-full h-full object-cover group-hover:scale-105 transition duration-700">
             <div class="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-bold text-white bg-black/50 backdrop-blur-md border border-white/20">
               {{ item.tag }}
             </div>
           </div>
           <div class="p-4">
              <h3 class="font-bold text-slate-900 text-lg mb-1">{{ item.title }}</h3>
              <p class="text-gray-500 text-sm mb-3">{{ item.desc }}</p>
              <div class="flex items-center justify-between">
                 <span class="text-xs text-gray-400 flex items-center gap-1">
                   <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   {{ item.date }}
                 </span>
                 <button @click.stop="handleJoin(item)" class="px-4 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition">
                   立即参加
                 </button>
              </div>
           </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up {
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>