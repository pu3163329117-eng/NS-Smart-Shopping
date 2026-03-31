<script setup>
import { computed, nextTick, onBeforeUpdate, onMounted, onUnmounted, ref, watch } from 'vue';
import { gsap } from 'gsap';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useUserProfile } from '../store/userProfile';
import { useFavorites } from '../store/favorites';
import { useProducts } from '../store/products';
import { useToast } from '../composables/useToast';
import { UserService } from '../services/api';
import EditProfileModal from '../components/EditProfileModal.vue';
import PublishModal from '../components/PublishModal.vue';
import IncomeModal from '../components/IncomeModal.vue';
import OrderCenterModal from '../components/OrderCenterModal.vue';
import InteractionModal from '../components/InteractionModal.vue';
import WalletModal from '../components/WalletModal.vue';
import AddressModal from '../components/AddressModal.vue';
import SellerModal from '../components/SellerModal.vue';
import ActivityModal from '../components/ActivityModal.vue';
import ServiceModal from '../components/ServiceModal.vue';
import MakerDashboard from './maker/MakerDashboard.vue';
import MakerServices from './maker/MakerServices.vue';
import MakerOrders from './maker/MakerOrders.vue';
import MakerWallet from './maker/MakerWallet.vue';
import MakerProjects from './maker/MakerProjects.vue';

const { t } = useI18n();
const router = useRouter();
const { userProfile, fetchProfile, updateProfile, dailyCheckin } = useUserProfile();
const { favorites } = useFavorites();
const { products } = useProducts();
const { show: showToast } = useToast();

const heroRef = ref(null);
const revealRefs = ref([]);
const activeTab = ref('personal');
const currentMakerTab = ref('dashboard');
const currentOrderTab = ref('all');
const currentInteractionTab = ref('want');
const currentWalletTab = ref('balance');
const currentSellerTab = ref('personal');
const currentServiceTab = ref('help');
const isEditModalOpen = ref(false);
const isPublishModalOpen = ref(false);
const isIncomeModalOpen = ref(false);
const isOrderModalOpen = ref(false);
const isInteractionModalOpen = ref(false);
const isWalletModalOpen = ref(false);
const isAddressModalOpen = ref(false);
const isSellerModalOpen = ref(false);
const isActivityModalOpen = ref(false);
const isServiceModalOpen = ref(false);
const orderCounts = ref({ pendingPay: 0, pendingShip: 0, pendingRecv: 0 });
const shellRef = ref(null);
const sheenState = ref({ x: 50, y: 26 });
let sheenRaf = null;

const icons = {
  user: ['M15.75 6.75a3.75 3.75 0 1 1-7.5 0a3.75 3.75 0 0 1 7.5 0Z', 'M4.5 20.118a7.5 7.5 0 0 1 15 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.5-1.632Z'],
  grid: ['M3.75 4.5h6.75v6.75H3.75V4.5Z', 'M13.5 4.5h6.75v6.75H13.5V4.5Z', 'M3.75 14.25h6.75V21H3.75v-6.75Z', 'M13.5 14.25h6.75V21H13.5v-6.75Z'],
  wallet: ['M2.25 7.5A2.25 2.25 0 0 1 4.5 5.25h12.75A2.25 2.25 0 0 1 19.5 7.5v9A2.25 2.25 0 0 1 17.25 18.75H4.5A2.25 2.25 0 0 1 2.25 16.5v-9Z', 'M2.25 8.25h17.25'],
  receipt: ['M6.75 3.75h10.5A1.5 1.5 0 0 1 18.75 5.25v13.5l-2.25-1.5-2.25 1.5-2.25-1.5-2.25 1.5-2.25-1.5-2.25 1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z', 'M8.25 8.25h7.5', 'M8.25 11.25h7.5'],
  spark: ['M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z'],
  gear: ['M10.5 6h3l.53 1.585a1.5 1.5 0 0 0 1.424 1.025H17l.75 3-1.163.872a1.5 1.5 0 0 0-.6 1.2v.636a1.5 1.5 0 0 0 .6 1.2L17.75 16.5 17 19.5h-1.546a1.5 1.5 0 0 0-1.424 1.025L13.5 22.11h-3l-.53-1.585A1.5 1.5 0 0 0 8.546 19.5H7l-.75-3 1.163-.872a1.5 1.5 0 0 0 .6-1.2v-.636a1.5 1.5 0 0 0-.6-1.2L6.25 11.625 7 8.625h1.546a1.5 1.5 0 0 0 1.424-1.025L10.5 6Z'],
  chevron: ['M9 5.25 15.75 12 9 18.75']
};
const getIconPaths = (name) => icons[name] || icons.grid;
const setRevealRef = (el) => { if (el) revealRefs.value.push(el); };
onBeforeUpdate(() => { revealRefs.value = []; });

