<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  isOpen: Boolean,
  order: Object
});

const emit = defineEmits(['close', 'pay']);
const { t } = useI18n();

const isProcessing = ref(false);
const paymentMethod = ref('alipay');

const safeOrderId = computed(() => props.order?.id || '--');
const safeAmount = computed(() => Number(props.order?.amount || 0));

const formatCurrency = (value) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const handlePay = async () => {
  if (!props.order?.id) return;

  isProcessing.value = true;
  await new Promise((resolve) => window.setTimeout(resolve, 1500));
  isProcessing.value = false;
  emit('pay', props.order.id);
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-md" @click="emit('close')"></div>

    <div class="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0c]/95 shadow-2xl">
      <div class="border-b border-white/10 px-6 py-6 text-center">
        <p class="text-[11px] uppercase tracking-[0.24em] text-white/35">{{ t('paymentModal.modalLabel') }}</p>
        <h3 class="mt-2 text-2xl font-medium tracking-tight text-white">{{ t('paymentModal.title') }}</h3>
        <p class="mt-3 text-xs uppercase tracking-[0.18em] text-white/35">
          {{ t('paymentModal.orderId', { id: safeOrderId }) }}
        </p>
      </div>

      <div class="space-y-6 px-6 py-6">
        <div class="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur-2xl">
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('paymentModal.amountLabel') }}</p>
          <p class="mt-4 text-5xl font-medium tracking-tighter text-white">{{ formatCurrency(safeAmount) }}</p>
        </div>

        <div class="space-y-3">
          <label
            class="flex cursor-pointer items-center justify-between rounded-[1.25rem] border p-4 transition"
            :class="paymentMethod === 'alipay' ? 'border-white/18 bg-white/[0.06]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.04]'"
          >
            <div class="space-y-1">
              <p class="text-sm font-medium text-white">{{ t('paymentModal.methods.alipay') }}</p>
              <p class="text-[11px] uppercase tracking-[0.18em] text-white/35">{{ t('paymentModal.methods.recommended') }}</p>
            </div>
            <input v-model="paymentMethod" type="radio" value="alipay" class="h-4 w-4 accent-white">
          </label>

          <label
            class="flex cursor-pointer items-center justify-between rounded-[1.25rem] border p-4 transition"
            :class="paymentMethod === 'wechat' ? 'border-white/18 bg-white/[0.06]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.04]'"
          >
            <div class="space-y-1">
              <p class="text-sm font-medium text-white">{{ t('paymentModal.methods.wechat') }}</p>
              <p class="text-[11px] uppercase tracking-[0.18em] text-white/35">{{ t('paymentModal.methods.secure') }}</p>
            </div>
            <input v-model="paymentMethod" type="radio" value="wechat" class="h-4 w-4 accent-white">
          </label>
        </div>
      </div>

      <div class="border-t border-white/10 bg-white/[0.02] px-6 py-6">
        <button
          class="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-base font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isProcessing"
          @click="handlePay"
        >
          <svg v-if="isProcessing" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z"></path>
          </svg>
          <span>{{ isProcessing ? t('paymentModal.processing') : t('paymentModal.payNow') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
