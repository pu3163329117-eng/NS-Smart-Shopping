<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import gsap from 'gsap';
import { useCart } from '../store/cart';
import { useToast } from '../composables/useToast';
import { useFavorites } from '../store/favorites';
import ShareModal from '../components/ShareModal.vue';
import ProductDetail from '../components/ProductDetail.vue';

const { addToCart } = useCart();
const { show } = useToast();
const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
const route = useRoute();

const categories = [
  { id: 'flea', name: '跳蚤市场', icon: '🏷️', desc: '闲置好物，循环利用' },
  { id: 'cards', name: '卡交易市场', icon: '🃏', desc: '稀有卡牌，收藏交换' },
  { id: 'goods', name: '谷子交易市场', icon: '🎎', desc: '二次元周边，热爱集结' },
  { id: '3d', name: '3D打印创意', icon: '🖨️', desc: '科技创造，无限可能' },
  { id: 'custom', name: '定制分区', icon: '🎨', desc: '专属设计，独一无二' }
];

const products = [
  // 跳蚤市场
  {
    id: 'f1',
    categoryId: 'flea',
    name: '闲置 iPad Air 4',
    price: 2500,
    aiMatch: 98,
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80',
    description: '95成新，自用爱惜，电池健康度92%。附赠保护壳和贴膜，适合学生党上网课或记笔记。'
  },
  {
    id: 'f2',
    categoryId: 'flea',
    name: '复古胶片相机',
    price: 800,
    aiMatch: 85,
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80',
    description: '经典的胶片质感，功能完好，外观有轻微使用痕迹，充满岁月的味道，摄影爱好者入门首选。'
  },
  // 卡交易市场
  {
    id: 'c1',
    categoryId: 'cards',
    name: '限量版球星卡 - 乔丹',
    price: 5000,
    aiMatch: 92,
    image: 'https://images.unsplash.com/photo-1629367494173-c78a56567877?auto=format&fit=crop&w=600&q=80',
    description: 'PSA评分10分，完美品相，极具收藏价值。篮球迷心中的神，不可错过的珍藏品。'
  },
  {
    id: 'c2',
    categoryId: 'cards',
    name: '宝可梦卡牌 - 喷火龙',
    price: 3000,
    aiMatch: 96,
    image: 'https://images.unsplash.com/photo-1613771404721-c5b425876d90?auto=format&fit=crop&w=600&q=80',
    description: '初代喷火龙闪卡，卡面保存良好，光泽度极佳。童年回忆，收藏界的硬通货。'
  },
  // 谷子交易市场
  {
    id: 'g1',
    categoryId: 'goods',
    name: '初音未来手办',
    price: 1200,
    aiMatch: 88,
    image: 'https://images.unsplash.com/photo-1607323675038-04313f83731d?auto=format&fit=crop&w=600&q=80',
    description: '官方正版，全新未拆封。细节精致，涂装完美，还原度极高，摆在桌面上也是一种享受。'
  },
  {
    id: 'g2',
    categoryId: 'goods',
    name: '动漫角色徽章套装',
    price: 150,
    aiMatch: 75,
    image: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?auto=format&fit=crop&w=600&q=80',
    description: '全套8枚，包含隐藏款。金属材质，做工精良，适合装饰书包或痛包，展示你的二次元属性。'
  },
  // 3D打印创意
  {
    id: '3d1',
    categoryId: '3d',
    name: '3D打印月球灯',
    price: 180,
    aiMatch: 94,
    image: 'https://images.unsplash.com/photo-1533202581692-a1b73e354965?auto=format&fit=crop&w=600&q=80',
    description: '采用高精度3D打印技术，真实还原月球表面纹理。触控开关，三色调光，夜晚营造浪漫氛围。'
  },
  {
    id: '3d2',
    categoryId: '3d',
    name: '定制关节龙模型',
    price: 260,
    aiMatch: 91,
    image: 'https://images.unsplash.com/photo-1615655406736-b37c4fabf923?auto=format&fit=crop&w=600&q=80',
    description: '全身关节可动，姿态随心摆放。采用环保PLA材料，色彩鲜艳，不仅是玩具，更是精美的桌面摆件。'
  },
  // 定制分区
  {
    id: 'cus1',
    categoryId: 'custom',
    name: '个性化定制手机壳',
    price: 88,
    aiMatch: 89,
    image: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=600&q=80',
    description: '支持来图定制，高清彩印，不掉色。防摔气囊设计，保护手机的同时，展现你的独特个性。'
  },
  {
    id: 'cus2',
    categoryId: 'custom',
    name: '手工刻字皮革钱包',
    price: 320,
    aiMatch: 93,
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80',
    description: '精选头层牛皮，纯手工缝制。免费刻字服务，送礼或自用都非常有意义，随时间沉淀独特质感。'
  }
];

const activeCategory = ref('flea');
const selectedProduct = ref(null);
const showShareModal = ref(false);
const searchQuery = ref('');
const sortBy = ref('default'); // default, price-asc, price-desc, ai-match
const showAiOnly = ref(false);

const filteredProducts = computed(() => {
  let result = products;

  // 如果没有搜索词，则应用分类筛选
  if (!searchQuery.value) {
    result = result.filter(p => p.categoryId === activeCategory.value);
  }
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query)
    );
  }
  
  // AI 智能筛选
  if (showAiOnly.value) {
    result = result.filter(p => p.aiMatch && p.aiMatch > 90);
  }
  
  // 排序
  if (sortBy.value === 'price-asc') {
    result.sort((a, b) => a.price - b.price);
  } else if (sortBy.value === 'price-desc') {
    result.sort((a, b) => b.price - a.price);
  } else if (sortBy.value === 'ai-match') {
    result.sort((a, b) => (b.aiMatch || 0) - (a.aiMatch || 0));
  }
  
  return result;
});

