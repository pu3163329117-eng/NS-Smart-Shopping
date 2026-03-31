<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { UserService } from '../services/api';
import { useCheckout } from '../store/checkout';
import { useCart } from '../store/cart';
import { useToast } from '../composables/useToast';

const router = useRouter();
const { show: showToast } = useToast();
const { checkout, subtotal, clearCheckout, setCheckoutItems } = useCheckout();
const { cart, clearCart } = useCart();

const addresses = ref([]);
const selectedAddressId = ref('');
const loadingAddresses = ref(false);
const isPaying = ref(false);

const showAddressModal = ref(false);
const editingAddressId = ref(null);
const savingAddress = ref(false);
const addressForm = reactive({
  receiver: '',
  phone: '',
  region: '',
  detail: '',
  isDefault: false
});

const normalizeAddress = (address = {}) => ({
  id: String(address.id || ''),
  receiver: address.receiver || address.name || '',
  phone: address.phone || '',
  region: address.region || '',
  detail: address.detail || '',
  isDefault: Boolean(address.isDefault)
});

const shippingFee = computed(() => 0); // Aligned with backend escrow logic (Free Shipping everywhere)
const totalAmount = computed(() => subtotal.value + shippingFee.value);

const hasCrossProvider = computed(() => {
  if (checkout.items.length <= 1) return false;
  const providers = new Set(checkout.items.map((i) => i.providerId || i.userId || i.sellerId || 'unknown'));
  return providers.size > 1;
});

const formatPrice = (value) => `¥${Number(value || 0).toFixed(2)}`;

const loadAddresses = async () => {
  loadingAddresses.value = true;
  try {
    const response = await UserService.getAddresses();
    const list = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : [];

    addresses.value = list.map(normalizeAddress);

    const defaultAddress = addresses.value.find((item) => item.isDefault);
    if (defaultAddress) {
      selectedAddressId.value = defaultAddress.id;
    } else if (!selectedAddressId.value && addresses.value.length > 0) {
      selectedAddressId.value = addresses.value[0].id;
    }
  } catch (error) {
    showToast(error?.message || '地址加载失败', 'error');
  } finally {
    loadingAddresses.value = false;
  }
};

const resetAddressForm = () => {
  editingAddressId.value = null;
  addressForm.receiver = '';
  addressForm.phone = '';
  addressForm.region = '';
  addressForm.detail = '';
  addressForm.isDefault = false;
};

const openCreateAddressModal = () => {
  resetAddressForm();
  showAddressModal.value = true;
};

const openEditAddressModal = (address) => {
  editingAddressId.value = address.id;
  addressForm.receiver = address.receiver;
  addressForm.phone = address.phone;
  addressForm.region = address.region;
  addressForm.detail = address.detail;
  addressForm.isDefault = Boolean(address.isDefault);
  showAddressModal.value = true;
};

const saveAddress = async () => {
  if (!addressForm.receiver || !addressForm.phone || !addressForm.detail) {
    showToast('请填写完整收货地址信息', 'warning');
    return;
  }

  savingAddress.value = true;
  try {
    const payload = {
      receiver: addressForm.receiver,
      phone: addressForm.phone,
      region: addressForm.region,
      detail: addressForm.detail,
      isDefault: addressForm.isDefault
    };

    if (editingAddressId.value) {
      await UserService.updateAddress(editingAddressId.value, payload);
    } else {
      await UserService.addAddress(payload);
    }

    showToast('地址已保存', 'success');
    showAddressModal.value = false;
    await loadAddresses();
  } catch (error) {
    showToast(error?.message || '地址保存失败', 'error');
  } finally {
    savingAddress.value = false;
  }
};

const deleteAddress = async (addressId) => {
  try {
    await UserService.deleteAddress(addressId);
    showToast('地址已删除', 'success');
    if (selectedAddressId.value === addressId) {
      selectedAddressId.value = '';
    }
    await loadAddresses();
  } catch (error) {
    showToast(error?.message || '删除地址失败', 'error');
  }
};

const setDefaultAddress = async (addressId) => {
  try {
    await UserService.setDefaultAddress(addressId);
    selectedAddressId.value = addressId;
    await loadAddresses();
    showToast('已设为默认地址', 'success');
  } catch (error) {
    showToast(error?.message || '设置默认地址失败', 'error');
  }
};