const formatCurrency = (value) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(Number(value || 0));
const displayName = computed(() => userProfile.userInfo.name || t('profile.defaults.guestName'));
const displaySign = computed(() => userProfile.userInfo.sign || t('profile.defaults.signature'));
const profileBackgroundUrl = computed(() => {
  const source = userProfile.userInfo.backgroundImage || userProfile.userInfo.avatar || '';
  if (!source || source === 'null' || source === 'undefined') return '';
  return String(source).replace(/"/g, '\\"');
});

const profileBackgroundStyle = computed(() => {
  if (profileBackgroundUrl.value) {
    return { backgroundImage: `url("${profileBackgroundUrl.value}")` };
  }
  return {};
});
const heroStats = computed(() => [
  { key: 'likes', value: userProfile.stats.likes, label: t('profile.hero.likes') },
  { key: 'following', value: userProfile.stats.following, label: t('profile.hero.following') },
  { key: 'followers', value: userProfile.stats.followers, label: t('profile.hero.followers') }
]);
const assetCards = computed(() => [
  { key: 'balance', icon: 'wallet', title: t('profile.overview.balance'), value: formatCurrency(userProfile.wallet.balance), action: () => openWallet('balance') },
  { key: 'points', icon: 'spark', title: t('profile.overview.points'), value: String(userProfile.wallet.points || 0), action: () => openWallet('points') },
  { key: 'coupons', icon: 'receipt', title: t('profile.overview.coupons'), value: String(userProfile.wallet.coupons || 0), action: () => openWallet('coupons') }
]);
const quickActions = computed(() => [
  { key: 'publish', title: t('profile.actions.publish'), body: t('profile.actions.publishBody') },
  { key: 'income', title: t('profile.actions.income'), body: t('profile.actions.incomeBody') },
  { key: 'activity', title: t('profile.actions.activity'), body: t('profile.actions.activityBody') },
  { key: 'seller', title: t('profile.actions.seller'), body: t('profile.actions.sellerBody') }
]);
const orderPanels = computed(() => [
  { key: 'pendingPay', count: orderCounts.value.pendingPay, label: t('profile.orders.pendingPay') },
  { key: 'pendingShip', count: orderCounts.value.pendingShip, label: t('profile.orders.pendingShip') },
  { key: 'pendingRecv', count: orderCounts.value.pendingRecv, label: t('profile.orders.pendingRecv') },
  { key: 'want', count: favorites.items.length, label: t('profile.interactions.want') }
]);
const makerTabs = computed(() => [
  { key: 'dashboard', label: t('profile.maker.dashboard') },
  { key: 'services', label: t('profile.maker.services') },
  { key: 'orders', label: t('profile.maker.orders') },
  { key: 'projects', label: t('profile.maker.projects') },
  { key: 'wallet', label: t('profile.maker.wallet') }
]);

const animateIn = async () => {
  await nextTick();
  if (heroRef.value) gsap.fromTo(heroRef.value, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out' });
  if (revealRefs.value.length) gsap.fromTo(revealRefs.value, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power3.out' });
};

const loadOrders = async () => {
  try {
    const orders = await UserService.getMyOrders();
    orderCounts.value = {
      pendingPay: orders.filter((item) => item.status === 'pending_payment').length,
      pendingShip: orders.filter((item) => item.status === 'pending_shipment').length,
      pendingRecv: orders.filter((item) => item.status === 'shipped').length
    };
  } catch (error) {
    console.error('Failed to fetch orders:', error);
  }
};

const openWallet = (tab) => { currentWalletTab.value = tab; isWalletModalOpen.value = true; };
const openOrderCenter = (tab = 'all') => { currentOrderTab.value = tab; isOrderModalOpen.value = true; };
const openInteraction = (tab) => { currentInteractionTab.value = tab; isInteractionModalOpen.value = true; };
const openSeller = (tab) => { currentSellerTab.value = tab; isSellerModalOpen.value = true; };

const handleQuickAction = (key) => {
  if (key === 'publish') isPublishModalOpen.value = true;
  else if (key === 'income') isIncomeModalOpen.value = true;
  else if (key === 'activity') isActivityModalOpen.value = true;
  else { openSeller('personal'); }
};

const handleCheckin = async () => {
  try {
    const result = await dailyCheckin();
    showToast(t('profile.feedback.checkinSuccess', { points: result?.award?.points ?? 0, exp: result?.award?.exp ?? 0 }), 'success');
  } catch (error) {
    showToast(error?.response?.status === 400 ? t('profile.feedback.checkinAlready') : t('profile.feedback.checkinFailed'), error?.response?.status === 400 ? 'info' : 'error');
  }
};

const handleSaveProfile = async (data) => {
  const success = await updateProfile(data);
  showToast(t(success ? 'profile.feedback.profileUpdated' : 'profile.feedback.profileUpdateFailed'), success ? 'success' : 'error');
  if (success) isEditModalOpen.value = false;
};

const handlePublishSelect = (type) => {
  isPublishModalOpen.value = false;
  showToast(t('profile.feedback.publishSelected', { type: type.name || type.id || '' }), 'success');
};

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

const resetShellSheen = () => {
  scheduleSheenUpdate(50, 26);
};

watch(activeTab, animateIn);

onMounted(async () => {
  await fetchProfile();
  if (userProfile.userInfo.name === 'Guest') showToast(t('profile.feedback.sessionExpired'), 'warning');
  await loadOrders();
  await animateIn();
  applySheen(sheenState.value.x, sheenState.value.y);
});

onUnmounted(() => {
  if (sheenRaf) {
    cancelAnimationFrame(sheenRaf);
    sheenRaf = null;
  }
});
</script>

<template>
  <div ref="shellRef" class="profile-shell min-h-screen overflow-x-clip overflow-y-hidden pb-24 text-slate-900 dark:text-white" @pointermove="handleShellPointerMove" @pointerleave="resetShellSheen">
    <div class="profile-bg" :style="profileBackgroundStyle" aria-hidden="true"></div>
    <div class="profile-backdrop" aria-hidden="true"></div>
    <div class="profile-rings" aria-hidden="true"></div>

    <div class="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-24 sm:px-8">
      <section ref="heroRef" class="liquid-panel rounded-[2rem] p-6 sm:p-8">
        <div class="flex flex-col gap-8 lg:flex-row lg:justify-between">
          <div class="flex flex-1 flex-col gap-6">
            <div class="flex items-center justify-between">
              <button class="liquid-pill rounded-full px-4 py-2 text-xs tracking-[0.22em] text-slate-600 dark:text-white/70" @click="isEditModalOpen = true">{{ $t('profile.hero.editProfile') }}</button>
              <button class="liquid-pill rounded-full p-3 text-slate-300" @click="router.push('/settings')">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path v-for="(path, index) in getIconPaths('gear')" :key="index" :d="path" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></svg>
              </button>
            </div>
            <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
              <img :src="userProfile.userInfo.avatar" class="h-24 w-24 rounded-[1.4rem] border border-slate-200 dark:border-slate-200 dark:border-white/20 bg-slate-200 dark:bg-slate-200 dark:bg-white/[0.08] object-cover shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
              <div class="flex-1">
                <div class="flex flex-wrap items-center gap-3">
                  <h1 class="text-4xl font-medium tracking-tighter sm:text-6xl">{{ displayName }}</h1>
                  <span class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-600 dark:text-white/70">{{ $t('profile.hero.level') }} {{ userProfile.userInfo.level }}</span>
                </div>
                <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-white/58">{{ displaySign }}</p>
                <div class="mt-5 grid grid-cols-3 gap-4 sm:max-w-lg">
                  <div v-for="item in heroStats" :key="item.key">
                    <p class="text-3xl font-medium tracking-tighter sm:text-4xl">{{ item.value }}</p>
                    <p class="mt-1 text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 dark:text-white/52">{{ item.label }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="liquid-tile w-full max-w-xl rounded-[1.6rem] p-6">
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 dark:text-white/52">{{ $t('profile.hero.walletFocus') }}</p>
            <p class="mt-4 text-5xl font-medium tracking-tighter sm:text-6xl">{{ formatCurrency(userProfile.wallet.balance) }}</p>
            <div class="mt-8 flex flex-wrap gap-3">
              <button class="liquid-pill rounded-full px-4 py-2 text-xs tracking-[0.2em] text-slate-600 dark:text-white/70" @click="handleCheckin">{{ $t('profile.hero.checkIn') }}</button>
              <button class="liquid-pill rounded-full px-4 py-2 text-xs tracking-[0.2em] text-slate-600 dark:text-white/70" @click="router.push('/wallet')">{{ $t('profile.hero.openWallet') }}</button>
            </div>
          </div>
        </div>
      </section>

      <section :ref="setRevealRef" class="liquid-surface mt-5 grid gap-3 rounded-[1.6rem] p-2 sm:grid-cols-2">
        <button class="rounded-[1.2rem] px-4 py-4 text-sm font-medium transition" :class="activeTab === 'personal' ? 'bg-white text-black' : 'text-slate-600 dark:text-white/55 hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04]'" @click="activeTab = 'personal'">{{ $t('profile.tabs.personal') }}</button>
        <button class="rounded-[1.2rem] px-4 py-4 text-sm font-medium transition" :class="activeTab === 'maker' ? 'bg-white text-black' : 'text-slate-600 dark:text-white/55 hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04]'" @click="activeTab = 'maker'">{{ $t('profile.tabs.maker') }}</button>
      </section>

      <template v-if="activeTab === 'personal'">
        <section :ref="setRevealRef" class="mt-5 grid gap-4 lg:grid-cols-3">
          <button v-for="card in assetCards" :key="card.key" class="liquid-panel rounded-[1.6rem] p-6 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.1]" @click="card.action()">
            <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path v-for="(path, index) in getIconPaths(card.icon)" :key="`${card.key}-${index}`" :d="path" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></svg>
            <p class="mt-5 text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-white/50">{{ card.title }}</p>
            <p class="mt-3 text-5xl font-medium tracking-tighter">{{ card.value }}</p>
          </button>
        </section>

        <section :ref="setRevealRef" class="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div class="liquid-panel rounded-[1.6rem] p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-white/50">{{ $t('profile.orders.heading') }}</p>
                <h2 class="mt-3 text-3xl font-medium tracking-tight">{{ $t('profile.orders.subtitle') }}</h2>
              </div>
              <button class="liquid-pill rounded-full px-4 py-2 text-xs tracking-[0.2em] text-slate-600 dark:text-white/70" @click="openOrderCenter('all')">{{ $t('profile.orders.viewAll') }}</button>
            </div>
            <div class="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button v-for="item in orderPanels" :key="item.key" class="liquid-tile rounded-[1.2rem] p-4 text-left transition hover:-translate-y-0.5" @click="item.key === 'want' ? openInteraction('want') : openOrderCenter(item.key)">
                <p class="text-4xl font-medium tracking-tighter">{{ item.count }}</p>
                <p class="mt-2 text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-white/50">{{ item.label }}</p>
              </button>
            </div>
          </div>

          <div class="liquid-panel rounded-[1.6rem] p-6">
            <p class="text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-white/50">{{ $t('profile.actions.heading') }}</p>
            <h2 class="mt-3 text-3xl font-medium tracking-tight">{{ $t('profile.actions.subtitle') }}</h2>
            <div class="mt-8 grid gap-3 sm:grid-cols-2">
              <button v-for="item in quickActions" :key="item.key" class="liquid-tile rounded-[1.2rem] p-4 text-left transition hover:-translate-y-0.5" @click="handleQuickAction(item.key)">
                <p class="text-lg font-medium tracking-tight">{{ item.title }}</p>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/58">{{ item.body }}</p>
              </button>
            </div>
            <div class="mt-6 grid gap-3 sm:grid-cols-2">
              <button class="liquid-tile rounded-[1.2rem] p-4 text-left transition hover:-translate-y-0.5" @click="isAddressModalOpen = true">
                <p class="text-lg font-medium tracking-tight">{{ $t('profile.services.address') }}</p>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/58">{{ $t('profile.services.addressBody') }}</p>
              </button>
              <button class="liquid-tile rounded-[1.2rem] p-4 text-left transition hover:-translate-y-0.5" @click="currentServiceTab = 'contact'; isServiceModalOpen = true">
                <p class="text-lg font-medium tracking-tight">{{ $t('profile.services.support') }}</p>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/58">{{ $t('profile.services.supportBody') }}</p>
              </button>
            </div>
          </div>
        </section>

        <section :ref="setRevealRef" class="liquid-panel mt-5 rounded-[1.6rem] p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-white/50">{{ $t('profile.recommendations.heading') }}</p>
              <h2 class="mt-3 text-3xl font-medium tracking-tight">{{ $t('profile.recommendations.subtitle') }}</h2>
            </div>
            <button class="liquid-pill rounded-full px-4 py-2 text-xs tracking-[0.2em] text-slate-600 dark:text-white/70" @click="router.push('/market')">{{ $t('profile.recommendations.explore') }}</button>
          </div>
          <div class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <button v-for="product in products.slice(0, 4)" :key="product.id" class="liquid-tile overflow-hidden rounded-[1.2rem] text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(5,8,20,0.55)]" @click="router.push(`/product/${product.id}`)">
              <div class="aspect-[4/5] overflow-hidden border-b border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20"><img :src="product.img" class="h-full w-full object-cover opacity-90 transition duration-500 hover:scale-[1.02]"></div>
              <div class="p-4">
                <p class="text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/50">{{ product.company || $t('profile.recommendations.creator') }}</p>
                <h3 class="mt-2 line-clamp-2 text-lg font-medium tracking-tight">{{ product.name }}</h3>
                <p class="mt-4 text-2xl font-medium tracking-tight">{{ formatCurrency(product.price) }}</p>
              </div>
            </button>
          </div>
        </section>
      </template>

      <template v-else>
        <section :ref="setRevealRef" class="mt-5 grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside class="space-y-5">
            <div class="liquid-panel rounded-[1.6rem] p-6">
              <p class="text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-white/50">{{ $t('profile.maker.heading') }}</p>
              <p class="mt-4 text-3xl font-medium tracking-tight">{{ displayName }}</p>
              <p class="mt-2 text-xs uppercase tracking-[0.22em] text-slate-600 dark:text-white/55">{{ $t('profile.maker.level') }} {{ userProfile.userInfo.level }}</p>
            </div>
            <nav class="liquid-surface rounded-[1.6rem] p-2">
              <button v-for="item in makerTabs" :key="item.key" class="mb-1 w-full rounded-[1rem] px-4 py-3 text-left text-sm font-medium transition last:mb-0" :class="currentMakerTab === item.key ? 'bg-white text-black' : 'text-slate-600 dark:text-white/55 hover:bg-slate-100 dark:bg-slate-100 dark:bg-white/[0.04]'" @click="currentMakerTab = item.key">{{ item.label }}</button>
            </nav>
          </aside>
          <div class="maker-frame liquid-panel min-w-0 rounded-[1.6rem] p-3">
            <Transition name="fade" mode="out-in">
              <MakerDashboard v-if="currentMakerTab === 'dashboard'" />
              <MakerServices v-else-if="currentMakerTab === 'services'" />
              <MakerOrders v-else-if="currentMakerTab === 'orders'" />
              <MakerProjects v-else-if="currentMakerTab === 'projects'" />
              <MakerWallet v-else-if="currentMakerTab === 'wallet'" />
            </Transition>
          </div>
        </section>
      </template>

      <EditProfileModal :isOpen="isEditModalOpen" :initialData="userProfile.userInfo" @close="isEditModalOpen = false" @save="handleSaveProfile" />
      <PublishModal :isOpen="isPublishModalOpen" @close="isPublishModalOpen = false" @select="handlePublishSelect" />
      <IncomeModal :show="isIncomeModalOpen" @close="isIncomeModalOpen = false" />
      <OrderCenterModal :show="isOrderModalOpen" :initialTab="currentOrderTab" @close="isOrderModalOpen = false" />
      <InteractionModal :show="isInteractionModalOpen" :initialTab="currentInteractionTab" @close="isInteractionModalOpen = false" />
      <WalletModal :show="isWalletModalOpen" :initialTab="currentWalletTab" @close="isWalletModalOpen = false" />
      <AddressModal :show="isAddressModalOpen" @close="isAddressModalOpen = false" />
      <SellerModal :show="isSellerModalOpen" :initialTab="currentSellerTab" @close="isSellerModalOpen = false" />
      <ActivityModal :show="isActivityModalOpen" @close="isActivityModalOpen = false" />
      <ServiceModal :show="isServiceModalOpen" :initialTab="currentServiceTab" @close="isServiceModalOpen = false" />
    </div>
  </div>
</template>

<style scoped>
.profile-shell {
  position: relative;
  background: #07080b;
  --glass-x: 50%;
  --glass-y: 26%;
}

.profile-bg,
.profile-backdrop,
.profile-rings {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.profile-bg {
  background-image: radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.1), transparent 44%), linear-gradient(135deg, #10131a 0%, #07080b 55%, #050506 100%);
  background-size: cover;
  background-position: center;
  opacity: 0.5;
  transform: scale(1.06);
  filter: saturate(1.12) contrast(1.04);
}

.profile-backdrop {
  background:
    radial-gradient(circle at 17% 14%, rgba(255, 255, 255, 0.12), transparent 45%),
    radial-gradient(circle at 85% 10%, rgba(125, 140, 255, 0.12), transparent 38%),
    linear-gradient(180deg, rgba(6, 8, 12, 0.42) 0%, rgba(6, 7, 10, 0.78) 60%, rgba(6, 7, 10, 0.9) 100%);
}

.profile-rings {
  opacity: 0.5;
  background:
    radial-gradient(40rem 40rem at 84% 12%, rgba(255, 255, 255, 0.08), transparent 72%),
    radial-gradient(32rem 32rem at 14% 20%, rgba(175, 190, 255, 0.08), transparent 72%);
}

.liquid-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(130deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 42%, rgba(255, 255, 255, 0.02) 100%);
  box-shadow:
    0 20px 56px rgba(0, 0, 0, 0.46),
    inset 0 1px 1px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(28px) saturate(150%);
  -webkit-backdrop-filter: blur(28px) saturate(150%);
  transition: border-color 0.28s ease, box-shadow 0.28s ease, background-color 0.28s ease;
}

.liquid-surface {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.3),
    inset 0 1px 1px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px) saturate(138%);
  -webkit-backdrop-filter: blur(24px) saturate(138%);
  transition: border-color 0.28s ease, box-shadow 0.28s ease, background-color 0.28s ease;
}

.liquid-tile {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.34),
    inset 0 1px 1px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(22px) saturate(132%);
  -webkit-backdrop-filter: blur(22px) saturate(132%);
  transition: transform 0.26s ease, box-shadow 0.26s ease, border-color 0.26s ease;
}

