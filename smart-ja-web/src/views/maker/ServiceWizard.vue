<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { generateServiceContent } from '../../services/aiService';
import { MakerService, UserService } from '../../services/api';
import { useToast } from '../../composables/useToast';

const props = defineProps({
  initialData: {
    type: Object,
    default: null
  },
  isIncubationSeed: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'success']);
const { show: showToast } = useToast();

const step = ref(1);
const isGenerating = ref(false);
const isSubmitting = ref(false);
const isUploading = ref(false);
const fileInput = ref(null);

const isEditing = computed(() => !!props.initialData && !props.isIncubationSeed);

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
      topic: data.title,
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
    step.value = 2;
  }
  document.body.style.overflow = 'hidden';
});

onUnmounted(() => {
  document.body.style.overflow = '';
});

const handleGenerate = async () => {
  if (!form.value.topic) return;
  
  isGenerating.value = true;
  try {
    let factoryInfo = null;
    if (form.value.type !== 'course' && form.value.productionMode === 'factory') {
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
    
    form.value.title = aiData.title;
    form.value.description = aiData.description;
    
    if (factoryInfo) {
      form.value.price = Math.ceil(factoryInfo.cost * 1.5);
    } else {
      form.value.price = aiData.price;
    }
    
    form.value.details = aiData.details;
    form.value.tags = aiData.tags || [];
    
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
    form.value.image = response.url;
    showToast('图片上传成功', 'success');
  } catch (error) {
    showToast('上传失败: ' + error.message, 'error');
  } finally {
    isUploading.value = false;
  }
};

const handleSubmit = async () => {
  isSubmitting.value = true;
  try {
    const serviceData = {
      title: form.value.title,
      description: form.value.description,
      details: form.value.details,
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

const serviceTypes = computed(() => [
  { id: 'course', name: t('wizard.types.course'), icon: '🎓', desc: '教大家编程、绘画或手工' },
  { id: '3d_print', name: t('wizard.types.3d'), icon: '🖨️', desc: '提供 3D 打印或激光切割' },
  { id: 'custom', name: t('wizard.types.custom'), icon: '🎨', desc: '画头像、做手账或设计海报' }
]);
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity" @click="$emit('close')"></div>

      <!-- Wizard Card -->
      <div class="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-[0_32px_120px_rgba(0,0,0,0.5)] overflow-hidden relative z-10 flex flex-col max-h-[92vh]">
        
        <!-- Header -->
        <div class="px-8 py-7 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-white">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 tracking-tight">
              {{ isEditing ? '✏️ 编辑作品' : '✨ 发布新作品' }}
            </h2>
            <p class="text-sm text-gray-500 mt-1">AI 助手已为你优化文案与供应链匹配</p>
          </div>
          <button @click="$emit('close')" class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:border-gray-300 hover:rotate-90 transition-all duration-300">
            ✕
          </button>
        </div>

        <!-- Content Area -->
        <div class="flex-1 min-h-0 overflow-y-auto p-8 custom-scrollbar scroll-smooth" style="overscroll-behavior: contain;">
          
          <!-- Step 1: Input -->
          <div v-if="step === 1" class="space-y-8 animate-fade-in">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <button 
                v-for="type in serviceTypes" 
                :key="type.id"
                @click="form.type = type.id"
                class="p-5 rounded-[2rem] border-2 text-left transition-all hover:shadow-xl group"
                :class="form.type === type.id ? 'border-indigo-500 bg-indigo-50/50 ring-4 ring-indigo-500/10' : 'border-gray-50 bg-gray-50/30 hover:border-indigo-100'"
              >
                <div class="text-4xl mb-4 group-hover:scale-110 transition-transform">{{ type.icon }}</div>
                <div class="font-bold text-gray-800 text-lg">{{ type.name }}</div>
                <div class="text-xs text-gray-500 mt-2 leading-relaxed opacity-70">{{ type.desc }}</div>
              </button>
            </div>

            <div v-if="form.type !== 'course'" class="bg-blue-50/50 p-6 rounded-[2.5rem] border border-blue-100/50">
              <label class="block text-sm font-bold text-blue-900/60 mb-4 tracking-widest uppercase">🛠️ 生产模式 (C2M 适配)</label>
              <div class="flex gap-4">
                <label v-for="mode in [{id:'self', name:t('wizard.modes.self'), icon:'🏠', sub:'本地手工'}, {id:'factory', name:t('wizard.modes.factory'), icon:'🏭', sub:'AI 链托管'}]" :key="mode.id" class="flex-1 cursor-pointer">
                  <input type="radio" v-model="form.productionMode" :value="mode.id" class="hidden peer">
                  <div class="p-4 bg-white rounded-2xl border-2 border-transparent peer-checked:border-blue-500 peer-checked:bg-blue-50/80 hover:bg-white/80 transition-all text-center shadow-sm">
                    <div class="text-2xl mb-1">{{ mode.icon }}</div>
                    <div class="font-bold text-sm text-gray-700">{{ mode.name }}</div>
                    <div class="text-[10px] text-gray-400 mt-1">{{ mode.sub }}</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="bg-gray-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
              <div class="absolute -right-4 -top-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
              <label class="block text-xs font-bold text-white/40 mb-3 tracking-widest uppercase">你想上架什么作品？</label>
              <div class="flex gap-3 relative z-10">
                <input v-model="form.topic" type="text" placeholder="例如：制作一个 Arduino 智能避障车" class="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 transition-all outline-none text-lg">
                <button @click="handleGenerate" :disabled="!form.topic || isGenerating" class="px-8 py-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-2xl font-bold transition-all disabled:opacity-30">
                  <span v-if="isGenerating" class="animate-spin text-xl block">✨</span>
                  <span v-else>生成文案</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Step 2: Edit -->
          <div v-else-if="step === 2" class="space-y-8 animate-slide-up pb-10">
            <div class="flex flex-col lg:flex-row gap-10">
              <div class="w-full lg:w-[320px] shrink-0 space-y-6">
                <div class="aspect-[4/3] bg-gray-100 rounded-[2rem] overflow-hidden relative group shadow-sm">
                  <img :src="form.image" class="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                  <div @click="triggerUpload" class="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                    <span class="text-white font-bold text-sm">更换封面</span>
                  </div>
                  <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFileChange">
                </div>
                <div class="bg-indigo-50/50 p-5 rounded-[1.6rem] border border-indigo-100/30">
                  <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">🏷️ 标签</p>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="tag in form.tags" :key="tag" class="px-2 py-1 bg-white rounded-lg text-[10px] text-indigo-600 border border-indigo-100/50">{{ tag }}</span>
                  </div>
                </div>
              </div>

              <div class="flex-1 space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-5 gap-6">
                  <div class="md:col-span-3">
                    <label class="block text-[11px] font-bold text-gray-400 uppercase mb-2">标题</label>
                    <input v-model="form.title" class="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-gray-800 focus:bg-white transition-all outline-none" />
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-[11px] font-bold text-gray-400 uppercase mb-2">价格 (¥)</label>
                    <input v-model.number="form.price" type="number" class="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-indigo-600 focus:bg-white transition-all outline-none" />
                  </div>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-gray-400 uppercase mb-2">详细文案 (Markdown)</label>
                  <textarea v-model="form.details" rows="12" class="w-full px-4 py-4 bg-gray-50 rounded-xl text-sm text-gray-600 focus:bg-white transition-all outline-none font-mono leading-relaxed custom-scrollbar"></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="step === 2" class="px-10 py-6 border-t border-gray-100 bg-gray-100 flex justify-between items-center shadow-[0_-20px_40px_rgba(0,0,0,0.05)] relative z-20">
          <button v-if="!isEditing" @click="step = 1" class="text-gray-400 font-bold hover:text-gray-800 transition-colors">← 修改创意</button>
          <div v-else></div>
          <button @click="handleSubmit" :disabled="isSubmitting" class="px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2">
            <span v-if="isSubmitting" class="animate-spin text-xl block">⏳</span>
            {{ isEditing ? '保存修改' : '确认一键发布' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 10px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); }
</style>
