<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../store/auth';
import { useToast } from '../composables/useToast';
import { UserService } from '../services/api';

const router = useRouter();
const { t } = useI18n();
const { logout } = useAuth();
const { show: showToast } = useToast();

const activePage = ref('main');
const feedbackContent = ref('');
const addresses = ref([]);
const addressLoading = ref(false);
const addressSubmitting = ref(false);
const editingAddressId = ref(null);
const addressForm = ref({
  receiver: '',
  phone: '',
  region: '',
  detail: '',
  isDefault: false
});

const securityForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const privacySettings = ref([
  { id: 'status', label: 'settings.privacy.items.online', enabled: true },
  { id: 'search', label: 'settings.privacy.items.searchByPhone', enabled: false },
  { id: 'recommend', label: 'settings.privacy.items.recommendation', enabled: true },
  { id: 'ads', label: 'settings.privacy.items.ads', enabled: false }
]);

const notificationSettings = ref([
  { id: 'order', label: 'settings.notification.items.order', enabled: true },
  { id: 'chat', label: 'settings.notification.items.chat', enabled: true },
  { id: 'promo', label: 'settings.notification.items.promo', enabled: false },
  { id: 'system', label: 'settings.notification.items.system', enabled: true }
]);

const generalSettings = ref([
  { id: 'theme', label: 'settings.general.items.theme', enabled: false, type: 'toggle' },
  { id: 'lang', label: 'settings.general.items.language', value: 'settings.general.values.language', type: 'select' },
  { id: 'font', label: 'settings.general.items.font', value: 'settings.general.values.font', type: 'select' },
  { id: 'cache', label: 'settings.general.items.cache', value: 'settings.general.values.cache', type: 'action' }
]);

const gridItems = computed(() => [
  { id: 'security', label: t('settings.grid.security') },
  { id: 'payment', label: t('settings.grid.payment') },
  { id: 'identity', label: t('settings.grid.identity') },
  { id: 'address', label: t('settings.grid.address') }
]);

const pageTitle = computed(() =>
  ({
    main: t('settings.title'),
    security: t('settings.page.security'),
    payment: t('settings.page.payment'),
    identity: t('settings.page.identity'),
    address: t('settings.grid.address'),
    privacy: t('settings.page.privacy'),
    notification: t('settings.page.notification'),
    general: t('settings.page.general'),
    feedback: t('settings.page.feedback'),
    about: t('settings.page.about'),
    complain: t('settings.page.complain'),
    permission: t('settings.page.permission')
  }[activePage.value] || t('settings.title'))
);

const settingList = computed(() => {
  if (activePage.value === 'privacy') return privacySettings.value;
  if (activePage.value === 'notification') return notificationSettings.value;
  return generalSettings.value;
});

const handleLogout = () => {
  logout();
  localStorage.removeItem('ja_user_profile');
  router.push('/login');
};

const handleSwitchAccount = () => {
  logout();
  localStorage.removeItem('ja_user_profile');
  router.push('/login');
};

const goBack = () => {
  if (activePage.value !== 'main') {
    activePage.value = 'main';
  } else {
    router.back();
  }
};

const navigateTo = (page) => {
  activePage.value = page;
  if (page === 'address') {
    void loadAddresses();
  }
};

const normalizeAddress = (address = {}) => ({
  id: String(address.id || ''),
  receiver: address.receiver || address.name || '',
  phone: address.phone || '',
  region: address.region || '',
  detail: address.detail || '',
  isDefault: Boolean(address.isDefault)
});

const resetAddressForm = () => {
  editingAddressId.value = null;
  addressForm.value = {
    receiver: '',
    phone: '',
    region: '',
    detail: '',
    isDefault: false
  };
};

const loadAddresses = async () => {
  addressLoading.value = true;
  try {
    const response = await UserService.getAddresses();
    const list = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
    addresses.value = list.map(normalizeAddress);
  } catch (error) {
    showToast(error?.message || '地址加载失败', 'error');
  } finally {
    addressLoading.value = false;
  }
};

const startCreateAddress = () => {
  resetAddressForm();
};

const startEditAddress = (address) => {
  editingAddressId.value = address.id;
  addressForm.value = {
    receiver: address.receiver,
    phone: address.phone,
    region: address.region,
    detail: address.detail,
    isDefault: address.isDefault
  };
};

