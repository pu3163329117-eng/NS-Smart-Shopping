<template>
  <button
    :class="[
      'action-button',
      customClass
    ]"
    @click="$emit('click')"
    :title="description"
  >
    <div class="action-icon-wrapper">
      <span class="action-icon">{{ icon }}</span>
    </div>
    <div class="action-content">
      <div class="action-label">{{ label }}</div>
      <div class="action-description">{{ description }}</div>
    </div>
    <div class="action-arrow">→</div>
  </button>
</template>

<script setup lang="ts">
interface Props {
  icon: string;
  label: string;
  description: string;
  customClass?: string;
}

interface Emits {
  (e: 'click'): void;
}

withDefaults(defineProps<Props>(), {
  customClass: 'bg-gradient-to-r from-blue-400 to-purple-500'
});

defineEmits<Emits>();
</script>

<style scoped>
.action-button {
  @apply flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-300;
  @apply hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02];
  @apply active:scale-95 active:shadow-inner;
  @apply backdrop-blur-sm border border-white/30;
}

.action-icon-wrapper {
  @apply flex-shrink-0;
}

.action-icon {
  @apply text-2xl;
}

.action-content {
  @apply flex-1 min-w-0;
}

.action-label {
  @apply font-semibold text-white text-sm mb-1 truncate;
}

.action-description {
  @apply text-white/80 text-xs truncate;
}

.action-arrow {
  @apply text-white/60 text-lg transition-transform duration-300;
}

.action-button:hover .action-arrow {
  @apply transform translate-x-1;
}
</style>