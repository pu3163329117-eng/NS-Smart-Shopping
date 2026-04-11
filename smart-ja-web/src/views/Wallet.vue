<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '../composables/useToast';
import { UserService } from '../services/api';

const { t } = useI18n();
const { show: showToast } = useToast();

const profile = ref(null);
const loading = ref(true);
const errorMessage = ref('');
const toppingUp = ref(false);
const customAmount = ref(100);
const isTopUpModalOpen = ref(false);
const shellRef = ref(null);
const sheenState = ref({ x: 50, y: 24 });
const activeFilter = ref('all');
let sheenRaf = null;

const quickAmounts = [50, 100, 200, 500];

const loadWallet = async () => {
  loading.value = true;

  try {
    const response = await UserService.getProfile();
    profile.value = response;
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = error?.message || t('wallet.state.loadErrorDefault');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadWallet();
  applySheen(sheenState.value.x, sheenState.value.y);
});

const applySheen = (xPercent, yPercent) => {
  if (!shellRef.value) return;
  shellRef.value.style.setProperty('--glass-x', `${xPercent}%`);
  shellRef.value.style.setProperty('--glass-y', `${yPercent}%`);
};

const scheduleSheenUpdate = (nextX, nextY) => {
  sheenState.value = { x: nextX, y: nextY };
  if (sheenRaf) return;
  sheenRaf = requestAnimationFrame(() => {
    applySheen(sheenState.value.x, sheenState.value.y);
    sheenRaf = null;
  });
};

const handleShellPointerMove = (event) => {
  if (!shellRef.value) return;
  const rect = shellRef.value.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  scheduleSheenUpdate(Math.max(6, Math.min(94, x)), Math.max(8, Math.min(90, y)));
};

const resetSheen = () => {
  scheduleSheenUpdate(50, 24);
};

onUnmounted(() => {
  if (sheenRaf) {
    cancelAnimationFrame(sheenRaf);
    sheenRaf = null;
  }
});

const wallet = computed(() => {
  return (
    profile.value?.wallet || {
      balance: 0,
      points: 0,
      coupons: 0
    }
  );
});

const transactions = computed(() => {
  return Array.isArray(profile.value?.transactions) ? profile.value.transactions : [];
});

const transactionFilterTabs = computed(() => {
  return [
    { key: 'all', label: t('wallet.filters.all') },
    { key: 'recharge', label: t('wallet.filters.recharge') },
    { key: 'expense', label: t('wallet.filters.expense') },
    { key: 'income', label: t('wallet.filters.income') },
    { key: 'ai', label: t('wallet.filters.ai') }
  ];
});

const normalizeFilterableText = (value) => {
  return String(value || '').toLowerCase();
};

const filteredTransactions = computed(() => {
  switch (activeFilter.value) {
    case 'recharge':
      return transactions.value.filter((item) => item.type === 'recharge');
    case 'expense':
      return transactions.value.filter((item) => ['payment', 'expense', 'gushi_hold'].includes(item.type));
    case 'income':
      return transactions.value.filter((item) => ['income', 'gushi_income', 'gushi_release', 'gushi_refund'].includes(item.type));
    case 'ai':
      return transactions.value.filter((item) => normalizeFilterableText(item.counterparty).includes('ns matrix'));
    case 'all':
    default:
      return transactions.value;
  }
});

const totalIncome = computed(() => {
  return transactions.value
    .filter((item) => Number(item.amount || 0) > 0)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
});

const totalExpense = computed(() => {
  return transactions.value
    .filter((item) => Number(item.amount || 0) < 0)
    .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
});

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `${t('wallet.currencySymbol')}${amount.toFixed(2)}`;
};

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `${amount >= 0 ? '+' : '-'}${formatCurrency(Math.abs(amount))}`;
};

