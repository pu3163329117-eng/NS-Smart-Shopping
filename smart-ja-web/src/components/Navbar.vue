<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useCart } from '../store/cart';
import { useFavorites } from '../store/favorites';
import { useAuth } from '../store/auth';
import { useUserProfile } from '../store/userProfile';
import { useAppTheme } from '../store/appConfig';
import { NotificationsService } from '../services/api';
import SearchModal from './SearchModal.vue';

const { theme, toggleTheme } = useAppTheme();
const { locale, t } = useI18n();
const { cart, toggleCart } = useCart();
const { favorites, toggleFavoritesDrawer } = useFavorites();
const { auth } = useAuth();
const { userProfile } = useUserProfile();
const router = useRouter();
const route = useRoute();

const isMenuOpen = ref(false);
const isSearchOpen = ref(false);
const isScrolled = ref(false);
const unreadNotificationCount = ref(0);
const notificationTimer = ref(null);

const navItems = computed(() => {
  const items = [
    { labelKey: 'nav.home', path: '/', action: () => router.push('/') },
    { labelKey: 'nav.market', path: '/market', action: () => router.push('/market') },
    { labelKey: 'nav.social', path: '/social', action: () => router.push('/social') },
    { labelKey: 'nav.crowdfunding', path: '/crowdfunding', action: () => router.push('/crowdfunding') },
    { labelKey: 'nav.aiLab', path: '/ai-lab', action: () => router.push('/ai-lab') },
    { labelKey: 'nav.aiMentor', path: '/ailab', action: () => router.push('/ailab') }
  ];

  if (auth.isAuthenticated) {
    const user = auth.user;
    if (user && (user.isAdmin === true || user.role === 'admin')) {
      items.push({ labelKey: 'nav.dashboard', path: '/investor-dashboard', action: () => router.push('/investor-dashboard') });
    }
  }

  items.push({ labelKey: 'nav.about', path: '/about', action: () => router.push('/about') });
  return items;
});

const isHomeRoute = computed(() => route.path === '/');

const isHeroTransparent = computed(() =>
  isHomeRoute.value && !isScrolled.value && !isMenuOpen.value && !isSearchOpen.value
);

const shellClasses = computed(() => {
  if (isHeroTransparent.value) {
    return 'bg-transparent border-transparent shadow-none';
  }

  return 'bg-white/90 dark:bg-[#08080a]/70 border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-2xl';
});

const baseTextClass = computed(() =>
  isHeroTransparent.value ? 'text-white' : 'text-slate-900 dark:text-slate-100'
);
const mutedTextClass = computed(() =>
  isHeroTransparent.value ? 'text-white/80' : 'text-slate-600 dark:text-slate-300'
);
const iconHoverClass = computed(() =>
  isHeroTransparent.value ? 'hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'
);

const updateScrollState = () => {
  isScrolled.value = window.scrollY > 18;
};

const isActive = (path) => (path === '/' ? route.path === '/' : route.path.startsWith(path));

const closeOverlays = () => {
  isMenuOpen.value = false;
};

const openSearch = () => {
  isSearchOpen.value = true;
  isMenuOpen.value = false;
};

const closeSearch = () => {
  isSearchOpen.value = false;
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

const goNotifications = () => {
  isMenuOpen.value = false;
  if (!auth.isAuthenticated) {
    goLogin();
    return;
  }
  router.push('/gushi/notifications');
};

const stopNotificationPolling = () => {
  if (notificationTimer.value) {
    clearInterval(notificationTimer.value);
    notificationTimer.value = null;
  }
};

const loadUnreadNotifications = async () => {
  if (!auth.isAuthenticated) {
    unreadNotificationCount.value = 0;
    return;
  }
  try {
    const res = await NotificationsService.getMyNotifications({ limit: 1 });
    unreadNotificationCount.value = Number(res?.data?.unreadCount || 0);
  } catch (error) {
    // Keep silent to avoid noisy toast in global nav polling.
  }
};

const startNotificationPolling = async () => {
  stopNotificationPolling();
  if (!auth.isAuthenticated) return;
  await loadUnreadNotifications();
  notificationTimer.value = window.setInterval(() => {
    loadUnreadNotifications();
  }, 30000);
};

watch(
  () => route.fullPath,
  () => {
    closeOverlays();
    closeSearch();
    updateScrollState();
  }
);

watch(
  () => auth.isAuthenticated,
  async (isAuthed) => {
    if (!isAuthed) {
      unreadNotificationCount.value = 0;
      stopNotificationPolling();
      return;
    }
    await startNotificationPolling();
  },
  { immediate: true }
);

onMounted(() => {
  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });
  startNotificationPolling();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateScrollState);
  stopNotificationPolling();
});
</script>

