<script setup>
import { ref } from 'vue';
import Navbar from './components/Navbar.vue';
import BottomNav from './components/BottomNav.vue';
import Footer from './components/Footer.vue';
import CartDrawer from './components/CartDrawer.vue';
import FavoritesDrawer from './components/FavoritesDrawer.vue';
import ToastContainer from './components/ToastContainer.vue';
import AIChatWindow from './components/AIChatWindow.vue';
import { useAIChat } from './store/aiChat';

const { aiChatState, toggleAIChat, closeAIChat } = useAIChat();
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col font-sans text-slate-900">
    <Navbar />
    <ToastContainer />
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <Footer />
    <div class="h-16 md:hidden"></div>
    <BottomNav />
    <CartDrawer />
    <FavoritesDrawer />
    <LiveTicker />
    <AIChatWindow :is-open="aiChatState.isOpen" @close="closeAIChat" />

    <!-- AI 悬浮球 -->
    <div class="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 group">
      <!-- Tooltip -->
      <div class="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
        <span class="text-sm font-bold text-gray-800">有问题？问问 AI 导购</span>
        <div class="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-r border-t border-gray-100 transform rotate-45"></div>
      </div>

      <button 
        @click="toggleAIChat"
        class="relative w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110 active:scale-95"
      >
        <!-- Glow Effect -->
        <div class="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-75 animate-pulse"></div>
        
        <!-- Main Sphere -->
        <div class="relative w-full h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-2xl border border-white/20 overflow-hidden">
          
          <!-- Inner shine -->
          <div class="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent"></div>
          
          <!-- Icon -->
          <svg class="w-8 h-8 text-white drop-shadow-md relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
        </div>

        <!-- Notification Dot (Optional) -->
        <span class="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>
      </button>
    </div>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
