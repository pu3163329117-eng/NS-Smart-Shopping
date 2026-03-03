<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useCart } from '../store/cart';
import { useFavorites } from '../store/favorites';
import { useAuth } from '../store/auth';
import { useUserProfile } from '../store/userProfile';
import SearchModal from './SearchModal.vue';

const { locale } = useI18n();
const { cart, toggleCart } = useCart();
const { favorites, toggleFavoritesDrawer } = useFavorites();
const { auth } = useAuth();
const { userProfile } = useUserProfile();
const router = useRouter();
const route = useRoute();

const isMenuOpen = ref(false);
const isSearchOpen = ref(false);
const isScrolled = ref(false);

const navItems = [
  { label: '首页', path: '/', action: () => router.push('/') },
  { label: '商城', path: '/market', action: () => router.push('/market') },
  { label: '社区', path: '/social', action: () => router.push('/social') },
  { label: '众筹', path: '/crowdfunding', action: () => router.push('/crowdfunding') },
  { label: 'AI Lab', path: '/ai-lab', action: () => router.push('/ai-lab') },
  { label: '关于', path: '/about', action: () => router.push('/about') }
];

const isHomeRoute = computed(() => route.path === '/');

const isHeroTransparent = computed(() => {
  return isHomeRoute.value && !isScrolled.value && !isMenuOpen.value && !isSearchOpen.value;
});

const shellClasses = computed(() => {
  if (isHeroTransparent.value) {
    return 'bg-transparent border-transparent shadow-none';
  }

  return 'bg-[rgba(8,8,10,0.72)] border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-2xl';
});

const baseTextClass = computed(() => (isHeroTransparent.value ? 'text-white' : 'text-slate-100'));
const mutedTextClass = computed(() => (isHeroTransparent.value ? 'text-white/72' : 'text-slate-300'));
const iconHoverClass = computed(() => (isHeroTransparent.value ? 'hover:bg-white/10' : 'hover:bg-white/5'));

const updateScrollState = () => {
  isScrolled.value = window.scrollY > 18;
};

const isActive = (path) => {
  if (path === '/') {
    return route.path === '/';
  }

  return route.path.startsWith(path);
};

const closeOverlays = () => {
  isMenuOpen.value = false;
};

const openSearch = () => {
  isSearchOpen.value = true;
  isMenuOpen.value = false;
};

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const toggleLanguage = () => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh';
};

const go = (action) => {
  isMenuOpen.value = false;
  action();
};

const goLogin = () => {
  isMenuOpen.value = false;
  router.push('/login');
};

const goProfile = () => {
  isMenuOpen.value = false;
  router.push('/profile');
};

watch(
  () => route.fullPath,
  () => {
    closeOverlays();
    updateScrollState();
  }
);

onMounted(() => {
  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateScrollState);
});
</script>

