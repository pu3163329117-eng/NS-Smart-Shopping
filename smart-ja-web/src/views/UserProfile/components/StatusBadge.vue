<template>
  <span :class="badgeClass">
    {{ text }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  status: 'pending' | 'shipped' | 'delivered' | 'completed';
  text: string;
}

const props = defineProps<Props>();

// 根据状态确定样式
const badgeClass = computed(() => {
  const baseClass = 'px-3 py-1 rounded-full text-xs font-medium';
  
  switch (props.status) {
    case 'pending':
      return `${baseClass} bg-amber-100 text-amber-800 border border-amber-200`;
    case 'shipped':
      return `${baseClass} bg-blue-100 text-blue-800 border border-blue-200`;
    case 'delivered':
      return `${baseClass} bg-green-100 text-green-800 border border-green-200`;
    case 'completed':
      return `${baseClass} bg-purple-100 text-purple-800 border border-purple-200`;
    default:
      return `${baseClass} bg-gray-100 text-gray-800 border border-gray-200`;
  }
});
</script>

<style scoped>
/* 添加脉动动画给待处理状态 */
.bg-amber-100 {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
</style>