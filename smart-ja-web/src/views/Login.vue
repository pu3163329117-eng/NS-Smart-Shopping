<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
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
const countdownTimer = ref(null);
const showCaptchaModal = ref(false);
const captchaProgress = ref(0);
const captchaVerified = ref(false);

const isValidPhone = computed(() => /^1[3-9]\d{9}$/.test(phoneNumber.value));
const RATE_LIMIT_HINT = '您发送得太频繁了，喝口水休息一下吧（请等待60秒）';

const resolveErrorMessage = (error, fallback) => {
  const status = Number(error?.status || error?.response?.status || 0);
  if (status === 429) {
    return RATE_LIMIT_HINT;
  }
  return error?.message || fallback;
};

const resetCaptcha = () => {
  captchaProgress.value = 0;
  captchaVerified.value = false;
};

const openCaptcha = () => {
  resetCaptcha();
  showCaptchaModal.value = true;
};

const closeCaptcha = () => {
  if (sendingCode.value) {
    return;
  }
  showCaptchaModal.value = false;
};

const onCaptchaSlide = (event) => {
  captchaProgress.value = Number(event?.target?.value || 0);
  captchaVerified.value = captchaProgress.value >= 100;
};

const startCountdown = () => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value);
  }

  countdown.value = 60;
  countdownTimer.value = window.setInterval(() => {
    countdown.value = Math.max(0, countdown.value - 1);
    if (countdown.value <= 0 && countdownTimer.value) {
      clearInterval(countdownTimer.value);
      countdownTimer.value = null;
    }
  }, 1000);
};

const requestSmsCode = async () => {
  sendingCode.value = true;
  try {
    await sendCode(phoneNumber.value);
    showToast('验证码已成功发送，请注意查收手机短信', 'success');
    startCountdown();
  } catch (error) {
    showToast(resolveErrorMessage(error, t('auth.sendFailed')), 'error');
  } finally {
    sendingCode.value = false;
  }
};

const handleSendCode = async () => {
  if (!isValidPhone.value) {
    showToast(t('auth.invalidPhone'), 'error');
    return;
  }
  if (countdown.value > 0 || sendingCode.value) return;

  openCaptcha();
};

const handleCaptchaConfirm = async () => {
  if (!captchaVerified.value) {
    return;
  }
  showCaptchaModal.value = false;
  await requestSmsCode();
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
    
    const redirectPath = router.currentRoute.value.query.redirect;
    if (redirectPath) {
      router.push(redirectPath);
    } else {
      router.push('/profile');
    }
  } catch (error) {
    showToast(resolveErrorMessage(error, t('auth.loginFailed')), 'error');
  } finally {
    loading.value = false;
  }
};

onBeforeUnmount(() => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value);
    countdownTimer.value = null;
  }
});

</script>

<template>
  <div class="min-h-screen bg-white dark:bg-[#0a0a0c] px-4 py-10">
    <div class="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
      <div class="grid w-full overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] backdrop-blur-2xl md:grid-cols-2">
        <div class="hidden border-r border-slate-200 dark:border-white/10 p-10 md:flex md:flex-col md:justify-between">
          <div>
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-600 dark:text-white/35">{{ $t('auth.brandLabel') }}</p>
            <h1 class="mt-5 text-5xl font-medium tracking-tighter text-slate-900 dark:text-white">NS</h1>
            <p class="mt-5 max-w-sm text-sm leading-7 text-slate-500 dark:text-slate-600 dark:text-white/45">{{ $t('auth.heroBody') }}</p>
          </div>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 dark:text-white/28">{{ $t('auth.heroFoot') }}</p>
        </div>

        <div class="p-8 sm:p-10">
          <div class="mb-8">
            <h2 class="text-3xl font-medium tracking-tight text-slate-900 dark:text-white">{{ $t('auth.welcome') }}</h2>
            <p class="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-600 dark:text-white/45">{{ $t('auth.subtitle') }}</p>
          </div>

          <div class="space-y-5">
            <div class="space-y-2">
              <label class="text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-white/38">{{ $t('auth.phone') }}</label>
              <input
                v-model="phoneNumber"
                type="tel"
                maxlength="11"
                class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/22 focus:border-slate-200 dark:border-white/20 focus:bg-white/[0.05]"
                :placeholder="$t('auth.phonePlaceholder')"
              >
            </div>

            <div class="space-y-2">
              <label class="text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-white/38">{{ $t('auth.code') }}</label>
              <div class="flex gap-3">
                <input
                  v-model="code"
                  type="text"
                  maxlength="6"
                  class="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/22 focus:border-slate-200 dark:border-white/20 focus:bg-white/[0.05]"
                  :placeholder="$t('auth.codePlaceholder')"
                >
                <button
                  class="min-w-[132px] rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-600 dark:text-slate-600 dark:text-white/65 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="!isValidPhone || countdown > 0 || sendingCode"
                  @click="handleSendCode"
                >
                  {{ sendingCode ? $t('auth.sending') : (countdown > 0 ? $t('auth.retry', { s: countdown }) : $t('auth.getCode')) }}
                </button>
              </div>
            </div>

            <button
              class="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-base font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading || !isValidPhone || !code"
              @click="handleLogin"
            >
              <svg v-if="loading" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z"></path>
              </svg>
              <span>{{ loading ? $t('auth.loggingIn') : $t('auth.login') }}</span>
            </button>

            <p class="pt-2 text-center text-xs leading-6 text-slate-400 dark:text-slate-600 dark:text-white/35">
              {{ $t('auth.agreement') }}
              <router-link to="/terms" class="text-slate-600 dark:text-white/62 transition hover:text-slate-900 dark:text-white">{{ $t('auth.terms') }}</router-link>
              &
              <router-link to="/privacy" class="text-slate-600 dark:text-white/62 transition hover:text-slate-900 dark:text-white">{{ $t('auth.privacy') }}</router-link>
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCaptchaModal" class="fixed inset-0 z-[1200] flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-slate-50 dark:bg-black/75 backdrop-blur-sm" @click="closeCaptcha"></div>
      <div class="relative w-full max-w-md rounded-[1.8rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c]/92 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
        <p class="text-[11px] uppercase tracking-[0.22em] text-slate-600 dark:text-white/40">Human Verification</p>
        <h3 class="mt-3 text-2xl font-medium tracking-tight text-slate-900 dark:text-white">请先完成滑块验证</h3>
        <p class="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-600 dark:text-white/45">将滑块拖到最右侧，验证通过后才会发送短信验证码。</p>

        <div class="mt-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4">
          <div class="mb-3 flex items-center justify-between text-xs text-slate-600 dark:text-white/55">
            <span>验证进度</span>
            <span>{{ captchaProgress }}%</span>
          </div>
          <input
            :value="captchaProgress"
            type="range"
            min="0"
            max="100"
            step="1"
            class="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
            @input="onCaptchaSlide"
          >
          <p class="mt-3 text-xs text-slate-600 dark:text-white/40">
            {{ captchaVerified ? '验证通过，可以发送验证码。' : '向右滑动完成验证。' }}
          </p>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-white/70 transition hover:bg-slate-200 dark:bg-white/[0.08]"
            :disabled="sendingCode"
            @click="closeCaptcha"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!captchaVerified || sendingCode"
            @click="handleCaptchaConfirm"
          >
            {{ sendingCode ? '发送中...' : '验证并发送' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
