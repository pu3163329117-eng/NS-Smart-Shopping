<script setup>
import { ref, computed, onMounted } from 'vue';
import { generateServiceContent } from '../../services/aiService';
import { MakerService, UserService } from '../../services/api';
import { useToast } from '../../composables/useToast';

const props = defineProps({
  initialData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'success']);
const { show: showToast } = useToast();

const step = ref(1);
const isGenerating = ref(false);
const isSubmitting = ref(false);
const isUploading = ref(false);
const fileInput = ref(null);

const isEditing = computed(() => !!props.initialData);

const form = ref({
  topic: '',
  type: 'course', // course, 3d_print, custom
  productionMode: 'self', // self, factory
  factoryData: null,
  title: '',
  description: '',
  price: 50,
  details: '',
  tags: [],
  image: ''
});

onMounted(() => {
  if (props.initialData) {
    const data = props.initialData;
    form.value = {
      topic: data.title, // Use title as topic fallback
      type: data.type || 'course',
      productionMode: data.productionMode || 'self',
      factoryData: data.factoryData || null,
      title: data.title || data.name,
      description: data.description || data.desc,
      price: data.price,
      details: data.details || '',
      tags: data.tags || [],
      image: data.image
    };
    step.value = 2; // Skip to step 2 for editing
  }
});

