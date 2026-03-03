<script setup>
import { computed, onMounted, ref } from 'vue';
import { useToast } from '../composables/useToast';
import { UserService } from '../services/api';

const { show: showToast } = useToast();

const profile = ref(null);
const loading = ref(true);
const errorMessage = ref('');
const toppingUp = ref(false);
const customAmount = ref(100);

const quickAmounts = [50, 100, 200, 500];

const loadWallet = async () => {
  loading.value = true;

  try {
    const response = await UserService.getProfile();
    profile.value = response;
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = error?.message || 'Unable to load wallet data right now.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadWallet();
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
  return `¥${amount.toFixed(2)}`;
};

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `${amount >= 0 ? '+' : '-'}${formatCurrency(Math.abs(amount))}`;
};

const formatDate = (value) => {
  if (!value) {
    return 'Unknown time';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const getTransactionTone = (transaction) => {
  const amount = Number(transaction.amount || 0);
  return amount > 0 ? 'text-emerald-300' : 'text-white';
};

const getTransactionIcon = (type) => {
  switch (type) {
    case 'recharge':
      return '↗';
    case 'expense':
      return '−';
    case 'income':
      return '+';
    case 'points':
      return '•';
    default:
      return '◦';
  }
};

const getTransactionBadge = (transaction) => {
  const type = transaction.type || 'record';
  switch (type) {
    case 'recharge':
      return 'Top-up';
    case 'expense':
      return 'Expense';
    case 'income':
      return 'Income';
    case 'points':
      return 'Points';
    default:
      return 'Record';
  }
};

const getChannelName = (channel) => {
  switch (channel) {
    case 'recharge':
      return 'Balance top-up';
    case 'wallet':
      return 'Wallet payment';
    case 'payout':
      return 'Service payout';
    case 'reward':
      return 'System reward';
    default:
      return channel || 'Other';
  }
};

const handleTopUp = async (amount) => {
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    showToast('Please enter a valid top-up amount.', 'error');
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
    showToast(`Simulated top-up completed: ${formatCurrency(parsedAmount)}`, 'success');
  } catch (error) {
    showToast(error?.message || 'Top-up failed.', 'error');
  } finally {
    toppingUp.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#050505] pt-20 pb-20 text-white">
    <div class="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_14%,_rgba(255,255,255,0.07),_transparent_18%),radial-gradient(circle_at_82%_18%,_rgba(255,255,255,0.04),_transparent_16%),radial-gradient(circle_at_50%_72%,_rgba(255,255,255,0.03),_transparent_24%)]"></div>

    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <section class="rounded-[2.75rem] border border-white/5 bg-white/[0.02] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-8">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">Wallet Control</p>
            <h1 class="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white">My Wallet</h1>
            <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Balance, points, and transaction flow pulled from the live user profile interface, now restyled as a darker financial cockpit.
            </p>
          </div>

          <button
            type="button"
            class="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
            @click="loadWallet"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 4v5h5m11 2a8 8 0 10-2.34 5.66L20 20" />
            </svg>
            Refresh
          </button>
        </div>
      </section>

      <div v-if="loading" class="mt-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-12 text-center backdrop-blur-xl">
        <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-white/70"></div>
        <p class="mt-4 text-sm text-slate-400">Synchronizing wallet telemetry...</p>
      </div>

      <div
        v-else-if="errorMessage"
        class="mt-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-10 text-center backdrop-blur-xl"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">Signal lost</p>
        <h2 class="mt-4 text-2xl font-semibold tracking-tight text-white">Wallet data did not load.</h2>
        <p class="mt-3 text-sm leading-7 text-slate-400">{{ errorMessage }}</p>
        <button
          type="button"
          class="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-slate-100"
          @click="loadWallet"
        >
          Retry
        </button>
      </div>

      <div v-else class="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section class="space-y-8">
          <div class="relative overflow-hidden rounded-[2.75rem] border border-white/5 bg-white/[0.02] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),_transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_34%,transparent_72%,rgba(255,255,255,0.02))]"></div>
            <div class="relative">
              <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">Available Balance</p>
              <p class="mt-5 text-5xl font-semibold tracking-[-0.04em] text-white">{{ formatCurrency(wallet.balance) }}</p>

              <div class="mt-8 grid gap-4 sm:grid-cols-2">
                <div class="rounded-[1.8rem] border border-white/5 bg-white/[0.03] p-5">
                  <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">Points</p>
                  <p class="mt-3 text-2xl font-semibold text-white">{{ wallet.points }}</p>
                </div>
                <div class="rounded-[1.8rem] border border-white/5 bg-white/[0.03] p-5">
                  <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">Coupons</p>
                  <p class="mt-3 text-2xl font-semibold text-white">{{ wallet.coupons }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl">
              <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Total Income</p>
              <p class="mt-3 text-3xl font-semibold tracking-tight text-emerald-300">{{ formatCurrency(totalIncome) }}</p>
            </div>
            <div class="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl">
              <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Total Expense</p>
              <p class="mt-3 text-3xl font-semibold tracking-tight text-white">{{ formatCurrency(totalExpense) }}</p>
            </div>
          </div>
        </section>

        <section class="space-y-8">
          <div class="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Reactor Input</p>
                <h2 class="mt-2 text-2xl font-semibold tracking-tight text-white">Simulated top-up</h2>
              </div>
              <span class="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Local balance boost
              </span>
            </div>

            <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                v-for="amount in quickAmounts"
                :key="amount"
                type="button"
                class="rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                :class="
                  customAmount === amount
                    ? 'border-white/20 bg-white text-black'
                    : 'border-white/8 bg-white/[0.03] text-white hover:bg-white/[0.06]'
                "
                :disabled="toppingUp"
                @click="customAmount = amount"
              >
                {{ formatCurrency(amount) }}
              </button>
            </div>

            <div class="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                v-model.number="customAmount"
                type="number"
                min="1"
                step="1"
                class="h-14 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-white/20 focus:bg-white/[0.05]"
                placeholder="Enter top-up amount"
              >
              <button
                type="button"
                class="h-14 rounded-2xl bg-white px-6 text-sm font-semibold text-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="toppingUp"
                @click="handleTopUp(customAmount)"
              >
                {{ toppingUp ? 'Charging...' : 'Simulate top-up' }}
              </button>
            </div>
          </div>

          <div class="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Ledger</p>
                <h2 class="mt-2 text-2xl font-semibold tracking-tight text-white">Transaction flow</h2>
              </div>
              <span class="text-sm text-slate-500">{{ transactions.length }} records</span>
            </div>

            <div v-if="transactions.length" class="mt-6 space-y-3">
              <article
                v-for="transaction in transactions"
                :key="transaction.id"
                class="group flex flex-col gap-4 rounded-[1.6rem] border border-white/5 bg-black/35 p-5 transition-all hover:border-white/10 hover:bg-white/[0.03]"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-center gap-4">
                    <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-lg text-white">
                      {{ getTransactionIcon(transaction.type) }}
                    </div>
                    <div>
                      <h3 class="text-[15px] font-semibold text-white">
                        {{ transaction.counterparty ? transaction.counterparty : (transaction.title || 'Wallet record') }}
                      </h3>
                      <p class="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span>{{ formatDate(transaction.date) }}</span>
                        <span
                          v-if="transaction.status === 'completed'"
                          class="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500"
                        >
                          Completed
                        </span>
                      </p>
                    </div>
                  </div>

                  <div class="text-right">
                    <p class="text-base font-semibold" :class="getTransactionTone(transaction)">
                      {{ formatAmount(transaction.amount) }}
                    </p>
                    <p v-if="transaction.balanceAfter != null" class="mt-1 text-xs font-medium tracking-tight text-slate-500">
                      Balance {{ formatCurrency(transaction.balanceAfter) }}
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

            <div v-else class="mt-6 rounded-[1.6rem] border border-dashed border-white/8 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
              No wallet transactions yet. Try a simulated top-up or finish an order to populate the ledger.
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