.liquid-pill {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px) saturate(130%);
  -webkit-backdrop-filter: blur(18px) saturate(130%);
  transition: background-color 0.25s ease, border-color 0.25s ease;
}

.liquid-pill:hover {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.14);
}

.liquid-panel::before,
.liquid-surface::before,
.liquid-tile::before,
.liquid-pill::before {
  content: '';
  position: absolute;
  inset: -34%;
  pointer-events: none;
  background: radial-gradient(circle at var(--glass-x) var(--glass-y), rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.11) 22%, transparent 58%);
  opacity: 0.24;
  transition: opacity 0.4s ease;
}

.liquid-panel:hover::before,
.liquid-surface:hover::before,
.liquid-tile:hover::before,
.liquid-pill:hover::before {
  opacity: 0.36;
}

.liquid-panel::after,
.liquid-surface::after,
.liquid-tile::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 36%);
  opacity: 0.16;
}

.liquid-tile:hover {
  transform: scale(1.02);
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.48),
    0 0 30px rgba(255, 255, 255, 0.1),
    inset 0 1px 1px rgba(255, 255, 255, 0.12);
}

:global(html:not(.dark)) .profile-shell {
  background: #f7f9fd;
}

:global(html:not(.dark)) .profile-bg {
  opacity: 0.82;
  filter: saturate(1.02) contrast(1.02) brightness(1.12);
}

