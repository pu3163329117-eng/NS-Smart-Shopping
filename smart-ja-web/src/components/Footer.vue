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
  show('Support channel is connecting. Please wait a moment.', 'info');
  setTimeout(() => {
    show('Support is currently busy. Please try again later or email support@nssmart.com.', 'warning');
  }, 2000);
};

const handleSubscribe = () => {
  if (!email.value || !email.value.includes('@')) {
    show('Please enter a valid email address.', 'error');
    return;
  }

  isSubmitting.value = true;
  setTimeout(() => {
    show('Subscription successful. Thanks for following us.', 'success');
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
  <footer class="mt-auto border-t border-slate-200 bg-slate-100 pb-8 pt-16 text-slate-900 transition-colors duration-300 dark:border-white/10 dark:bg-slate-950 dark:text-white">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <h3 class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-2xl font-bold tracking-tighter text-transparent">NS Smart Shopping</h3>
            <div class="flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1">
              <span class="relative flex h-2 w-2">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-green-400">System Online</span>
            </div>
          </div>
          <p class="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            AI-native marketplace for young creators and coaches.<br>
            Turning ideas into real products and real outcomes.
          </p>
        </div>

        <div>
          <h4 class="mb-4 font-semibold text-slate-700 dark:text-slate-200">Platform</h4>
          <ul class="space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li><button @click="navigateTo('/about')" class="block w-full text-left transition-all duration-300 hover:pl-1 hover:text-blue-600 dark:hover:text-blue-400">About</button></li>
            <li><button @click="navigateTo('/crowdfunding')" class="block w-full text-left transition-all duration-300 hover:pl-1 hover:text-blue-600 dark:hover:text-blue-400">Crowdfunding</button></li>
            <li><button @click="navigateTo('/market')" class="block w-full text-left transition-all duration-300 hover:pl-1 hover:text-blue-600 dark:hover:text-blue-400">Market</button></li>
            <li><button @click="navigateTo('/ai-lab')" class="block w-full text-left transition-all duration-300 hover:pl-1 hover:text-blue-600 dark:hover:text-blue-400">AI Lab</button></li>
          </ul>
        </div>

        <div>
          <h4 class="mb-4 font-semibold text-slate-700 dark:text-slate-200">Support</h4>
          <ul class="space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li><button @click="navigateTo('/help')" class="block w-full text-left transition-all duration-300 hover:pl-1 hover:text-violet-600 dark:hover:text-purple-400">Help Center</button></li>
            <li><button @click="navigateTo('/terms')" class="block w-full text-left transition-all duration-300 hover:pl-1 hover:text-violet-600 dark:hover:text-purple-400">Terms</button></li>
            <li><button @click="navigateTo('/privacy')" class="block w-full text-left transition-all duration-300 hover:pl-1 hover:text-violet-600 dark:hover:text-purple-400">Privacy</button></li>
            <li><button @click="handleContact" class="block w-full text-left transition-all duration-300 hover:pl-1 hover:text-violet-600 dark:hover:text-purple-400">Contact Support</button></li>
          </ul>
        </div>

        <div>
          <h4 class="mb-4 font-semibold text-slate-700 dark:text-slate-200">Newsletter</h4>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <input
                v-model="email"
                type="email"
                placeholder="Your email"
                class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                @keyup.enter="handleSubscribe"
              >
            </div>
            <button
              :disabled="isSubmitting"
              class="flex min-w-[70px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
              @click="handleSubscribe"
            >
              <span v-if="isSubmitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
              <span v-else>Join</span>
            </button>
          </div>
          <p class="mt-2 text-xs text-slate-500">By subscribing, you agree to our privacy policy.</p>
        </div>
      </div>

      <div class="flex flex-col items-center justify-between gap-4 border-t border-slate-300 pt-8 md:flex-row dark:border-slate-800">
        <p class="text-sm text-slate-500">© 2026 NS Smart Shopping. All rights reserved.</p>
        <div class="flex gap-6 text-slate-500 dark:text-slate-400">
          <a
            href="#"
            class="group flex items-center gap-1 transition-all duration-100 ease-out will-change-transform hover:text-[#07C160]"
            @mousemove="handleCardMouseMove"
            @mouseleave="handleCardMouseLeave"
          >
            <span class="sr-only">WeChat</span>
            <svg class="h-5 w-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24"><path d="M8.5,14.5c0.8,0,1.5-0.7,1.5-1.5s-0.7-1.5-1.5-1.5S7,12.2,7,13S7.7,14.5,8.5,14.5z M15.5,14.5c0.8,0,1.5-0.7,1.5-1.5 s-0.7-1.5-1.5-1.5S14,12.2,14,13S14.7,14.5,15.5,14.5z M12,2C6.5,2,2,6,2,11c0,2.9,1.5,5.5,3.9,7.2c-0.2,0.8-0.8,2.1-1.6,3.3 c0,0,3.3-0.4,5.4-2.2c0.8,0.2,1.6,0.3,2.4,0.3c5.5,0,10-4,10-9S17.5,2,12,2z"></path></svg>
            <span class="text-xs font-medium opacity-0 transition-all duration-300 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100">WeChat</span>
          </a>
          <a
            href="#"
            class="group flex items-center gap-1 transition-all duration-100 ease-out will-change-transform hover:text-[#E6162D]"
            @mousemove="handleCardMouseMove"
            @mouseleave="handleCardMouseLeave"
          >
            <span class="sr-only">Weibo</span>
            <svg class="h-5 w-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.18 6.55c1.45.36 2.05 1.57 1.57 3.09-.64 1.95-3.09 3.39-5.91 3.51-3.21.14-5.69-1.25-5.69-3.41 0-1.88 2.07-3.14 4.88-3.14 1.83-.01 3.82.52 5.15-.05z"></path></svg>
            <span class="text-xs font-medium opacity-0 transition-all duration-300 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100">Weibo</span>
          </a>
          <a
            href="#"
            class="group flex items-center gap-1 transition-all duration-100 ease-out will-change-transform hover:text-slate-900 dark:hover:text-white"
            @mousemove="handleCardMouseMove"
            @mouseleave="handleCardMouseLeave"
          >
            <span class="sr-only">Douyin</span>
            <svg class="h-5 w-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5,6.5c-0.8,0-1.5,0.7-1.5,1.5v7c0,2.8-2.2,5-5,5s-5-2.2-5-5s2.2-5,5-5c0.3,0,0.6,0,0.9,0.1V5.6C10.6,5.5,10.3,5.5,10,5.5 C5.9,5.5,2.5,8.9,2.5,13s3.4,7.5,7.5,7.5s7.5-3.4,7.5-7.5V9.4c1.1,0.8,2.5,1.2,3.9,1.2v-4.4C19.7,6.2,18.1,6.5,16.5,6.5z"></path></svg>
            <span class="text-xs font-medium opacity-0 transition-all duration-300 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100">Douyin</span>
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>
