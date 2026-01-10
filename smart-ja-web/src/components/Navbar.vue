<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useCart } from '../store/cart';
import { useFavorites } from '../store/favorites';
import { useAuth } from '../store/auth';
import { useUserProfile } from '../store/userProfile';
import SearchModal from './SearchModal.vue';

const { cart, toggleCart } = useCart();
const { favorites, toggleFavoritesDrawer } = useFavorites();
const { auth, logout } = useAuth();
const { userProfile } = useUserProfile();
const router = useRouter();
const route = useRoute();
const isMenuOpen = ref(false);
const isSearchOpen = ref(false);

const isActive = (path) => route.path === path;

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const openSearch = () => {
  isSearchOpen.value = true;
  isMenuOpen.value = false;
};

const goHome = () => {
  isMenuOpen.value = false;
  router.push('/');
};

const goAbout = () => {
  isMenuOpen.value = false;
  router.push('/about');
};

const goCrowdfunding = () => {
  isMenuOpen.value = false;
  router.push('/crowdfunding');
};

const goMarket = () => {
  isMenuOpen.value = false;
  router.push('/market');
};

const goSocial = () => {
  isMenuOpen.value = false;
  router.push('/social');
};

const goAILab = () => {
  isMenuOpen.value = false;
  router.push('/ai-lab');
};

const goLogin = () => {
  isMenuOpen.value = false;
  router.push('/login');
};