<template>
  <nav class="fixed left-0 top-0 z-50 w-full">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mt-3 rounded-3xl border transition-all duration-500" :class="shellClasses">
        <div
          v-if="isHeroTransparent"
          class="pointer-events-none absolute left-0 right-0 top-[4.85rem] h-8 bg-gradient-to-b from-white/8 to-transparent blur-2xl"
        ></div>

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

          <button type="button" class="flex items-center gap-3" @click="go(navItems[0].action)">
            <span class="text-xs font-semibold uppercase tracking-[0.42em]" :class="mutedTextClass">NS</span>
            <span class="text-base font-semibold tracking-[-0.03em]" :class="baseTextClass">{{ $t('nav.brand') }}</span>
          </button>

          <div class="hidden items-center gap-1 md:flex">
            <button
              v-for="item in navItems"
              :key="item.path"
              type="button"
              class="rounded-full px-4 py-2 text-sm font-medium transition"
              :class="[
                isActive(item.path)
                  ? (isHeroTransparent ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white')
                  : `${mutedTextClass} hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white`,
                item.path === '/ai-lab' ? 'relative overflow-hidden group border border-transparent hover:border-indigo-500/30 dark:hover:border-indigo-400/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] dark:hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]' : ''
              ]"
              @click="go(item.action)"
            >
              <span
                v-if="item.path === '/ai-lab'"
                class="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 transition duration-300 group-hover:opacity-100"
              ></span>
              <span
                class="relative z-10 flex items-center gap-1.5"
                :class="item.path === '/ai-lab' ? 'bg-clip-text font-bold group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:to-purple-500 dark:group-hover:from-indigo-400 dark:group-hover:to-purple-400' : ''"
              >
                <svg
                  v-if="item.path === '/ai-lab'"
                  class="h-3.5 w-3.5 animate-pulse text-indigo-500 dark:text-indigo-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 1.6l-5.3 7.5a1.5 1.5 0 00.5 2.3l1.4.7.5 2.4a.6.6 0 001 .3l3.1-3.5a.6.6 0 01.7-.1l2.8 1.2a1.5 1.5 0 002-1.8L11.5 1.6a.8.8 0 00-1.5 0z" />
                </svg>
                {{ t(item.labelKey) }}
              </span>
            </button>
          </div>

          <div class="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full transition"
              :class="[baseTextClass, iconHoverClass]"
              :title="$t('nav.toggleTheme')"
              @click="toggleTheme"
            >
              <svg v-if="theme === 'dark'" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>

            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition"
              :class="[baseTextClass, iconHoverClass]"
              :title="$t('nav.toggleLanguage')"
              @click="toggleLanguage"
            >
              <span class="text-xs">{{ locale === 'zh' ? 'EN' : '中文' }}</span>
            </button>

            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full transition"
              :class="[baseTextClass, iconHoverClass]"
              :title="$t('nav.search')"
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
              :title="$t('nav.favorites')"
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
              :title="$t('nav.cart')"
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

            <button
              type="button"
              class="relative inline-flex h-10 w-10 items-center justify-center rounded-full transition"
              :class="[baseTextClass, iconHoverClass]"
              :title="$t('gushi.notifications.bell')"
              @click="goNotifications"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span
                v-if="unreadNotificationCount > 0"
                class="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white"
              >
                {{ unreadNotificationCount > 99 ? '99+' : unreadNotificationCount }}
              </span>
            </button>

            <button
              type="button"
              class="relative inline-flex h-10 w-10 items-center justify-center rounded-full transition"
              :class="[baseTextClass, iconHoverClass]"
              :title="$t('nav.profile')"
              @click="auth.isAuthenticated ? goProfile() : goLogin()"
            >
              <template v-if="auth.isAuthenticated && userProfile?.userInfo?.avatar">
                <img
                  :src="userProfile.userInfo.avatar"
                  :alt="$t('nav.avatar')"
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
            {{ $t('nav.searchProducts') }}
          </button>

          <div class="space-y-1">
            <button
              v-for="item in navItems"
              :key="`mobile-${item.path}`"
              type="button"
              class="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition"
              :class="isActive(item.path) ? 'bg-white/10 text-white' : `${mutedTextClass} hover:bg-white/5 hover:text-white`"
              @click="go(item.action)"
            >
              {{ t(item.labelKey) }}
            </button>
            <button
              v-if="auth.isAuthenticated"
              type="button"
              class="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition"
              :class="route.path === '/gushi/notifications' ? 'bg-white/10 text-white' : `${mutedTextClass} hover:bg-white/5 hover:text-white`"
              @click="goNotifications"
            >
              {{ $t('gushi.notifications.bell') }}
            </button>
          </div>

          <div class="mt-3 border-t border-white/10 pt-3">
            <button
              v-if="auth.isAuthenticated"
              type="button"
              class="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-white/5"
              @click="goProfile"
            >
              <div class="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/5">
                <img
                  v-if="userProfile?.userInfo?.avatar"
                  :src="userProfile.userInfo.avatar"
                  :alt="$t('nav.avatar')"
                  class="h-full w-full object-cover"
                />
              </div>
              <div>
                <p class="text-sm font-medium text-white">{{ userProfile?.userInfo?.name || $t('nav.profile') }}</p>
                <p class="text-xs text-slate-500">{{ $t('nav.openProfile') }}</p>
              </div>
            </button>

            <button
              v-else
              type="button"
              class="block w-full rounded-2xl bg-white px-4 py-3 text-left text-sm font-semibold text-black transition hover:bg-slate-100"
              @click="goLogin"
            >
              {{ $t('nav.login') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <SearchModal :is-open="isSearchOpen" @close="closeSearch" />
  </nav>
</template>
