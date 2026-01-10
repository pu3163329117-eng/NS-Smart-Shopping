<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '../composables/useToast';

const router = useRouter();
const { show } = useToast();
const email = ref('');
const isSubmitting = ref(false);

const navigateTo = (path) => {
  router.push(path);
};

const handleContact = () => {
  show('客服系统正在连接，请稍候...', 'info');
  // Simulate delay or open a modal
  setTimeout(() => {
    show('当前客服正忙，请稍后重试或发送邮件至 support@nssmart.com', 'warning');
  }, 2000);
};

const handleSubscribe = async () => {
  if (!email.value || !email.value.includes('@')) {
    show('请输入有效的邮箱地址', 'error');
    return;
  }

  isSubmitting.value = true;
  
  // Simulate API call
  setTimeout(() => {
    show('订阅成功！感谢您的关注。', 'success');
    email.value = '';
    isSubmitting.value = false;
  }, 1500);
};

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -15;
  const rotateY = ((x - centerX) / centerX) * 15;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.2, 1.2, 1.2)`;
};

const handleCardMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <footer class="bg-slate-900 text-white pt-16 pb-8 mt-auto border-t border-slate-800/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <!-- Brand -->
        <div class="space-y-4">
          <div class="flex items-center gap-3">
             <h3 class="text-2xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">NS Smart Shopping</h3>
             <div class="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span class="text-[10px] font-mono text-green-400 font-bold uppercase tracking-wider">System Online</span>
             </div>
          </div>
          <p class="text-slate-400 text-sm leading-relaxed">
            全球首个 AI 托管的学生公司平台。<br>
            连接创意与现实，助力每一个梦想。
          </p>
        </div>

        <!-- Links -->
        <div>
          <h4 class="font-semibold mb-4 text-slate-200">平台</h4>
          <ul class="space-y-2 text-slate-400 text-sm">
            <li><button @click="navigateTo('/about')" class="hover:text-blue-400 hover:pl-1 transition-all duration-300 block text-left w-full">关于我们</button></li>
            <li><button @click="navigateTo('/crowdfunding')" class="hover:text-blue-400 hover:pl-1 transition-all duration-300 block text-left w-full">众筹计划</button></li>
            <li><button @click="navigateTo('/market')" class="hover:text-blue-400 hover:pl-1 transition-all duration-300 block text-left w-full">跳蚤市场</button></li>
            <li><button @click="navigateTo('/ai-lab')" class="hover:text-blue-400 hover:pl-1 transition-all duration-300 block text-left w-full">AI 实验室</button></li>
          </ul>
        </div>

        <!-- Support -->
        <div>
          <h4 class="font-semibold mb-4 text-slate-200">支持</h4>
          <ul class="space-y-2 text-slate-400 text-sm">
            <li><button @click="navigateTo('/help')" class="hover:text-purple-400 hover:pl-1 transition-all duration-300 block text-left w-full">帮助中心</button></li>
            <li><button @click="navigateTo('/terms')" class="hover:text-purple-400 hover:pl-1 transition-all duration-300 block text-left w-full">用户协议</button></li>
            <li><button @click="navigateTo('/privacy')" class="hover:text-purple-400 hover:pl-1 transition-all duration-300 block text-left w-full">隐私政策</button></li>
            <li><button @click="handleContact" class="hover:text-purple-400 hover:pl-1 transition-all duration-300 block text-left w-full">联系客服</button></li>
          </ul>
        </div>

        <!-- Newsletter -->
        <div>
          <h4 class="font-semibold mb-4 text-slate-200">订阅更新</h4>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <input 
                v-model="email"
                type="email" 
                placeholder="您的邮箱" 
                class="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-slate-500 transition-all duration-300"
                @keyup.enter="handleSubscribe"
              >
            </div>
            <button 
              @click="handleSubscribe"
              :disabled="isSubmitting"
              class="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed min-w-[70px] flex items-center justify-center"
            >
              <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span v-else>订阅</span>
            </button>
          </div>
          <p class="text-xs text-slate-500 mt-2">订阅即表示您同意我们的隐私政策。</p>
        </div>
      </div>

      <div class="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-slate-500 text-sm">© 2026 NS Smart Shopping. All rights reserved.</p>
        <div class="flex gap-6 text-slate-400">
           <a href="#" 
              @mousemove="handleCardMouseMove"
              @mouseleave="handleCardMouseLeave"
              class="hover:text-[#07C160] transition-all duration-100 ease-out will-change-transform flex items-center gap-1 group"
           >
             <span class="sr-only">WeChat</span>
             <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M8.5,14.5c0.8,0,1.5-0.7,1.5-1.5s-0.7-1.5-1.5-1.5S7,12.2,7,13S7.7,14.5,8.5,14.5z M15.5,14.5c0.8,0,1.5-0.7,1.5-1.5 s-0.7-1.5-1.5-1.5S14,12.2,14,13S14.7,14.5,15.5,14.5z M12,2C6.5,2,2,6,2,11c0,2.9,1.5,5.5,3.9,7.2c-0.2,0.8-0.8,2.1-1.6,3.3 c0,0,3.3-0.4,5.4-2.2c0.8,0.2,1.6,0.3,2.4,0.3c5.5,0,10-4,10-9S17.5,2,12,2z"></path></svg>
             <span class="text-xs font-medium opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">微信</span>
           </a>
           <a href="#" 
              @mousemove="handleCardMouseMove"
              @mouseleave="handleCardMouseLeave"
              class="hover:text-[#E6162D] transition-all duration-100 ease-out will-change-transform flex items-center gap-1 group"
           >
             <span class="sr-only">Weibo</span>
             <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.18 6.55c1.45.36 2.05 1.57 1.57 3.09-.64 1.95-3.09 3.39-5.91 3.51-3.21.14-5.69-1.25-5.69-3.41 0-1.88 2.07-3.14 4.88-3.14 1.83-.01 3.82.52 5.15-.05z"></path></svg>
             <span class="text-xs font-medium opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">微博</span>
           </a>
           <a href="#" 
              @mousemove="handleCardMouseMove"
              @mouseleave="handleCardMouseLeave"
              class="hover:text-white transition-all duration-100 ease-out will-change-transform flex items-center gap-1 group"
           >
             <span class="sr-only">Douyin</span>
             <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5,6.5c-0.8,0-1.5,0.7-1.5,1.5v7c0,2.8-2.2,5-5,5s-5-2.2-5-5s2.2-5,5-5c0.3,0,0.6,0,0.9,0.1V5.6C10.6,5.5,10.3,5.5,10,5.5 C5.9,5.5,2.5,8.9,2.5,13s3.4,7.5,7.5,7.5s7.5-3.4,7.5-7.5V9.4c1.1,0.8,2.5,1.2,3.9,1.2v-4.4C19.7,6.2,18.1,6.5,16.5,6.5z"></path></svg>
             <span class="text-xs font-medium opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">抖音</span>
           </a>
        </div>
      </div>
    </div>
  </footer>
</template>
