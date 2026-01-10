<script setup>
import { useToast } from '../composables/useToast';

const { toasts } = useToast();
</script>

<template>
  <div class="fixed top-24 right-5 z-[100] flex flex-col gap-4 pointer-events-none">
    <transition-group name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        class="pointer-events-auto min-w-[300px] p-4 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all duration-300"
        :class="{
          'bg-white text-slate-800 border-l-4 border-blue-500': toast.type === 'info',
          'bg-white text-slate-800 border-l-4 border-green-500': toast.type === 'success',
          'bg-white text-slate-800 border-l-4 border-red-500': toast.type === 'error'
        }"
      >
        <div v-if="toast.type === 'success'" class="text-green-500">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <div v-else-if="toast.type === 'error'" class="text-red-500">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </div>
        <div v-else class="text-blue-500">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        
        <p class="font-medium text-sm">{{ toast.message }}</p>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>