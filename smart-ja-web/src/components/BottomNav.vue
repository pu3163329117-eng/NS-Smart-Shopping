<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const navItems = [
  { 
    name: '首页', 
    path: '/', 
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' 
  },
  { 
    name: '市场', 
    path: '/market', 
    icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' 
  },
  { 
    name: '社区', 
    path: '/social', 
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' 
  },
  { 
    name: '众筹', 
    path: '/crowdfunding', 
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' 
  },
  { 
    name: '我的', 
    path: '/profile', 
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' 
  }
];

const isActive = (path) => {
  if (path === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(path);
};

const navigateTo = (path) => {
  router.push(path);
};
</script>

<template>
  <nav class="md:hidden fixed bottom-0 left-0 z-40 w-full border-t border-slate-200 bg-white/90 backdrop-blur-lg transition-colors duration-300 dark:border-white/10 dark:bg-[#0a0a0c]/82 pb-safe">
    <div class="grid grid-cols-5 h-16">
      <button 
        v-for="item in navItems" 
        :key="item.path"
        @click="navigateTo(item.path)"
        class="flex flex-col items-center justify-center space-y-1 relative group active:scale-90 transition-transform duration-200"
      >
        <!-- Active Indicator -->
        <div 
          v-if="isActive(item.path)"
          class="absolute -top-[1px] left-1/2 h-1 w-8 -translate-x-1/2 rounded-b-lg bg-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.32)] dark:bg-white dark:shadow-[0_2px_10px_rgba(255,255,255,0.28)]"
        ></div>

        <svg 
          class="w-6 h-6 transition-colors duration-300"
          :class="isActive(item.path) ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"></path>
        </svg>
        <span 
          class="text-[10px] font-medium transition-colors duration-300"
          :class="isActive(item.path) ? 'text-slate-900 dark:text-white' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'"
        >
          {{ item.name }}
        </span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
