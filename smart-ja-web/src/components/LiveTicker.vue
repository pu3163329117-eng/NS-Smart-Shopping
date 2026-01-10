<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const events = ref([
  { type: 'AI', icon: '🤖', color: 'text-blue-400', msg: 'AI 自动优化了 "智能手环" 的库存策略' },
  { type: 'SALE', icon: '💰', color: 'text-green-400', msg: '刚刚: 用户 user_9527 购买了 "人体工学椅"' },
  { type: 'SEC', icon: '🛡️', color: 'text-red-400', msg: '安全盾拦截了一次来自 192.168.x.x 的异常访问' },
  { type: 'TREND', icon: '📈', color: 'text-purple-400', msg: '趋势提醒: "复古CCD相机" 搜索量激增 300%' },
  { type: 'AI', icon: '🧠', color: 'text-blue-400', msg: 'AI 生成了 5 份新的个性化推荐报告' },
  { type: 'SALE', icon: '📦', color: 'text-green-400', msg: '店铺 "极客空间" 补货了 "树莓派开发板"' },
]);

const currentEventIndex = ref(0);
const isVisible = ref(true);
let intervalId;

onMounted(() => {
  intervalId = setInterval(() => {
    isVisible.value = false;
    setTimeout(() => {
      currentEventIndex.value = (currentEventIndex.value + 1) % events.value.length;
      isVisible.value = true;
    }, 500); // Wait for fade out
  }, 4000); // Change every 4 seconds
});

onUnmounted(() => {
  clearInterval(intervalId);
});
</script>

<template>
  <div class="fixed bottom-[4.5rem] md:bottom-4 left-4 z-40 max-w-[90vw] md:max-w-md pointer-events-none">
    <div 
      class="bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-2xl flex items-center gap-3 transition-all duration-500 transform"
      :class="[isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4']"
    >
      <div class="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      <div class="flex items-center gap-2 overflow-hidden">
        <span class="text-lg">{{ events[currentEventIndex].icon }}</span>
        <span 
          class="text-xs md:text-sm font-mono font-medium truncate"
          :class="events[currentEventIndex].color"
        >
          [{{ events[currentEventIndex].type }}]
        </span>
        <span class="text-xs md:text-sm text-gray-300 truncate font-light">
          {{ events[currentEventIndex].msg }}
        </span>
      </div>
    </div>
  </div>
</template>
