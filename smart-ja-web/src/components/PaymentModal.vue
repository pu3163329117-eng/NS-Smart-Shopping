<script setup>
import { ref } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  order: Object
});

const emit = defineEmits(['close', 'pay']);

const isProcessing = ref(false);
const paymentMethod = ref('alipay');

const handlePay = async () => {
  isProcessing.value = true;
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  isProcessing.value = false;
  emit('pay', props.order.id);
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>
    
    <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden animate-scale-in">
      <div class="p-6 text-center border-b border-gray-100">
        <h3 class="text-xl font-bold text-gray-900">收银台</h3>
        <p class="text-sm text-gray-500 mt-1">订单号: {{ order.id }}</p>
      </div>

      <div class="p-6 space-y-6">
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-1">支付金额</div>
          <div class="text-4xl font-bold text-slate-900">¥{{ order.amount.toFixed(2) }}</div>
        </div>

        <div class="space-y-3">
          <label class="flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all"
                 :class="paymentMethod === 'alipay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">支</div>
              <span class="font-bold text-gray-700">支付宝</span>
            </div>
            <input type="radio" v-model="paymentMethod" value="alipay" class="w-5 h-5 text-blue-600">
          </label>

          <label class="flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all"
                 :class="paymentMethod === 'wechat' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">微</div>
              <span class="font-bold text-gray-700">微信支付</span>
            </div>
            <input type="radio" v-model="paymentMethod" value="wechat" class="w-5 h-5 text-green-600">
          </label>
        </div>
      </div>

      <div class="p-6 bg-gray-50 border-t border-gray-100">
        <button 
          @click="handlePay"
          :disabled="isProcessing"
          class="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
          <span v-if="isProcessing" class="animate-spin">⏳</span>
          {{ isProcessing ? '支付中...' : '立即支付' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>