const formatDate = (value) => {
  if (!value) {
    return t('wallet.ledger.unknownTime');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const getTransactionTone = (transaction) => {
  const amount = Number(transaction.amount || 0);
  return amount > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white';
};

const getTransactionIcon = (type) => {
  switch (type) {
    case 'recharge':
      return '+';
    case 'payment':
    case 'expense':
    case 'gushi_hold':
      return '-';
    case 'income':
    case 'gushi_income':
    case 'gushi_release':
    case 'gushi_refund':
      return '+';
    case 'points':
      return '*';
    default:
      return '#';
  }
};

const getTransactionBadge = (transaction) => {
  const type = transaction.type || 'record';
  switch (type) {
    case 'recharge':
      return t('wallet.transactionType.topUp');
    case 'payment':
    case 'expense':
      return t('wallet.transactionType.expense');
    case 'income':
      return t('wallet.transactionType.income');
    case 'gushi_hold':
      return 'Escrow Hold';
    case 'gushi_income':
    case 'gushi_release':
      return 'Gushi Settlement';
    case 'gushi_refund':
      return 'Order Refund';
    case 'points':
      return t('wallet.transactionType.points');
    default:
      return t('wallet.transactionType.record');
  }
};

const getChannelName = (channel) => {
  switch (channel) {
    case 'recharge':
      return t('wallet.channel.balanceTopUp');
    case 'wallet':
      return t('wallet.channel.walletPayment');
    case 'payout':
      return t('wallet.channel.servicePayout');
    case 'reward':
      return t('wallet.channel.systemReward');
    case 'wallet_hold':
      return 'Platform Escrow';
    case 'wallet_release':
    case 'wallet_refund':
      return 'Escrow Release';
    default:
      return channel || t('wallet.channel.other');
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'completed':
      return t('wallet.status.completed');
    default:
      return status || t('wallet.status.unknown');
  }
};

const handleTopUp = async (amount) => {
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    showToast(t('wallet.toast.invalidAmount'), 'error');
    return;
  }

  toppingUp.value = true;

  try {
    const result = await UserService.topUpWallet(parsedAmount);

    profile.value = {
      ...(profile.value || {}),
      wallet: result.wallet,
      transactions: result.transactions
    };

    customAmount.value = parsedAmount;
    showToast(t('wallet.toast.topUpSuccess', { amount: formatCurrency(parsedAmount) }), 'success');
    isTopUpModalOpen.value = false;
  } catch (error) {
    showToast(error?.message || t('wallet.toast.topUpFailed'), 'error');
  } finally {
    toppingUp.value = false;
  }
};
</script>

<template>
  <div
    ref="shellRef"
    class="wallet-shell min-h-screen pt-20 pb-20 text-slate-900 dark:text-white"
    @pointermove="handleShellPointerMove"
    @pointerleave="resetSheen"
  >
    <div class="wallet-bg pointer-events-none fixed inset-0 -z-10"></div>

    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <section class="liquid-panel rounded-[2.75rem] p-6 md:p-8">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-700 dark:text-slate-400">{{ t('wallet.header.kicker') }}</p>
            <h1 class="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">{{ t('wallet.header.title') }}</h1>
            <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-800 dark:text-slate-300">
              {{ t('wallet.header.subtitle') }}
            </p>
          </div>

          <button
            type="button"
            class="liquid-pill inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-800 dark:text-white transition"
            @click="loadWallet"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 4v5h5m11 2a8 8 0 10-2.34 5.66L20 20" />
            </svg>
            {{ t('wallet.actions.refresh') }}
          </button>
        </div>
      </section>

      <div v-if="loading" class="liquid-panel mt-8 rounded-[2.5rem] p-12 text-center">
        <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-white/70"></div>
        <p class="mt-4 text-sm text-slate-400">{{ t('wallet.state.loading') }}</p>
      </div>

      <div
        v-else-if="errorMessage"
        class="liquid-panel mt-8 rounded-[2.5rem] p-10 text-center"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">{{ t('wallet.state.signalLost') }}</p>
        <h2 class="mt-4 text-2xl font-semibold tracking-tight text-white">{{ t('wallet.state.loadFailedTitle') }}</h2>
        <p class="mt-3 text-sm leading-7 text-slate-400">{{ errorMessage }}</p>
        <button
          type="button"
          class="liquid-cta mt-6 rounded-full px-5 py-3 text-sm font-semibold text-black transition"
          @click="loadWallet"
        >
          {{ t('wallet.actions.retry') }}
        </button>
      </div>

      <div v-else class="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section class="space-y-8">
          <div class="liquid-panel relative overflow-hidden rounded-[2.75rem] p-8">
            <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_34%,transparent_72%,rgba(255,255,255,0.02))]"></div>
            <div class="relative">
              <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-700 dark:text-slate-400">{{ t('wallet.summary.availableBalance') }}</p>
              <p class="mt-5 text-5xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">{{ formatCurrency(wallet.balance) }}</p>

              <div class="mt-8 grid gap-4 sm:grid-cols-2">
                <div class="liquid-tile rounded-[1.8rem] p-5">
                  <p class="text-[11px] uppercase tracking-[0.24em] text-slate-700 dark:text-slate-400">{{ t('wallet.summary.points') }}</p>
                  <p class="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{{ wallet.points }}</p>
                </div>
                <div class="liquid-tile rounded-[1.8rem] p-5">
                  <p class="text-[11px] uppercase tracking-[0.24em] text-slate-700 dark:text-slate-400">{{ t('wallet.summary.coupons') }}</p>
                  <p class="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{{ wallet.coupons }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="liquid-tile rounded-[2rem] p-6">
              <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700 dark:text-slate-400">{{ t('wallet.summary.totalIncome') }}</p>
              <p class="mt-3 text-3xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-300">{{ formatCurrency(totalIncome) }}</p>
            </div>
            <div class="liquid-tile rounded-[2rem] p-6">
              <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700 dark:text-slate-400">{{ t('wallet.summary.totalExpense') }}</p>
              <p class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ formatCurrency(totalExpense) }}</p>
            </div>
          </div>
        </section>

        <section class="space-y-8">
          <div class="liquid-panel rounded-[2rem] p-6">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700 dark:text-slate-400">{{ t('wallet.recharge.kicker') }}</p>
                <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ t('wallet.recharge.title') }}</h2>
              </div>
              <span class="liquid-pill rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {{ t('wallet.recharge.sandbox') }}
              </span>
            </div>

            <p class="mt-5 text-sm leading-7 text-slate-700 dark:text-slate-300">
              {{ t('wallet.recharge.description') }}
            </p>

            <button
              type="button"
              class="liquid-cta mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
              @click="isTopUpModalOpen = true"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 5v14m-7-7h14" />
              </svg>
              {{ t('wallet.actions.rechargeNow') }}
            </button>
          </div>

          <div class="liquid-panel rounded-[2rem] p-6">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700 dark:text-slate-400">{{ t('wallet.ledger.kicker') }}</p>
                <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ t('wallet.ledger.title') }}</h2>
              </div>
              <span class="text-sm text-slate-700 dark:text-slate-400">{{ t('wallet.ledger.records', { count: filteredTransactions.length }) }}</span>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <button
                v-for="filter in transactionFilterTabs"
                :key="filter.key"
                type="button"
                class="rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition"
                :class="
                  activeFilter === filter.key
                    ? 'border-white/24 bg-white text-black shadow-[0_10px_22px_rgba(0,0,0,0.28)]'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.12] hover:text-white'
                "
                @click="activeFilter = filter.key"
              >
                {{ filter.label }}
              </button>
            </div>

            <div v-if="filteredTransactions.length" class="mt-6 space-y-3">
              <article
                v-for="transaction in filteredTransactions"
                :key="transaction.id"
                class="liquid-tile group flex flex-col gap-4 rounded-[1.6rem] p-5 transition-all hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.12]"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-center gap-4">
                    <div class="liquid-mini flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg text-slate-800 dark:text-white">
                      {{ getTransactionIcon(transaction.type) }}
                    </div>
                    <div>
                      <h3 class="text-[15px] font-semibold text-slate-900 dark:text-white">
                        {{ transaction.counterparty ? transaction.counterparty : (transaction.title || t('wallet.ledger.recordFallback')) }}
                      </h3>
                      <p class="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span>{{ formatDate(transaction.date) }}</span>
                        <span
                          v-if="transaction.status === 'completed'"
                          class="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500"
                        >
                          {{ getStatusLabel(transaction.status) }}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div class="text-right">
                    <p class="text-base font-semibold" :class="getTransactionTone(transaction)">
                      {{ formatAmount(transaction.amount) }}
                    </p>
                    <p v-if="transaction.balanceAfter != null" class="mt-1 text-xs font-medium tracking-tight text-slate-500">
                      {{ t('wallet.ledger.balanceAfter', { amount: formatCurrency(transaction.balanceAfter) }) }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center justify-between border-t border-white/5 pt-3">
                  <div class="flex items-center gap-3">
                    <span class="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {{ getTransactionBadge(transaction) }}
                    </span>
                    <span v-if="transaction.channel" class="text-xs font-medium text-slate-500">
                      {{ getChannelName(transaction.channel) }}
                    </span>
                  </div>
                  <div v-if="transaction.orderId" class="max-w-[150px] truncate text-xs font-mono tracking-wider text-slate-500">
                    {{ transaction.orderId }}
                  </div>
                </div>
              </article>
            </div>

            <div v-else class="liquid-tile mt-6 rounded-[1.6rem] border-dashed p-8 text-center text-sm text-slate-500">
              {{ t('wallet.ledger.empty') }}
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-if="isTopUpModalOpen" class="fixed inset-0 z-[1200] flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="isTopUpModalOpen = false"></div>
      <div class="liquid-panel relative w-full max-w-lg rounded-[2rem] p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{{ t('wallet.modal.kicker') }}</p>
            <h3 class="mt-2 text-2xl font-semibold tracking-tight text-white">{{ t('wallet.modal.title') }}</h3>
          </div>
          <button
            type="button"
            class="rounded-full border border-white/10 p-2 text-white/60 transition hover:bg-white/[0.08]"
            @click="isTopUpModalOpen = false"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            v-for="amount in quickAmounts"
            :key="amount"
            type="button"
            class="rounded-2xl border px-4 py-3 text-sm font-semibold transition"
            :class="
              customAmount === amount
                ? 'border-white/24 bg-white text-black shadow-[0_12px_25px_rgba(0,0,0,0.32)]'
                : 'liquid-tile text-white hover:bg-white/[0.14]'
            "
            :disabled="toppingUp"
            @click="customAmount = amount"
          >
            {{ formatCurrency(amount) }}
          </button>
        </div>

        <div class="mt-5 space-y-3">
          <input
            v-model.number="customAmount"
            type="number"
            min="1"
            step="1"
            class="liquid-input h-14 w-full rounded-2xl px-4 text-sm text-white outline-none transition placeholder:text-slate-500"
            :placeholder="t('wallet.modal.amountPlaceholder')"
          >
          <button
            type="button"
            class="liquid-cta h-14 w-full rounded-2xl px-6 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="toppingUp"
            @click="handleTopUp(customAmount)"
          >
            {{ toppingUp ? t('wallet.modal.charging') : t('wallet.modal.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wallet-shell {
  position: relative;
  --glass-x: 50%;
  --glass-y: 24%;
}

.wallet-bg {
  background:
    radial-gradient(circle at 18% 14%, rgba(255, 255, 255, 0.09), transparent 18%),
    radial-gradient(circle at 82% 18%, rgba(255, 255, 255, 0.05), transparent 16%),
    radial-gradient(circle at 50% 72%, rgba(130, 148, 255, 0.06), transparent 24%),
    linear-gradient(140deg, #0a0b0f 0%, #050506 60%, #040405 100%);
}

.liquid-panel,
.liquid-tile,
.liquid-pill,
.liquid-mini {
  position: relative;
  overflow: hidden;
}

.liquid-panel {
  border: 1px solid rgba(255, 255, 255, 0.13);
  background: linear-gradient(122deg, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.055) 35%, rgba(255, 255, 255, 0.02) 100%);
  box-shadow:
    0 26px 65px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    inset 0 -1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(28px) saturate(150%);
  -webkit-backdrop-filter: blur(28px) saturate(150%);
}

.liquid-tile {
  border: 1px solid rgba(255, 255, 255, 0.11);
  background: rgba(255, 255, 255, 0.06);
  box-shadow:
    0 15px 34px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px) saturate(130%);
  -webkit-backdrop-filter: blur(20px) saturate(130%);
}

.liquid-pill {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px) saturate(130%);
  -webkit-backdrop-filter: blur(18px) saturate(130%);
}

.liquid-mini {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.liquid-input {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px) saturate(125%);
  -webkit-backdrop-filter: blur(18px) saturate(125%);
}

.liquid-input:focus {
  border-color: rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.11);
}