const saveAddress = async () => {
  const payload = {
    receiver: addressForm.value.receiver,
    phone: addressForm.value.phone,
    region: addressForm.value.region,
    detail: addressForm.value.detail,
    isDefault: addressForm.value.isDefault
  };

  if (!payload.receiver || !payload.phone || !payload.detail) {
    showToast('请填写完整地址信息', 'warning');
    return;
  }

  addressSubmitting.value = true;
  try {
    if (editingAddressId.value) {
      await UserService.updateAddress(editingAddressId.value, payload);
      showToast('地址已更新', 'success');
    } else {
      await UserService.addAddress(payload);
      showToast('地址已新增', 'success');
    }
    resetAddressForm();
    await loadAddresses();
  } catch (error) {
    showToast(error?.message || '地址保存失败', 'error');
  } finally {
    addressSubmitting.value = false;
  }
};

const removeAddress = async (addressId) => {
  try {
    await UserService.deleteAddress(addressId);
    showToast('地址已删除', 'success');
    await loadAddresses();
  } catch (error) {
    showToast(error?.message || '删除地址失败', 'error');
  }
};

const makeDefaultAddress = async (addressId) => {
  try {
    await UserService.setDefaultAddress(addressId);
    showToast('默认地址已更新', 'success');
    await loadAddresses();
  } catch (error) {
    showToast(error?.message || '设置默认地址失败', 'error');
  }
};

const handleUpdatePassword = () => {
  if (!securityForm.value.oldPassword || !securityForm.value.newPassword) {
    showToast(t('settings.feedback.fillRequired'), 'warning');
    return;
  }
  if (securityForm.value.newPassword !== securityForm.value.confirmPassword) {
    showToast(t('settings.feedback.passwordMismatch'), 'error');
    return;
  }
  showToast(t('settings.feedback.passwordUpdated'), 'success');
  window.setTimeout(handleLogout, 1200);
};

const handleClearCache = () => {
  const cacheSetting = generalSettings.value.find((item) => item.id === 'cache');
  if (cacheSetting) {
    cacheSetting.value = 'settings.general.values.cacheCleared';
  }
  showToast(t('settings.feedback.cacheCleared'), 'success');
};

