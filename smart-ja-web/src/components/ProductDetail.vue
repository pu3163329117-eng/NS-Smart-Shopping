<script setup>
import { onMounted, onUnmounted, ref, computed, provide, watch } from 'vue';
import { useFavorites } from '../store/favorites';
import { useReviews } from '../store/reviews';
import { useProducts } from '../store/products';
import { evaluateProduct } from '../services/aiService';
import { useToast } from '../composables/useToast';
import ShareModal from './ShareModal.vue';

// ECharts imports
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { RadarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';

use([
  CanvasRenderer,
  RadarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent
]);

provide(THEME_KEY, 'light');

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
});

// AI & Product Logic
const productsStore = useProducts();
const aiAnalysisResult = ref(null);
const isAnalyzing = ref(false);

const similarProducts = computed(() => {
  const allProducts = productsStore.products.value || [];
  // Exclude current product and pick random ones
  return allProducts
    .filter(p => p.id !== props.product.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 4)
    .map(p => ({
      ...p,
      img: p.image || p.img
    }));
});

const fetchAIAnalysis = async () => {
  if (!props.product) return;
  
  isAnalyzing.value = true;
  aiAnalysisResult.value = null;
  
  try {
    aiAnalysisResult.value = await evaluateProduct(props.product);
  } catch (error) {
    console.error("Failed to fetch AI analysis", error);
  } finally {
    isAnalyzing.value = false;
  }
};

watch(() => props.product, fetchAIAnalysis, { immediate: true });

// AI Radar Chart Option
const radarOption = computed(() => {
  const scores = aiAnalysisResult.value?.scores || [
    { name: '性价比', value: 0 },
    { name: '设计感', value: 0 },
    { name: '实用性', value: 0 },
    { name: '环保指数', value: 0 },
    { name: '趋势热度', value: 0 }
  ];

  return {
    color: ['#3B82F6'],
    title: {
      text: 'NS AI 综合测评',
      left: 'center',
      textStyle: {
        color: '#1e293b',
        fontSize: 14
      }
    },
    tooltip: {},
    radar: {
      indicator: scores.map(s => ({ name: s.name, max: 100 })),
      splitArea: {
        areaStyle: {
          color: ['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']
        }
      }
    },
    series: [
      {
        name: 'AI 评分',
        type: 'radar',
        data: [
          {
            value: scores.map(s => s.value),
            name: '产品维度',
            areaStyle: {
              color: 'rgba(59, 130, 246, 0.3)'
            }
          }
        ]
      }
    ]
  };
});

const activeTab = ref('details'); // details, reviews, ai-analysis

const emit = defineEmits(['close', 'add-to-cart']);
const { toggleFavorite, isFavorite } = useFavorites();
const reviewsStore = useReviews();
const { show: showToast } = useToast();
const showShareModal = ref(false);

const isAdding = ref(false);
const selectedColor = ref(0);
const selectedSize = ref(1);

// Reviews Data
const reviews = computed(() => reviewsStore.getReviews(props.product.id));
const newReview = ref({ rating: 5, content: '' });
const showReviewForm = ref(false);

const submitReview = () => {
  if (!newReview.value.content.trim()) return;
  
  reviewsStore.addReview(props.product.id, {
    rating: newReview.value.rating,
    content: newReview.value.content
  });
  
  newReview.value.content = '';
  newReview.value.rating = 5;
  showReviewForm.value = false;
  showToast('评论发布成功', 'success');
};

const colors = [
  { name: '经典黑', class: 'bg-gray-900' },
  { name: '太空银', class: 'bg-gray-300' },
  { name: '深海蓝', class: 'bg-blue-600' }
];

const sizes = ['S', 'M', 'L', 'XL'];

