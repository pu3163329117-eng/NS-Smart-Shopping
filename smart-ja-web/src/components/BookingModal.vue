<script setup>
import { ref, computed } from 'vue';
import { useOrderStore } from '../store/order';
import { useToast } from '../composables/useToast';

const props = defineProps({
  isOpen: Boolean,
  service: Object
});

const emit = defineEmits(['close']);

const orderStore = useOrderStore();
const { show: showToast } = useToast();

const step = ref(1); // 1: Info, 2: Schedule/File, 3: Confirm
const selectedDate = ref('');
const selectedTime = ref('');
const fileUploaded = ref(null);
const contactInfo = ref({
  name: '',
  phone: '',
  note: ''
});
const isProcessing = ref(false);

const timeSlots = ['09:00', '10:30', '14:00', '16:00', '19:00'];

// --- Methods ---
const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (file) {
    // Simulate file upload
    fileUploaded.value = {
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    };
  }
};

const nextStep = () => {
  if (step.value === 1) {
    if (!props.service) return;
    step.value = 2;
  } else if (step.value === 2) {
    // Validation
    if (props.service.tags.includes('3D打印') && !fileUploaded.value) {
      showToast('请先上传 3D 模型文件', 'error');
      return;
    }
    if (props.service.tags.includes('线下') && (!selectedDate.value || !selectedTime.value)) {
      showToast('请选择预约时间', 'error');
      return;
    }
    step.value = 3;
  }
};

const confirmBooking = async () => {
  if (!contactInfo.value.name || !contactInfo.value.phone) {
    showToast('请完善联系人信息', 'error');
    return;
  }

  isProcessing.value = true;
  
  try {
    // Create Order via Mock API
    await orderStore.createOrder({
      serviceId: props.service.id,
      serviceName: props.service.name,
      provider: props.service.provider,
      price: props.service.price,
      type: props.service.tags.includes('3D打印') ? '3d_print' : 'course',
      status: 'paid', // Mock payment success
      details: {
        date: selectedDate.value,
        time: selectedTime.value,
        file: fileUploaded.value?.name,
        contact: { ...contactInfo.value }
      }
    });
    
    showToast('🎉 预约成功！请在订单中心查看', 'success');
    emit('close');
    
    // Reset
    step.value = 1;
    contactInfo.value = { name: '', phone: '', note: '' };
  } catch (error) {
    showToast('预约失败: ' + error.message, 'error');
  } finally {
    isProcessing.value = false;
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>

    <!-- Modal Content -->
    <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-scale-up flex flex-col max-h-[90vh]">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 class="font-bold text-gray-900">预约服务</h3>
          <p class="text-xs text-gray-500 mt-0.5">Step {{ step }} / 3</p>
        </div>
        <button @click="$emit('close')" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto flex-1">
        
        <!-- Step 1: Service Info -->
        <div v-if="step === 1" class="space-y-4">
          <div class="flex gap-4">
            <img :src="service.image" class="w-20 h-20 rounded-lg object-cover bg-gray-100" />
            <div>
              <h4 class="font-bold text-gray-800">{{ service.name }}</h4>
              <div class="text-sm text-gray-500 mt-1">提供方: {{ service.provider }}</div>
              <div class="text-lg font-bold text-blue-600 mt-2">¥{{ service.price }}</div>
            </div>
          </div>
          <div class="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 leading-relaxed">
            <p class="font-bold mb-1">服务说明：</p>
            {{ service.description }}
          </div>
        </div>

        <!-- Step 2: Customization -->
        <div v-else-if="step === 2" class="space-y-6">
          
          <!-- Case A: 3D Printing (Upload) -->
          <div v-if="service.tags.includes('3D打印')" class="space-y-3">
            <label class="block text-sm font-bold text-gray-700">上传模型文件 (STL/OBJ)</label>
            <div class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer relative">
              <input type="file" accept=".stl,.obj" @change="handleFileUpload" class="absolute inset-0 opacity-0 cursor-pointer" />
              <div v-if="!fileUploaded">
                <div class="text-3xl mb-2">📤</div>
                <p class="text-sm text-gray-500">点击或拖拽文件到此处</p>
              </div>
              <div v-else class="flex items-center justify-center gap-3">
                <div class="text-2xl">📄</div>
                <div class="text-left">
                  <div class="text-sm font-bold text-gray-800">{{ fileUploaded.name }}</div>
                  <div class="text-xs text-gray-500">{{ fileUploaded.size }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Case B: Course/Offline (Schedule) -->
          <div v-else class="space-y-4">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">选择日期</label>
              <input type="date" v-model="selectedDate" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">选择时段</label>
              <div class="grid grid-cols-3 gap-3">
                <button 
                  v-for="t in timeSlots" :key="t"
                  @click="selectedTime = t"
                  class="py-2 rounded-lg text-sm border transition-all"
                  :class="selectedTime === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'"
                >
                  {{ t }}
                </button>
              </div>
            </div>
          </div>

        </div>

        <!-- Step 3: Contact & Confirm -->
        <div v-else-if="step === 3" class="space-y-4">
          <div class="space-y-3">
            <label class="block text-sm font-bold text-gray-700">联系人姓名</label>
            <input type="text" v-model="contactInfo.name" placeholder="请输入真实姓名" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div class="space-y-3">
            <label class="block text-sm font-bold text-gray-700">联系电话</label>
            <input type="tel" v-model="contactInfo.phone" placeholder="接收服务通知" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div class="space-y-3">
            <label class="block text-sm font-bold text-gray-700">备注需求 (选填)</label>
            <textarea v-model="contactInfo.note" rows="3" class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-xl mt-4 border border-gray-100">
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-500">服务费用</span>
              <span class="font-medium">¥{{ service.price }}</span>
            </div>
            <div class="flex justify-between text-sm mb-2">
              <span class="text-gray-500">预约费</span>
              <span class="font-medium">¥0.00</span>
            </div>
            <div class="border-t border-gray-200 pt-2 flex justify-between items-center">
              <span class="font-bold text-gray-800">总计支付</span>
              <span class="text-xl font-bold text-blue-600">¥{{ service.price }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
        <button 
          v-if="step > 1"
          @click="step--"
          class="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
        >
          上一步
        </button>
        <button 
          @click="step < 3 ? nextStep() : confirmBooking()"
          :disabled="isProcessing"
          class="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
        >
          <span v-if="isProcessing" class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
          {{ step === 3 ? (isProcessing ? '支付中...' : '确认并支付') : '下一步' }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-scale-up {
  animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
