<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const events = computed(() => [
  { type: 'AI', icon: '🤖', color: 'text-blue-400', msg: t('liveTicker.event1') },
  { type: 'SALE', icon: '💰', color: 'text-green-400', msg: t('liveTicker.event2') },
  { type: 'SEC', icon: '🛡️', color: 'text-red-400', msg: t('liveTicker.event3') },
  { type: 'TREND', icon: '📈', color: 'text-purple-400', msg: t('liveTicker.event4') },
  { type: 'AI', icon: '🧠', color: 'text-blue-400', msg: t('liveTicker.event5') },
  { type: 'SALE', icon: '📦', color: 'text-green-400', msg: t('liveTicker.event6') },
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
  <div class="fixed bottom-[5.5rem] md:bottom-10 left-4 z-40 max-w-[90vw] md:max-w-md pointer-events-none">
    <div 
      class="bg-black/70 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center gap-3 transition-all duration-500 transform"
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
