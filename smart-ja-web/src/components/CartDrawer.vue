<script setup>
import { useCart } from '../store/cart';
import { useProducts } from '../store/products';
import { ref, computed, watch } from 'vue';
import { useToast } from '../composables/useToast';
import { useOrderStore } from '../store/order';
import { UserService } from '../services/api';
import { getCartRecommendations } from '../services/aiService';

const { cart, removeFromCart, clearCart, toggleCart, total, addToCart, updateQuantity } = useCart();
const { products } = useProducts();
const { show: showToast } = useToast();
const orderStore = useOrderStore();
const isCheckingOut = ref(false);
const addresses = ref([]);
const selectedAddressId = ref('');
const showAddressSelector = ref(false);
const recommendations = ref([]);

// Load Recommendations when cart changes (debounced)
let timeout = null;
watch(() => cart.items, (newItems) => {
  if (newItems.length > 0) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(async () => {
      recommendations.value = await getCartRecommendations(newItems);
    }, 1000);
  } else {
    recommendations.value = [];
  }
}, { deep: true });

// Fetch addresses on mount/open
const loadAddresses = async () => {
  try {
    const data = await UserService.getAddresses();
    addresses.value = data;
    const defaultAddr = data.find(a => a.isDefault);
    if (defaultAddr) selectedAddressId.value = defaultAddr.id;
    else if (data.length > 0) selectedAddressId.value = data[0].id;
  } catch (e) {
    console.error('Failed to load addresses', e);
  }
};

const checkout = async () => {
  if (cart.items.length === 0) return;
  
  if (!showAddressSelector.value) {
    await loadAddresses();
    showAddressSelector.value = true;
    return;
  }

  if (!selectedAddressId.value) {
    showToast('请选择收货地址', 'error');
    return;
  }
  
  isCheckingOut.value = true;
  
  try {
    // Create a single order for all items
    await orderStore.createOrder({
      items: cart.items,
      total: total.value,
      addressId: selectedAddressId.value
    });
    
    // Simulate payment processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    alert(`支付成功！共消费 ¥${total.value}。感谢您的购买！`);
    clearCart();
    toggleCart();
    showAddressSelector.value = false;
  } catch (err) {
    console.error(err);
    showToast('支付失败: ' + err.message, 'error');
  } finally {
    isCheckingOut.value = false;
  }
};

const handleNewAddress = async () => {
  const addressStr = prompt('请输入新地址 (例如: 北京市朝阳区...):');
  if (addressStr) {
    try {
      const newAddr = await UserService.addAddress({
        name: 'My Address',
        phone: '13800000000',
        detail: addressStr,
        isDefault: addresses.value.length === 0
      });
      addresses.value.push(newAddr);
      selectedAddressId.value = newAddr.id;
    } catch (e) {
      showToast('添加地址失败', 'error');
    }
  }
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
  <div v-if="cart.isOpen" class="fixed inset-0 overflow-hidden" style="z-index: 9999;">
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
          
          <transition-group name="list" tag="div" class="space-y-4">
            <div v-for="(item, index) in cart.items" :key="item.id || index" 
                 @mousemove="handleCardMouseMove" @mouseleave="handleCardMouseLeave"
                 class="group bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-all duration-300 relative overflow-hidden">
              <!-- Delete Background Action (Optional advanced feature, simple button for now) -->
              
              <div class="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative group-hover:scale-105 transition-transform duration-500">
                <img :src="item.img" class="w-full h-full object-cover">
              </div>
              
              <div class="flex-1 flex flex-col justify-between py-1">
                <div>
                  <div class="flex justify-between items-start">
                    <h3 class="font-bold text-slate-900 line-clamp-2 leading-tight">{{ item.name }}</h3>
                    <button @click="removeFromCart(index)" class="text-gray-300 hover:text-red-500 transition-colors p-1 -mr-2 -mt-2">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                  <p class="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <span v-if="item.selectedColor" class="px-2 py-0.5 bg-gray-50 rounded text-gray-500">{{ item.selectedColor }}</span>
                    <span v-if="item.selectedSize" class="px-2 py-0.5 bg-gray-50 rounded text-gray-500">{{ item.selectedSize }}</span>
                  </p>
                </div>
                
                <div class="flex justify-between items-end">
                  <div class="font-bold text-lg text-slate-900">¥{{ (item.price * (item.quantity || 1)).toFixed(2) }}</div>
                  <div class="flex items-center gap-3 bg-gray-50 rounded-lg px-2 py-1">
                    <button @click="updateQuantity(index, -1)" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-slate-900">-</button>
                    <span class="text-sm font-bold w-4 text-center">{{ item.quantity || 1 }}</span>
                    <button @click="updateQuantity(index, 1)" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-slate-900">+</button>
                  </div>
                </div>
              </div>
            </div>
          </transition-group>

          <!-- Address Selector -->
          <div v-if="showAddressSelector" class="animate-fadeIn bg-slate-50 p-4 rounded-xl border border-slate-200">
             <h4 class="font-bold text-slate-800 mb-3 flex justify-between items-center">
               确认收货地址
               <button @click="showAddressSelector = false" class="text-xs text-blue-500">返回购物车</button>
             </h4>
             <div class="space-y-2 max-h-40 overflow-y-auto mb-3">
               <div 
                 v-for="addr in addresses" 
                 :key="addr.id"
                 @click="selectedAddressId = addr.id"
                 class="p-3 rounded-lg border-2 cursor-pointer transition-all"
                 :class="selectedAddressId === addr.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
               >
                 <div class="text-sm font-bold">{{ addr.name }} <span class="text-gray-500 font-normal">{{ addr.phone }}</span></div>
                 <div class="text-xs text-gray-600 truncate">{{ addr.detail }}</div>
               </div>
               <div v-if="addresses.length === 0" class="text-center text-gray-400 text-sm py-2">
                 暂无地址，请添加
               </div>
             </div>
             <button @click="handleNewAddress" class="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors">
               + 添加新地址
             </button>
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

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