:global(html:not(.dark)) .profile-backdrop {
  background:
    radial-gradient(circle at 17% 14%, rgba(255, 255, 255, 0.28), transparent 45%),
    radial-gradient(circle at 85% 10%, rgba(99, 102, 241, 0.06), transparent 38%),
    linear-gradient(180deg, rgba(247, 249, 253, 0.04) 0%, rgba(242, 246, 252, 0.18) 60%, rgba(236, 242, 250, 0.32) 100%);
}

:global(html:not(.dark)) .profile-shell .liquid-panel {
  border-color: rgba(15, 23, 42, 0.1);
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.86) 35%, rgba(255, 255, 255, 0.72) 100%);
  box-shadow:
    0 18px 34px rgba(15, 23, 42, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -1px 0 rgba(255, 255, 255, 0.74);
}

:global(html:not(.dark)) .profile-shell .liquid-surface {
  border-color: rgba(15, 23, 42, 0.1);
  background: rgba(255, 255, 255, 0.84);
}

:global(html:not(.dark)) .profile-shell .liquid-tile,
:global(html:not(.dark)) .profile-shell .liquid-pill {
  border-color: rgba(15, 23, 42, 0.1);
  background: rgba(255, 255, 255, 0.8);
}

:global(html:not(.dark)) .profile-shell .liquid-panel,
:global(html:not(.dark)) .profile-shell .liquid-surface,
:global(html:not(.dark)) .profile-shell .liquid-tile,
:global(html:not(.dark)) .profile-shell .liquid-pill {
  backdrop-filter: blur(14px) saturate(118%);
  -webkit-backdrop-filter: blur(14px) saturate(118%);
}