const handleFeedback = () => {
  if (!feedbackContent.value.trim()) {
    showToast(t('settings.feedback.feedbackRequired'), 'warning');
    return;
  }
  showToast(t('settings.feedback.feedbackSubmitted'), 'success');
  feedbackContent.value = '';
  goBack();
};
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-[#0a0a0c] pb-10 text-slate-900 dark:text-white">
    <div class="sticky top-20 z-40 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c]/90 px-4 py-3 backdrop-blur-2xl">
      <div class="mx-auto flex max-w-5xl items-center justify-between">
        <button class="rounded-full border border-slate-200 dark:border-white/10 p-2 text-slate-600 dark:text-white/55 transition hover:bg-slate-100 dark:bg-white/[0.04] hover:text-slate-800 dark:text-slate-600 dark:text-white/80" @click="goBack">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19 8 12l7-7"></path>
          </svg>
        </button>
        <h1 class="text-lg font-medium tracking-tight">{{ pageTitle }}</h1>
        <div class="w-9"></div>
      </div>
    </div>

    <div class="mx-auto max-w-5xl px-4">
      <div v-if="activePage === 'main'" class="space-y-4 pt-4">
        <section class="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-5 backdrop-blur-2xl">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              v-for="item in gridItems"
              :key="item.id"
              class="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 p-4 text-center text-sm font-medium text-slate-600 dark:text-white/72 transition hover:bg-slate-100 dark:bg-white/[0.04]"
              @click="navigateTo(item.id)"
            >
              {{ item.label }}
            </button>
          </div>
        </section>

        <section class="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] backdrop-blur-2xl">
          <button class="flex w-full items-center justify-between border-b border-slate-200 dark:border-white/10 px-4 py-4 text-sm text-slate-700 dark:text-slate-600 dark:text-white/75 transition hover:bg-slate-50 dark:bg-white/[0.03]" @click="navigateTo('privacy')">
            <span>{{ t('settings.page.privacy') }}</span>
            <svg class="h-4 w-4 text-slate-600 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5.25 15.75 12 9 18.75"></path></svg>
          </button>
          <button class="flex w-full items-center justify-between border-b border-slate-200 dark:border-white/10 px-4 py-4 text-sm text-slate-700 dark:text-slate-600 dark:text-white/75 transition hover:bg-slate-50 dark:bg-white/[0.03]" @click="navigateTo('notification')">
            <span>{{ t('settings.page.notification') }}</span>
            <svg class="h-4 w-4 text-slate-600 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5.25 15.75 12 9 18.75"></path></svg>
          </button>
          <button class="flex w-full items-center justify-between px-4 py-4 text-sm text-slate-700 dark:text-slate-600 dark:text-white/75 transition hover:bg-slate-50 dark:bg-white/[0.03]" @click="navigateTo('general')">
            <span>{{ t('settings.page.general') }}</span>
            <svg class="h-4 w-4 text-slate-600 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5.25 15.75 12 9 18.75"></path></svg>
          </button>
        </section>

        <section class="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] backdrop-blur-2xl">
          <button class="flex w-full items-center justify-between border-b border-slate-200 dark:border-white/10 px-4 py-4 text-sm text-slate-700 dark:text-slate-600 dark:text-white/75 transition hover:bg-slate-50 dark:bg-white/[0.03]" @click="navigateTo('feedback')">
            <span>{{ t('settings.page.feedback') }}</span>
            <svg class="h-4 w-4 text-slate-600 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5.25 15.75 12 9 18.75"></path></svg>
          </button>
          <button class="flex w-full items-center justify-between px-4 py-4 text-sm text-slate-700 dark:text-slate-600 dark:text-white/75 transition hover:bg-slate-50 dark:bg-white/[0.03]" @click="navigateTo('about')">
            <span>{{ t('settings.page.about') }}</span>
            <span class="text-xs uppercase tracking-[0.18em] text-slate-600 dark:text-white/32">v1.0.0</span>
          </button>
        </section>

        <section class="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] backdrop-blur-2xl">
          <button class="flex w-full items-center justify-between border-b border-slate-200 dark:border-white/10 px-4 py-4 text-sm text-slate-700 dark:text-slate-600 dark:text-white/75 transition hover:bg-slate-50 dark:bg-white/[0.03]" @click="navigateTo('complain')">
            <span>{{ t('settings.page.complain') }}</span>
            <svg class="h-4 w-4 text-slate-600 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5.25 15.75 12 9 18.75"></path></svg>
          </button>
          <button class="flex w-full items-center justify-between px-4 py-4 text-sm text-slate-700 dark:text-slate-600 dark:text-white/75 transition hover:bg-slate-50 dark:bg-white/[0.03]" @click="navigateTo('permission')">
            <span>{{ t('settings.page.permission') }}</span>
            <svg class="h-4 w-4 text-slate-600 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5.25 15.75 12 9 18.75"></path></svg>
          </button>
        </section>

        <section class="space-y-3 pt-2">
          <button class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] py-3 text-sm font-medium text-slate-700 dark:text-slate-600 dark:text-white/75 transition hover:bg-white/[0.05]" @click="handleSwitchAccount">
            {{ t('settings.actions.switchAccount') }}
          </button>
          <button class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10" @click="handleLogout">
            {{ t('settings.actions.logout') }}
          </button>
        </section>
      </div>

      <div v-else-if="activePage === 'security'" class="space-y-4 pt-4">
        <section class="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-5 backdrop-blur-2xl">
          <h3 class="text-lg font-medium tracking-tight">{{ t('settings.security.title') }}</h3>
          <div class="mt-5 space-y-4">
            <input v-model="securityForm.oldPassword" type="password" class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/22 focus:border-slate-200 dark:border-white/20 focus:bg-white/[0.05]" :placeholder="t('settings.security.oldPassword')">
            <input v-model="securityForm.newPassword" type="password" class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/22 focus:border-slate-200 dark:border-white/20 focus:bg-white/[0.05]" :placeholder="t('settings.security.newPassword')">
            <input v-model="securityForm.confirmPassword" type="password" class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/22 focus:border-slate-200 dark:border-white/20 focus:bg-white/[0.05]" :placeholder="t('settings.security.confirmPassword')">
            <button class="w-full rounded-2xl bg-white py-3 text-sm font-medium text-black transition hover:bg-white/90" @click="handleUpdatePassword">{{ t('settings.security.submit') }}</button>
          </div>
        </section>
      </div>

      <div v-else-if="activePage === 'payment'" class="space-y-4 pt-4">
        <section class="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-5 backdrop-blur-2xl">
          <h3 class="text-lg font-medium tracking-tight">{{ t('settings.payment.title') }}</h3>
          <div class="mt-4 space-y-3">
            <div class="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 p-4">
              <p class="text-sm font-medium text-slate-900 dark:text-white">{{ t('settings.payment.wechat') }}</p>
              <p class="mt-1 text-xs text-slate-400 dark:text-slate-600 dark:text-white/35">**** **** **** 8888</p>
            </div>
            <div class="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 p-4">
              <p class="text-sm font-medium text-slate-900 dark:text-white">{{ t('settings.payment.alipay') }}</p>
              <p class="mt-1 text-xs text-slate-400 dark:text-slate-600 dark:text-white/35">138 **** 8888</p>
            </div>
            <button class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] py-3 text-sm font-medium text-slate-600 dark:text-slate-600 dark:text-white/65 transition hover:bg-white/[0.05]" @click="showToast(t('settings.feedback.comingSoon'), 'info')">
              {{ t('settings.payment.add') }}
            </button>
          </div>
        </section>
      </div>

      <div v-else-if="activePage === 'identity'" class="pt-4">
        <section class="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-6 text-center backdrop-blur-2xl">
          <h3 class="text-2xl font-medium tracking-tight">{{ t('settings.identity.verified') }}</h3>
          <p class="mt-3 text-sm text-slate-500 dark:text-slate-600 dark:text-white/45">{{ t('settings.identity.description') }}</p>
        </section>
      </div>

      <div v-else-if="activePage === 'address'" class="space-y-4 pt-4">
        <section class="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-5 backdrop-blur-2xl">
          <div class="flex items-center justify-between gap-4">
            <h3 class="text-lg font-medium tracking-tight">地址管理</h3>
            <button class="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-2 text-xs text-slate-600 dark:text-white/72 transition hover:bg-white/[0.07]" @click="startCreateAddress">
              新增地址
            </button>
          </div>

          <div v-if="addressLoading" class="mt-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 p-4 text-sm text-slate-500 dark:text-slate-600 dark:text-white/45">
            正在加载地址...
          </div>
          <div v-else-if="!addresses.length" class="mt-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 p-4 text-sm text-slate-500 dark:text-slate-600 dark:text-white/45">
            还没有地址，先新增一条用于结账。
          </div>
          <div v-else class="mt-4 space-y-3">
            <article
              v-for="address in addresses"
              :key="address.id"
              class="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 p-4"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ address.receiver }}</p>
                    <span class="text-xs text-slate-500 dark:text-slate-600 dark:text-white/45">{{ address.phone }}</span>
                    <span v-if="address.isDefault" class="rounded-full border border-slate-200 dark:border-white/15 bg-white/[0.05] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-600 dark:text-white/62">
                      默认
                    </span>
                  </div>
                  <p class="mt-2 text-sm text-slate-600 dark:text-white/55">{{ address.region }} {{ address.detail }}</p>
                </div>
                <div class="flex gap-2">
                  <button class="rounded-full border border-slate-200 dark:border-white/10 px-3 py-1 text-xs text-slate-600 dark:text-white/62 transition hover:bg-slate-100 dark:bg-white/[0.06]" @click="startEditAddress(address)">
                    编辑
                  </button>
                  <button
                    v-if="!address.isDefault"
                    class="rounded-full border border-slate-200 dark:border-white/10 px-3 py-1 text-xs text-slate-600 dark:text-white/62 transition hover:bg-slate-100 dark:bg-white/[0.06]"
                    @click="makeDefaultAddress(address.id)"
                  >
                    设默认
                  </button>
                  <button class="rounded-full border border-red-500/25 px-3 py-1 text-xs text-red-300 transition hover:bg-red-500/10" @click="removeAddress(address.id)">
                    删除
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-5 backdrop-blur-2xl">
          <h4 class="text-sm font-medium text-slate-600 dark:text-white/82">{{ editingAddressId ? '编辑地址' : '新增地址' }}</h4>
          <div class="mt-4 space-y-3">
            <input v-model.trim="addressForm.receiver" type="text" placeholder="收件人" class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/22 focus:border-slate-200 dark:border-white/20 focus:bg-white/[0.05]">
            <input v-model.trim="addressForm.phone" type="tel" placeholder="联系电话" class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/22 focus:border-slate-200 dark:border-white/20 focus:bg-white/[0.05]">
            <input v-model.trim="addressForm.region" type="text" placeholder="省市区" class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/22 focus:border-slate-200 dark:border-white/20 focus:bg-white/[0.05]">
            <textarea v-model.trim="addressForm.detail" rows="3" placeholder="详细地址" class="w-full resize-none rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/22 focus:border-slate-200 dark:border-white/20 focus:bg-white/[0.05]"></textarea>
            <label class="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 px-4 py-3">
              <span class="text-sm text-slate-600 dark:text-white/68">设为默认地址</span>
              <input v-model="addressForm.isDefault" type="checkbox" class="h-4 w-4 rounded border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-slate-100 dark:bg-black/20">
            </label>
          </div>

          <div class="mt-4 flex gap-3">
            <button class="flex-1 rounded-2xl bg-white py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60" :disabled="addressSubmitting" @click="saveAddress">
              {{ addressSubmitting ? '保存中...' : (editingAddressId ? '更新地址' : '创建地址') }}
            </button>
            <button class="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] py-3 text-sm font-medium text-slate-700 dark:text-slate-600 dark:text-white/75 transition hover:bg-white/[0.05]" @click="resetAddressForm">
              重置
            </button>
          </div>
        </section>
      </div>

      <div v-else-if="['privacy', 'notification', 'general'].includes(activePage)" class="pt-4">
        <section class="overflow-hidden rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] backdrop-blur-2xl">
          <div
            v-for="item in settingList"
            :key="item.id"
            class="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-4 py-4 last:border-none"
          >
            <span class="text-sm text-slate-700 dark:text-slate-600 dark:text-white/75">{{ t(item.label) }}</span>

            <button
              v-if="item.type !== 'select' && item.type !== 'action'"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="item.enabled ? 'bg-white/75' : 'bg-white/12'"
              @click="item.enabled = !item.enabled"
            >
              <span class="inline-block h-4 w-4 rounded-full bg-white dark:bg-[#0a0a0c] transition-transform" :class="item.enabled ? 'translate-x-6' : 'translate-x-1'"></span>
            </button>

            <button
              v-else-if="item.type === 'select'"
              class="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-600 dark:text-white/38"
            >
              {{ t(item.value) }}
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5.25 15.75 12 9 18.75"></path>
              </svg>
            </button>

            <button
              v-else
              class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-600 dark:text-white/45"
              @click="handleClearCache"
            >
              {{ t(item.value) }}
            </button>
          </div>
        </section>
      </div>

      <div v-else-if="activePage === 'feedback'" class="pt-4">
        <section class="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-5 backdrop-blur-2xl">
          <label class="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-600 dark:text-white/35">{{ t('settings.feedback.title') }}</label>
          <textarea
            v-model="feedbackContent"
            rows="7"
            class="mt-3 w-full resize-none rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4 text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/22 focus:border-slate-200 dark:border-white/20 focus:bg-white/[0.05]"
            :placeholder="t('settings.feedback.placeholder')"
          ></textarea>
          <button class="mt-4 w-full rounded-2xl bg-white py-3 text-sm font-medium text-black transition hover:bg-white/90" @click="handleFeedback">
            {{ t('settings.feedback.submit') }}
          </button>
        </section>
      </div>

      <div v-else-if="activePage === 'about'" class="pt-4">
        <section class="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-6 text-center backdrop-blur-2xl">
          <h2 class="text-3xl font-medium tracking-tighter">NS Smart Shopping</h2>
          <p class="mt-3 text-sm text-slate-500 dark:text-slate-600 dark:text-white/45">{{ t('settings.about.version') }}</p>
          <div class="mt-5 space-y-2 text-left">
            <div class="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 px-4 py-3 text-sm text-slate-700 dark:text-slate-600 dark:text-white/75">{{ t('settings.about.feature') }}</div>
            <div class="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 px-4 py-3 text-sm text-slate-700 dark:text-slate-600 dark:text-white/75">{{ t('settings.about.checkUpdate') }}</div>
            <div class="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 px-4 py-3 text-sm text-slate-700 dark:text-slate-600 dark:text-white/75">{{ t('settings.about.policy') }}</div>
          </div>
        </section>
      </div>

      <div v-else class="pt-4">
        <section class="flex min-h-[45vh] items-center justify-center rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-6 text-center text-slate-400 dark:text-slate-600 dark:text-white/35 backdrop-blur-2xl">
          {{ t('settings.empty') }}
        </section>
      </div>
    </div>

  </div>
</template>
