<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserProfile } from '../store/userProfile';
import { useToast } from '../composables/useToast';
import { UserService } from '../services/api';

const props = defineProps({
  show: Boolean,
  initialTab: {
    type: String,
    default: 'balance'
  }
});

const emit = defineEmits(['close']);

const { t, locale } = useI18n();
const { userProfile, fetchProfile } = useUserProfile();
const { show: showToast } = useToast();

const activeTab = ref(props.initialTab);
const transactions = ref([]);
const pointHistory = ref([]);

const tabs = computed(() => [
  { id: 'balance', label: t('walletModal.tabs.balance') },
  { id: 'points', label: t('walletModal.tabs.points') },
  { id: 'coupons', label: t('walletModal.tabs.coupons') }
]);

const fallbackTransactions = computed(() => [
  {
    id: 'fallback-expense',
    type: 'expense',
    title: t('walletModal.fallbackTransactions.purchase'),
    amount: -29.9,
    date: '2026-01-15T14:30:00'
  },
  {
    id: 'fallback-income',
    type: 'income',
    title: t('walletModal.fallbackTransactions.sale'),
    amount: 45,
    date: '2026-01-12T09:15:00'
  },
  {
    id: 'fallback-topup',
    type: 'topup',
    title: t('walletModal.fallbackTransactions.topUp'),
    amount: 100,
    date: '2026-01-10T18:20:00'
  }
]);

const fallbackPointHistory = computed(() => [
  {
    id: 'points-checkin',
    type: 'gain',
    title: t('walletModal.fallbackPoints.checkIn'),
    amount: 10,
    date: '2026-01-16T09:00:00'
  },
  {
    id: 'points-purchase',
    type: 'gain',
    title: t('walletModal.fallbackPoints.purchase'),
    amount: 29,
    date: '2026-01-15T14:30:00'
  },
  {
    id: 'points-redeem',
    type: 'use',
    title: t('walletModal.fallbackPoints.redeem'),
    amount: -50,
    date: '2026-01-15T14:35:00'
  }
]);

const coupons = computed(() => [
  {
    id: 'new-user',
    name: t('walletModal.coupons.newUser.name'),
    amount: 10,
    min: 0,
    description: t('walletModal.coupons.newUser.description'),
    expire: '2026-02-01',
    status: 'available'
  },
  {
    id: 'full-reduction',
    name: t('walletModal.coupons.fullReduction.name'),
    amount: 20,
    min: 199,
    description: t('walletModal.coupons.fullReduction.description'),
    expire: '2026-02-15',
    status: 'available'
  },
  {
    id: 'shipping',
    name: t('walletModal.coupons.shipping.name'),
    amount: 8,
    min: 0,
    description: t('walletModal.coupons.shipping.description'),
    expire: '2026-01-20',
    status: 'used'
  }
]);

const formatCurrency = (amount) =>
  new Intl.NumberFormat(locale.value === 'zh' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount || 0));

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en-US');
};

const syncRecords = (records) => {
  if (Array.isArray(records) && records.length > 0) {
    transactions.value = records.filter((item) => !item.isPoints);
    pointHistory.value = records.filter((item) => item.isPoints);
    return;
  }

  transactions.value = fallbackTransactions.value;
  pointHistory.value = fallbackPointHistory.value;
};

const refreshProfile = async () => {
  try {
    await fetchProfile();
  } catch (error) {
    console.error('wallet profile refresh failed', error);
  } finally {
    syncRecords(userProfile.transactions);
  }
};

onMounted(refreshProfile);

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      activeTab.value = props.initialTab;
      refreshProfile();
    }
  }
);

watch(
  () => props.initialTab,
  (tab) => {
    activeTab.value = tab;
  }
);

watch(
  () => userProfile.transactions,
  (records) => {
    syncRecords(records);
  },
  { deep: true, immediate: true }
);