const payNow = async () => {
  if (!checkout.items.length) {
    showToast('结账清单为空', 'warning');
    return;
  }

  if (!selectedAddressId.value) {
    showToast('请先选择收货地址', 'warning');
    if (!addresses.value.length) {
      openCreateAddressModal();
    }
    return;
  }

  isPaying.value = true;
  try {
    const payload = {
      items: checkout.items.map((item) => ({
        id: item.id,
        skuId: item.skuId || null,
        skuName: item.skuName || '',
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        providerId: item.providerId || null
      })),
      total: Number(totalAmount.value.toFixed(2)),
      shippingFee: shippingFee.value,
      addressId: selectedAddressId.value
    };

    const orderResult = await UserService.createOrder(payload);

    if (checkout.source === 'cart') {
      clearCart();
    }
    clearCheckout();

    if (orderResult?.split && Array.isArray(orderResult?.orders)) {
      showToast(`支付成功，已自动拆分为 ${orderResult.orders.length} 笔订单`, 'success');
    } else {
      showToast('支付成功，订单已创建', 'success');
    }
    
    router.push('/profile');
  } catch (error) {
    const errCode = error?.response?.data?.code || error?.code;
    const errorMsg = error?.response?.data?.message || error?.message || '';

    const insufficient =
      errCode === 'INSUFFICIENT_FUNDS' ||
      errorMsg.toLowerCase().includes('insufficient');

    if (insufficient) {
      showToast('余额不足，请先充值钱包', 'error');
      router.push('/wallet');
      return;
    }

    showToast(errorMsg || '支付失败，请稍后再试', 'error');
  } finally {
    isPaying.value = false;
  }
};

