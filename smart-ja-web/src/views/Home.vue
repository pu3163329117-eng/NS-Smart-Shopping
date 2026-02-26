<script setup>
import { onMounted, ref, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useI18n } from 'vue-i18n';
import ProductDetail from '../components/ProductDetail.vue';
import ProductSphere from '../components/ProductSphere.vue';
import { useCart } from '../store/cart';
import { useFavorites } from '../store/favorites';
import { useToast } from '../composables/useToast';
import { MarketService } from '../services/api';
import { useProducts } from '../store/products';

gsap.registerPlugin(ScrollTrigger);

const router = useRouter();
const { t } = useI18n();
const { addToCart } = useCart();
const { toggleFavorite, isFavorite } = useFavorites();
const { products: storeProducts, updateProductImage, updateProductPrice } = useProducts();
const { show: showToast } = useToast();

const categories = computed(() => [
  { name: t('categories.market'), icon: '🏷️', desc: t('categoryDesc.market'), route: '/market' },
  { name: t('categories.cards'), icon: '🃏', desc: t('categoryDesc.cards'), route: '/market' },
  { name: t('categories.anime'), icon: '🎎', desc: t('categoryDesc.anime'), route: '/market' },
  { name: t('categories.3dprint'), icon: '🖨️', desc: t('categoryDesc.3dprint'), route: '/market' },
  { name: t('categories.crowdfunding'), icon: '🚀', desc: t('categoryDesc.crowdfunding'), route: '/crowdfunding' }
]);

const heroTitle = ref(null);
const heroSubtitle = ref(null);
const selectedProduct = ref(null);
const showSphere = ref(false);
const featuredServices = ref([]);
const welcomeText = ref('');
const fullWelcomeText = 'Welcome to the Future_';

// Computed for safe template access
const displayProducts = computed(() => {
  if (!storeProducts.value || !Array.isArray(storeProducts.value)) {
    return [];
  }
  return storeProducts.value.slice(0, 4);
});

const typeWriter = () => {
  let i = 0;
  welcomeText.value = '';
  if (window._typeWriterTimer) clearInterval(window._typeWriterTimer);
  
  window._typeWriterTimer = setInterval(() => {
    if (i < fullWelcomeText.length) {
      welcomeText.value += fullWelcomeText.charAt(i);
      i++;
    } else {
      clearInterval(window._typeWriterTimer);
    }
  }, 100);
};

onBeforeUnmount(() => {
  if (window._typeWriterTimer) clearInterval(window._typeWriterTimer);
});

const fetchFeatured = async () => {
  try {
    const data = await MarketService.getFeaturedServices();
    if (data && data.length > 0) {
      featuredServices.value = data;
    } else {
      // Fallback to store products if API returns empty
      featuredServices.value = storeProducts.value;
    }
  } catch (e) {
    console.error('Failed to load featured services, using fallback', e);
    featuredServices.value = storeProducts.value;
  }
};

const handleEditPrice = (product) => {
  const newPrice = prompt(t('common.enterNewPrice'), product.price);
  if (newPrice !== null && !isNaN(parseFloat(newPrice))) {
    updateProductPrice(product.id, newPrice);
    showToast(t('common.priceUpdated'), 'success');
  } else if (newPrice !== null) {
    showToast(t('common.invalidPrice'), 'error');
  }
};

const triggerImageUpload = (id) => {
  // Use a ref for editingProductId if needed, or just handle simple upload
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateProductImage(id, ev.target.result);
        showToast(t('common.imageUpdated'), 'success');
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
};

const handleToggleFavorite = (event, product) => {
  event.stopPropagation();
  const added = toggleFavorite(product);
  if (added) {
    showToast(t('common.addedToFavorites'), 'success');
  } else {
    showToast(t('common.removedFromFavorites'), 'info');
  }
};

const handleAddToCart = (event, product) => {
  event.stopPropagation();
  addToCart(product);
  showToast(t('common.addedToCart'), 'success');
};

const openProduct = (product) => {
  selectedProduct.value = product;
};

const closeProduct = () => {
  selectedProduct.value = null;
};