<template>
  <nav class="fixed left-0 top-0 z-50 w-full">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        class="mt-3 rounded-3xl border transition-all duration-500"
        :class="shellClasses"
      >
        <div class="pointer-events-none absolute left-0 right-0 top-[4.85rem] h-8 bg-gradient-to-b from-white/8 to-transparent blur-2xl" v-if="isHeroTransparent"></div>

        <div class="flex h-16 items-center justify-between px-4 sm:px-5">
          <div class="flex items-center gap-3 md:hidden">
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full transition"
              :class="[baseTextClass, iconHoverClass]"
              @click="toggleMenu"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  v-if="!isMenuOpen"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                  d="M4 7h16M4 12h16M4 17h16"
                />
                <path
                  v-else
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <button
            type="button"
            class="flex items-center gap-3"
            @click="go(navItems[0].action)"
          >
            <span class="text-xs font-semibold uppercase tracking-[0.42em]" :class="mutedTextClass">NS</span>
            <span class="text-base font-semibold tracking-[-0.03em]" :class="baseTextClass">Smart Shopping</span>
          </button>

          <div class="hidden items-center gap-1 md:flex">
            <button
              v-for="item in navItems"
              :key="item.path"
              type="button"
              class="rounded-full px-4 py-2 text-sm font-medium transition"
              :class="
                isActive(item.path)
                  ? 'bg-white/10 text-white'
                  : `${mutedTextClass} hover:bg-white/5 hover:text-white`
              "
              @click="go(item.action)"
            >
              {{ item.label }}
            </button>
          </div>

          <div class="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition"
              :class="[baseTextClass, iconHoverClass]"
              @click="toggleLanguage"
              title="切换语言"
            >
              {{ locale === 'zh' ? 'EN' : '中' }}
            </button>

            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full transition"
              :class="[baseTextClass, iconHoverClass]"
              title="搜索"
              @click="openSearch"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-4.35-4.35m1.85-4.65a6.5 6.5 0 11-13 0a6.5 6.5 0 0113 0z" />
              </svg>
            </button>

            <button
              type="button"
              class="relative inline-flex h-10 w-10 items-center justify-center rounded-full transition"
              :class="[baseTextClass, iconHoverClass]"
              title="收藏"
              @click="toggleFavoritesDrawer"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span
                v-if="favorites.items.length > 0"
                class="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold text-black"
              >
                {{ favorites.items.length }}
              </span>
            </button>

            <button
              type="button"
              class="relative inline-flex h-10 w-10 items-center justify-center rounded-full transition"
              :class="[baseTextClass, iconHoverClass]"
              title="购物车"
              @click="toggleCart"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11H4L5 9z" />
              </svg>
              <span
                v-if="cart.items.length > 0"
                class="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold text-black"
              >
                {{ cart.items.length }}
              </span>
            </button>

            <!-- Unified Profile / Login Icon -->
            <button
              type="button"
              class="relative inline-flex h-10 w-10 items-center justify-center rounded-full transition"
              :class="[baseTextClass, iconHoverClass]"
              title="个人中心"
              @click="auth.isAuthenticated ? goProfile() : goLogin()"
            >
              <template v-if="auth.isAuthenticated && userProfile?.userInfo?.avatar">
                <img
                  :src="userProfile.userInfo.avatar"
                  alt="avatar"
                  class="h-7 w-7 rounded-full border border-white/20 object-cover"
                />
              </template>
              <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          </div>
        </div>

        <div
          v-show="isMenuOpen"
          class="border-t border-white/10 px-4 pb-4 pt-3 md:hidden"
          :class="isHeroTransparent ? 'bg-black/50 backdrop-blur-2xl' : 'bg-transparent'"
        >
          <button
            type="button"
            class="mb-3 flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm"
            :class="mutedTextClass"
            @click="openSearch"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-4.35-4.35m1.85-4.65a6.5 6.5 0 11-13 0a6.5 6.5 0 0113 0z" />
            </svg>
            搜索商品
          </button>

          <div class="space-y-1">
            <button
              v-for="item in navItems"
              :key="`mobile-${item.path}`"
              type="button"
              class="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition"
              :class="
                isActive(item.path)
                  ? 'bg-white/10 text-white'
                  : `${mutedTextClass} hover:bg-white/5 hover:text-white`
              "
              @click="go(item.action)"
            >
              {{ item.label }}
            </button>
          </div>

          <div class="mt-3 border-t border-white/10 pt-3">
            <button
              v-if="auth.isAuthenticated"
              type="button"
              class="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-white/5"
              @click="goProfile"
            >
              <img
                v-if="userProfile?.userInfo?.avatar"
                :src="userProfile.userInfo.avatar"
                alt="avatar"
                class="h-8 w-8 rounded-full border border-white/10 object-cover"
              />
              <span class="text-sm font-medium" :class="baseTextClass">{{ userProfile?.userInfo?.name || '个人主页' }}</span>
            </button>
            <button
              v-else
              type="button"
              class="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition hover:bg-white/5"
              :class="baseTextClass"
              @click="goLogin"
            >
              登录
            </button>
          </div>
        </div>
      </div>
    </div>

    <SearchModal :is-open="isSearchOpen" @close="isSearchOpen = false" />
  </nav>
</template>
