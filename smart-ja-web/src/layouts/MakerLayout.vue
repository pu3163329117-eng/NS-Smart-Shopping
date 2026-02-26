<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const menuItems = [
  { id: 'dashboard', name: '工作室概览', icon: '🎮', path: '/maker/dashboard' },
  { id: 'services', name: '我的作品/服务', icon: '🎨', path: '/maker/services' },
  { id: 'orders', name: '接单任务', icon: '📜', path: '/maker/orders' },
  { id: 'wallet', name: '零花钱钱包', icon: '💰', path: '/maker/wallet' },
];

const activeTab = 'dashboard'; // In real app, match with route
</script>

<template>
  <div class="min-h-screen bg-[#F0F4F8] font-sans flex flex-col md:flex-row pt-16">
    
    <!-- Sidebar (Gamified Style) -->
    <aside class="w-full md:w-64 bg-white border-r border-indigo-100 flex flex-col shadow-xl z-20 md:h-[calc(100vh-4rem)] sticky top-16">
      
      <!-- Profile Card -->
      <div class="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative overflow-hidden">
        <div class="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
        <div class="relative z-10 flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-full bg-white border-2 border-indigo-300 p-0.5 shadow-md">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=TeenMaker" class="w-full h-full rounded-full bg-indigo-100" />
          </div>
          <div>
            <h2 class="font-bold text-lg">Teen Maker X</h2>
            <div class="text-xs bg-indigo-800/30 px-2 py-0.5 rounded-full inline-block">Lv.2 初级工匠</div>
          </div>
        </div>
        
        <!-- EXP Bar -->
        <div class="relative pt-1">
          <div class="flex mb-1 items-center justify-between">
            <span class="text-[10px] font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-100 bg-indigo-800/30">
              EXP: 350 / 500
            </span>
          </div>
          <div class="overflow-hidden h-2 mb-1 text-xs flex rounded bg-indigo-800/30">
            <div style="width: 70%" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-400"></div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
        <router-link 
          v-for="item in menuItems" 
          :key="item.id"
          :to="item.path"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group hover:bg-indigo-50"
          active-class="bg-indigo-100 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
        >
          <span class="text-xl group-hover:scale-110 transition-transform">{{ item.icon }}</span>
          <span class="font-bold text-gray-700 group-hover:text-indigo-800">{{ item.name }}</span>
        </router-link>
      </nav>

      <!-- Back to Market -->
      <div class="p-4 border-t border-gray-100">
        <button @click="router.push('/')" class="w-full py-2 text-sm text-gray-500 hover:text-indigo-600 flex items-center justify-center gap-2 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z"></path></svg>
          返回前台市场
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto relative">
      <!-- Top Bar Mobile -->
      <div class="md:hidden bg-white p-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <span class="font-bold text-indigo-600">🛠️ Maker Studio</span>
        <button class="p-2 bg-gray-100 rounded-lg">🍔</button>
      </div>

      <div class="p-4 md:p-8 max-w-6xl mx-auto">
        <router-view />
      </div>
    </main>

  </div>
</template>