.liquid-cta {
  background: #fff;
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.34);
}

.liquid-cta:hover {
  background: #f8fafc;
}

.liquid-panel::before,
.liquid-tile::before,
.liquid-pill::before,
.liquid-mini::before {
  content: '';
  position: absolute;
  inset: -34%;
  pointer-events: none;
  background: radial-gradient(circle at var(--glass-x) var(--glass-y), rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.09) 22%, transparent 58%);
  opacity: 0.24;
  transition: opacity 0.35s ease;
}

.liquid-panel:hover::before,
.liquid-tile:hover::before,
.liquid-pill:hover::before {
  opacity: 0.34;
}

.liquid-panel::after,
.liquid-tile::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0) 32%);
  opacity: 0.15;
}

:global(html:not(.dark)) .wallet-bg {
  background:
    radial-gradient(circle at 18% 14%, rgba(30, 41, 59, 0.08), transparent 18%),
    radial-gradient(circle at 82% 18%, rgba(30, 64, 175, 0.06), transparent 16%),
    radial-gradient(circle at 50% 72%, rgba(59, 130, 246, 0.08), transparent 24%),
    linear-gradient(140deg, #f8fafc 0%, #eef2f7 60%, #e2e8f0 100%);
}

:global(html:not(.dark)) .wallet-shell .liquid-panel {
  border-color: rgba(15, 23, 42, 0.08);
  background: linear-gradient(122deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.25) 35%, rgba(255, 255, 255, 0.15) 100%);
  box-shadow:
    0 20px 45px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(40px) saturate(160%);
  -webkit-backdrop-filter: blur(40px) saturate(160%);
}

