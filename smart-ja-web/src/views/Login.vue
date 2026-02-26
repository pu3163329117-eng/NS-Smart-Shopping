<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../store/auth';
import { useToast } from '../composables/useToast';

const router = useRouter();
const { t } = useI18n();
const { login, sendCode } = useAuth();
const { show: showToast } = useToast();

const phoneNumber = ref('');
const code = ref('');
const loading = ref(false);
const sendingCode = ref(false);
const countdown = ref(0);

const isValidPhone = computed(() => {
  return /^1[3-9]\d{9}$/.test(phoneNumber.value);
});

const handleSendCode = async () => {
  if (!isValidPhone.value) {
    showToast(t('auth.invalidPhone'), 'error');
    return;
  }
  
  if (countdown.value > 0) return;

  sendingCode.value = true;
  try {
    const receivedCode = await sendCode(phoneNumber.value);
    showToast(t('auth.codeSent', { code: receivedCode }), 'success'); // For demo purposes
    
    countdown.value = 60;
    const timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  } catch (error) {
    showToast(t('auth.sendFailed'), 'error');
  } finally {
    sendingCode.value = false;
  }
};

const handleLogin = async () => {
  if (!phoneNumber.value || !code.value) {
    showToast(t('auth.fillAll'), 'error');
    return;
  }
  
  loading.value = true;
  try {
    await login(phoneNumber.value, code.value);
    showToast(t('auth.loginSuccess'), 'success');
    router.push('/profile');
  } catch (error) {
    showToast(error.message || t('auth.loginFailed'), 'error');
  } finally {
    loading.value = false;
  }
};

const handleCardMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -2;
  const rotateY = ((x - centerX) / centerX) * 2;
  
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (e) => {
  e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div 
      class="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md transition-all duration-300 ease-out will-change-transform"
      @mousemove="handleCardMouseMove"
      @mouseleave="handleCardMouseLeave"
    >
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold text-slate-900 mb-2">{{ $t('auth.welcome') }}</h1>
        <p class="text-slate-500">{{ $t('auth.subtitle') }}</p>
      </div>

      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">{{ $t('auth.phone') }}</label>
          <input 
            v-model="phoneNumber"
            type="tel" 
            maxlength="11"
            class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            :placeholder="$t('auth.phonePlaceholder')"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">{{ $t('auth.code') }}</label>
          <div class="flex gap-3">
            <input 
              v-model="code"
              type="text" 
              maxlength="6"
              class="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              :placeholder="$t('auth.codePlaceholder')"
            >
            <button 
              @click="handleSendCode"
              :disabled="!isValidPhone || countdown > 0 || sendingCode"
              class="px-4 py-3 bg-gray-100 text-slate-600 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              {{ sendingCode ? $t('auth.sending') : (countdown > 0 ? $t('auth.retry', { s: countdown }) : $t('auth.getCode')) }}
            </button>
          </div>
        </div>

        <button 
          @click="handleLogin"
          :disabled="loading || !isValidPhone || !code"
          class="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          <svg v-if="loading" class="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ loading ? $t('auth.loggingIn') : $t('auth.login') }}
        </button>

        <p class="text-center text-xs text-gray-400 mt-6">
          {{ $t('auth.agreement') }} <a href="#" class="text-blue-600">{{ $t('auth.terms') }}</a> & <a href="#" class="text-blue-600">{{ $t('auth.privacy') }}</a>
        </p>
      </div>
    </div>
  </div>
</template>
