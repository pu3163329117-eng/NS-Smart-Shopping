<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useFavorites } from '../store/favorites';
import { useProducts } from '../store/products';
import { useToast } from '../composables/useToast';
import { useRouter } from 'vue-router';

const props = defineProps({
  show: Boolean,
  initialTab: {
    type: String,
    default: 'want'
  }
});

const emit = defineEmits(['close']);

const { favorites, toggleFavorite } = useFavorites();
const { products } = useProducts();
const { show: showToast } = useToast();
const router = useRouter();

const activeTab = ref(props.initialTab);

// Watch for prop changes to update active tab
watch(() => props.initialTab, (newTab) => {
  if (newTab) {
    activeTab.value = newTab;
  }
});

const tabs = [
  { id: 'want', name: '想要' },
  { id: 'owned', name: '我有' },
  { id: 'footprints', name: '足迹' },
  { id: 'following', name: '关注品牌' }
];

// Mock Data Generators
const generateOwned = () => {
  // Use first 2 products as owned
  return products.value.slice(0, 2).map(p => ({
    ...p,
    purchaseDate: '2026-12-15',
    status: '已拥有'
  }));
};

const generateFootprints = () => {
  // Use first 3 products as footprints with random dates
  const dates = ['刚刚', '1小时前', '昨天'];
  return products.value.slice(0, 3).map((p, i) => ({
    ...p,
    viewDate: dates[i] || '最近'
  }));
};

const generateFollowing = () => [
  { id: 1, name: '湘芒芒', logo: '🥭', fans: '12.5w', isFollowing: true, desc: '传递湖南文化的情感陪伴型文创' },
  { id: 2, name: 'TechKid 智趣', logo: '🤖', fans: '8.2w', isFollowing: true, desc: '专注儿童编程教育启蒙' },
  { id: 3, name: '绿意未来', logo: '🌱', fans: '5.6w', isFollowing: true, desc: '环保理念文创先锋' }
];

const ownedItems = ref([]);
const footprintItems = ref([]);
const followingItems = ref([]);

onMounted(() => {
  ownedItems.value = generateOwned();
  footprintItems.value = generateFootprints();
  followingItems.value = generateFollowing();
});

// Actions
const handleUnfollow = (brand) => {
  brand.isFollowing = !brand.isFollowing;
  if (brand.isFollowing) {
    showToast(`已关注 ${brand.name}`, 'success');
  } else {
    showToast(`已取消关注 ${brand.name}`, 'info');
  }
};

const goToProduct = (id) => {
  emit('close');
  router.push(`/product/${id}`);
};

const closeModal = () => {
  emit('close');
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
  const card = e.currentTarget;
  card.style.transform = '';
};

const handleModalMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -2;
  const rotateY = ((x - centerX) / centerX) * 2;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
};

const handleModalMouseLeave = (e) => {
  const card = e.currentTarget;
  card.style.transform = '';
};

