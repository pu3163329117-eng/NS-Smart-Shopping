<script setup>
import { ref, onMounted } from 'vue';
import { auditProduct } from '../../services/aiService';
import { useToast } from '../../composables/useToast';

const { show: showToast } = useToast();
const isAuditing = ref(false);
const products = ref([
  {
    id: 1,
    name: 'Arduino 智能小车套件',
    description: '专为青少年设计的编程入门小车，包含超声波避障、循迹功能。使用环保材料。',
    seller: 'TechKid 智趣',
    status: 'pending',
    image: 'https://images.unsplash.com/photo-1555664424-778a6902201b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 2,
    name: '自制高能激光笔',
    description: '超强功率，可瞬间点燃火柴，甚至切割塑料。',
    seller: '危险的创客',
    status: 'pending',
    image: 'https://images.unsplash.com/photo-1590959651373-a3db0f38a961?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 3,
    name: '3D打印月球灯',
    description: '还原月球表面纹理，支持触摸调光，非常适合作为礼物。',
    seller: 'MoonWalker',
    status: 'pending',
    image: 'https://images.unsplash.com/photo-1534234828563-025c27633215?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
  }
]);

const auditResult = ref({});

const handleAudit = async (product) => {
  auditResult.value[product.id] = { loading: true };
  
  try {
    const result = await auditProduct(product);
    auditResult.value[product.id] = {
      loading: false,
      pass: result.pass,
      reason: result.reason
    };
    
    if (result.pass) {
      product.status = 'approved';
      showToast(`[AI] ${product.name} 审核通过`, 'success');
    } else {
      product.status = 'rejected';
      showToast(`[AI] ${product.name} 审核拒绝: ${result.reason}`, 'error');
    }
  } catch (e) {
    console.error(e);
    auditResult.value[product.id] = { loading: false, error: true };
  }
};

const auditAll = async () => {
  isAuditing.value = true;
  for (const p of products.value) {
    if (p.status === 'pending') {
      await handleAudit(p);
      // Add a small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  isAuditing.value = false;
};
</script>

<template>
  <div class="pt-24 min-h-screen bg-gray-50 pb-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">🛡️ AI 审核中心</h1>
          <p class="text-slate-500 mt-1">智能识别违规商品，保障平台安全</p>
        </div>
        <button 
          @click="auditAll" 
          :disabled="isAuditing"
          class="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <span v-if="isAuditing" class="animate-spin">⏳</span>
          <span v-else>🤖 一键 AI 审核</span>
        </button>
      </div>

      <!-- Product List -->
      <div class="grid grid-cols-1 gap-6">
        <div v-for="product in products" :key="product.id" class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
          <!-- Image -->
          <img :src="product.image" class="w-full md:w-48 h-48 object-cover rounded-xl bg-gray-100 flex-shrink-0" />
          
          <!-- Content -->
          <div class="flex-1">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-xl font-bold text-slate-900">{{ product.name }}</h3>
                <p class="text-sm text-slate-500 mb-2">卖家: {{ product.seller }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span 
                  class="px-3 py-1 rounded-full text-xs font-bold uppercase"
                  :class="{
                    'bg-yellow-100 text-yellow-700': product.status === 'pending',
                    'bg-green-100 text-green-700': product.status === 'approved',
                    'bg-red-100 text-red-700': product.status === 'rejected'
                  }"
                >
                  {{ product.status }}
                </span>
              </div>
            </div>
            
            <p class="text-slate-600 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              {{ product.description }}
            </p>

            <!-- AI Result -->
            <div v-if="auditResult[product.id]" class="mb-4">
              <div v-if="auditResult[product.id].loading" class="text-blue-600 text-sm font-bold animate-pulse">
                AI 正在分析语义...
              </div>
              <div v-else-if="auditResult[product.id].pass" class="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span class="font-bold">AI 判定合规</span>
              </div>
              <div v-else class="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                <span class="font-bold">AI 拦截: {{ auditResult[product.id].reason }}</span>
              </div>
            </div>

            <!-- Manual Actions -->
            <div class="flex gap-3" v-if="product.status === 'pending'">
              <button @click="handleAudit(product)" class="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors border border-indigo-100">
                单条审核
              </button>
              <button class="text-sm font-bold text-gray-500 hover:text-gray-700 px-4 py-2">
                人工介入
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