const handleCardMouseMove = (e, cardId) => {
  const card = document.getElementById(cardId) || e.currentTarget;
  if (!card) return;
  
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -2; // Subtle tilt
  const rotateY = ((x - centerX) / centerX) * 2;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (cardId) => {
  const card = typeof cardId === 'string' ? document.getElementById(cardId) : cardId.currentTarget;
  // Fallback if cardId is just an index passed from template but element is not found by ID (for categories if I use currentTarget)
  // Actually, for products it passes index. For categories I'll pass ID string.
  
  if (typeof cardId === 'number') {
      const el = document.getElementById(`product-card-${cardId}`);
      if (el) el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      return;
  }
  
  if (typeof cardId === 'string') {
      const el = document.getElementById(cardId);
      if (el) el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      return;
  }
  
  // If event object passed directly
  if (cardId && cardId.currentTarget) {
       cardId.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
  }
};

onMounted(() => {
  typeWriter();
  fetchFeatured();

  // 1. 标题文字视差飞入
  const tl = gsap.timeline();
  tl.from(heroTitle.value, {
    y: 100,
    opacity: 0,
    duration: 1.2,
    ease: 'power4.out',
    delay: 0.5
  })
  .from(heroSubtitle.value, {
    y: 50,
    opacity: 0,
    duration: 1,
    ease: 'power3.out'
  }, '-=0.8');

  // 2. 产品卡片滚动触发
  gsap.utils.toArray('.product-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      },
      y: 100,
      opacity: 0,
      duration: 1,
      ease: 'power2.out'
    });
  });
});
</script>

