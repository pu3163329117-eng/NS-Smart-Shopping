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
    icon: 'M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2h-2m-4 0H7a2 2 0 01-2-2v-1m0-4V7a2 2 0 012-2h6m4 4H9a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 00-2-2z'
  },
  {
    name: '众筹',
    path: '/crowdfunding',
    icon: 'M12 8c-2.21 0-4 1.79-4 4v7h8v-7c0-2.21-1.79-4-4-4zm0 0V5m-7 7h2m10 0h2M7.5 19h9'
  },
  { 
    name: 'AI Lab', 
    path: '/ai-lab', 
    icon: 'M9.75 3.104v5.714M14.25 3.104v5.714M5.714 10.286h12.572M6.857 19.429h10.286A2.286 2.286 0 0019.429 17.143V9.143a2.286 2.286 0 00-2.286-2.286H6.857A2.286 2.286 0 004.571 9.143v8a2.286 2.286 0 002.286 2.286z' 
  },
  { 
    name: '钱包', 
    path: '/wallet', 
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m0-6h3m0 0a2 2 0 110 4h-3m3-4v4' 
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
    <div class="grid grid-cols-7 h-16">
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
