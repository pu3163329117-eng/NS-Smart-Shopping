<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useI18n } from 'vue-i18n';
import { useCart } from '../store/cart';
import { useToast } from '../composables/useToast';
import { MarketService } from '../services/api';
import { useInfiniteScroll, useDebounceFn } from '@vueuse/core';

gsap.registerPlugin(ScrollTrigger);

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { addToCart } = useCart();
const { show: showToast } = useToast();

const services = ref([]);
const loading = ref(false);
const hasMore = ref(true);
const currentCursor = ref(null);
const errorMessage = ref('');

const searchQuery = ref(route.query.q || '');
const sortBy = ref(route.query.sortBy || 'latest'); 
const activeCategory = ref(route.query.category || '');

const marketContainer = ref(null);

const categories = [
  { id: '', name: '全部发现' },
  { id: 'service', name: '数字服务' },
  { id: 'goods', name: '实物周边' },
  { id: '3d', name: '3D打印' },
  { id: 'custom', name: '个性定制' }
];

const loadServices = async (isLoadMore = false) => {
  if (loading.value || (!hasMore.value && isLoadMore)) return;
  
  loading.value = true;
  if (!isLoadMore) {
    currentCursor.value = null;
    services.value = [];
  }

  try {
    const params = {
      q: searchQuery.value,
      sortBy: sortBy.value,
      limit: 12,
      cursor: currentCursor.value,
      category: activeCategory.value
    };

    const res = await MarketService.getAllServices(params);
    const records = Array.isArray(res.data) ? res.data : [];
    
    // Process records for display
    const processed = records.map(s => ({
      ...s,
      provider: s.provider || 'NS Studio'
    }));

    if (isLoadMore) {
      services.value.push(...processed);
    } else {
      services.value = processed;
    }

    currentCursor.value = res.nextCursor;
    hasMore.value = !!res.nextCursor;
    
    // trigger animation for new items
    setTimeout(() => {
      ScrollTrigger.refresh();
      gsap.fromTo('.market-card', 
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' }
      );
    }, 100);

  } catch (error) {
    errorMessage.value = error.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

const debouncedSearch = useDebounceFn(() => {
  router.replace({ query: { ...route.query, q: searchQuery.value } });
  loadServices(false);
}, 500);

watch(searchQuery, () => {
  debouncedSearch();
});

watch([sortBy, activeCategory], () => {
  router.replace({ query: { q: searchQuery.value, sortBy: sortBy.value, category: activeCategory.value } });
  loadServices(false);
});

onMounted(() => {
  loadServices(false);
});

useInfiniteScroll(
  document,
  () => {
    if (hasMore.value && !loading.value) {
      loadServices(true);
    }
  },
  { distance: 300 }
);

const openProduct = (id) => {
  router.push(`/product/${id}`);
};

const formatPrice = (price) => {
  return `¥${Number(price).toFixed(2)}`;
};
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white pt-24 pb-32" ref="marketContainer">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Market Hero -->
      <div class="mb-16 text-center">
        <h1 class="text-5xl md:text-7xl font-semibold tracking-[-0.05em] text-white">NS Market</h1>
        <p class="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
          探索无限创意的汇聚之地。从数字服务到实体好物，这里是创客们的发声场。
        </p>
      </div>

      <!-- Controls Matrix -->
      <div class="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 p-2 rounded-[2rem] bg-white/[0.02] border border-white/10 backdrop-blur-xl">
        <div class="flex gap-2 overflow-x-auto w-full md:w-auto p-2 no-scrollbar">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            @click="activeCategory = cat.id"
            class="whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300"
            :class="activeCategory === cat.id ? 'bg-white text-black' : 'text-slate-400 hover:text-white hover:bg-white/10'"
          >
            {{ cat.name }}
          </button>
        </div>

        <div class="flex items-center gap-4 w-full md:w-auto px-4 pb-2 md:pb-0">
          <div class="relative w-full md:w-64">
            <input 
              v-model="searchQuery"
              type="text"
              placeholder="搜索灵感..."
              class="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
            >
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          
          <select 
            v-model="sortBy"
            class="bg-transparent border border-white/10 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat pr-10"
          >
            <option class="text-black" value="latest">最新上线</option>
            <option class="text-black" value="sales_desc">最受欢迎</option>
            <option class="text-black" value="price_asc">价格最低</option>
            <option class="text-black" value="price_desc">价格最高</option>
          </select>
        </div>
      </div>

      <!-- Grid -->
      <div v-if="services.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div 
          v-for="service in services" 
          :key="service.id"
          class="market-card group relative flex flex-col rounded-[2rem] bg-[#111111] border border-white/5 overflow-hidden hover:border-white/20 transition-all duration-500 cursor-pointer shadow-none hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
          @click="openProduct(service.id)"
        >
          <div class="aspect-[4/5] sm:aspect-square w-full overflow-hidden bg-[#1a1a1a] relative">
            <div class="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent z-10 opacity-60"></div>
            <img 
              v-if="service.image" 
              :src="service.image" 
              class="w-full h-full object-cover transform transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#121214] to-black text-6xl font-bold text-white/5">
              {{ service.title?.charAt(0) }}
            </div>
            
            <div class="absolute top-4 right-4 z-20 flex flex-col gap-2">
              <span v-if="service.tags?.[0]" class="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                {{ service.tags[0] }}
              </span>
            </div>
          </div>
          
          <div class="p-6 flex flex-col flex-1 relative z-20">
            <h3 class="text-lg font-semibold text-white tracking-tight line-clamp-1 group-hover:text-blue-400 transition-colors">{{ service.title }}</h3>
            <p class="text-xs text-slate-500 mt-1 uppercase tracking-widest">{{ service.provider }}</p>
            <p class="mt-3 text-sm text-slate-400 line-clamp-2 leading-relaxed flex-1">{{ service.description }}</p>
            
            <div class="mt-5 flex items-end justify-between">
              <span class="text-xl font-medium text-white tracking-tight">{{ formatPrice(service.price) }}</span>
              <button class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:shadow-[0_4px_16px_rgba(255,255,255,0.2)]">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty / Loading -->
      <div v-if="services.length === 0 && !loading" class="py-32 text-center">
        <p class="text-slate-500 text-lg">没有找到符合条件的商品，换个搜索词试试？</p>
        <button @click="searchQuery = ''; activeCategory = '';" class="mt-6 px-6 py-2 rounded-full border border-white/20 text-white hover:bg-white/10 transition flex items-center gap-2 mx-auto">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          重置探索
        </button>
      </div>

      <div v-if="loading" class="py-12 flex justify-center">
        <div class="flex gap-2">
          <div class="w-2 h-2 rounded-full bg-white/40 animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-2 h-2 rounded-full bg-white/40 animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-2 h-2 rounded-full bg-white/40 animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </div>
      
      <div v-if="!hasMore && services.length > 0" class="py-12 text-center text-slate-600 text-sm">
        已经到底啦
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