:global(html:not(.dark)) .wallet-shell .liquid-tile,
:global(html:not(.dark)) .wallet-shell .liquid-pill,
:global(html:not(.dark)) .wallet-shell .liquid-mini,
:global(html:not(.dark)) .wallet-shell .liquid-input {
  border-color: rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(34px) saturate(140%);
  -webkit-backdrop-filter: blur(34px) saturate(140%);
}

:global(html:not(.dark)) .wallet-shell .text-white {
  color: rgba(15, 23, 42, 0.95) !important;
}

:global(html:not(.dark)) .wallet-shell [class*='text-white/'] {
  color: rgba(15, 23, 42, 0.72) !important;
}

:global(html:not(.dark)) .wallet-shell .text-slate-600 {
  color: rgba(15, 23, 42, 0.6) !important;
}

:global(html:not(.dark)) .wallet-shell .text-slate-700 {
  color: rgba(15, 23, 42, 0.8) !important;
}

:global(html:not(.dark)) .wallet-shell .liquid-cta .text-white,
:global(html:not(.dark)) .wallet-shell .liquid-cta.text-white {
  color: #fff !important;
}

@media (max-width: 768px) {
  .liquid-panel {
    backdrop-filter: blur(20px) saturate(130%);
    -webkit-backdrop-filter: blur(20px) saturate(130%);
  }

  .liquid-tile,
  .liquid-pill,
  .liquid-input {
    backdrop-filter: blur(16px) saturate(120%);
    -webkit-backdrop-filter: blur(16px) saturate(120%);
  }
}
</style>
