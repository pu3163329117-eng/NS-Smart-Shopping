<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCart } from '../store/cart';
import { useCheckout } from '../store/checkout';
import { useToast } from '../composables/useToast';
import { getCartRecommendations } from '../services/aiService';

const router = useRouter();
const { cart, removeFromCart, clearCart, toggleCart, total, updateQuantity } = useCart();
const { setCheckoutItems } = useCheckout();
const { show: showToast } = useToast();

const recommendations = ref([]);

let timeout = null;
watch(
  () => cart.items,
  (newItems) => {
    if (newItems.length > 0) {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        recommendations.value = await getCartRecommendations(newItems);
      }, 800);
    } else {
      recommendations.value = [];
    }
  },
  { deep: true, immediate: true }
);

const goCheckout = () => {
  if (!cart.items.length) {
    showToast('购物车为空', 'warning');
    return;
  }

  setCheckoutItems(cart.items, 'cart');
  toggleCart();
  router.push('/checkout');
};

const formatPrice = (value) => `¥${Number(value || 0).toFixed(2)}`;
</script>

<template>
  <div v-if="cart.isOpen" class="fixed inset-0 z-[9999] overflow-hidden">
    <div class="absolute inset-0 bg-slate-50 dark:bg-black/40 backdrop-blur-sm transition-opacity" @click="toggleCart"></div>

    <div class="fixed inset-y-0 right-0 flex max-w-full">
      <div class="flex h-full w-screen max-w-md flex-col border-l border-slate-200 dark:border-white/10 bg-[#0b0b0d]/95 shadow-2xl backdrop-blur-2xl">
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-6 py-5">
          <h2 class="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
            购物车
            <span class="rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] px-2 py-0.5 text-xs text-slate-600 dark:text-white/60">
              {{ cart.items.length }}
            </span>
          </h2>
          <button
            type="button"
            class="rounded-full border border-slate-200 dark:border-white/10 p-2 text-slate-600 dark:text-white/60 transition hover:bg-slate-100 dark:bg-white/[0.06] hover:text-slate-900 dark:text-white"
            @click="toggleCart"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18 18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-5">
          <div v-if="cart.items.length === 0" class="flex h-full flex-col items-center justify-center text-center text-slate-500 dark:text-slate-600 dark:text-white/45">
            <div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]">
              <svg class="h-10 w-10 text-slate-600 dark:text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
              </svg>
            </div>
            <p class="text-base font-medium text-slate-600 dark:text-white/72">购物车还是空的</p>
            <button
              type="button"
              class="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
              @click="toggleCart"
            >
              去逛逛
            </button>
          </div>

          <div v-else class="space-y-3">
            <article
              v-for="(item, index) in cart.items"
              :key="item.lineKey || `${item.id}-${index}`"
              class="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4"
            >
              <div class="flex gap-3">
                <div class="h-20 w-20 overflow-hidden rounded-xl bg-slate-50 dark:bg-black/30">
                  <img :src="item.img || item.image" :alt="item.name || item.title" class="h-full w-full object-cover">
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-3">
                    <h3 class="truncate text-sm font-semibold text-slate-900 dark:text-white">{{ item.name || item.title }}</h3>
                    <button
                      type="button"
                      class="rounded-full p-1 text-slate-400 dark:text-slate-600 dark:text-white/35 transition hover:bg-slate-100 dark:bg-white/[0.06] hover:text-red-300"
                      @click="removeFromCart(index)"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18 18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>

                  <p v-if="item.skuName" class="mt-2 text-xs text-slate-600 dark:text-white/55">规格：{{ item.skuName }}</p>
                  <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{{ formatPrice((item.price || 0) * (item.quantity || 1)) }}</p>

                  <div class="mt-3 inline-flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 px-2 py-1">
                    <button type="button" class="h-6 w-6 text-slate-600 dark:text-slate-600 dark:text-white/65 transition hover:text-slate-900 dark:text-white" @click="updateQuantity(index, -1)">-</button>
                    <span class="w-5 text-center text-sm text-slate-900 dark:text-white">{{ item.quantity || 1 }}</span>
                    <button type="button" class="h-6 w-6 text-slate-600 dark:text-slate-600 dark:text-white/65 transition hover:text-slate-900 dark:text-white" @click="updateQuantity(index, 1)">+</button>
                  </div>
                </div>
              </div>
            </article>

            <section v-if="recommendations.length" class="mt-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-600 dark:text-white/45">AI 推荐</p>
              <div class="mt-3 space-y-2">
                <p v-for="(recommend, idx) in recommendations.slice(0, 3)" :key="idx" class="text-sm leading-6 text-slate-600 dark:text-slate-600 dark:text-white/65">
                  {{ recommend }}
                </p>
              </div>
            </section>
          </div>
        </div>

        <div class="border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-5 py-5">
          <div class="mb-4 flex items-end justify-between">
            <span class="text-sm text-slate-600 dark:text-white/55">合计 ({{ cart.items.length }} 件)</span>
            <span class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ formatPrice(total) }}</span>
          </div>

          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-600 dark:text-white/65 transition hover:bg-white/[0.05]"
              :disabled="!cart.items.length"
              @click="clearCart"
            >
              清空
            </button>
            <button
              type="button"
              class="flex-[1.4] rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
              :disabled="!cart.items.length"
              @click="goCheckout"
            >
              去结账
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