<template>
  <div>
    <!-- 首页 Hero -->
    <section class="relative h-screen flex items-center justify-center bg-black overflow-hidden">
      <!-- 动态星空背景 -->
      <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-40 animate-pulse-slow"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black"></div>
      
      <!-- 浮动装饰球 -->
      <div class="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500 rounded-full mix-blend-screen filter blur-[80px] opacity-40 animate-blob"></div>
      <div class="absolute top-1/3 right-1/4 w-32 h-32 bg-purple-500 rounded-full mix-blend-screen filter blur-[80px] opacity-40 animate-blob animation-delay-2000"></div>
      <div class="absolute bottom-1/4 left-1/3 w-32 h-32 bg-pink-500 rounded-full mix-blend-screen filter blur-[80px] opacity-40 animate-blob animation-delay-4000"></div>

      <div class="text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto z-10 relative">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 animate-fade-in-down">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span class="text-blue-200 text-sm font-medium tracking-wide uppercase">{{ $t('home.subtitle') }}</span>
        </div>

        <h1 ref="heroTitle" class="text-7xl md:text-9xl font-bold tracking-tighter text-white mb-8 leading-tight drop-shadow-2xl">
          {{ $t('home.title') }}
        </h1>
        
        <p ref="heroSubtitle" class="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
          {{ welcomeText }}<span class="animate-blink">|</span>
        </p>

        <p class="text-sm text-gray-400 mb-8 max-w-3xl mx-auto">
          {{ $t('home.aiInsight') }}
        </p>
        
        <div class="mt-12 flex flex-col md:flex-row gap-6 justify-center items-center">
          <button 
            @click="showSphere = true" 
            class="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-100 transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] overflow-hidden"
          >
            <span class="relative z-10 flex items-center gap-2">
              {{ $t('home.enterMeta') }}
              <svg class="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            </span>
          </button>
          
          <button 
            @click="$router.push('/ai-lab')"
            class="group px-8 py-4 bg-transparent border border-white/20 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-all duration-300 hover:border-white/50 backdrop-blur-sm"
          >
            {{ $t('home.visitAI') }}
          </button>
        </div>

        <!-- AI Quote of the Day -->
        <div class="mt-16 max-w-2xl mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 transform hover:scale-[1.02] transition-transform duration-500 cursor-default">
          <div class="flex items-start gap-4">
            <div class="text-4xl">💡</div>
            <div class="text-left">
              <h3 class="text-blue-300 font-bold text-sm uppercase tracking-wider mb-1">AI Daily Insight</h3>
              <p class="text-gray-300 font-light italic">"{{ $t('home.aiInsight') }}"</p>
            </div>
          </div>
        </div>

        <!-- Scroll Indicator removed -->
      </div>
    </section>

    <!-- 特色分类入口 -->
    <section class="py-12 bg-white border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div v-for="(cat, idx) in categories" :key="idx" 
               :id="`category-card-${idx}`"
               class="group relative bg-slate-50 rounded-2xl p-6 hover:bg-slate-900 transition-all duration-200 ease-out cursor-pointer overflow-hidden will-change-transform"
               @click="$router.push(cat.route)"
               @mousemove="(e) => handleCardMouseMove(e, `category-card-${idx}`)"
               @mouseleave="() => handleCardMouseLeave(`category-card-${idx}`)"
          >
            <div class="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-gray-200 to-transparent opacity-20 rounded-bl-full group-hover:from-white/20 transition-all"></div>
            <div class="text-4xl mb-3 transform group-hover:scale-110 transition-transform duration-300">{{ cat.icon }}</div>
            <h3 class="text-lg font-bold text-slate-900 group-hover:text-white transition-colors">{{ cat.name }}</h3>
            <p class="text-sm text-slate-500 group-hover:text-slate-300 transition-colors mt-1">{{ cat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 产品展示区 -->
    <section class="py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-16 flex items-end justify-between">
          <div>
            <h2 class="text-4xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">{{ $t('common.smartPicks') }}</span>
              <span class="text-sm px-2 py-1 bg-black text-white rounded-md font-normal tracking-wide align-middle">SMART PICKS</span>
            </h2>
            <div class="h-1 w-20 bg-gradient-to-r from-blue-600 to-purple-600"></div>
          </div>
          <p class="hidden md:block text-slate-500 mb-2">{{ $t('common.smartPicksSubtitle') }}</p>
        </div>

        <!-- Personalized Section -->
        <div class="mb-12 bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
          <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-overlay filter blur-[60px] opacity-20 animate-pulse"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h3 class="text-2xl font-bold mb-2">{{ $t('common.personalized') }}</h3>
                <p class="text-blue-200 text-sm">{{ $t('common.personalizedDesc') }}</p>
              </div>
              <button class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm backdrop-blur-md transition-colors">
                {{ $t('common.viewAll') }}
              </button>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div v-for="i in 4" :key="i" class="bg-white/5 hover:bg-white/10 rounded-xl p-3 cursor-pointer transition-colors group">
                <div class="aspect-square bg-black/20 rounded-lg mb-3 overflow-hidden relative">
                   <!-- Placeholder Images -->
                   <img :src="`https://picsum.photos/300/300?random=${i}`" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                   <div class="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">9{{ i }}% {{ $t('common.match') }}</div>
                </div>
                <h4 class="font-bold text-sm truncate">{{ $t('common.smartDevice') }} {{ i }}</h4>
                <p class="text-xs text-gray-400 mt-1">¥{{ 100 * i }}.00</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-32">
          <div v-for="(product, index) in featuredServices" :key="product.id" 
               :id="`product-card-${index}`"
               class="product-card flex flex-col md:flex-row items-center gap-12 group cursor-pointer transition-transform duration-200 ease-out"
               :class="{'md:flex-row-reverse': index % 2 !== 0}"
               @click="openProduct(product)"
               @mousemove="(e) => handleCardMouseMove(e, index)"
               @mouseleave="() => handleCardMouseLeave(index)"
               style="will-change: transform">
            
            <!-- 图片区域 -->
            <div class="w-full md:w-1/2 relative overflow-hidden rounded-3xl shadow-2xl aspect-[4/3] group/image">
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500 z-10 pointer-events-none"></div>
              <!-- Shimmer Effect -->
              <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out z-20 pointer-events-none"></div>
              
              <img :src="product.image || product.img" :alt="product.title || product.name" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out">
              
              <!-- 悬浮标签 -->
              <div class="absolute top-4 left-4 z-20 flex flex-col gap-2 items-start">
                <span class="bg-white/90 backdrop-blur-sm text-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg opacity-0 -translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                  {{ product.provider || product.company || 'Maker' }}
                </span>
                <span v-if="index === 0" class="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  {{ $t('common.top1') }}
                </span>
                <span class="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 transform translate-x-[-20px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  {{ $t('common.aiMatch') }} {{ 98 - index * 2 }}%
                </span>
              </div>
            </div>

            <!-- 文字区域 -->
            <div class="w-full md:w-1/2 space-y-6">
              <span class="text-sm font-semibold tracking-wider text-slate-500 uppercase">{{ product.provider || product.company || 'Maker' }}</span>
              <h3 class="text-5xl font-bold text-slate-900">{{ product.title || product.name }}</h3>
              <p class="text-xl text-slate-600 leading-relaxed">{{ product.description || product.desc }}</p>
              
              <!-- 价格区域，点击可编辑 -->
              <div class="group/price relative inline-block cursor-pointer" @click.stop="handleEditPrice(product)" :title="$t('common.editPrice')">
                <p class="text-2xl font-bold text-slate-900">¥{{ product.price }}</p>
                <span class="absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover/price:opacity-100 transition-opacity text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </span>
              </div>

              <div class="pt-4 flex gap-4">
                <button @click.stop="openProduct(product)" class="inline-flex items-center text-lg font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  {{ $t('common.learnMore') }} 
                  <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </button>
                <button @click="handleAddToCart($event, product)" class="bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-all">
                  {{ $t('common.addToCart') }}
                </button>
                <button @click="handleToggleFavorite($event, product)" class="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors" :class="{ 'text-red-500 border-red-500': isFavorite(product.id), 'text-slate-400': !isFavorite(product.id) }">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 产品详情弹窗 -->
    <ProductDetail 
      v-if="selectedProduct" 
      :product="selectedProduct" 
      @close="closeProduct"
      @add-to-cart="handleAddToCart"
      @open-product="openProduct"
    />

    <!-- 3D 宇宙视图 -->
    <transition name="fade">
      <ProductSphere 
        v-if="showSphere" 
        :products="storeProducts" 
        @close="showSphere = false"
      />
    </transition>

    <!-- 隐藏的文件上传控件 -->
    <input 
      type="file" 
      ref="fileInput" 
      class="hidden" 
      accept="image/*" 
      @change="handleImageUpload"
    >
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
