<template>
  <button
    :class="[
      'order-stat-card',
      'bg-gradient-to-r',
      color
    ]"
    @click="$emit('click')"
  >
    <div class="stat-icon">{{ icon }}</div>
    <div class="stat-content">
      <div class="stat-count">{{ formattedCount }}</div>
      <div class="stat-title">{{ title }}</div>
    </div>
    <div class="stat-arrow">›</div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  icon: string;
  title: string;
  count: number;
  color: string;
}

interface Emits {
  (e: 'click'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 格式化数量显示
const formattedCount = computed(() => {
  if (props.count >= 1000) {
    return (props.count / 1000).toFixed(1) + 'k';
  }
  return props.count.toString();
});
</script>

<style scoped>
.order-stat-card {
  @apply flex items-center gap-3 p-4 rounded-xl text-white transition-all duration-300;
  @apply hover:shadow-xl hover:-translate-y-1 hover:scale-[1.03];
  @apply active:scale-95 active:shadow-inner;
}

.stat-icon {
  @apply text-2xl;
}

.stat-content {
  @apply flex-1;
}

.stat-count {
  @apply text-2xl font-bold;
}

.stat-title {
  @apply text-sm opacity-90;
}

.stat-arrow {
  @apply text-xl opacity-70 transition-transform duration-300;
}

.order-stat-card:hover .stat-arrow {
  @apply transform translate-x-1;
}
</style>