:global(html:not(.dark)) .profile-shell .text-slate-900 dark:text-white {
  color: rgba(15, 23, 42, 0.96) !important;
}

:global(html:not(.dark)) .profile-shell [class*='text-white/'] {
  color: rgba(15, 23, 42, 0.84) !important;
}

:global(html:not(.dark)) .profile-shell [class*='border-white/'] {
  border-color: rgba(15, 23, 42, 0.16) !important;
}

:global(html:not(.dark)) .maker-frame :deep(.bg-white),
:global(html:not(.dark)) .maker-frame :deep(.bg-white\/90),
:global(html:not(.dark)) .maker-frame :deep(.bg-gray-50),
:global(html:not(.dark)) .maker-frame :deep(.bg-slate-50) {
  background-color: rgba(255, 255, 255, 0.72) !important;
  backdrop-filter: blur(16px) saturate(118%);
  -webkit-backdrop-filter: blur(16px) saturate(118%);
}

:global(html:not(.dark)) .maker-frame :deep(.border-gray-100),
:global(html:not(.dark)) .maker-frame :deep(.border-gray-200),
:global(html:not(.dark)) .maker-frame :deep(.border-slate-100),
:global(html:not(.dark)) .maker-frame :deep(.border-slate-200) {
  border-color: rgba(15, 23, 42, 0.12) !important;
}

