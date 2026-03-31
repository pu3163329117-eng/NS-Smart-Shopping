<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const menuItems = computed(() => [
  { key: 'dashboard', label: t('profile.maker.dashboard'), path: '/maker/dashboard' },
  { key: 'services', label: t('profile.maker.services'), path: '/maker/services' },
  { key: 'orders', label: t('profile.maker.orders'), path: '/maker/orders' },
  { key: 'wallet', label: t('profile.maker.wallet'), path: '/maker/wallet' }
]);

const isActive = (path) => route.path === path || route.path.startsWith(`${path}/`);
</script>

<template>
  <div class="maker-shell relative min-h-screen overflow-x-clip pb-12 pt-20 text-white">
    <div class="pointer-events-none absolute -left-40 -top-24 h-[420px] w-[420px] rounded-full bg-indigo-500/18 blur-[120px]"></div>
    <div class="pointer-events-none absolute right-[-180px] top-16 h-[420px] w-[420px] rounded-full bg-cyan-500/12 blur-[120px]"></div>
    <div class="pointer-events-none absolute bottom-[-180px] left-[25%] h-[460px] w-[460px] rounded-full bg-emerald-500/10 blur-[130px]"></div>

    <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside class="maker-glass h-fit rounded-[2rem] p-4 lg:sticky lg:top-24">
          <div class="mb-5 rounded-[1.5rem] bg-white/[0.03] p-5">
            <p class="text-[10px] uppercase tracking-[0.22em] text-white/45">{{ t('profile.maker.heading') }}</p>
            <p class="mt-3 text-xl font-semibold tracking-tight text-white">{{ t('maker.welcome', { name: 'Maker' }) }}</p>
            <p class="mt-2 text-sm leading-6 text-white/58">{{ t('maker.subtitle') }}</p>
          </div>

          <nav class="space-y-2">
            <button
              v-for="item in menuItems"
              :key="item.key"
              type="button"
              class="maker-nav-btn w-full px-4 py-3 text-left text-sm font-medium tracking-wide"
              :class="isActive(item.path) ? 'maker-nav-btn-active' : 'text-white/62 hover:text-white'"
              @click="router.push(item.path)"
            >
              {{ item.label }}
            </button>
          </nav>

          <button
            type="button"
            class="maker-nav-btn mt-5 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm text-white/70 hover:text-white"
            @click="router.push('/market')"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 6 4 12l6 6m-5-6h15" />
            </svg>
            {{ t('nav.market') }}
          </button>
        </aside>

        <main class="maker-main min-w-0 rounded-[2rem] p-2 sm:p-3">
          <router-view />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.maker-shell {
  background:
    radial-gradient(circle at 18% 14%, rgba(255, 255, 255, 0.08), transparent 42%),
    radial-gradient(circle at 84% 8%, rgba(56, 189, 248, 0.08), transparent 34%),
    linear-gradient(180deg, #08090d 0%, #050506 68%, #050505 100%);
}

.maker-glass {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(24px);
  box-shadow:
    0 14px 44px rgba(0, 0, 0, 0.42),
    inset 0 1px 1px rgba(255, 255, 255, 0.08);
}

.maker-main {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(24px);
  box-shadow:
    0 16px 46px rgba(0, 0, 0, 0.4),
    inset 0 1px 1px rgba(255, 255, 255, 0.08);
}

.maker-nav-btn {
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(16px);
  transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease, background-color 0.24s ease;
}

.maker-nav-btn:hover {
  transform: scale(1.02);
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow:
    0 0 30px rgba(255, 255, 255, 0.1),
    0 14px 30px rgba(0, 0, 0, 0.36);
}

.maker-nav-btn-active {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 30px rgba(255, 255, 255, 0.12),
    0 14px 34px rgba(0, 0, 0, 0.38);
}

.maker-main :deep(.border-slate-200),
.maker-main :deep(.border-slate-300),
.maker-main :deep(.border-slate-100),
.maker-main :deep(.border-gray-200),
.maker-main :deep(.border-gray-100) {
  border-color: rgba(255, 255, 255, 0.08) !important;
}

.maker-main :deep(.bg-white),
.maker-main :deep(.bg-white\/90),
.maker-main :deep(.bg-slate-50),
.maker-main :deep(.bg-gray-50),
.maker-main :deep(.dark\:bg-white\/\[0\.02\]),
.maker-main :deep(.dark\:bg-white\/\[0\.03\]) {
  background-color: rgba(255, 255, 255, 0.03) !important;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.maker-main :deep(.shadow-sm),
.maker-main :deep(.shadow-md) {
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.34),
    inset 0 1px 1px rgba(255, 255, 255, 0.06) !important;
}

.maker-main :deep(.text-slate-900),
.maker-main :deep(.text-slate-800),
.maker-main :deep(.text-gray-900),
.maker-main :deep(.text-gray-800) {
  color: rgba(255, 255, 255, 0.95) !important;
}

.maker-main :deep(.text-slate-600),
.maker-main :deep(.text-slate-500),
.maker-main :deep(.text-gray-600),
.maker-main :deep(.text-gray-500),
.maker-main :deep(.dark\:text-slate-400),
.maker-main :deep(.dark\:text-slate-500) {
  color: rgba(255, 255, 255, 0.58) !important;
}

.maker-main :deep(button.rounded-3xl),
.maker-main :deep(button.rounded-2xl) {
  transition: transform 0.24s ease, box-shadow 0.24s ease;
}

.maker-main :deep(button.rounded-3xl:hover),
.maker-main :deep(button.rounded-2xl:hover) {
  transform: scale(1.02);
  box-shadow:
    0 0 30px rgba(255, 255, 255, 0.1),
    0 18px 36px rgba(0, 0, 0, 0.38);
}
</style>