onMounted(async () => {
  if (!checkout.items.length && cart.items.length) {
    setCheckoutItems(cart.items, 'cart');
  }
  await loadAddresses();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#060608] pb-24 pt-24 text-slate-900 dark:text-white">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mb-8 flex items-center justify-between">
        <button
          type="button"
          class="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-600 dark:text-white/80 transition hover:bg-slate-200 dark:bg-white/[0.08]"
          @click="router.back()"
        >
          返回
        </button>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Checkout</h1>
        <div class="w-[88px]"></div>
      </div>

      <div v-if="!checkout.items.length" class="rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-10 text-center">
        <p class="text-lg text-slate-600 dark:text-white/70">当前没有待结算商品</p>
        <button
          type="button"
          class="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
          @click="router.push('/market')"
        >
          去商城看看
        </button>
      </div>

      <div v-else class="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section class="space-y-6">
          <div v-if="hasCrossProvider" class="rounded-[1.5rem] border border-indigo-500/30 bg-indigo-500/10 p-5 text-indigo-400">
            <div class="flex items-center gap-3">
              <svg class="h-6 w-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p class="text-sm font-medium">温馨提示：订单包含不同商家的商品，系统将在支付完成后自动拆分为多笔子订单。</p>
            </div>
          </div>
          
          <article class="rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-6 backdrop-blur-xl">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-xl font-semibold tracking-tight">收货地址</h2>
              <button
                type="button"
                class="rounded-full border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-medium text-slate-600 dark:text-white/70 transition hover:bg-slate-100 dark:bg-white/[0.06]"
                @click="openCreateAddressModal"
              >
                新增地址
              </button>
            </div>

            <div v-if="loadingAddresses" class="py-10 text-center text-sm text-slate-500 dark:text-slate-600 dark:text-white/45">正在加载地址...</div>
            <div v-else-if="!addresses.length" class="rounded-2xl border border-dashed border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-slate-100 dark:bg-black/20 p-6 text-center">
              <p class="text-sm text-slate-600 dark:text-white/60">暂无地址，请先新增收货地址</p>
            </div>
            <div v-else class="space-y-3">
              <article
                v-for="address in addresses"
                :key="address.id"
                class="rounded-2xl border p-4 transition"
                :class="
                  selectedAddressId === address.id
                    ? 'border-slate-200 dark:border-white/35 bg-slate-200 dark:bg-white/[0.08]'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-200 dark:border-white/20 hover:bg-white/[0.05]'
                "
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="cursor-pointer" @click="selectedAddressId = address.id">
                    <div class="flex items-center gap-2">
                      <p class="text-base font-semibold">{{ address.receiver }}</p>
                      <span class="text-sm text-slate-600 dark:text-white/55">{{ address.phone }}</span>
                      <span
                        v-if="address.isDefault"
                        class="rounded-full border border-slate-200 dark:border-white/15 bg-slate-200 dark:bg-white/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-600 dark:text-white/70"
                      >
                        默认
                      </span>
                    </div>
                    <p class="mt-2 text-sm text-slate-600 dark:text-white/60">{{ address.region }} {{ address.detail }}</p>
                  </div>

                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="rounded-full border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-600 dark:text-white/65 transition hover:bg-slate-200 dark:bg-white/[0.08]"
                      @click="openEditAddressModal(address)"
                    >
                      编辑
                    </button>
                    <button
                      v-if="!address.isDefault"
                      type="button"
                      class="rounded-full border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-600 dark:text-white/65 transition hover:bg-slate-200 dark:bg-white/[0.08]"
                      @click="setDefaultAddress(address.id)"
                    >
                      设默认
                    </button>
                    <button
                      type="button"
                      class="rounded-full border border-red-500/25 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10"
                      @click="deleteAddress(address.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </article>

          <article class="rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-6 backdrop-blur-xl">
            <h2 class="mb-4 text-xl font-semibold tracking-tight">商品清单</h2>
            <div class="space-y-3">
              <div
                v-for="item in checkout.items"
                :key="`${item.lineKey || item.id}-${item.quantity}`"
                class="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4"
              >
                <div class="h-16 w-16 overflow-hidden rounded-xl bg-slate-50 dark:bg-black/40">
                  <img v-if="item.image" :src="item.image" :alt="item.title" class="h-full w-full object-cover">
                  <div v-else class="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-600 dark:text-white/25">
                    {{ item.title.slice(0, 1).toUpperCase() }}
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold">{{ item.title }}</p>
                  <p v-if="item.skuName" class="mt-1 truncate text-xs text-slate-600 dark:text-white/55">规格：{{ item.skuName }}</p>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-600 dark:text-white/45">x{{ item.quantity }}</p>
                </div>
                <p class="text-sm font-semibold">{{ formatPrice(item.price * item.quantity) }}</p>
              </div>
            </div>
          </article>
        </section>

        <aside class="h-fit rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] p-6 backdrop-blur-2xl lg:sticky lg:top-28">
          <h2 class="text-xl font-semibold tracking-tight">订单汇总</h2>
          <div class="mt-6 space-y-4 text-sm">
            <div class="flex items-center justify-between text-slate-600 dark:text-white/68">
              <span>商品总额</span>
              <span>{{ formatPrice(subtotal) }}</span>
            </div>
            <div class="flex items-center justify-between text-slate-600 dark:text-white/68">
              <span>运费</span>
              <span>{{ shippingFee > 0 ? formatPrice(shippingFee) : '免运费' }}</span>
            </div>
            <div class="h-px bg-white/10"></div>
            <div class="flex items-center justify-between text-base font-semibold">
              <span>应付金额</span>
              <span class="text-2xl tracking-tight">{{ formatPrice(totalAmount) }}</span>
            </div>
          </div>

          <button
            type="button"
            class="mt-8 w-full rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-55"
            :disabled="isPaying || !checkout.items.length"
            @click="payNow"
          >
            {{ isPaying ? '支付处理中...' : '确认付款 (以服务端结算为准)' }}
          </button>

          <p class="mt-4 text-xs leading-6 text-slate-600 dark:text-white/40">
            * 页面显示的总计金额仅供初步核对，最终实际扣款和可用库存以服务端最终结算为准。<br>
            支付将自动调用钱包逻辑，若余额不足会引导您前往充值。
          </p>
        </aside>
      </div>
    </div>

    <div v-if="showAddressModal" class="fixed inset-0 z-[1200] flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-slate-50 dark:bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm" @click="showAddressModal = false"></div>
      <div class="relative w-full max-w-xl rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c]/95 p-6">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold tracking-tight">{{ editingAddressId ? '编辑地址' : '新增地址' }}</h3>
          <button
            type="button"
            class="rounded-full border border-slate-200 dark:border-white/10 p-2 text-slate-600 dark:text-white/60 transition hover:bg-slate-200 dark:bg-white/[0.08]"
            @click="showAddressModal = false"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="mt-5 space-y-3">
          <input
            v-model.trim="addressForm.receiver"
            type="text"
            class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/25 focus:border-slate-200 dark:border-white/25"
            placeholder="收件人"
          >
          <input
            v-model.trim="addressForm.phone"
            type="tel"
            class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/25 focus:border-slate-200 dark:border-white/25"
            placeholder="联系电话"
          >
          <input
            v-model.trim="addressForm.region"
            type="text"
            class="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/25 focus:border-slate-200 dark:border-white/25"
            placeholder="省市区"
          >
          <textarea
            v-model.trim="addressForm.detail"
            rows="3"
            class="w-full resize-none rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/25 focus:border-slate-200 dark:border-white/25"
            placeholder="详细地址"
          ></textarea>

          <label class="mt-2 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3">
            <span class="text-sm text-slate-600 dark:text-white/70">设为默认地址</span>
            <input v-model="addressForm.isDefault" type="checkbox" class="h-4 w-4 rounded border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-slate-100 dark:bg-black/20">
          </label>
        </div>

        <button
          type="button"
          class="mt-6 w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
          :disabled="savingAddress"
          @click="saveAddress"
        >
          {{ savingAddress ? '保存中...' : '保存地址' }}
        </button>
      </div>
    </div>
  </div>
</template>
