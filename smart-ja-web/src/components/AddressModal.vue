<script setup>
import { ref } from 'vue';
import { useToast } from '../composables/useToast';

const props = defineProps({
  show: Boolean
});

const emit = defineEmits(['close']);
const { show: showToast } = useToast();

const isAdding = ref(false);
const addresses = ref([
  { id: 1, name: '张三', phone: '138****8888', region: '湖南省 长沙市 岳麓区', detail: '岳麓大道123号', isDefault: true },
  { id: 2, name: '李四', phone: '139****9999', region: '湖南省 长沙市 开福区', detail: '湘江北路456号', isDefault: false },
]);

const newAddress = ref({
  name: '',
  phone: '',
  region: '',
  detail: '',
  isDefault: false
});

const handleSave = () => {
  if (!newAddress.value.name || !newAddress.value.phone || !newAddress.value.detail) {
    showToast('请填写完整信息', 'error');
    return;
  }
  
  addresses.value.push({
    id: Date.now(),
    ...newAddress.value,
    region: '湖南省 长沙市 岳麓区' // Mock region
  });
  
  showToast('地址添加成功', 'success');
  isAdding.value = false;
  newAddress.value = { name: '', phone: '', region: '', detail: '', isDefault: false };
};

const closeModal = () => {
  emit('close');
};

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -8;
  const rotateY = ((x - centerX) / centerX) * 8;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

    <div class="relative bg-gray-50 w-full sm:w-[480px] h-[80vh] sm:h-[700px] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
      
      <!-- Header -->
      <div class="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 z-10">
        <div class="flex items-center gap-2">
           <button v-if="isAdding" @click="isAdding = false" class="text-slate-900">
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
           </button>
           <h2 class="text-lg font-bold text-slate-900">{{ isAdding ? '添加新地址' : '我的收货地址' }}</h2>
        </div>
        <button @click="closeModal" class="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 scrollbar-hide bg-gray-50">
        
        <!-- List View -->
        <div v-if="!isAdding" class="space-y-3">
          <div v-for="addr in addresses" :key="addr.id" 
               class="bg-white p-4 rounded-xl shadow-sm relative overflow-hidden group transition-transform duration-100 ease-out will-change-transform"
               @mousemove="handleCardMouseMove"
               @mouseleave="handleCardMouseLeave">
            <div class="flex justify-between items-start mb-2">
               <div class="flex items-center gap-2">
                 <span class="font-bold text-slate-900 text-lg">{{ addr.name }}</span>
                 <span class="text-gray-500 text-sm">{{ addr.phone }}</span>
               </div>
               <span v-if="addr.isDefault" class="bg-red-50 text-red-500 text-[10px] px-1.5 py-0.5 rounded border border-red-200">默认</span>
            </div>
            <div class="text-sm text-gray-600 leading-relaxed pr-8">
              {{ addr.region }} {{ addr.detail }}
            </div>
            
            <button class="absolute top-4 right-4 text-gray-400 hover:text-slate-900">
               <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
          </div>
        </div>

        <!-- Add Form -->
        <div v-else class="space-y-4">
           <div class="bg-white rounded-xl p-4 shadow-sm space-y-4">
             <div>
               <label class="block text-sm font-medium text-gray-700 mb-1">收货人</label>
               <input v-model="newAddress.name" type="text" class="w-full bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-slate-900 p-3 text-sm" placeholder="名字">
             </div>
             <div>
               <label class="block text-sm font-medium text-gray-700 mb-1">手机号码</label>
               <input v-model="newAddress.phone" type="tel" class="w-full bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-slate-900 p-3 text-sm" placeholder="手机号">
             </div>
             <div>
               <label class="block text-sm font-medium text-gray-700 mb-1">所在地区</label>
               <div class="w-full bg-gray-50 rounded-lg p-3 text-sm text-gray-500 flex justify-between items-center cursor-pointer">
                 <span>湖南省 长沙市 岳麓区</span>
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
               </div>
             </div>
             <div>
               <label class="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
               <textarea v-model="newAddress.detail" rows="3" class="w-full bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-slate-900 p-3 text-sm resize-none" placeholder="街道、楼牌号等"></textarea>
             </div>
             <div class="flex items-center justify-between pt-2">
               <span class="text-sm font-medium text-gray-700">设为默认地址</span>
               <button @click="newAddress.isDefault = !newAddress.isDefault" 
                       class="w-11 h-6 rounded-full transition-colors relative"
                       :class="newAddress.isDefault ? 'bg-slate-900' : 'bg-gray-200'">
                 <div class="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform"
                      :class="newAddress.isDefault ? 'translate-x-5' : ''"></div>
               </button>
             </div>
           </div>
           
           <button @click="handleSave" class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">保存地址</button>
        </div>

      </div>

      <!-- Footer Button (Only in List View) -->
      <div v-if="!isAdding" class="p-4 bg-white border-t border-gray-100">
        <button @click="isAdding = true" class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          新增收货地址
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up {
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>