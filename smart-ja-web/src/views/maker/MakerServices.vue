<script setup>
import { ref, onMounted } from 'vue';
import { MakerService } from '../../services/api';
import { useToast } from '../../composables/useToast';
import ServiceWizard from './ServiceWizard.vue';

const services = ref([]);
const showWizard = ref(false);
const editingService = ref(null);
const isLoading = ref(true);
const { show: showToast } = useToast();

const fetchServices = async () => {
  isLoading.value = true;
  try {
    services.value = await MakerService.getServices();
  } catch (e) {
    showToast('加载服务失败: ' + e.message, 'error');
  } finally {
    isLoading.value = false;
  }
};

const handlePublishSuccess = () => {
  showWizard.value = false;
  editingService.value = null;
  fetchServices(); // Refresh list
};

const handleWizardClose = () => {
  showWizard.value = false;
  editingService.value = null;
};

const handleEdit = (service) => {
  editingService.value = service;
  showWizard.value = true;
};

const handleDelete = async (service) => {
  if (confirm(`❌ 确定要下架 "${service.title || service.name}" 吗？`)) {
    try {
      await MakerService.deleteService(service.id);
      showToast('🗑️ 服务已下架', 'success');
      // Optimistic update
      services.value = services.value.filter(s => s.id !== service.id);
    } catch (e) {
      showToast('❌ 下架失败: ' + e.message, 'error');
    }
  }
};

onMounted(() => {
  fetchServices();
});
</script>

<template>
  <div class="space-y-8">
    
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">我的作品与服务</h1>
        <p class="text-gray-500 mt-1">管理你发布的课程、代工或创意服务</p>
      </div>
      <button 
        @click="showWizard = true"
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
      >
        <span>✨</span> 发布新作品
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && services.length === 0" class="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
      <div class="text-6xl mb-4">🎨</div>
      <h3 class="text-xl font-bold text-gray-800 mb-2">还没有作品哦</h3>
      <p class="text-gray-500 mb-6 max-w-md mx-auto">
        你的创意工坊空空如也。试着发布第一个服务，赚取你的第一桶金吧！
      </p>
      <button 
        @click="showWizard = true"
        class="text-indigo-600 font-bold hover:underline"
      >
        立即开始创作 →
      </button>
    </div>

    <!-- Service Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      
      <div v-for="service in services" :key="service.id" class="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
        <!-- Image -->
        <div class="aspect-video bg-gray-100 relative overflow-hidden">
          <img :src="service.image" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div class="absolute top-3 right-3 flex gap-1">
            <div class="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
              {{ service.type === 'course' ? '🎓 课程' : (service.type === '3d_print' ? '🖨️ 代工' : '🎨 定制') }}
            </div>
            <div v-if="service.productionMode === 'factory'" class="bg-blue-500/90 text-white backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
              🏭 C2M
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="p-5 flex-1 flex flex-col">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-gray-900 line-clamp-1 text-lg group-hover:text-indigo-600 transition-colors">{{ service.title || service.name }}</h3>
            <span class="font-bold text-indigo-600">¥{{ service.price }}</span>
          </div>
          
          <p class="text-sm text-gray-500 line-clamp-2 mb-4 h-10 leading-relaxed flex-1">
            {{ service.description || service.desc }}
          </p>
          
          <div class="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-50 mt-auto">
            <div class="flex gap-3">
              <span class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                {{ service.views || 0 }}
              </span>
              <span class="flex items-center gap-1 text-orange-400 font-bold">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                {{ service.sales || 0 }} 单
              </span>
            </div>
            
            <span 
              class="px-2 py-0.5 rounded-full font-bold"
              :class="(service.status || 'active') === 'active' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'"
            >
              {{ (service.status || 'active') === 'active' ? '已上架' : '审核中' }}
            </span>
          </div>
        </div>
        
        <!-- Actions (Hover) -->
        <div class="bg-gray-50 px-5 py-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button @click="handleEdit(service)" class="flex-1 text-xs font-bold text-gray-600 hover:text-indigo-600 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all">
            编辑
          </button>
          <button @click="handleDelete(service)" class="flex-1 text-xs font-bold text-red-500 hover:text-red-700 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-red-100 transition-all">
            下架
          </button>
        </div>
      </div>

    </div>

    <!-- Wizard Modal -->
    <ServiceWizard 
      v-if="showWizard" 
      :initial-data="editingService"
      @close="handleWizardClose" 
      @success="handlePublishSuccess"
    />

  </div>
</template>
