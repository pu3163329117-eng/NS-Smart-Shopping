<script setup>
import { ref, reactive, watch } from 'vue';
import { UserService } from '../services/api';

const props = defineProps({
  isOpen: Boolean,
  initialData: Object
});

const emit = defineEmits(['close', 'save']);

const formData = reactive({
  name: '',
  sign: '',
  avatar: '',
  backgroundImage: ''
});

const isUploading = ref(false);

// Initialize form when modal opens
watch(() => props.isOpen, (newVal) => {
  if (newVal && props.initialData) {
    formData.name = props.initialData.name || '';
    formData.sign = props.initialData.sign || '';
    formData.avatar = props.initialData.avatar || '';
    formData.backgroundImage = props.initialData.backgroundImage || '';
  }
});

const handleSave = () => {
  emit('save', { ...formData });
};

const handleFileChange = async (field, event) => {
  const file = event.target.files[0];
  if (!file) return;

  isUploading.value = true;

  try {
    const response = await UserService.uploadFile(file);
    if (response && response.url) {
      formData[field] = response.url;
    }
  } catch (error) {
    console.error('File upload failed:', error);
    // Optionally show toast error here if useToast is imported, or just log
    // alert('上传失败，请重试'); // Use console error instead of blocking alert
  } finally {
    isUploading.value = false;
  }
};

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  card.style.setProperty('--mouse-x', `${x}px`);
  card.style.setProperty('--mouse-y', `${y}px`);
};

const handleCardMouseLeave = (e) => {
   // Optional reset
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="!isUploading && $emit('close')"></div>
    
    <!-- Modal Content -->
    <div class="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 class="text-lg font-bold text-slate-800">编辑个人信息</h3>
        <button @click="$emit('close')" :disabled="isUploading" class="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100 disabled:opacity-50">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      
      <!-- Body -->
      <div class="p-6 overflow-y-auto space-y-6">
        
        <!-- Background Image -->
        <div class="space-y-2">
          <label class="block text-sm font-bold text-slate-700">背景图片</label>
          <div class="relative h-32 rounded-xl overflow-hidden bg-gray-100 group border-2 border-dashed border-gray-300 hover:border-blue-400 transition cursor-pointer">
            <img v-if="formData.backgroundImage" :src="formData.backgroundImage" class="w-full h-full object-cover">
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200">
              <span class="text-sm">点击上传背景图</span>
            </div>
            
            <!-- Loading Overlay -->
            <div v-if="isUploading" class="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <svg class="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>

            <!-- Overlay for upload -->
            <div v-else class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
               <span class="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">更换背景</span>
            </div>
            <input type="file" accept="image/*" :disabled="isUploading" class="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" @change="(e) => handleFileChange('backgroundImage', e)">
          </div>
          <div class="text-xs text-gray-400">支持 JPG, PNG 格式，建议尺寸 16:9</div>
        </div>

        <!-- Avatar -->
        <div class="flex items-center gap-6">
           <div 
             @mousemove="handleCardMouseMove"
             @mouseleave="handleCardMouseLeave"
             class="relative group cursor-pointer transition-all duration-100 ease-out will-change-transform"
           >
             <img :src="formData.avatar" class="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover bg-gray-100">
             
             <!-- Loading Overlay -->
             <div v-if="isUploading" class="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center z-10">
                <svg class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
             </div>

             <div v-else class="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
               <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
             </div>
             <input type="file" accept="image/*" :disabled="isUploading" class="absolute inset-0 opacity-0 cursor-pointer rounded-full disabled:cursor-not-allowed" @change="(e) => handleFileChange('avatar', e)">
           </div>
           <div class="flex-1 space-y-2">
             <label class="block text-sm font-bold text-slate-700">头像</label>
             <div class="text-xs text-gray-500">点击左侧头像更换。建议使用正方形图片。</div>
             <button type="button" @click="formData.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`" class="text-xs text-blue-600 hover:underline">
               随机生成头像
             </button>
           </div>
        </div>

        <!-- Name -->
        <div class="space-y-2">
          <label class="block text-sm font-bold text-slate-700">昵称</label>
          <input type="text" v-model="formData.name" class="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-slate-800 placeholder-gray-400" placeholder="请输入昵称">
        </div>

        <!-- Sign -->
        <div class="space-y-2">
          <label class="block text-sm font-bold text-slate-700">个性签名</label>
          <textarea v-model="formData.sign" rows="3" class="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-slate-800 placeholder-gray-400 resize-none" placeholder="介绍一下自己..."></textarea>
        </div>

      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
        <button @click="$emit('close')" class="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-100 transition">
          取消
        </button>
        <button @click="handleSave" class="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition shadow-lg shadow-slate-200">
          保存修改
        </button>
      </div>
    </div>
  </div>
</template>
