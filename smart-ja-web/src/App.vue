<script setup>
import Navbar from './components/Navbar.vue';
import BottomNav from './components/BottomNav.vue';
import Footer from './components/Footer.vue';
import CartDrawer from './components/CartDrawer.vue';
import FavoritesDrawer from './components/FavoritesDrawer.vue';
import ToastContainer from './components/ToastContainer.vue';
import LiveTicker from './components/LiveTicker.vue';
import FloatingSalesAssistant from './components/FloatingSalesAssistant.vue';
import { useAppTheme } from './store/appConfig';
import { onMounted } from 'vue';

const { initTheme } = useAppTheme();

onMounted(() => {
  initTheme();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#050505] transition-colors duration-500 flex flex-col font-sans text-slate-900 dark:text-slate-100">
    <Navbar />
    <ToastContainer />
    <router-view v-slot="{ Component }">
      <transition name="page-slide" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <Footer />
    <div class="h-16 md:hidden"></div>
    <BottomNav />
    <CartDrawer />
    <FavoritesDrawer />
    <LiveTicker />
    <FloatingSalesAssistant />
  </div>
</template>

<style>
html {
  scroll-behavior: smooth;
}

.page-slide-enter-active,
.page-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