:global(html:not(.dark)) .maker-frame :deep(.shadow-sm),
:global(html:not(.dark)) .maker-frame :deep(.shadow-md) {
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08) !important;
}

:global(html.dark) .maker-frame :deep(.bg-white),
:global(html.dark) .maker-frame :deep(.bg-white\/90),
:global(html.dark) .maker-frame :deep(.bg-gray-50),
:global(html.dark) .maker-frame :deep(.bg-slate-50) {
  background-color: rgba(255, 255, 255, 0.06) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

:global(html.dark) .maker-frame :deep(.text-slate-900),
:global(html.dark) .maker-frame :deep(.text-slate-800),
:global(html.dark) .maker-frame :deep(.text-gray-900),
:global(html.dark) .maker-frame :deep(.text-gray-800) {
  color: rgba(255, 255, 255, 0.92) !important;
}

:global(html.dark) .maker-frame :deep(.text-slate-600),
:global(html.dark) .maker-frame :deep(.text-gray-600),
:global(html.dark) .maker-frame :deep(.text-slate-500),
:global(html.dark) .maker-frame :deep(.text-gray-500) {
  color: rgba(255, 255, 255, 0.5) !important;
}

:global(html.dark) .maker-frame :deep(.border-gray-100),
:global(html.dark) .maker-frame :deep(.border-gray-200),
:global(html.dark) .maker-frame :deep(.border-slate-100) {
  border-color: rgba(255, 255, 255, 0.12) !important;
}

@media (max-width: 768px) {
  .profile-bg {
    opacity: 0.42;
    transform: scale(1.03);
  }

  .liquid-panel,
  .liquid-surface,
  .liquid-tile {
    backdrop-filter: blur(18px) saturate(130%);
    -webkit-backdrop-filter: blur(18px) saturate(130%);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
