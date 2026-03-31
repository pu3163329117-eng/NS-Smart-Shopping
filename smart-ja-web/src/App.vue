<script setup>
import Navbar from './components/Navbar.vue';
import BottomNav from './components/BottomNav.vue';
import Footer from './components/Footer.vue';
import CartDrawer from './components/CartDrawer.vue';
import FavoritesDrawer from './components/FavoritesDrawer.vue';
import ToastContainer from './components/ToastContainer.vue';
import FloatingSalesAssistant from './components/FloatingSalesAssistant.vue';
</script>

<template>
  <div class="app-root min-h-screen transition-colors duration-500 flex flex-col font-sans">
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
    <FloatingSalesAssistant />
  </div>
</template>

<style>
.app-root {
  background-color: var(--app-bg);
  color: var(--app-text);
}

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
</style>
