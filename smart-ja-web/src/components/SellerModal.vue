<script setup>
import { ref } from 'vue';
import { useToast } from '../composables/useToast';

const props = defineProps({
  show: Boolean,
  initialTab: {
    type: String,
    default: 'personal'
  }
});

const emit = defineEmits(['close']);
const { show: showToast } = useToast();

const activeTab = ref(props.initialTab);
const tabs = [
  { id: 'personal', name: '个人卖家' },
  { id: 'enterprise', name: '企业/品牌' }
];

const form = ref({
  name: '',
  idCard: '',
  phone: '',
  category: '',
  shopName: ''
});

const categories = ['手工文创', '二手闲置', '农特产品', '设计服务', '其他'];

const handleSubmit = () => {
  if (!form.value.name || !form.value.phone) {
    showToast('请填写完整信息', 'error');
    return;
  }
  
  // Simulate API call
  setTimeout(() => {
    showToast('申请提交成功，审核中...', 'success');
    emit('close');
    form.value = { name: '', idCard: '', phone: '', category: '', shopName: '' };
  }, 500);
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
  
  const rotateX = ((y - centerY) / centerY) * -10; // Stronger tilt for small icon
  const rotateY = ((x - centerX) / centerX) * 10;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.1, 1.1, 1.1)`;
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
        <h2 class="text-lg font-bold text-slate-900">商家入驻申请</h2>
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
      <div class="flex-1 overflow-y-auto p-6 scrollbar-hide bg-gray-50">
        
        <div class="text-center mb-8">
           <div 
             class="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30 text-white text-3xl transition-transform duration-200 ease-out will-change-transform cursor-pointer"
             @mousemove="handleCardMouseMove"
             @mouseleave="handleCardMouseLeave"
           >
             <span v-if="activeTab === 'personal'">👤</span>
             <span v-else>🏢</span>
           </div>
           <h3 class="text-xl font-bold text-slate-900">
             {{ activeTab === 'personal' ? '成为个人卖家' : '企业品牌入驻' }}
           </h3>
           <p class="text-gray-500 text-sm mt-2 px-8">
             {{ activeTab === 'personal' ? '实名认证后即可发布商品，适合出售闲置物品或个人手作。' : '提供营业执照，享受更多品牌权益与流量扶持。' }}
           </p>
        </div>

        <div class="space-y-4">
           <div>
             <label class="block text-sm font-medium text-gray-700 mb-1">
               {{ activeTab === 'personal' ? '真实姓名' : '企业名称' }}
             </label>
             <input v-model="form.name" type="text" class="w-full bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent p-3 text-sm transition" placeholder="请填写真实信息">
           </div>
           
           <div>
             <label class="block text-sm font-medium text-gray-700 mb-1">
               {{ activeTab === 'personal' ? '身份证号' : '统一社会信用代码' }}
             </label>
             <input v-model="form.idCard" type="text" class="w-full bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent p-3 text-sm transition" placeholder="请输入证件号码">
           </div>

           <div>
             <label class="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
             <input v-model="form.phone" type="tel" class="w-full bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent p-3 text-sm transition" placeholder="请输入手机号码">
           </div>
           
           <div v-if="activeTab === 'enterprise'">
              <label class="block text-sm font-medium text-gray-700 mb-1">店铺名称</label>
              <input v-model="form.shopName" type="text" class="w-full bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent p-3 text-sm transition" placeholder="拟定店铺名称">
           </div>

           <div>
             <label class="block text-sm font-medium text-gray-700 mb-1">主营类目</label>
             <div class="flex flex-wrap gap-2">
               <div v-for="cat in categories" :key="cat" 
                    @click="form.category = cat"
                    class="px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition"
                    :class="form.category === cat ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'">
                 {{ cat }}
               </div>
             </div>
           </div>
        </div>

        <div class="mt-8 flex items-start gap-2">
          <input type="checkbox" id="agree" class="mt-1 rounded border-gray-300 text-slate-900 focus:ring-slate-900">
          <label for="agree" class="text-xs text-gray-500">
            我已阅读并同意 <a href="#" class="text-blue-600">《商家入驻协议》</a> 及 <a href="#" class="text-blue-600">《保证金管理规范》</a>
          </label>
        </div>

      </div>

      <!-- Footer -->
      <div class="p-4 bg-white border-t border-gray-100">
        <button @click="handleSubmit" class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">
          立即申请
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