// Normalize product data to handle different structures (Home vs Market)
const displayProduct = computed(() => {
  return {
    ...props.product,
    img: props.product.img || props.product.image,
    desc: props.product.desc || props.product.description || props.product.longDesc,
    company: props.product.company || 'NS Market',
    longDesc: props.product.longDesc || props.product.description || props.product.desc,
    rating: (4 + Math.random()).toFixed(1), // Random high rating
    reviews: Math.floor(Math.random() * 500) + 50
  };
});

const handleToggleFavorite = () => {
  const added = toggleFavorite(props.product);
  if (added) {
    showToast('已加入收藏', 'success');
  } else {
    showToast('已取消收藏', 'info');
  }
};

const handleAddToCart = () => {
  isAdding.value = true;
  setTimeout(() => {
    emit('add-to-cart', props.product);
    showToast('已加入购物车', 'success');
    isAdding.value = false;
  }, 600);
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

// 禁止背景滚动
onMounted(() => {
  document.body.style.overflow = 'hidden';
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
    <!-- 背景遮罩 -->
    <div class="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" @click="$emit('close')"></div>

    <!-- 详情卡片 -->
    <div class="relative w-full max-w-6xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] h-[90vh] animate-scale-up">
      
      <!-- 关闭按钮 -->
      <button @click="$emit('close')" class="absolute top-4 right-4 z-50 p-2 bg-black/10 hover:bg-black/20 backdrop-blur rounded-full text-slate-800 transition-all transform hover:rotate-90">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>

      <!-- 图片区域 -->
      <div 
        class="w-full md:w-1/2 h-1/3 md:h-full relative bg-gray-50 flex items-center justify-center p-4 md:p-8 group overflow-hidden transition-transform duration-200 ease-out will-change-transform shrink-0"
        @mousemove="handleCardMouseMove"
        @mouseleave="handleCardMouseLeave"
      >
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-gray-200"></div>
        
        <!-- 装饰圆环 -->
        <div class="absolute w-96 h-96 border border-gray-200 rounded-full animate-spin-slow opacity-50"></div>
        <div class="absolute w-[30rem] h-[30rem] border border-gray-100 rounded-full animate-spin-reverse-slow opacity-50"></div>

        <img :src="displayProduct.img" :alt="displayProduct.name" class="w-full h-full object-contain relative z-10 transform transition-transform duration-700 hover:scale-110 drop-shadow-2xl">
        
        <!-- 缩略图 (Mock) - 仅在大屏显示 -->
        <div class="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 gap-3 z-20">
          <div v-for="i in 3" :key="i" class="w-12 h-12 rounded-lg border-2 border-white bg-white shadow-md overflow-hidden cursor-pointer hover:border-blue-500 transition-colors">
             <img :src="displayProduct.img" class="w-full h-full object-cover opacity-80 hover:opacity-100">
          </div>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="w-full md:w-1/2 flex flex-col flex-1 md:h-full bg-white min-h-0 relative z-10">
        
        <!-- Tabs Header -->
        <div class="flex border-b border-gray-100 px-6 pt-4 flex-shrink-0 bg-white z-20">
          <button 
            v-for="tab in ['details', 'reviews', 'ai-analysis']" 
            :key="tab"
            @click="activeTab = tab"
            class="pb-3 px-4 text-sm font-bold border-b-2 transition-colors capitalize mr-4 whitespace-nowrap"
            :class="activeTab === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-gray-400 hover:text-gray-600'"
          >
            {{ tab === 'details' ? '商品详情' : tab === 'reviews' ? '用户评价' : 'AI 测评' }}
          </button>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 relative bg-white">
          
          <!-- Details Tab -->
          <div v-show="activeTab === 'details'" class="space-y-6 animate-fade-in">
            <!-- 头部信息 -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold tracking-wider uppercase">
                  <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  {{ displayProduct.company }}
                </span>
                
                <!-- 评分 -->
                <div class="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                  <svg class="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  <span class="text-slate-900 ml-1">{{ displayProduct.rating }}</span>
                  <span class="text-slate-400 font-normal">({{ displayProduct.reviews }} 评论)</span>
                </div>
              </div>
              
              <h2 class="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight">{{ displayProduct.name }}</h2>
              
              <div class="flex items-baseline gap-4 mb-2">
                <span class="text-4xl font-bold text-slate-900">¥{{ displayProduct.price }}</span>
                <span class="text-lg text-slate-400 line-through">¥{{ (parseFloat(displayProduct.price) * 1.2).toFixed(2) }}</span>
                <div v-if="displayProduct.aiMatch" class="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full text-white text-xs font-bold shadow-lg flex items-center gap-1 animate-pulse">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  AI Match {{ displayProduct.aiMatch }}%
                </div>
              </div>
              <div class="flex gap-2 mb-4">
                 <span class="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded">限时特惠</span>
              </div>
            </div>

            <!-- 属性选择 -->
            <div class="space-y-6 py-6 border-t border-b border-gray-100">
              <!-- 描述 -->
              <div class="prose prose-slate prose-sm max-w-none">
                <h3 class="text-base font-bold text-slate-900 mb-2">产品故事</h3>
                <p class="text-slate-600 leading-relaxed text-justify mb-8">
                  {{ displayProduct.longDesc }}
                </p>
              </div>
            </div>
          </div>

          <!-- Reviews Tab -->
          <div v-show="activeTab === 'reviews'" class="space-y-6 animate-fade-in">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-base font-bold text-slate-900">用户评价 ({{ reviews.length }})</h3>
              <button 
                @click="showReviewForm = !showReviewForm"
                class="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                {{ showReviewForm ? '取消评论' : '写评论' }}
              </button>
            </div>
            
            <!-- Comment Form -->
            <div v-if="showReviewForm" class="bg-gray-50 p-4 rounded-xl mb-6">
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">评分</label>
                <div class="flex gap-2">
                  <button 
                    v-for="star in 5" 
                    :key="star"
                    @click="newReview.rating = star"
                    class="text-xl focus:outline-none transition-transform hover:scale-110"
                    :class="star <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'"
                  >
                    ★
                  </button>
                </div>
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">评论内容</label>
                <textarea 
                  v-model="newReview.content"
                  rows="3"
                  class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="分享您的使用体验..."
                ></textarea>
              </div>
              <div class="flex justify-end gap-2">
                <button 
                  @click="showReviewForm = false"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
                <button 
                  @click="submitReview"
                  class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  :disabled="!newReview.content.trim()"
                >
                  发布
                </button>
              </div>
            </div>

            <!-- Reviews List -->
            <div class="space-y-6">
              <div v-for="review in reviews" :key="review.id" class="border-b border-gray-100 pb-6 last:border-0">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-xs font-bold text-blue-600">
                      {{ review.user.charAt(0) }}
                    </div>
                    <div>
                      <div class="text-sm font-bold text-slate-900">{{ review.user }}</div>
                      <div class="text-xs text-gray-400">{{ review.date }}</div>
                    </div>
                  </div>
                  <div class="flex text-yellow-400 text-xs">
                    <span v-for="n in 5" :key="n">{{ n <= review.rating ? '★' : '☆' }}</span>
                  </div>
                </div>
                <p class="text-sm text-slate-600 leading-relaxed">{{ review.content }}</p>
              </div>
              
              <div v-if="reviews.length === 0" class="text-center py-12 text-gray-400">
                暂无评价，快来抢沙发吧！
              </div>
            </div>
          </div>

          <!-- AI Analysis Tab -->
          <div v-show="activeTab === 'ai-analysis'" class="space-y-6 animate-fade-in h-full flex flex-col">
            <div v-if="isAnalyzing" class="flex flex-col items-center justify-center h-full py-12 space-y-4">
              <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p class="text-slate-500 text-sm animate-pulse">NS AI 正在深度分析商品数据...</p>
            </div>
            
            <template v-else>
               <div class="bg-blue-50 p-4 rounded-xl mb-4">
                 <div class="flex items-start gap-3">
                   <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                     🤖
                   </div>
                   <div>
                     <h4 class="font-bold text-blue-900 text-sm mb-1">NS AI 购物助手分析</h4>
                     <p class="text-sm text-blue-800 leading-relaxed">
                       {{ aiAnalysisResult?.analysis || 'AI 分析暂时不可用，请稍后再试。' }}
                     </p>
                   </div>
                 </div>
               </div>
               
               <div class="flex-1 min-h-[300px] w-full">
                 <v-chart class="chart w-full h-full" :option="radarOption" autoresize />
               </div>
               
               <div class="grid grid-cols-2 gap-4 mt-4">
                 <div class="bg-gray-50 p-3 rounded-lg text-center">
                   <div class="text-xs text-gray-500 mb-1">全网热度</div>
                   <div class="text-lg font-bold text-slate-900">{{ aiAnalysisResult?.marketHeat || '-' }}</div>
                 </div>
                 <div class="bg-gray-50 p-3 rounded-lg text-center">
                   <div class="text-xs text-gray-500 mb-1">回购率预测</div>
                   <div class="text-lg font-bold text-green-600">{{ aiAnalysisResult?.repurchaseRate || '-' }}</div>
                 </div>
               </div>
            </template>
          </div>

          <!-- AI 猜你喜欢 -->
          <div class="mt-8 pt-8 border-t border-gray-100">
            <div class="flex items-center gap-2 mb-4">
               <span class="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></span>
               <h3 class="text-sm font-bold text-slate-900">猜你喜欢</h3>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div 
                v-for="item in similarProducts" 
                :key="item.id"
                class="group cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition-colors flex gap-3 items-center"
                @click="$emit('close'); $emit('open-product', item)"
              >
                <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img :src="item.img" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-xs font-bold text-slate-900 truncate mb-1">{{ item.name }}</h4>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-blue-600">¥{{ item.price }}</span>
                    <span class="text-[10px] text-purple-500 bg-purple-50 px-1 rounded border border-purple-100">AI 95%</span>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
      
      <!-- 底部操作栏 (Fixed at bottom) -->
      <div class="p-4 md:p-6 md:px-12 border-t border-gray-100 bg-white z-20 flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div class="flex gap-3 md:gap-4">
          <button 
            @click="handleAddToCart" 
            :disabled="isAdding"
            class="flex-1 bg-slate-900 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-600/30 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="isAdding" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span v-else>立即购买 - ¥{{ displayProduct.price }}</span>
          </button>
          
          <button @click="handleToggleFavorite" class="px-4 md:px-6 rounded-xl md:rounded-2xl border-2 border-gray-100 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all flex items-center justify-center" :class="{ '!text-red-500 !border-red-100 !bg-red-50': isFavorite(product.id) }">
            <svg class="w-6 h-6 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
          
          <button @click="showShareModal = true" class="px-4 md:px-6 rounded-xl md:rounded-2xl border-2 border-gray-100 text-slate-400 hover:text-blue-500 hover:border-blue-100 hover:bg-blue-50 transition-all flex items-center justify-center">
            <svg class="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
          </button>
        </div>
        <p class="text-xs text-center text-slate-400 mt-3 md:mt-4 flex items-center justify-center gap-3 md:gap-4">
          <span class="flex items-center gap-1"><svg class="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> 正品保障</span>
          <span class="flex items-center gap-1"><svg class="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 极速发货</span>
          <span class="flex items-center gap-1"><svg class="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg> 7天无忧退</span>
        </p>
      </div>
      </div>
    </div>
    
    <ShareModal 
      :is-open="showShareModal" 
      :product="product" 
      @close="showShareModal = false" 
    />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e2e8f0;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #cbd5e1;
}

.animate-scale-up {
  animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleUp {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

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
