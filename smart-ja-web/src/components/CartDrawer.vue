<script setup>
import { useCart } from '../store/cart';
import { useProducts } from '../store/products';
import { ref, computed } from 'vue';
import { useToast } from '../composables/useToast';

const { cart, removeFromCart, clearCart, toggleCart, total, addToCart } = useCart();
const { products } = useProducts();
const { show: showToast } = useToast();
const isCheckingOut = ref(false);

// AI Recommendation Logic
const recommendations = computed(() => {
  // Filter out products already in cart
  const cartIds = new Set(cart.items.map(item => item.id));
  const available = products.value.filter(p => !cartIds.has(p.id));
  
  // Randomly select 2
  return available.sort(() => Math.random() - 0.5).slice(0, 2);
});

const handleAddRec = (product) => {
  addToCart(product);
  showToast('已添加推荐商品', 'success');
};

const checkout = async () => {
  if (cart.items.length === 0) return;
  
  isCheckingOut.value = true;
  
  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  alert(`支付成功！共消费 ¥${total.value}。感谢您的购买！`);
  clearCart();
  toggleCart();
  isCheckingOut.value = false;
};

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -5;
  const rotateY = ((x - centerX) / centerX) * 5;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div v-if="cart.isOpen" class="fixed inset-0 z-[100] overflow-hidden">
    <div class="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" @click="toggleCart"></div>
    
    <div class="fixed inset-y-0 right-0 max-w-full flex">
      <div class="w-screen max-w-md transform transition ease-in-out duration-500 sm:duration-700 bg-white/95 backdrop-blur-xl shadow-2xl flex flex-col h-full border-l border-white/20">
        
        <!-- Header -->
        <div class="px-6 py-6 border-b border-gray-100/50 flex items-center justify-between bg-white/50 backdrop-blur-sm">
          <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>购物车</span>
            <span class="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{{ cart.items.length }}</span>
          </h2>
          <button @click="toggleCart" class="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Items List -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <div v-if="cart.items.length === 0" class="flex flex-col items-center justify-center h-full text-slate-400 animate-fadeIn">
            <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <svg class="w-12 h-12 opacity-50 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            </div>
            <p class="text-lg font-medium text-slate-600">购物车还是空的</p>
            <p class="text-sm mt-1">快去挑选心仪的商品吧</p>
            <button @click="toggleCart" class="mt-6 px-6 py-2 bg-slate-900 text-white rounded-full text-sm font-bold hover:bg-slate-800 transition-transform active:scale-95">
              去逛逛
            </button>
          </div>
          
          <div v-for="(item, index) in cart.items" :key="index" 
               @mousemove="handleCardMouseMove"
               @mouseleave="handleCardMouseLeave"
               class="flex gap-4 items-center animate-fadeIn group p-3 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-100 ease-out will-change-transform border border-transparent hover:border-gray-100">
            <div class="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative group-hover:scale-105 transition-transform duration-500">
              <img :src="item.img" :alt="item.name" class="w-full h-full object-cover">
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-between h-24 py-1">
              <div>
                <h3 class="text-base font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{{ item.name }}</h3>
                <p class="text-sm text-slate-500">{{ item.company }}</p>
              </div>
              <div class="flex items-center justify-between mt-1">
                <p class="font-bold text-lg text-slate-900">¥{{ item.price }}</p>
                <button @click="removeFromCart(index)" class="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                  移除
                </button>
              </div>
            </div>
          </div>

          <!-- AI Recommendations (Only show if cart has items or just generally at bottom) -->
          <div v-if="recommendations.length > 0" class="pt-6 border-t border-gray-100">
             <div class="flex items-center gap-2 mb-4">
                <span class="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></span>
                <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                  AI 智能推荐 
                  <span class="text-[10px] font-normal text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">Based on your taste</span>
                </h3>
             </div>
             <div class="space-y-3">
               <div v-for="rec in recommendations" :key="rec.id" class="flex gap-3 items-center p-2 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors group/rec">
                 <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                   <img :src="rec.img" class="w-full h-full object-cover group-hover/rec:scale-110 transition-transform">
                 </div>
                 <div class="flex-1 min-w-0">
                   <h4 class="text-sm font-bold text-slate-900 truncate">{{ rec.name }}</h4>
                   <div class="flex items-center justify-between mt-1">
                     <span class="text-xs text-blue-600 font-bold">¥{{ rec.price }}</span>
                     <button @click="handleAddRec(rec)" class="p-1.5 bg-white rounded-full shadow-sm hover:text-blue-600 transition-colors text-gray-400">
                       <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                     </button>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="border-t border-gray-100 p-6 bg-gray-50/80 backdrop-blur-md">
          <div class="flex justify-between items-end mb-6">
            <span class="text-sm font-medium text-slate-500 mb-1">总计 ({{ cart.items.length }} 件)</span>
            <div class="text-right">
              <span class="text-3xl font-bold text-slate-900 tracking-tight">¥{{ total }}</span>
            </div>
          </div>
          <button @click="checkout" 
                  :disabled="cart.items.length === 0 || isCheckingOut"
                  class="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl relative overflow-hidden group">
            <span :class="{ 'opacity-0': isCheckingOut }">一键结算</span>
            <div v-if="isCheckingOut" class="absolute inset-0 flex items-center justify-center">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div v-else class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