// Format price helper
const formatPrice = (price) => {
  return typeof price === 'number' ? price.toFixed(2) : price;
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

    <!-- Modal Content -->
    <div 
      class="relative bg-gray-50 w-full sm:w-[480px] h-[85vh] sm:h-[800px] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up transition-transform duration-100 ease-out will-change-transform"
      @mousemove="handleModalMouseMove"
      @mouseleave="handleModalMouseLeave"
    >
      
      <!-- Header -->
      <div class="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 z-10">
        <h2 class="text-lg font-bold text-slate-900">我的互动</h2>
        <button @click="closeModal" class="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="bg-white px-2 pt-2 border-b border-gray-100 flex overflow-x-auto scrollbar-hide shrink-0 z-10">
        <div v-for="tab in tabs" :key="tab.id" 
             @click="activeTab = tab.id"
             class="flex-1 px-4 py-3 text-sm font-medium cursor-pointer relative transition-colors whitespace-nowrap text-center"
             :class="activeTab === tab.id ? 'text-slate-900 font-bold' : 'text-gray-500 hover:text-slate-700'">
          {{ tab.name }}
          <div v-if="activeTab === tab.id" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-slate-900 rounded-t-full"></div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-4 scrollbar-hide bg-gray-50">
        
        <!-- 1. Want / Favorites Tab -->
        <div v-if="activeTab === 'want'" class="space-y-4">
          <div v-if="favorites.items.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-400">
            <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            </div>
            <p>还没有收藏任何商品哦</p>
            <button @click="closeModal" class="mt-4 px-6 py-2 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800 transition">去逛逛</button>
          </div>
          
          <div v-else class="grid grid-cols-2 gap-3">
            <div v-for="product in favorites.items" :key="product.id" 
                 class="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group cursor-pointer transition-transform duration-100 ease-out will-change-transform"
                 @click="goToProduct(product.id)"
                 @mousemove.stop="handleCardMouseMove"
                 @mouseleave="handleCardMouseLeave"
            >
              <div class="aspect-square relative bg-gray-100">
                <img :src="product.img" class="w-full h-full object-cover">
                <button @click.stop="toggleFavorite(product)" class="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-red-500 shadow-sm hover:scale-110 transition">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" /></svg>
                </button>
              </div>
              <div class="p-3">
                <h3 class="font-bold text-slate-900 text-sm truncate">{{ product.name }}</h3>
                <div class="flex justify-between items-end mt-2">
                  <span class="text-red-600 font-bold">¥{{ formatPrice(product.price) }}</span>
                  <span class="text-xs text-gray-400">{{ product.company }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Owned Tab -->
        <div v-else-if="activeTab === 'owned'" class="space-y-3">
          <div v-if="ownedItems.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-400">
            <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <p>还没有拥有的宝贝</p>
          </div>
          <div v-else v-for="item in ownedItems" :key="item.id" 
               class="bg-white p-3 rounded-xl shadow-sm flex gap-3 cursor-pointer"
               @click="goToProduct(item.id)">
            <img :src="item.img" class="w-20 h-20 rounded-lg object-cover bg-gray-100 flex-shrink-0">
            <div class="flex-1 flex flex-col justify-between py-0.5">
              <div>
                <h3 class="font-bold text-slate-900 text-sm line-clamp-1">{{ item.name }}</h3>
                <p class="text-xs text-gray-500 mt-1 line-clamp-1">{{ item.desc }}</p>
              </div>
              <div class="flex justify-between items-center">
                 <span class="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">{{ item.status }}</span>
                 <span class="text-xs text-gray-400">购于 {{ item.purchaseDate }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Footprints Tab -->
        <div v-else-if="activeTab === 'footprints'" class="space-y-0">
          <div v-if="footprintItems.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-400">
            <p>还没有浏览足迹</p>
          </div>
          <div v-else class="relative pl-4 border-l-2 border-gray-200 space-y-6 py-2 ml-2">
            <div v-for="item in footprintItems" :key="item.id" class="relative group cursor-pointer" @click="goToProduct(item.id)">
              <!-- Timeline Dot -->
              <div class="absolute -left-[21px] top-8 w-3 h-3 bg-white border-2 border-slate-300 rounded-full group-hover:border-slate-900 group-hover:scale-125 transition"></div>
              
              <div class="text-xs text-gray-400 mb-1 ml-1">{{ item.viewDate }}</div>
              <div class="bg-white p-3 rounded-xl shadow-sm flex gap-3 group-hover:shadow-md transition transition-transform duration-100 ease-out will-change-transform"
                   @mousemove.stop="handleCardMouseMove"
                   @mouseleave="handleCardMouseLeave">
                <img :src="item.img" class="w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0">
                <div class="flex-1 flex flex-col justify-center">
                  <h3 class="font-bold text-slate-900 text-sm line-clamp-1">{{ item.name }}</h3>
                  <div class="flex justify-between items-center mt-2">
                    <span class="text-red-600 font-bold text-sm">¥{{ formatPrice(item.price) }}</span>
                    <span class="text-xs text-gray-400">{{ item.company }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Following Tab -->
        <div v-else-if="activeTab === 'following'" class="space-y-3">
          <div v-for="brand in followingItems" :key="brand.id" 
               class="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between transition-transform duration-100 ease-out will-change-transform"
               @mousemove.stop="handleCardMouseMove"
               @mouseleave="handleCardMouseLeave"
          >
             <div class="flex items-center gap-3">
               <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl shadow-inner">
                 {{ brand.logo }}
               </div>
               <div>
                 <h3 class="font-bold text-slate-900 text-sm">{{ brand.name }}</h3>
                 <p class="text-xs text-gray-500 mt-0.5">{{ brand.fans }} 粉丝</p>
               </div>
             </div>
             <button @click.stop="handleUnfollow(brand)" 
                     class="px-3 py-1.5 rounded-full text-xs font-medium transition"
                     :class="brand.isFollowing ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'">
               {{ brand.isFollowing ? '已关注' : '关注' }}
             </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up {
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>