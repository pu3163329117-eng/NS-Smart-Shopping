<script setup>
import { useFavorites } from '../store/favorites';
import { useCart } from '../store/cart';
import { useToast } from '../composables/useToast';

const { favorites, removeFromFavorites, toggleFavoritesDrawer } = useFavorites();
const { addToCart } = useCart();
const { show: showToast } = useToast();

const handleAddToCart = (product) => {
  addToCart(product);
  showToast('已加入购物车', 'success');
};

const handleRemove = (id) => {
  removeFromFavorites(id);
  showToast('已取消收藏', 'info');
};
</script>

<template>
  <div>
    <!-- Backdrop -->
    <div 
      v-if="favorites.isOpen" 
      class="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] transition-opacity duration-300"
      @click="toggleFavoritesDrawer"
    ></div>

    <!-- Drawer -->
    <div 
      class="fixed top-0 right-0 h-full w-full sm:w-96 bg-white/95 backdrop-blur-xl shadow-2xl z-[101] transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col border-l border-white/20"
      :class="favorites.isOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <!-- Header -->
      <div class="p-6 border-b border-gray-100/50 flex items-center justify-between bg-white/50 backdrop-blur-sm">
        <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
          <span>我的收藏</span>
          <span class="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{{ favorites.items.length }}</span>
        </h2>
        <button @click="toggleFavoritesDrawer" class="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <div v-if="favorites.items.length === 0" class="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 animate-slide-in">
          <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-2">
            <svg class="w-12 h-12 opacity-50 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
          </div>
          <p class="text-lg font-medium text-slate-600">暂无收藏商品</p>
          <p class="text-sm">去发现更多好物吧</p>
          <button @click="toggleFavoritesDrawer" class="mt-4 text-blue-600 font-bold hover:text-blue-700 hover:underline transition-colors">去逛逛</button>
        </div>

        <div v-else v-for="item in favorites.items" :key="item.id" 
             @mousemove="handleCardMouseMove"
             @mouseleave="handleCardMouseLeave"
             class="flex gap-4 animate-slide-in group p-3 rounded-2xl hover:bg-white hover:shadow-lg transition-all duration-100 ease-out will-change-transform border border-transparent hover:border-gray-100">
          <div class="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden relative group-hover:scale-105 transition-transform duration-500">
            <img :src="item.img" :alt="item.name" class="w-full h-full object-cover">
            <!-- Shimmer effect on hover -->
            <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out z-10 pointer-events-none"></div>
          </div>
          <div class="flex-1 flex flex-col justify-between py-1">
            <div>
              <h3 class="font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{{ item.name }}</h3>
              <p class="text-sm font-medium text-slate-500 mt-1">¥{{ item.price }}</p>
            </div>
            <div class="flex items-center gap-2 mt-2">
              <button @click="handleAddToCart(item)" class="flex-1 text-xs font-bold text-white bg-slate-900 px-3 py-2 rounded-lg hover:bg-slate-800 transition-all active:scale-95 shadow-sm hover:shadow flex items-center justify-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                加入购物车
              </button>
              <button @click="handleRemove(item.id)" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="取消收藏">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-slide-in {
  animation: slideIn 0.3s ease-out forwards;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