const goProfile = () => {
  isMenuOpen.value = false;
  router.push('/profile');
};

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -10;
  const rotateY = ((x - centerX) / centerX) * 10;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.1, 1.1, 1.1)`;
};

const handleCardMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <nav class="fixed w-full z-50 glass-nav transition-all duration-300 top-0 left-0">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Mobile menu button -->
        <div class="flex items-center md:hidden">
          <button @click="toggleMenu" class="text-slate-600 hover:text-slate-900 p-2 focus:outline-none">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path v-if="!isMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-shrink-0 flex items-center cursor-pointer" @click="goHome">
          <span class="text-2xl font-bold text-slate-900 tracking-tight">NS Smart Shopping</span>
        </div>
        <div class="hidden md:flex items-center space-x-2">
          <a @click.prevent="goHome" href="#" 
             class="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative group"
             :class="isActive('/') ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'">
             产品系列
             <span class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 transform scale-x-0 transition-transform duration-200"
                   :class="isActive('/') ? 'scale-x-100' : 'group-hover:scale-x-100'"></span>
          </a>

          <a @click.prevent="goMarket" href="#" 
             class="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative group"
             :class="isActive('/market') ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'">
             NS多元市场
             <span class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 transform scale-x-0 transition-transform duration-200"
                   :class="isActive('/market') ? 'scale-x-100' : 'group-hover:scale-x-100'"></span>
          </a>

          <a @click.prevent="goSocial" href="#" 
             class="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative group"
             :class="isActive('/social') ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'">
             社区动态
             <span class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 transform scale-x-0 transition-transform duration-200"
                   :class="isActive('/social') ? 'scale-x-100' : 'group-hover:scale-x-100'"></span>
          </a>

          <a @click.prevent="goCrowdfunding" href="#" 
             class="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative group"
             :class="isActive('/crowdfunding') ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'">
             众筹计划
             <span class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 transform scale-x-0 transition-transform duration-200"
                   :class="isActive('/crowdfunding') ? 'scale-x-100' : 'group-hover:scale-x-100'"></span>
          </a>

          <!-- Optimized AI Lab Button -->
          <a @click.prevent="goAILab" href="#" 
             @mousemove="handleCardMouseMove"
             @mouseleave="handleCardMouseLeave"
             class="mx-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-100 ease-out will-change-transform relative group flex items-center gap-2 border border-transparent hover:border-purple-200"
             :class="isActive('/ai-lab') ? 'bg-slate-900 text-white shadow-lg ring-2 ring-purple-500/20' : 'bg-slate-50 text-slate-600 hover:bg-white hover:shadow-md'">
             
             <span class="relative z-10 transition-colors duration-300"
                   :class="isActive('/ai-lab') ? 'text-white' : 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'">
               AI 实验室
             </span>
             
             <!-- Pulse Dot -->
             <span class="relative flex h-2 w-2">
               <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
               <span class="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
             </span>
          </a>

          <a @click.prevent="goAbout" href="#" 
             class="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative group"
             :class="isActive('/about') ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'">
             关于我们
             <span class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 transform scale-x-0 transition-transform duration-200"
                   :class="isActive('/about') ? 'scale-x-100' : 'group-hover:scale-x-100'"></span>
          </a>
        </div>
        <div class="flex items-center space-x-4">
          <button @click="openSearch" class="p-2 text-slate-600 hover:text-slate-900 transition-colors hover:bg-slate-100 rounded-full" title="搜索">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </button>
          <button @click="toggleFavoritesDrawer" class="relative p-2 text-slate-600 hover:text-slate-900 transition-colors" title="收藏">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            <span v-if="favorites.items.length > 0" class="absolute top-0 right-0 w-4 h-4 bg-blue-500 text-white text-xs flex items-center justify-center rounded-full">{{ favorites.items.length }}</span>
          </button>
          <button @click="toggleCart" class="relative p-2 text-slate-600 hover:text-slate-900 transition-colors" title="购物车">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            <span v-if="cart.items.length > 0" class="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">{{ cart.items.length }}</span>
          </button>
          
          <div v-if="auth.isAuthenticated" class="flex items-center space-x-3 cursor-pointer" @click="goProfile">
             <img :src="userProfile.userInfo.avatar" class="w-8 h-8 rounded-full border border-gray-200">
             <span class="text-sm font-medium text-slate-900 hover:text-blue-600 transition">{{ userProfile.userInfo.name }}</span>
          </div>
          <button v-else @click="goLogin" class="bg-black text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-all transform hover:scale-105">
            登录
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-show="isMenuOpen" class="md:hidden bg-white border-t border-gray-100 absolute w-full left-0 shadow-lg">
      <div class="px-4 pt-4 pb-2">
        <div @click="openSearch" class="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-500 mb-4 cursor-pointer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <span class="text-sm">Search products...</span>
        </div>
      </div>
      <div class="px-4 pb-4 space-y-1">
        <a @click.prevent="goHome" href="#" 
           class="block px-3 py-2 rounded-md text-base font-medium"
           :class="isActive('/') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'">
           产品系列
        </a>
        <a @click.prevent="goMarket" href="#" 
           class="block px-3 py-2 rounded-md text-base font-medium"
           :class="isActive('/market') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'">
           NS多元市场
        </a>
        <a @click.prevent="goSocial" href="#" 
           class="block px-3 py-2 rounded-md text-base font-medium"
           :class="isActive('/social') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'">
           社区动态
        </a>
        <a @click.prevent="goCrowdfunding" href="#" 
           class="block px-3 py-2 rounded-md text-base font-medium"
           :class="isActive('/crowdfunding') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'">
           众筹计划
        </a>
        <a @click.prevent="goAILab" href="#" 
           class="block px-3 py-2 rounded-md text-base font-medium"
           :class="isActive('/ai-lab') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'">
           AI 实验室
        </a>
        <a @click.prevent="goAbout" href="#" 
           class="block px-3 py-2 rounded-md text-base font-medium"
           :class="isActive('/about') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'">
           关于我们
        </a>
        <div class="border-t border-gray-100 my-2 pt-2">
          <div v-if="auth.isAuthenticated" class="px-3 py-2 flex items-center space-x-3" @click="goProfile">
             <img :src="userProfile.userInfo.avatar" class="w-8 h-8 rounded-full border border-gray-200">
             <span class="font-medium text-slate-900">{{ userProfile.userInfo.name }} (个人中心)</span>
          </div>
          <a v-else @click.prevent="goLogin" href="#" class="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            登录
          </a>
        </div>
      </div>
    </div>
    
    <SearchModal :is-open="isSearchOpen" @close="isSearchOpen = false" />
  </nav>
</template>
