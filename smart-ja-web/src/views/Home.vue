<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ProductDetail from '../components/ProductDetail.vue';
import ProductSphere from '../components/ProductSphere.vue';
import { useCart } from '../store/cart';
import { useFavorites } from '../store/favorites';
import { useToast } from '../composables/useToast';
import { useProducts } from '../store/products';

gsap.registerPlugin(ScrollTrigger);

const router = useRouter();
const { addToCart } = useCart();
const { toggleFavorite, isFavorite } = useFavorites();
const { products, updateProductImage, updateProductPrice } = useProducts();
const { show: showToast } = useToast();

const categories = [
  { name: '跳蚤市场', icon: '🏷️', desc: '校园闲置循环', route: '/market' },
  { name: '卡交易', icon: '🃏', desc: '稀有卡牌收藏', route: '/market' },
  { name: '二次元谷子', icon: '🎎', desc: '热爱集结地', route: '/market' },
  { name: '3D打印', icon: '🖨️', desc: '创意无限可能', route: '/market' },
  { name: '众筹计划', icon: '🚀', desc: '助力梦想起飞', route: '/crowdfunding' }
];

const heroTitle = ref(null);
const heroSubtitle = ref(null);
const selectedProduct = ref(null);
const showSphere = ref(false);
const fileInput = ref(null);
const editingProductId = ref(null);
const welcomeText = ref('');
const fullWelcomeText = 'Welcome to the Future_';

const typeWriter = () => {
  let i = 0;
  welcomeText.value = '';
  const timer = setInterval(() => {
    if (i < fullWelcomeText.length) {
      welcomeText.value += fullWelcomeText.charAt(i);
      i++;
    } else {
      clearInterval(timer);
      // Blink effect for cursor
      setInterval(() => {
        if (welcomeText.value.endsWith('_')) {
          welcomeText.value = welcomeText.value.slice(0, -1);
        } else {
          welcomeText.value += '_';
        }
      }, 500);
    }
  }, 100);
};

const handleEditPrice = (product) => {
  const newPrice = prompt('请输入新的价格 (例如: 29.9):', product.price);
  if (newPrice !== null && !isNaN(parseFloat(newPrice))) {
    updateProductPrice(product.id, newPrice);
    showToast('价格更新成功！', 'success');
  } else if (newPrice !== null) {
    showToast('输入的价格无效', 'error');
  }
};

const triggerImageUpload = (id) => {
  editingProductId.value = id;
  fileInput.value.click();
};

const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (file && editingProductId.value) {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateProductImage(editingProductId.value, e.target.result);
      showToast('图片更新成功！', 'success');
      // Reset
      event.target.value = '';
      editingProductId.value = null;
    };
    reader.readAsDataURL(file);
  }
};

const handleToggleFavorite = (event, product) => {
  event.stopPropagation();
  const added = toggleFavorite(product);
  if (added) {
    showToast('已加入收藏', 'success');
  } else {
    showToast('已取消收藏', 'info');
  }
};

const handleAddToCart = (event, product) => {
  event.stopPropagation();
  addToCart(product);
  showToast('已加入购物车', 'success');
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
          <span class="text-blue-200 text-sm font-medium tracking-wide uppercase">Welcome to the Future</span>
        </div>

        <h1 ref="heroTitle" class="text-7xl md:text-9xl font-bold tracking-tighter text-white mb-8 leading-tight drop-shadow-2xl">
          NS <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient-x">Universe</span>
        </h1>
        
        <p ref="heroSubtitle" class="mt-6 text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-light leading-relaxed">
          全球首个 <span class="font-bold text-white">AI 托管</span> 的学生商业生态系统。<br class="hidden md:block" />
          在这里，创意与算法共舞，梦想触手可及。
        </p>
        
        <div class="mt-12 flex flex-col md:flex-row gap-6 justify-center items-center">
          <button 
            @click="showSphere = true" 
            class="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-100 transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] overflow-hidden"
          >
            <span class="relative z-10 flex items-center gap-2">
              进入元宇宙
              <svg class="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            </span>
          </button>
          
          <button 
            @click="$router.push('/ai-lab')"
            class="group px-8 py-4 bg-transparent border border-white/20 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-all duration-300 hover:border-white/50 backdrop-blur-sm"
          >
            访问 AI 实验室
          </button>
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
              <span class="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">AI 每日精选</span>
              <span class="text-sm px-2 py-1 bg-black text-white rounded-md font-normal tracking-wide align-middle">SMART PICKS</span>
            </h2>
            <div class="h-1 w-20 bg-gradient-to-r from-blue-600 to-purple-600"></div>
          </div>
          <p class="hidden md:block text-slate-500 mb-2">由 NS-AI 算法根据您的喜好实时推荐</p>
        </div>

        <div class="space-y-32">
          <div v-for="(product, index) in products" :key="product.id" 
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
              
              <img :src="product.img" :alt="product.name" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out">
              
              <!-- 悬浮标签 -->
              <div class="absolute top-4 left-4 z-20 flex flex-col gap-2 items-start">
                <span class="bg-white/90 backdrop-blur-sm text-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg opacity-0 -translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                  {{ product.company }}
                </span>
                <span v-if="index === 0" class="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  Top 1
                </span>
                <span class="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 transform translate-x-[-20px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  AI Match {{ 98 - index * 2 }}%
                </span>
              </div>

              <!-- 快速换图按钮 -->
              <button @click.stop="triggerImageUpload(product.id)" class="absolute top-4 right-4 z-30 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-all opacity-0 group-hover/image:opacity-100 hover:scale-110" title="更换图片">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
              </button>
            </div>

            <!-- 文字区域 -->
            <div class="w-full md:w-1/2 space-y-6">
              <span class="text-sm font-semibold tracking-wider text-slate-500 uppercase">{{ product.company }}</span>
              <h3 class="text-5xl font-bold text-slate-900">{{ product.name }}</h3>
              <p class="text-xl text-slate-600 leading-relaxed">{{ product.desc }}</p>
              
              <!-- 价格区域，点击可编辑 -->
              <div class="group/price relative inline-block cursor-pointer" @click.stop="handleEditPrice(product)" title="点击修改价格">
                <p class="text-2xl font-bold text-slate-900">¥{{ product.price }}</p>
                <span class="absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover/price:opacity-100 transition-opacity text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </span>
              </div>

              <div class="pt-4 flex gap-4">
                <button @click.stop="openProduct(product)" class="inline-flex items-center text-lg font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  了解更多 
                  <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </button>
                <button @click="handleAddToCart($event, product)" class="bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-all">
                  加入购物车
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
        :products="products" 
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