const switchCategory = (id) => {
  activeCategory.value = id;
  searchQuery.value = ''; // Clear search when switching category
  selectedProduct.value = null; // Close detail if open
  nextTick(() => {
    animateItems();
  });
};

const viewProduct = (product) => {
  selectedProduct.value = product;
};

const closeDetail = () => {
  selectedProduct.value = null;
};

const handleAddToCart = (product) => {
  addToCart({
    ...product,
    img: product.image || product.img
  });
  show(`已添加 "${product.name}" 到购物车`, 'success');
  closeDetail();
};

const handleToggleFavorite = (e, product) => {
  e.stopPropagation(); // Prevent opening detail modal
  if (isFavorite(product.id)) {
    removeFromFavorites(product.id);
    show('已取消收藏', 'info');
  } else {
    addToFavorites(product);
    show('已加入收藏', 'success');
  }
};

const handleCardMouseMove = (e, index) => {
  const card = document.getElementById(`market-product-card-${index}`);
  if (!card) return;
  
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -5;
  const rotateY = ((x - centerX) / centerX) * 5;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (index) => {
  const card = document.getElementById(`market-product-card-${index}`);
  if (!card) return;
  
  card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};

const animateItems = () => {
  gsap.fromTo('.product-card', 
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
  );
};

// Handle URL query params for search
watch(() => route.query.q, (newQuery) => {
  if (newQuery) {
    searchQuery.value = newQuery;
  }
}, { immediate: true });

onMounted(() => {
  animateItems();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 pt-24 pb-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- 头部介绍 -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-slate-900 mb-4">NS 多元市场</h1>
        <p class="text-lg text-slate-500 max-w-2xl mx-auto">
          探索无限可能，发现独特好物。从闲置循环到创意定制，这里有你想要的一切。
        </p>
      </div>

      <!-- 分类导航 -->
      <div class="flex flex-wrap justify-center gap-4 mb-12">
        <button 
          v-for="cat in categories" 
          :key="cat.id"
          @click="switchCategory(cat.id)"
          class="px-6 py-3 rounded-full text-sm font-medium transition-all transform hover:scale-105 flex items-center gap-2"
          :class="activeCategory === cat.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'"
        >
          <span>{{ cat.icon }}</span>
          {{ cat.name }}
        </button>
      </div>

      <!-- 工具栏 -->
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <!-- 搜索框 -->
        <div class="relative w-full md:w-96">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="搜索市场好物..." 
            class="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          >
          <svg class="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>

        <div class="flex items-center gap-4 w-full md:w-auto">
          <!-- AI 筛选开关 -->
          <label class="flex items-center gap-2 cursor-pointer group">
            <div class="relative">
              <input type="checkbox" v-model="showAiOnly" class="sr-only peer">
              <div class="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
            <span class="text-sm font-medium text-slate-600 group-hover:text-purple-600 transition-colors">AI 严选 (>90%)</span>
          </label>

          <!-- 排序下拉 -->
          <select 
            v-model="sortBy" 
            class="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer hover:border-blue-500 transition-colors"
          >
            <option value="default">默认排序</option>
            <option value="price-asc">价格: 低到高</option>
            <option value="price-desc">价格: 高到低</option>
            <option value="ai-match">AI 匹配度</option>
          </select>
        </div>
      </div>

      <!-- 市场内容区域 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div 
          v-for="(product, index) in filteredProducts" 
          :key="product.id"
          :id="`market-product-card-${index}`"
          @click="viewProduct(product)"
          @mousemove="(e) => handleCardMouseMove(e, index)"
          @mouseleave="() => handleCardMouseLeave(index)"
          class="product-card bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer group border border-slate-100 will-change-transform duration-200 ease-out"
        >
          <div class="h-48 overflow-hidden relative group-hover:shadow-inner">
            <img :src="product.image" :alt="product.name" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
            
            <!-- AI Match Badge -->
            <div v-if="product.aiMatch && product.aiMatch > 85" class="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-purple-500/30 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-[-10px] group-hover:translate-y-0">
              <span class="text-[10px] font-bold text-purple-300">AI Match</span>
              <span class="text-[10px] font-bold text-white">{{ product.aiMatch }}%</span>
            </div>

            <!-- Quick Favorite Button -->
            <button 
              @click="(e) => handleToggleFavorite(e, product)"
              class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition z-10"
            >
              <svg 
                class="w-5 h-5 transition-colors" 
                :class="isFavorite(product.id) ? 'text-red-500 fill-current' : 'text-gray-400'"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
            </button>
          </div>
          <div class="p-5">
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-bold text-slate-900 line-clamp-1 text-lg">{{ product.name }}</h3>
              <span class="text-blue-600 font-bold">¥{{ product.price }}</span>
            </div>
            <p class="text-slate-500 text-sm line-clamp-2 mb-4 h-10">{{ product.description }}</p>
            <button class="w-full py-2 rounded-xl bg-slate-100 text-slate-700 font-medium group-hover:bg-slate-900 group-hover:text-white transition-colors">
              查看详情
            </button>
          </div>
        </div>
      </div>

      <!-- 产品详情弹窗 (Modal) -->
      <ProductDetail 
        v-if="selectedProduct" 
        :product="selectedProduct" 
        @close="closeDetail"
        @add-to-cart="handleAddToCart"
        @open-product="viewProduct"
      />

      <ShareModal 
        v-if="selectedProduct"
        :is-open="showShareModal" 
        :product="selectedProduct" 
        @close="showShareModal = false" 
      />

    </div>
  </div>
</template>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fadeInUp 0.4s ease-out forwards;
}
</style>