watch(locale, () => {
  if (!userProfile.transactions || userProfile.transactions.length === 0) {
    syncRecords([]);
  }
});

const closeModal = () => {
  emit('close');
};

const handleTopUp = async () => {
  const amountInput = window.prompt(t('walletModal.actions.topUpPrompt'), '100');
  if (!amountInput) return;

  const amount = Number.parseFloat(amountInput);
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast(t('walletModal.feedback.invalidAmount'), 'error');
    return;
  }

  try {
    const response = await UserService.topUpWallet(amount);
    const wallet = response?.wallet ?? response;
    const latestTransactions = response?.transactions;

    if (wallet) {
      userProfile.wallet = {
        ...userProfile.wallet,
        ...wallet
      };
    }

    if (Array.isArray(latestTransactions)) {
      userProfile.transactions = latestTransactions;
      syncRecords(latestTransactions);
    } else {
      transactions.value.unshift({
        id: `topup-${Date.now()}`,
        type: 'topup',
        title: t('walletModal.fallbackTransactions.topUp'),
        amount,
        date: new Date().toISOString()
      });
    }

    showToast(t('walletModal.feedback.topUpSuccess', { amount: formatCurrency(amount) }), 'success');
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || t('walletModal.feedback.unknownError');
    showToast(t('walletModal.feedback.topUpFailed', { message }), 'error');
  }
};

const handleWithdraw = () => {
  showToast(t('walletModal.feedback.withdrawSubmitted'), 'success');
};

const handleCardMouseMove = (event) => {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * -5;
  const rotateY = ((x - centerX) / centerX) * 5;

  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
};

const handleCardMouseLeave = (event) => {
  event.currentTarget.style.transform = '';
};

const handleModalMouseMove = (event) => {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * -2;
  const rotateY = ((x - centerX) / centerX) * 2;

  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
};

