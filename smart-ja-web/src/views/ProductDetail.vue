<script setup>
import { useRoute, useRouter } from 'vue-router';
import { useProducts } from '../store/products';
import { useCart } from '../store/cart';
import { useFavorites } from '../store/favorites';
import { useToast } from '../composables/useToast';
import { computed, ref, onMounted } from 'vue';
import ShareModal from '../components/ShareModal.vue';
import gsap from 'gsap';

const route = useRoute();
const router = useRouter();
const { getProductById } = useProducts();
const { addToCart } = useCart();
const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
const { show: showToast } = useToast();

const showShareModal = ref(false);
const isAdding = ref(false);
const selectedColor = ref(null); // Default to null to force selection or allow toggle
const selectedSize = ref(null);
const reviewsList = ref([
  { id: 1, user: 'Alex M.', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', rating: 5, date: '2025-12-10', content: '质量非常好，穿着很舒服，尺码标准！' },
  { id: 2, user: 'Sarah L.', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', rating: 4, date: '2025-12-08', content: '颜色很正，物流也很快，就是稍微有点贵。' },
  { id: 3, user: 'Mike T.', avatar: 'https://randomuser.me/api/portraits/men/86.jpg', rating: 5, date: '2025-12-05', content: 'NS的设计一如既往的棒，不仅是衣服，更是一种态度。' }
]);
const newReview = ref({ rating: 5, content: '' });
const showReviewForm = ref(false);

const productId = parseInt(route.params.id);
// Mock getting product if store returns undefined (fallback for demo)
const productRaw = getProductById(productId) || {
  id: productId,
  name: '示例商品',
  price: '999.00',
  img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80',
  desc: '商品描述加载中...',
  longDesc: '这只是一个示例商品，因为我们在 store 中没有找到对应的 ID。',
  company: 'NS Official'
};

const displayProduct = computed(() => {
  return {
    ...productRaw,
    rating: (4 + Math.random()).toFixed(1),
    reviews: Math.floor(Math.random() * 500) + 50
  };
});

const isFav = computed(() => displayProduct.value && isFavorite(displayProduct.value.id));

const colors = [
  { name: '经典黑', class: 'bg-gray-900' },
  { name: '太空银', class: 'bg-gray-300' },
  { name: '深海蓝', class: 'bg-blue-600' }
];

const sizes = ['S', 'M', 'L', 'XL'];

const handleColorSelect = (idx) => {
  if (selectedColor.value === idx) {
    selectedColor.value = null; // Toggle off
  } else {
    selectedColor.value = idx; // Select
  }
};

const handleSizeSelect = (idx) => {
  if (selectedSize.value === idx) {
    selectedSize.value = null; // Toggle off
  } else {
    selectedSize.value = idx; // Select
  }
};

const submitReview = () => {
  if (!newReview.value.content.trim()) return;
  
  reviewsList.value.unshift({
    id: Date.now(),
    user: '我',
    avatar: 'https://ui-avatars.com/api/?name=Me&background=0D8ABC&color=fff',
    rating: newReview.value.rating,
    date: new Date().toLocaleDateString(),
    content: newReview.value.content
  });
  
  newReview.value.content = '';
  newReview.value.rating = 5;
  showReviewForm.value = false;
  showToast('评论发布成功', 'success');
};

const handleAddToCart = () => {
  if (selectedColor.value === null || selectedSize.value === null) {
    showToast('请先选择颜色和尺码', 'warning');
    return;
  }

  if (displayProduct.value) {
    isAdding.value = true;
    setTimeout(() => {
      addToCart({
        ...displayProduct.value,
        selectedColor: colors[selectedColor.value].name,
        selectedSize: sizes[selectedSize.value]
      });
      showToast('已加入购物车', 'success');
      isAdding.value = false;
    }, 600);
  }
};

const toggleFav = () => {
  if (!displayProduct.value) return;
  if (isFav.value) {
    removeFromFavorites(displayProduct.value.id);
    showToast('已取消收藏', 'info');
  } else {
    addToFavorites(displayProduct.value);
    showToast('已加入收藏', 'success');
  }
};

const goBack = () => {
  router.back();
};

onMounted(() => {
  // Simple entry animation
  gsap.from('.animate-entry', {
    y: 30,
    opacity: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: 'power3.out'
  });
});

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
  <div class="min-h-screen bg-white pb-24 pt-16 md:pt-24">
    <!-- Navbar / Back Button -->
    <div class="fixed top-0 left-0 w-full z-40 px-4 py-4 md:px-8 md:py-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-100/50">
      <button @click="goBack" class="p-2 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2 text-slate-600 font-medium">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        <span class="hidden md:inline">返回</span>
      </button>
      <h1 class="text-lg font-bold text-slate-900 opacity-0 md:opacity-100 transition-opacity">{{ displayProduct.name }}</h1>
      <button @click="showShareModal = true" class="p-2 rounded-full hover:bg-gray-100 transition-colors text-slate-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
      </button>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
        
        <!-- Left: Image Section -->
        <div class="relative animate-entry">
           <div 
             class="sticky top-32 aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-gray-50 flex items-center justify-center group shadow-2xl border border-gray-100 transition-all duration-300 ease-out will-change-transform"
             @mousemove="handleCardMouseMove"
             @mouseleave="handleCardMouseLeave"
           >
              <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-gray-200"></div>
              
              <!-- Decorative Rings -->
              <div class="absolute w-[120%] h-[120%] border border-gray-200 rounded-full animate-spin-slow opacity-50 pointer-events-none"></div>
              <div class="absolute w-[150%] h-[150%] border border-gray-100 rounded-full animate-spin-reverse-slow opacity-30 pointer-events-none"></div>

              <img :src="displayProduct.img" :alt="displayProduct.name" class="w-full h-full object-contain p-8 relative z-10 transform transition-transform duration-700 group-hover:scale-110 drop-shadow-xl">
           </div>
           
           <!-- Thumbnails Mock -->
           <div class="mt-6 flex gap-4 justify-center">
             <div v-for="i in 3" :key="i" class="w-20 h-20 rounded-2xl border-2 border-transparent bg-gray-50 overflow-hidden cursor-pointer hover:border-blue-500 transition-all shadow-sm">
                <img :src="displayProduct.img" class="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity">
             </div>
           </div>
        </div>

        <!-- Right: Content Section -->
        <div class="flex flex-col space-y-8 animate-entry pt-4">
          <!-- Header -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold tracking-wider uppercase">
                <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                {{ displayProduct.company }}
              </span>
              <div class="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                <svg class="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                <span class="text-slate-900 ml-1">{{ displayProduct.rating }}</span>
                <span class="text-slate-400 font-normal">({{ displayProduct.reviews }} 评论)</span>
              </div>
            </div>

            <h1 class="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight">{{ displayProduct.name }}</h1>
            
            <div class="flex items-baseline gap-4">
              <span class="text-4xl font-bold text-slate-900">¥{{ displayProduct.price }}</span>
              <span class="text-lg text-slate-400 line-through">¥{{ (parseFloat(displayProduct.price) * 1.2).toFixed(2) }}</span>
              <span class="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded">限时特惠</span>
            </div>
            
            <p class="text-slate-600 leading-relaxed text-lg">{{ displayProduct.desc }}</p>
          </div>

          <!-- Selectors -->
          <div class="space-y-8 py-8 border-t border-b border-gray-100">
            <!-- Color -->
            <div>
              <h3 class="text-sm font-bold text-slate-900 mb-4">选择颜色</h3>
              <div class="flex gap-4">
                <button 
                  v-for="(color, idx) in colors" 
                  :key="idx"
                  @click="selectedColor = idx"
                  class="w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center relative"
                  :class="selectedColor === idx ? 'border-slate-900 ring-2 ring-slate-200 ring-offset-2' : 'border-transparent hover:scale-110'"
                >
                  <span :class="[color.class, 'w-10 h-10 rounded-full shadow-sm']"></span>
                </button>
              </div>
            </div>

            <!-- Size -->
            <div>
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-sm font-bold text-slate-900">选择规格</h3>
                <button class="text-xs text-blue-600 hover:underline">查看参数表</button>
              </div>
              <div class="flex flex-wrap gap-3">
                <button 
                  v-for="(size, idx) in sizes" 
                  :key="idx"
                  @click="selectedSize = idx"
                  class="px-8 py-3 rounded-xl border text-sm font-bold transition-all"
                  :class="selectedSize === idx ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-gray-200 text-slate-600 hover:border-slate-400 bg-white'"
                >
                  {{ size }}
                </button>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="prose prose-slate prose-lg max-w-none">
            <h3 class="text-xl font-bold text-slate-900 mb-4">商品详情</h3>
            <p class="text-slate-600 leading-relaxed">
              {{ displayProduct.longDesc }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-4 pt-4">
            <button 
              @click="handleAddToCart" 
              :disabled="isAdding"
              class="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold text-xl hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-600/30 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg v-if="isAdding" class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span v-else>立即购买</span>
            </button>
            
            <button @click="toggleFav" class="px-6 rounded-2xl border-2 border-gray-100 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all flex items-center justify-center" :class="{ '!text-red-500 !border-red-100 !bg-red-50': isFav }">
              <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </button>
          </div>

          <!-- Guarantee -->
          <div class="grid grid-cols-3 gap-4 pt-4">
            <div 
              @mousemove="handleCardMouseMove"
              @mouseleave="handleCardMouseLeave"
              class="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 text-center transition-all duration-100 ease-out will-change-transform hover:shadow-md"
            >
               <svg class="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
               <span class="text-xs font-bold text-slate-700">正品保障</span>
            </div>
            <div 
              @mousemove="handleCardMouseMove"
              @mouseleave="handleCardMouseLeave"
              class="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 text-center transition-all duration-100 ease-out will-change-transform hover:shadow-md"
            >
               <svg class="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               <span class="text-xs font-bold text-slate-700">极速发货</span>
            </div>
            <div 
              @mousemove="handleCardMouseMove"
              @mouseleave="handleCardMouseLeave"
              class="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 text-center transition-all duration-100 ease-out will-change-transform hover:shadow-md"
            >
               <svg class="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
               <span class="text-xs font-bold text-slate-700">7天无忧退</span>
            </div>
          </div>

          <!-- Reviews Section -->
          <div class="pt-10 border-t border-gray-100">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold text-slate-900">用户评价 ({{ reviewsList.length }})</h3>
              <button @click="showReviewForm = !showReviewForm" class="text-sm font-bold text-blue-600 hover:text-blue-700">
                {{ showReviewForm ? '取消评论' : '写评价' }}
              </button>
            </div>

            <!-- Review Form -->
            <transition name="fade">
              <div v-if="showReviewForm" class="mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div class="mb-4">
                  <label class="block text-sm font-bold text-slate-700 mb-2">评分</label>
                  <div class="flex gap-2">
                    <button v-for="i in 5" :key="i" @click="newReview.rating = i" class="focus:outline-none transition-transform active:scale-95">
                      <svg class="w-8 h-8" :class="i <= newReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    </button>
                  </div>
                </div>
                <div class="mb-4">
                  <label class="block text-sm font-bold text-slate-700 mb-2">评价内容</label>
                  <textarea v-model="newReview.content" rows="3" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" placeholder="分享您的使用体验..."></textarea>
                </div>
                <button @click="submitReview" class="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">发布评价</button>
              </div>
            </transition>

            <!-- Reviews List -->
            <div class="space-y-6">
              <div v-for="review in reviewsList" :key="review.id" class="flex gap-4">
                <img :src="review.avatar" class="w-10 h-10 rounded-full bg-gray-100 object-cover">
                <div class="flex-1">
                  <div class="flex justify-between items-start mb-1">
                    <span class="font-bold text-slate-900">{{ review.user }}</span>
                    <span class="text-xs text-gray-400">{{ review.date }}</span>
                  </div>
                  <div class="flex text-yellow-400 mb-2">
                    <svg v-for="i in 5" :key="i" class="w-4 h-4" :class="i <= review.rating ? 'fill-current' : 'text-gray-200'" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  </div>
                  <p class="text-slate-600 text-sm leading-relaxed">{{ review.content }}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Share Modal -->
    <ShareModal 
      :is-open="showShareModal" 
      :product="displayProduct" 
      @close="showShareModal = false" 
    />
  </div>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 10s linear infinite;
}

.animate-spin-reverse-slow {
  animation: spin 15s linear infinite reverse;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
