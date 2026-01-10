<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../store/auth';
import { useToast } from '../composables/useToast';
import AddressModal from '../components/AddressModal.vue';

const router = useRouter();
const { logout } = useAuth();
const { show: showToast } = useToast();

const activePage = ref('main'); // main, security, payment, identity, privacy, notification, general, feedback, about, complain, permission
const isAddressModalOpen = ref(false);

const handleLogout = () => {
  logout();
  localStorage.removeItem('ja_user_profile');
  router.push('/login');
};

const handleSwitchAccount = () => {
  logout();
  localStorage.removeItem('ja_user_profile');
  router.push('/login');
};

const goBack = () => {
  if (activePage.value !== 'main') {
    activePage.value = 'main';
  } else {
    router.back();
  }
};

const navigateTo = (page) => {
  if (page === 'address') {
    isAddressModalOpen.value = true;
  } else {
    activePage.value = page;
  }
};

// --- Mock Data & States ---
const securityForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const handleUpdatePassword = () => {
  if (!securityForm.value.oldPassword || !securityForm.value.newPassword) {
    showToast('请填写完整信息', 'warning');
    return;
  }
  if (securityForm.value.newPassword !== securityForm.value.confirmPassword) {
    showToast('两次密码输入不一致', 'error');
    return;
  }
  showToast('密码修改成功，请重新登录', 'success');
  // In real app, call API then logout
  setTimeout(() => handleLogout(), 1500);
};

const privacySettings = ref([
  { id: 'status', name: '展示在线状态', enabled: true },
  { id: 'search', name: '允许通过手机号搜索我', enabled: false },
  { id: 'recommend', name: '个性化推荐', enabled: true },
  { id: 'ads', name: '个性化广告', enabled: false }
]);

const notificationSettings = ref([
  { id: 'order', name: '订单状态更新', enabled: true },
  { id: 'chat', name: '新消息通知', enabled: true },
  { id: 'promo', name: '优惠活动通知', enabled: false },
  { id: 'system', name: '系统公告', enabled: true }
]);

const generalSettings = ref([
  { id: 'theme', name: '深色模式', enabled: false, type: 'toggle' },
  { id: 'lang', name: '多语言', value: '简体中文', type: 'select' },
  { id: 'font', name: '字体大小', value: '标准', type: 'select' },
  { id: 'cache', name: '清除缓存', value: '128MB', type: 'action' }
]);

const feedbackContent = ref('');
const handleFeedback = () => {
  if (!feedbackContent.value.trim()) {
    showToast('请输入反馈内容', 'warning');
    return;
  }
  showToast('感谢您的反馈，我们会尽快处理', 'success');
  feedbackContent.value = '';
  goBack();
};

const handleClearCache = () => {
  showToast('缓存已清除', 'success');
  // Mock clearing cache
  generalSettings.value.find(s => s.id === 'cache').value = '0KB';
};

const gridItems = [
  { name: '账号安全', icon: 'shield-check', page: 'security' },
  { name: '支付设置', icon: 'credit-card', page: 'payment' },
  { name: '身份认证', icon: 'id-card', page: 'identity' },
  { name: '地址管理', icon: 'location-marker', page: 'address' }
];