// Step 1: Input Topic
const handleGenerate = async () => {
  if (!form.value.topic) return;
  
  isGenerating.value = true;
  try {
    // Simulate AI Supply Chain Matching if Factory mode
    let factoryInfo = null;
    if (form.value.type !== 'course' && form.value.productionMode === 'factory') {
       // Mock delay for "Matching"
       await new Promise(r => setTimeout(r, 1500));
       factoryInfo = {
         name: 'Shenzhen Rapid Proto Co.',
         cost: Math.floor(Math.random() * 50) + 20,
         moq: 1,
         leadTime: '3 days'
       };
       form.value.factoryData = factoryInfo;
    }

    const aiData = await generateServiceContent(form.value.topic, form.value.type);
    
    // Merge AI data
    form.value.title = aiData.title;
    form.value.description = aiData.description;
    
    // Calculate Price based on cost if factory
    if (factoryInfo) {
      form.value.price = Math.ceil(factoryInfo.cost * 1.5); // 50% margin
    } else {
      form.value.price = aiData.price;
    }
    
    form.value.details = aiData.details;
    form.value.tags = aiData.tags || [];
    
    // Mock image generation using DiceBear (Vector Shapes) which is more reliable
    const seed = encodeURIComponent(form.value.title || 'service');
    form.value.image = `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    
    step.value = 2;
  } catch (error) {
    showToast('AI 生成失败，请重试', 'error');
  } finally {
    isGenerating.value = false;
  }
};

const triggerUpload = () => {
  fileInput.value.click();
};

const handleFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  isUploading.value = true;
  try {
    const response = await UserService.uploadFile(file);
    form.value.image = response.data.url;
    showToast('图片上传成功', 'success');
  } catch (error) {
    showToast('上传失败: ' + error.message, 'error');
  } finally {
    isUploading.value = false;
  }
};

// Step 2: Edit & Confirm
const handleSubmit = async () => {
  isSubmitting.value = true;
  try {
    const serviceData = {
      title: form.value.title,
      description: form.value.description, // Short desc
      details: form.value.details, // Long desc
      price: form.value.price,
      type: form.value.type,
      productionMode: form.value.productionMode,
      factoryData: form.value.factoryData,
      tags: form.value.tags,
      image: form.value.image
    };

    if (isEditing.value) {
      await MakerService.updateService(props.initialData.id, serviceData);
      showToast('🎉 服务更新成功！', 'success');
    } else {
      await MakerService.createService(serviceData);
      showToast('🎉 服务发布成功！已上架市场', 'success');
    }
    
    emit('success');
    emit('close');
  } catch (error) {
    showToast((isEditing.value ? '更新' : '发布') + '失败: ' + error.message, 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const serviceTypes = [
  { id: 'course', name: '技能课程', icon: '🎓', desc: '教大家编程、绘画或手工' },
  { id: '3d_print', name: '代工服务', icon: '🖨️', desc: '提供 3D 打印或激光切割' },
  { id: 'custom', name: '创意定制', icon: '🎨', desc: '画头像、做手账或设计海报' }
];
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>

    <!-- Wizard Card -->
    <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
      
      <!-- Header -->
      <div class="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">
            {{ isEditing ? '✏️ 编辑服务' : '✨ 发布新作品' }}
          </h2>
          <p class="text-sm text-gray-500 mt-1">AI 助手帮你一键生成文案和方案</p>
        </div>
        <button @click="$emit('close')" class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition">
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-8">
        
        <!-- Step 1: Idea Input -->
        <div v-if="step === 1" class="space-y-8 animate-fade-in">
          
          <!-- Type Selection -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              v-for="type in serviceTypes" 
              :key="type.id"
              @click="form.type = type.id"
              class="p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md"
              :class="form.type === type.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200 ring-offset-2' : 'border-gray-100 hover:border-indigo-200'"
            >
              <div class="text-3xl mb-2">{{ type.icon }}</div>
              <div class="font-bold text-gray-800">{{ type.name }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ type.desc }}</div>
            </button>
          </div>

          <!-- Production Mode (Only for non-course) -->
          <div v-if="form.type !== 'course'" class="bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-fade-in">
            <label class="block text-sm font-bold text-blue-900 mb-3">🛠️ 生产方式 (C2M)</label>
            <div class="flex gap-4">
              <label class="flex-1 cursor-pointer">
                <input type="radio" v-model="form.productionMode" value="self" class="hidden peer">
                <div class="p-3 bg-white rounded-xl border-2 border-transparent peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:bg-blue-50/50 transition text-center">
                  <div class="text-xl mb-1">🏠</div>
                  <div class="font-bold text-sm text-gray-700">自制 (DIY)</div>
                  <div class="text-xs text-gray-400">自己动手制作</div>
                </div>
              </label>
              <label class="flex-1 cursor-pointer">
                <input type="radio" v-model="form.productionMode" value="factory" class="hidden peer">
                <div class="p-3 bg-white rounded-xl border-2 border-transparent peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:bg-blue-50/50 transition text-center">
                  <div class="text-xl mb-1">🏭</div>
                  <div class="font-bold text-sm text-gray-700">云工厂 (C2M)</div>
                  <div class="text-xs text-gray-400">AI 匹配供应链</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Topic Input -->
          <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <label class="block text-sm font-bold text-gray-700 mb-2">你想做什么？(输入关键词)</label>
            <div class="flex gap-2">
              <input 
                v-model="form.topic" 
                type="text" 
                placeholder="例如：教大家做 Arduino 避障小车" 
                class="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
                @keyup.enter="handleGenerate"
              />
              <button 
                @click="handleGenerate" 
                :disabled="!form.topic || isGenerating"
                class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
              >
                <span v-if="isGenerating" class="animate-spin">⏳</span>
                <span v-else>{{ form.productionMode === 'factory' ? '🏭 AI 匹配工厂' : '✨ AI 生成方案' }}</span>
              </button>
            </div>
            <p class="text-xs text-gray-400 mt-3">
              {{ form.productionMode === 'factory' ? '💡 AI 将自动搜索深圳/东莞的优质供应商并核算成本' : '💡 提示：输入越具体，AI 生成的效果越好哦！' }}
            </p>
          </div>

        </div>

        <!-- Step 2: Preview & Edit -->
        <div v-else-if="step === 2" class="space-y-6 animate-slide-up">
          
          <div class="flex flex-col md:flex-row gap-6">
            <!-- Left: Image Preview -->
            <div class="w-full md:w-1/3 space-y-3">
              <div class="aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden relative group">
                <img :src="form.image" class="w-full h-full object-cover" />
                <div @click="triggerUpload" class="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span class="text-white font-bold text-sm mb-1">📷 上传图片</span>
                  <span class="text-white/70 text-xs">支持 JPG/PNG</span>
                </div>
                <!-- Hidden Input -->
                <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFileChange">
                
                <!-- Loading Overlay -->
                <div v-if="isUploading" class="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                  <span class="animate-spin text-white text-2xl">⏳</span>
                </div>
              </div>
              <div class="bg-indigo-50 p-3 rounded-xl text-xs text-indigo-700">
                🏷️ 标签: {{ form.tags.join(', ') }}
              </div>
            </div>

            <!-- Right: Form -->
            <div class="flex-1 space-y-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">标题</label>
                <input v-model="form.title" class="w-full px-3 py-2 bg-gray-50 rounded-lg font-bold text-gray-800 border-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">简介</label>
                <textarea v-model="form.description" rows="2" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 border-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">价格 (¥)</label>
                <div class="flex items-center gap-2">
                  <input v-model.number="form.price" type="number" class="w-32 px-3 py-2 bg-gray-50 rounded-lg font-bold text-indigo-600 border-none focus:ring-2 focus:ring-indigo-500" />
                  <div v-if="form.factoryData" class="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    成本: ¥{{ form.factoryData.cost }} (建议售价: ¥{{ Math.ceil(form.factoryData.cost * 1.5) }})
                  </div>
                </div>
              </div>
              
              <div v-if="form.factoryData" class="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 border border-gray-100">
                <div class="font-bold mb-1">🏭 供应链信息 (已匹配)</div>
                <div>供应商: {{ form.factoryData.name }}</div>
                <div>生产周期: {{ form.factoryData.leadTime }}</div>
                <div>起订量: {{ form.factoryData.moq }} 件</div>
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">详细内容 (Markdown)</label>
                <textarea v-model="form.details" rows="6" class="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 border-none focus:ring-2 focus:ring-indigo-500 font-mono"></textarea>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- Footer -->
      <div v-if="step === 2" class="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
        <button v-if="!isEditing" @click="step = 1" class="text-gray-500 font-bold hover:text-gray-800">
          ← 返回修改
        </button>
        <div v-else></div> <!-- Spacer -->
        
        <button 
          @click="handleSubmit"
          :disabled="isSubmitting"
          class="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 transition-all flex items-center gap-2"
        >
          <span v-if="isSubmitting" class="animate-spin">⏳</span>
          {{ isSubmitting ? (isEditing ? '更新中...' : '发布中...') : (isEditing ? '💾 保存修改' : '🚀 确认发布') }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
.animate-slide-up {
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
