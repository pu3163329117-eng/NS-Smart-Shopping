<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProducts } from '../store/products';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close']);
const router = useRouter();
const { products } = useProducts();
const searchInput = ref(null);
const query = ref('');
const isSearching = ref(false);

// Generate trending from products
const trending = computed(() => {
  // Pick 4 random products or tags
  const list = [];
  if (products.value.length > 0) {
    const shuffled = [...products.value].sort(() => 0.5 - Math.random());
    shuffled.slice(0, 4).forEach((p, i) => {
      list.push({
        text: p.name,
        trend: i === 0 ? 'up' : (i === 1 ? 'new' : 'steady')
      });
    });
  }
  return list.length ? list : [
    { text: '智能家居套件', trend: 'up' },
    { text: '复古胶片相机', trend: 'steady' },
    { text: '3D打印模型', trend: 'up' },
    { text: 'AI 辅助学习', trend: 'new' }
  ];
});

// 模拟历史记录
const history = ref(['无线耳机', '机械键盘']);

// 模拟联想结果
const suggestions = computed(() => {
  if (!query.value) return [];
  return [
    { text: `${query.value} 配件`, type: 'category' },
    { text: `${query.value} 评测`, type: 'article' },
    { text: `二手 ${query.value}`, type: 'market' }
  ];
});

const close = () => {
  emit('close');
  query.value = '';
};

const handleSearch = (text) => {
  if (!text) return;
  // 添加到历史记录
  if (!history.value.includes(text)) {
    history.value.unshift(text);
    if (history.value.length > 5) history.value.pop();
  }
  
  close();
  // Navigate to market with search query
  router.push({ path: '/market', query: { q: text } });
  console.log('Searching for:', text);
};

const clearHistory = () => {
  history.value = [];
};

// 监听打开状态，自动聚焦
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      searchInput.value?.focus();
    }, 100);
  }
});

// ESC 关闭
const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    close();
  }
};

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="close"></div>
        
        <!-- Modal -->
        <div class="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all">
          <!-- Search Header -->
          <div class="p-4 border-b border-gray-100 flex items-center gap-3">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              ref="searchInput"
              v-model="query"
              type="text" 
              placeholder="Ask AI or search products..." 
              class="flex-1 text-lg text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent h-12"
              @keyup.enter="handleSearch(query)"
            >
            <button @click="close" class="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
              <span class="text-xs font-bold border border-slate-300 rounded px-1.5 py-0.5">ESC</span>
            </button>
          </div>

          <!-- Content -->
          <div class="p-6 bg-slate-50/50 min-h-[300px]">
            
            <!-- Suggestions (when typing) -->
            <div v-if="query" class="space-y-2">
              <div v-for="(item, idx) in suggestions" :key="idx" 
                   @click="handleSearch(item.text)"
                   class="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 hover:border-purple-200 hover:shadow-sm cursor-pointer transition-all group">
                <div class="flex items-center gap-3">
                  <span class="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </span>
                  <span class="font-medium text-slate-700 group-hover:text-purple-700">{{ item.text }}</span>
                </div>
                <span class="text-xs text-slate-400 uppercase tracking-wider">{{ item.type }}</span>
              </div>
            </div>

            <!-- Default View -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- History -->
              <div>
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Searches</h3>
                  <button v-if="history.length" @click="clearHistory" class="text-xs text-red-400 hover:text-red-600">Clear</button>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button 
                    v-for="item in history" 
                    :key="item"
                    @click="handleSearch(item)"
                    class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-purple-300 hover:text-purple-600 transition-colors"
                  >
                    {{ item }}
                  </button>
                  <span v-if="!history.length" class="text-sm text-slate-400 italic">No recent searches</span>
                </div>
              </div>

              <!-- Trending -->
              <div>
                <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">AI Trending Now</h3>
                <div class="space-y-3">
                  <button 
                    v-for="(item, idx) in trending" 
                    :key="idx"
                    @click="handleSearch(item.text)"
                    class="w-full flex items-center justify-between group"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-slate-300 font-bold w-4">{{ idx + 1 }}</span>
                      <span class="text-slate-600 font-medium group-hover:text-purple-600 transition-colors">{{ item.text }}</span>
                    </div>
                    <span v-if="item.trend === 'up'" class="text-green-500 text-xs flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                      Rising
                    </span>
                    <span v-if="item.trend === 'new'" class="text-blue-500 text-xs bg-blue-50 px-1.5 py-0.5 rounded">NEW</span>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- AI Hint -->
            <div class="mt-8 p-4 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-xl border border-purple-100 flex items-start gap-3">
              <span class="text-xl">🤖</span>
              <div>
                <h4 class="text-sm font-bold text-slate-800">AI Assistant Tip</h4>
                <p class="text-xs text-slate-500 mt-1">Try searching for "gift for designer" or "budget gaming setup" to get personalized AI recommendations.</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>