const pageTitle = computed(() => {
  const titles = {
    main: '设置',
    security: '账号安全',
    payment: '支付设置',
    identity: '身份认证',
    privacy: '隐私设置',
    notification: '消息设置',
    general: '通用设置',
    feedback: '反馈与建议',
    about: '关于我们',
    complain: '维权投诉',
    permission: '应用权限'
  };
  return titles[activePage.value] || '设置';
});

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -5;
  const rotateY = ((x - centerX) / centerX) * 5;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-10">
    <!-- Header -->
    <div class="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 border-b border-gray-100 shadow-sm">
      <button @click="goBack" class="p-2 -ml-2 text-slate-900 hover:bg-gray-50 rounded-full transition">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
      </button>
      <h1 class="text-lg font-bold text-slate-900">{{ pageTitle }}</h1>
      <div class="w-10"></div> <!-- Spacer -->
    </div>

    <!-- Main Settings List -->
    <div v-if="activePage === 'main'" class="animate-fade-in">
      <!-- Grid Icons -->
      <div class="bg-white mt-3 p-6">
        <div class="grid grid-cols-4 gap-4">
          <div v-for="item in gridItems" :key="item.name" @click="navigateTo(item.page)" class="flex flex-col items-center gap-3 cursor-pointer group hover:-translate-y-1 transition-transform duration-300">
            <div class="text-slate-600 group-hover:text-slate-900 transition-colors duration-300">
              <svg v-if="item.icon === 'shield-check'" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              <svg v-else-if="item.icon === 'credit-card'" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
              <svg v-else-if="item.icon === 'id-card'" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
              <svg v-else-if="item.icon === 'location-marker'" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <span class="text-xs font-medium text-slate-700">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- List Groups -->
      <div class="mt-3 bg-white">
        <div @click="navigateTo('privacy')" class="px-4 py-4 flex justify-between items-center border-b border-gray-50 active:bg-gray-50 cursor-pointer hover:bg-gray-50 transition">
          <span class="text-slate-900 text-[15px]">隐私设置</span>
          <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
        <div @click="navigateTo('notification')" class="px-4 py-4 flex justify-between items-center border-b border-gray-50 active:bg-gray-50 cursor-pointer hover:bg-gray-50 transition">
          <span class="text-slate-900 text-[15px]">消息设置</span>
          <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
        <div @click="navigateTo('general')" class="px-4 py-4 flex justify-between items-center border-b border-gray-50 active:bg-gray-50 cursor-pointer hover:bg-gray-50 transition">
          <span class="text-slate-900 text-[15px]">通用设置</span>
          <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
      </div>

      <div class="mt-3 bg-white">
        <div @click="navigateTo('feedback')" class="px-4 py-4 flex justify-between items-center border-b border-gray-50 active:bg-gray-50 cursor-pointer hover:bg-gray-50 transition">
          <span class="text-slate-900 text-[15px]">反馈与建议</span>
          <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
        <div @click="navigateTo('about')" class="px-4 py-4 flex justify-between items-center active:bg-gray-50 cursor-pointer hover:bg-gray-50 transition">
          <span class="text-slate-900 text-[15px]">关于 NS Smart Shopping</span>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400">v1.0.0</span>
            <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </div>
        </div>
      </div>

      <div class="mt-3 bg-white">
        <div @click="navigateTo('complain')" class="px-4 py-4 flex justify-between items-center border-b border-gray-50 active:bg-gray-50 cursor-pointer hover:bg-gray-50 transition">
          <span class="text-slate-900 text-[15px]">维权投诉</span>
          <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
        <div @click="navigateTo('permission')" class="px-4 py-4 flex justify-between items-center active:bg-gray-50 cursor-pointer hover:bg-gray-50 transition">
          <span class="text-slate-900 text-[15px]">应用权限</span>
          <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
      </div>

      <div class="mt-6 px-4 space-y-3">
        <button @click="handleSwitchAccount" class="w-full py-3.5 bg-white text-slate-900 font-medium text-[15px] rounded-xl shadow-sm active:scale-[0.99] transition hover:bg-gray-50">
          切换账号
        </button>
        <button @click="handleLogout" class="w-full py-3.5 bg-white text-red-500 font-medium text-[15px] rounded-xl shadow-sm active:scale-[0.99] transition hover:bg-red-50">
          退出登录
        </button>
      </div>

      <div class="text-center mt-8 pb-8 text-xs text-gray-300">
        NS Smart Shopping v1.0.0
      </div>
    </div>

    <!-- Security Page -->
    <div v-else-if="activePage === 'security'" class="p-4 animate-fade-in-right">
      <div class="bg-white rounded-xl p-6 shadow-sm">
        <h3 class="font-bold text-lg mb-6 text-slate-900">修改登录密码</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
            <input v-model="securityForm.oldPassword" type="password" class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-slate-900 outline-none transition bg-gray-50 focus:bg-white" placeholder="请输入当前密码">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">新密码</label>
            <input v-model="securityForm.newPassword" type="password" class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-slate-900 outline-none transition bg-gray-50 focus:bg-white" placeholder="请输入新密码（至少6位）">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
            <input v-model="securityForm.confirmPassword" type="password" class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-slate-900 outline-none transition bg-gray-50 focus:bg-white" placeholder="请再次输入新密码">
          </div>
          <button @click="handleUpdatePassword" class="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-slate-800 transition mt-4 active:scale-[0.99]">
            确认修改
          </button>
        </div>
      </div>
      <div class="mt-4 bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
        <span class="text-slate-900 font-medium">注销账号</span>
        <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
      </div>
    </div>

    <!-- Payment Page -->
    <div v-else-if="activePage === 'payment'" class="p-4 animate-fade-in-right">
      <div class="space-y-4">
        <div 
          class="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group transition-all duration-200 ease-out will-change-transform"
          @mousemove="handleCardMouseMove"
          @mouseleave="handleCardMouseLeave"
        >
          <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          <div class="flex justify-between items-start mb-8">
            <span class="font-bold text-lg">WeChat Pay</span>
            <span class="bg-white/20 px-2 py-0.5 rounded text-xs backdrop-blur-sm">默认支付</span>
          </div>
          <div class="flex justify-between items-end">
            <span class="text-white/80 font-mono tracking-widest">**** **** **** 8888</span>
            <span class="text-sm opacity-80">已绑定</span>
          </div>
        </div>
        
        <div 
          class="bg-gradient-to-r from-green-500 to-green-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group transition-all duration-200 ease-out will-change-transform"
          @mousemove="handleCardMouseMove"
          @mouseleave="handleCardMouseLeave"
        >
           <div class="absolute -bottom-4 -left-4 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
           <div class="flex justify-between items-start mb-8">
            <span class="font-bold text-lg">Alipay</span>
          </div>
          <div class="flex justify-between items-end">
            <span class="text-white/80 font-mono">138 **** 8888</span>
            <span class="text-sm opacity-80">已绑定</span>
          </div>
        </div>

        <button @click="showToast('功能开发中...', 'info')" class="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-500 font-medium hover:border-slate-400 hover:text-slate-700 transition flex items-center justify-center gap-2 active:bg-gray-50">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          添加新支付方式
        </button>
      </div>
    </div>

    <!-- Identity Page -->
    <div v-else-if="activePage === 'identity'" class="p-4 animate-fade-in-right">
      <div class="bg-white rounded-xl p-8 text-center shadow-sm">
        <div class="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h3 class="text-xl font-bold text-slate-900 mb-2">已完成实名认证</h3>
        <p class="text-gray-500 text-sm mb-6">您的身份信息已通过安全验证</p>
        <div class="bg-gray-50 rounded-lg p-4 text-left space-y-3">
          <div class="flex justify-between">
            <span class="text-gray-500">真实姓名</span>
            <span class="font-medium text-slate-900">*明</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">证件类型</span>
            <span class="font-medium text-slate-900">居民身份证</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">证件号码</span>
            <span class="font-medium text-slate-900">330***********001X</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Privacy & Notification & General (Shared Layout) -->
    <div v-else-if="['privacy', 'notification', 'general'].includes(activePage)" class="bg-white mt-3">
      <div v-for="item in (activePage === 'privacy' ? privacySettings : activePage === 'notification' ? notificationSettings : generalSettings)" :key="item.id" 
           class="px-4 py-4 flex justify-between items-center border-b border-gray-50 last:border-none">
        <span class="text-slate-900">{{ item.name }}</span>
        
        <!-- Toggle Switch -->
        <button v-if="item.type !== 'select' && item.type !== 'action'" 
                @click="item.enabled = !item.enabled"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                :class="item.enabled ? 'bg-slate-900' : 'bg-gray-200'">
          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="item.enabled ? 'translate-x-6' : 'translate-x-1'"></span>
        </button>

        <!-- Select/Action -->
        <div v-else-if="item.type === 'select'" class="flex items-center gap-2 text-gray-500 text-sm cursor-pointer">
          {{ item.value }}
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>

        <button v-else-if="item.type === 'action'" @click="handleClearCache" class="text-sm text-blue-600 font-medium">
          {{ item.value }}
        </button>
      </div>
    </div>

    <!-- Feedback Page -->
    <div v-else-if="activePage === 'feedback'" class="p-4 animate-fade-in-right">
      <div class="bg-white rounded-xl p-6 shadow-sm">
        <label class="block text-sm font-bold text-slate-900 mb-2">问题与建议</label>
        <textarea v-model="feedbackContent" rows="6" class="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-slate-900 resize-none text-slate-800 placeholder-gray-400 transition" placeholder="请详细描述您遇到的问题或建议，我们将不断改进..."></textarea>
        <button @click="handleFeedback" class="w-full bg-slate-900 text-white font-bold py-3 rounded-xl mt-4 shadow-lg hover:bg-slate-800 transition active:scale-[0.99]">提交反馈</button>
      </div>
    </div>

    <!-- About Page -->
    <div v-else-if="activePage === 'about'" class="p-8 text-center animate-fade-in-right">
      <div class="w-24 h-24 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl text-white text-3xl font-bold">
        NS
      </div>
      <h2 class="text-2xl font-bold text-slate-900 mb-2">NS Smart Shopping</h2>
      <p class="text-gray-500 mb-8">Version 1.0.0 (Build 20260106)</p>
      
      <div class="bg-white rounded-xl overflow-hidden shadow-sm text-left">
        <div class="px-4 py-4 border-b border-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-50">
          <span>功能介绍</span>
          <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
        <div class="px-4 py-4 border-b border-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-50">
          <span>检查更新</span>
          <span class="text-xs text-gray-400">已是最新版本</span>
        </div>
        <div class="px-4 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
          <span>用户协议与隐私政策</span>
          <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
      </div>
    </div>

    <!-- Static Info Pages -->
    <div v-else-if="['complain', 'permission'].includes(activePage)" class="p-4 animate-fade-in-right">
      <div class="bg-white rounded-xl p-6 shadow-sm min-h-[50vh] flex flex-col items-center justify-center text-gray-400">
        <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <p>暂无相关内容</p>
      </div>
    </div>

    <!-- Modals -->
    <AddressModal 
      :show="isAddressModalOpen" 
      @close="isAddressModalOpen = false"
    />

  </div>
</template>
