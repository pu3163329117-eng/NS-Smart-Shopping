<script setup>
import { ref } from 'vue';
import { useToast } from '../composables/useToast';

const props = defineProps({
  show: Boolean,
  initialTab: {
    type: String,
    default: 'help'
  }
});

const emit = defineEmits(['close']);
const { show: showToast } = useToast();

const activeTab = ref(props.initialTab);
const tabs = [
  { id: 'help', name: '帮助中心' },
  { id: 'contact', name: '联系客服' }
];

const faqs = [
  { q: '如何修改收货地址？', a: '在个人中心-服务与工具-收货地址中进行管理。' },
  { q: '订单发货需要多久？', a: '一般情况下，商家会在48小时内发货。定制商品请查看详情页说明。' },
  { q: '如何申请退款？', a: '在订单详情页点击“申请售后”，选择退款原因即可提交申请。' },
  { q: '积分有什么用？', a: '积分可以用于抵扣现金，或者在积分商城兑换专属礼品。' }
];

const chatMessages = ref([
  { id: 1, type: 'system', text: '您好，智能客服为您服务。请问有什么可以帮您？' }
]);
const inputMessage = ref('');

const sendMessage = () => {
  if (!inputMessage.value.trim()) return;
  
  chatMessages.value.push({ id: Date.now(), type: 'user', text: inputMessage.value });
  const userMsg = inputMessage.value;
  inputMessage.value = '';

  // Auto reply
  setTimeout(() => {
    chatMessages.value.push({ 
      id: Date.now() + 1, 
      type: 'system', 
      text: `收到您的问题：“${userMsg}”。人工客服当前繁忙，已为您记录反馈。` 
    });
  }, 1000);
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
  
  const rotateX = ((y - centerY) / centerY) * -3; // Subtle tilt
  const rotateY = ((x - centerX) / centerX) * 3;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
};

const handleCardMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

    <div 
      class="relative bg-gray-50 w-full sm:w-[480px] h-[85vh] sm:h-[750px] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up"
    >
      
      <!-- Header -->
      <div class="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 z-10">
        <h2 class="text-lg font-bold text-slate-900">服务中心</h2>
        <button @click="closeModal" class="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="bg-white px-2 pt-2 border-b border-gray-100 flex justify-center shrink-0 z-10">
        <div class="flex bg-gray-100 p-1 rounded-xl w-full max-w-xs">
           <button v-for="tab in tabs" :key="tab.id" 
                   @click="activeTab = tab.id"
                   class="flex-1 py-2 text-sm font-bold rounded-lg transition-all"
                   :class="activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
             {{ tab.name }}
           </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto scrollbar-hide bg-gray-50 relative">
        
        <!-- Help Tab -->
        <div v-if="activeTab === 'help'" class="p-4 space-y-4">
          <div class="bg-white rounded-xl shadow-sm overflow-hidden">
             <div class="px-4 py-3 border-b border-gray-50 font-bold text-slate-900">常见问题</div>
             <div class="divide-y divide-gray-50">
               <div v-for="(item, index) in faqs" :key="index" class="p-4 hover:bg-gray-50 transition cursor-pointer">
                 <h4 class="text-sm font-medium text-slate-800 mb-1 flex items-center gap-2">
                   <span class="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">Q</span>
                   {{ item.q }}
                 </h4>
                 <p class="text-xs text-gray-500 pl-6">{{ item.a }}</p>
               </div>
             </div>
          </div>
          
          <div 
            class="bg-blue-50 p-4 rounded-xl flex items-center justify-between transition-transform duration-200 ease-out will-change-transform cursor-pointer"
            @mousemove="handleCardMouseMove"
            @mouseleave="handleCardMouseLeave"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              </div>
              <div>
                <div class="font-bold text-slate-900 text-sm">客服热线</div>
                <div class="text-xs text-gray-500">400-123-4567 (9:00-18:00)</div>
              </div>
            </div>
            <button class="px-3 py-1 bg-white border border-blue-200 text-blue-600 rounded-full text-xs font-medium">拨打</button>
          </div>
        </div>

        <!-- Chat Tab -->
        <div v-else class="h-full flex flex-col">
           <div class="flex-1 overflow-y-auto p-4 space-y-4">
             <div v-for="msg in chatMessages" :key="msg.id" class="flex" :class="msg.type === 'user' ? 'justify-end' : 'justify-start'">
               <div class="max-w-[80%] px-4 py-2 rounded-2xl text-sm" 
                    :class="msg.type === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-800 shadow-sm rounded-tl-none'">
                 {{ msg.text }}
               </div>
             </div>
           </div>
           
           <div class="p-3 bg-white border-t border-gray-100 flex gap-2">
             <input v-model="inputMessage" @keyup.enter="sendMessage" type="text" class="flex-1 bg-gray-50 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" placeholder="请输入您的问题...">
             <button @click="sendMessage" class="bg-slate-900 text-white p-2 rounded-full hover:bg-slate-800 transition">
               <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
             </button>
           </div>
        </div>

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