const handleModalMouseLeave = (event) => {
  event.currentTarget.style.transform = '';
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

    <div
      class="relative flex h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-gray-50 shadow-2xl transition-transform duration-100 ease-out will-change-transform sm:h-[800px] sm:w-[480px] sm:rounded-3xl"
      @mousemove="handleModalMouseMove"
      @mouseleave="handleModalMouseLeave"
    >
      <div class="z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <h2 class="text-lg font-bold text-slate-900">{{ t('walletModal.title') }}</h2>
        <button
          class="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          @click="closeModal"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="z-10 flex overflow-x-auto border-b border-gray-100 bg-white px-2 pt-2 scrollbar-hide">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="relative flex-1 whitespace-nowrap px-4 py-3 text-center text-sm font-medium transition-colors"
          :class="activeTab === tab.id ? 'font-bold text-slate-900' : 'text-gray-500 hover:text-slate-700'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
          <span
            v-if="activeTab === tab.id"
            class="absolute bottom-0 left-1/2 h-1 w-6 -translate-x-1/2 rounded-t-full bg-slate-900"
          ></span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto bg-gray-50 p-4 scrollbar-hide">
        <div v-if="activeTab === 'balance'" class="space-y-6">
          <div
            class="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-lg transition-transform duration-100 ease-out will-change-transform"
            @mousemove.stop="handleCardMouseMove"
            @mouseleave="handleCardMouseLeave"
          >
            <div class="mb-1 text-sm text-slate-300">{{ t('walletModal.balance.label') }}</div>
            <div class="mb-6 text-3xl font-bold tracking-wider">
              {{ formatCurrency(userProfile.wallet.balance) }}
            </div>
            <div class="flex gap-4">
              <button
                class="flex-1 rounded-xl bg-white py-2 text-sm font-bold text-slate-900 transition hover:bg-gray-100"
                @click="handleTopUp"
              >
                {{ t('walletModal.actions.topUp') }}
              </button>
              <button
                class="flex-1 rounded-xl bg-white/10 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
                @click="handleWithdraw"
              >
                {{ t('walletModal.actions.withdraw') }}
              </button>
            </div>
          </div>

          <section>
            <h3 class="mb-3 font-bold text-slate-900">{{ t('walletModal.balance.transactions') }}</h3>
            <div class="space-y-3">
              <div
                v-for="item in transactions"
                :key="item.id"
                class="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm transition-transform duration-100 ease-out will-change-transform"
                @mousemove.stop="handleCardMouseMove"
                @mouseleave="handleCardMouseLeave"
              >
                <div>
                  <div class="text-sm font-bold text-slate-900">{{ item.title }}</div>
                  <div class="mt-1 text-xs text-gray-400">{{ formatDateTime(item.date) }}</div>
                </div>
                <div class="font-bold" :class="item.amount > 0 ? 'text-red-500' : 'text-slate-900'">
                  {{ item.amount > 0 ? '+' : '' }}{{ formatCurrency(Math.abs(item.amount)) }}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="activeTab === 'points'" class="space-y-6">
          <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 p-6 text-white shadow-lg">
            <div class="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-white/20 blur-2xl"></div>
            <div class="relative z-10">
              <div class="mb-1 text-sm text-white/90">{{ t('walletModal.points.label') }}</div>
              <div class="mb-4 text-3xl font-bold tracking-wider">{{ userProfile.wallet.points }}</div>
              <div class="text-xs text-white/80">{{ t('walletModal.points.exchangeRate') }}</div>
            </div>
          </div>

          <section>
            <h3 class="mb-3 font-bold text-slate-900">{{ t('walletModal.points.history') }}</h3>
            <div class="space-y-3">
              <div
                v-for="item in pointHistory"
                :key="item.id"
                class="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm transition-transform duration-100 ease-out will-change-transform"
                @mousemove.stop="handleCardMouseMove"
                @mouseleave="handleCardMouseLeave"
              >
                <div>
                  <div class="text-sm font-bold text-slate-900">{{ item.title }}</div>
                  <div class="mt-1 text-xs text-gray-400">{{ formatDateTime(item.date) }}</div>
                </div>
                <div class="font-bold" :class="item.amount > 0 ? 'text-orange-500' : 'text-slate-900'">
                  {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="coupon in coupons"
            :key="coupon.id"
            class="relative flex overflow-hidden rounded-xl bg-white shadow-sm transition-transform duration-100 ease-out will-change-transform"
            @mousemove.stop="handleCardMouseMove"
            @mouseleave="handleCardMouseLeave"
          >
            <div
              class="flex w-24 flex-col items-center justify-center border-r border-dashed border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-2 text-red-600"
            >
              <span class="text-xs font-bold">{{ t('walletModal.coupons.amountLabel') }}</span>
              <span class="text-2xl font-bold">{{ coupon.amount }}</span>
              <span class="text-[10px]">
                {{ coupon.min > 0 ? t('walletModal.coupons.minimum', { amount: coupon.min }) : t('walletModal.coupons.noMinimum') }}
              </span>
            </div>

            <div class="relative flex flex-1 flex-col justify-between p-3">
              <div>
                <h3 class="text-sm font-bold text-slate-900">{{ coupon.name }}</h3>
                <p class="mt-1 text-xs text-gray-500">{{ coupon.description }}</p>
              </div>

              <div class="mt-2 flex items-end justify-between">
                <span class="text-[10px] text-gray-400">
                  {{ t('walletModal.coupons.expires', { date: coupon.expire }) }}
                </span>
                <button
                  v-if="coupon.status === 'available'"
                  class="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white"
                >
                  {{ t('walletModal.coupons.useNow') }}
                </button>
                <span v-else class="text-xs text-gray-400">{{ t('walletModal.coupons.used') }}</span>
              </div>

              <div class="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-gray-50"></div>
              <div class="absolute -bottom-2 -left-2 h-4 w-4 rounded-full bg-gray-50"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
