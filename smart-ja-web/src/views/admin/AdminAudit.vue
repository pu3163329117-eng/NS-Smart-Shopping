<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { auditProduct } from '../../services/aiService';
import { GushiService } from '../../services/api';
import { useToast } from '../../composables/useToast';

const router = useRouter();

const { t } = useI18n();
const { show: showToast } = useToast();

const activeTab = ref('ai');
const isAuditing = ref(false);
const accessDenied = ref(false);
const products = ref([]);
const auditResult = ref({});

const loadingPending = ref(false);
const pendingListings = ref([]);
const listingActionMap = reactive({});
const listingRejectReasons = reactive({});

const loadingDisputes = ref(false);
const pendingDisputes = ref([]);
const disputeActionMap = reactive({});
const disputeNotes = reactive({});

const loadingProductRequests = ref(false);
const pendingProductRequests = ref([]);
const requestActionMap = reactive({});
const requestNotes = reactive({});

const handleAudit = async (product) => {
  auditResult.value[product.id] = { loading: true };

  try {
    const result = await auditProduct(product);
    auditResult.value[product.id] = {
      loading: false,
      pass: result.pass,
      reason: result.reason
    };

    if (result.pass) {
      product.status = 'approved';
      showToast(`[AI] ${product.name} approved`, 'success');
    } else {
      product.status = 'rejected';
      showToast(`[AI] ${product.name} rejected: ${result.reason}`, 'error');
    }
  } catch (error) {
    console.error(error);
    auditResult.value[product.id] = { loading: false, error: true };
    showToast('AI audit failed', 'error');
  }
};

const auditAll = async () => {
  isAuditing.value = true;
  for (const item of products.value) {
    if (item.status === 'pending') {
      await handleAudit(item);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }
  isAuditing.value = false;
};

const loadPendingListings = async () => {
  loadingPending.value = true;
  accessDenied.value = false;
  try {
    const res = await GushiService.getPendingListingsForAudit({ limit: 100 });
    pendingListings.value = Array.isArray(res?.data) ? res.data : [];
  } catch (error) {
    console.error(error);
    const msg = error?.message || '';
    if (msg.includes('权限') || error?.status === 403 || error?.response?.status === 403) {
      accessDenied.value = true;
      showToast('访问拒绝：需要管理员权限', 'error');
    } else {
      showToast(msg || t('gushi.admin.listings.loadFailed'), 'error');
    }
  } finally {
    loadingPending.value = false;
  }
};

const approveListing = async (listingId) => {
  listingActionMap[listingId] = true;
  try {
    await GushiService.approveListing(listingId);
    pendingListings.value = pendingListings.value.filter((item) => item.id !== listingId);
    showToast(t('gushi.admin.listings.approveSuccess'), 'success');
  } catch (error) {
    console.error(error);
    showToast(error?.message || t('gushi.admin.listings.approveFailed'), 'error');
  } finally {
    listingActionMap[listingId] = false;
  }
};

const rejectListing = async (listingId) => {
  listingActionMap[listingId] = true;
  try {
    await GushiService.rejectListing(listingId, {
      reason: (listingRejectReasons[listingId] || '').trim()
    });
    pendingListings.value = pendingListings.value.filter((item) => item.id !== listingId);
    showToast(t('gushi.admin.listings.rejectSuccess'), 'success');
  } catch (error) {
    console.error(error);
    showToast(error?.message || t('gushi.admin.listings.rejectFailed'), 'error');
  } finally {
    listingActionMap[listingId] = false;
  }
};

const loadPendingDisputes = async () => {
  loadingDisputes.value = true;
  try {
    const res = await GushiService.getDisputesForAudit({ status: 'pending', limit: 100 });
    pendingDisputes.value = Array.isArray(res?.data) ? res.data : [];
  } catch (error) {
    console.error(error);
    showToast(error?.message || t('gushi.admin.disputes.loadFailed'), 'error');
  } finally {
    loadingDisputes.value = false;
  }
};

const resolveDispute = async (dispute, action) => {
  disputeActionMap[dispute.id] = true;
  try {
    await GushiService.resolveDispute(dispute.orderId, {
      action,
      adminNote: (disputeNotes[dispute.id] || '').trim()
    });
    pendingDisputes.value = pendingDisputes.value.filter((item) => item.id !== dispute.id);
    showToast(
      action === 'release' ? t('gushi.admin.disputes.releaseSuccess') : t('gushi.admin.disputes.refundSuccess'),
      'success'
    );
  } catch (error) {
    console.error(error);
    showToast(error?.message || t('gushi.admin.disputes.resolveFailed'), 'error');
  } finally {
    disputeActionMap[dispute.id] = false;
  }
};

const loadPendingProductRequests = async () => {
  loadingProductRequests.value = true;
  try {
    const res = await GushiService.getProductRequestsForAudit({ status: 'pending', limit: 100 });
    pendingProductRequests.value = Array.isArray(res?.data) ? res.data : [];
  } catch (error) {
    console.error(error);
    showToast(error?.message || t('gushi.admin.requests.loadFailed'), 'error');
  } finally {
    loadingProductRequests.value = false;
  }
};

const approveRequest = async (requestId) => {
  requestActionMap[requestId] = true;
  try {
    await GushiService.approveProductRequest(requestId, {
      adminNote: (requestNotes[requestId] || '').trim()
    });
    pendingProductRequests.value = pendingProductRequests.value.filter((item) => item.id !== requestId);
    showToast(t('gushi.admin.requests.approveSuccess'), 'success');
  } catch (error) {
    console.error(error);
    showToast(error?.message || t('gushi.admin.requests.approveFailed'), 'error');
  } finally {
    requestActionMap[requestId] = false;
  }
};

const rejectRequest = async (requestId) => {
  requestActionMap[requestId] = true;
  try {
    await GushiService.rejectProductRequest(requestId, {
      adminNote: (requestNotes[requestId] || '').trim()
    });
    pendingProductRequests.value = pendingProductRequests.value.filter((item) => item.id !== requestId);
    showToast(t('gushi.admin.requests.rejectSuccess'), 'success');
  } catch (error) {
    console.error(error);
    showToast(error?.message || t('gushi.admin.requests.rejectFailed'), 'error');
  } finally {
    requestActionMap[requestId] = false;
  }
};

watch(activeTab, async (tab) => {
  if (tab === 'gushi-listings') {
    await loadPendingListings();
  }
  if (tab === 'disputes') {
    await loadPendingDisputes();
  }
  if (tab === 'product-requests') {
    await loadPendingProductRequests();
  }
});

onMounted(() => {
  loadPendingListings();
});

const formatPrice = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return Number(value).toFixed(2);
};
</script>

<template>
  <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-20 pt-24 transition-colors duration-500">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Audit Center</h1>
        <p class="mt-1 text-slate-600 dark:text-slate-400">Review AI compliance and operate Gushi marketplace audits.</p>
      </div>

      <div class="mb-6 flex flex-wrap gap-3">
        <button
          @click="activeTab = 'ai'"
          class="rounded-xl px-4 py-2 text-sm font-semibold transition"
          :class="activeTab === 'ai' ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'border border-slate-200 bg-white text-slate-700 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:text-white'"
        >
          AI Product Audit
        </button>
        <button
          @click="activeTab = 'gushi-listings'"
          class="rounded-xl px-4 py-2 text-sm font-semibold transition"
          :class="activeTab === 'gushi-listings' ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'border border-slate-200 bg-white text-slate-700 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:text-white'"
        >
          {{ $t('gushi.admin.tabs.listings') }}
        </button>
        <button
          @click="activeTab = 'disputes'"
          class="rounded-xl px-4 py-2 text-sm font-semibold transition"
          :class="activeTab === 'disputes' ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'border border-slate-200 bg-white text-slate-700 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:text-white'"
        >
          {{ $t('gushi.admin.tabs.disputes') }}
        </button>
        <button
          @click="activeTab = 'product-requests'"
          class="rounded-xl px-4 py-2 text-sm font-semibold transition"
          :class="activeTab === 'product-requests' ? 'bg-slate-900 text-white dark:bg-white dark:text-black' : 'border border-slate-200 bg-white text-slate-700 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:text-white'"
        >
          {{ $t('gushi.admin.tabs.productRequests') }}
        </button>
        <button
          @click="router.push('/admin/crowdfunding')"
          class="rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
        >
          众筹审批中心
        </button>
      </div>

      <div v-if="accessDenied" class="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center mt-10">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
          <svg class="h-8 w-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h3 class="text-xl font-bold text-rose-800 mb-2">无权访问 (403 Forbidden)</h3>
        <p class="text-rose-600">您的账号尚未被授予管理员权限。所有的敏感操作接口已被后端熔断拦截。</p>
        <button @click="router.push('/')" class="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
          返回安全主页
        </button>
      </div>
      
      <div v-else-if="activeTab === 'ai'" class="space-y-6">
        <div v-if="products.length" class="flex justify-end">
          <button
            @click="auditAll"
            :disabled="isAuditing"
            class="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <span>{{ isAuditing ? 'Auditing...' : 'Run AI Audit for All' }}</span>
          </button>
        </div>

        <div v-if="!products.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div class="mx-auto mb-4 h-14 w-14 rounded-full bg-slate-100"></div>
          <h3 class="text-lg font-semibold text-slate-800">No seeded demo products</h3>
          <p class="mt-2 text-sm text-slate-500">AI audit tab is now real-data only. Please review live records from listing/dispute/request tabs.</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-6">
          <div
            v-for="product in products"
            :key="product.id"
            class="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-white/[0.03] dark:backdrop-blur-xl md:flex-row"
          >
            <img :src="product.image" class="h-48 w-full rounded-xl object-cover md:w-52" />
            <div class="flex-1">
              <div class="mb-2 flex items-start justify-between gap-4">
                <div>
                  <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{{ product.name }}</h3>
                  <p class="text-sm text-slate-600 dark:text-slate-400">Seller: {{ product.seller }}</p>
                </div>
                <span
                  class="rounded-full px-3 py-1 text-xs font-bold uppercase transition-colors"
                  :class="{
                    'bg-yellow-100 text-yellow-700 dark:bg-amber-400/15 dark:text-amber-200': product.status === 'pending',
                    'bg-green-100 text-green-700 dark:bg-emerald-400/15 dark:text-emerald-200': product.status === 'approved',
                    'bg-red-100 text-red-700 dark:bg-rose-400/15 dark:text-rose-200': product.status === 'rejected'
                  }"
                >
                  {{ product.status }}
                </span>
              </div>

              <p class="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                {{ product.description }}
              </p>

              <div v-if="auditResult[product.id]" class="mt-4">
                <div v-if="auditResult[product.id].loading" class="text-sm font-semibold text-blue-600">AI auditing...</div>
                <div v-else-if="auditResult[product.id].pass" class="text-sm font-semibold text-green-600">AI approved</div>
                <div v-else class="text-sm font-semibold text-red-600">AI rejected: {{ auditResult[product.id].reason }}</div>
              </div>

              <div v-if="product.status === 'pending'" class="mt-4">
                <button
                  @click="handleAudit(product)"
                  class="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                >
                  Audit This Product
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'gushi-listings'" class="space-y-4">
        <div class="flex justify-end">
          <button
            @click="loadPendingListings"
            :disabled="loadingPending"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {{ loadingPending ? $t('gushi.admin.listings.refreshing') : $t('gushi.admin.listings.refresh') }}
          </button>
        </div>

        <div v-if="loadingPending" class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          {{ $t('gushi.admin.listings.loading') }}
        </div>

        <div v-else-if="!pendingListings.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div class="mx-auto mb-4 h-14 w-14 rounded-full bg-slate-100"></div>
          <h3 class="text-lg font-semibold text-slate-800">{{ $t('gushi.admin.listings.emptyTitle') }}</h3>
          <p class="mt-2 text-sm text-slate-500">{{ $t('gushi.admin.listings.emptyDesc') }}</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-5">
          <div
            v-for="listing in pendingListings"
            :key="listing.id"
            class="rounded-2xl border border-slate-200 bg-white/75 backdrop-blur-xl p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.03] dark:backdrop-blur-xl"
          >
            <div class="flex flex-col gap-5 md:flex-row">
              <img
                :src="listing.images?.[0] || listing.product?.officialImage"
                class="h-36 w-full rounded-xl bg-slate-100 object-cover md:w-44"
              />

              <div class="flex-1">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <h3 class="text-lg font-semibold text-slate-900">
                    {{ listing.product?.ipName }} | {{ listing.product?.characterName }}
                  </h3>
                  <span class="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                    {{ $t('gushi.admin.listings.pendingBadge') }}
                  </span>
                </div>

                <div class="grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <p>{{ $t('gushi.admin.listings.seller') }}: {{ listing.seller?.username }} ({{ listing.seller?.email }})</p>
                  <p>{{ $t('gushi.admin.listings.price') }}: CNY {{ formatPrice(listing.price) }}</p>
                  <p>{{ $t('gushi.admin.listings.grade') }}: {{ listing.conditionGrade }}</p>
                  <p>{{ $t('gushi.admin.listings.stock') }}: {{ listing.availableQuantity }} / {{ listing.quantity }}</p>
                  <p>{{ $t('gushi.admin.listings.opened') }}: {{ listing.isOpened ? t('gushi.common.yes') : t('gushi.common.no') }}</p>
                  <p>{{ $t('gushi.admin.listings.originalBox') }}: {{ listing.hasOriginalPackage ? t('gushi.common.yes') : t('gushi.common.no') }}</p>
                </div>

                <p class="mt-2 text-sm text-slate-500">
                  {{ $t('gushi.admin.listings.defectNotes') }}: {{ listing.defectNotes || t('gushi.admin.listings.noNotes') }}
                </p>

                <p class="mt-1 text-xs text-slate-400">
                  {{ $t('gushi.admin.listings.submittedAt') }}: {{ new Date(listing.createdAt).toLocaleString() }}
                </p>

                <div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    v-model="listingRejectReasons[listing.id]"
                    type="text"
                    :placeholder="$t('gushi.admin.listings.rejectReasonPlaceholder')"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 md:max-w-xs"
                  />
                  <div class="flex gap-2">
                    <button
                      @click="approveListing(listing.id)"
                      :disabled="listingActionMap[listing.id]"
                      class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {{ listingActionMap[listing.id] ? $t('gushi.admin.common.processing') : $t('gushi.admin.common.approve') }}
                    </button>
                    <button
                      @click="rejectListing(listing.id)"
                      :disabled="listingActionMap[listing.id]"
                      class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
                    >
                      {{ listingActionMap[listing.id] ? $t('gushi.admin.common.processing') : $t('gushi.admin.common.reject') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'disputes'" class="space-y-4">
        <div class="flex justify-end">
          <button
            @click="loadPendingDisputes"
            :disabled="loadingDisputes"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {{ loadingDisputes ? $t('gushi.admin.disputes.refreshing') : $t('gushi.admin.disputes.refresh') }}
          </button>
        </div>

        <div v-if="loadingDisputes" class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          {{ $t('gushi.admin.disputes.loading') }}
        </div>

        <div v-else-if="!pendingDisputes.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div class="mx-auto mb-4 h-14 w-14 rounded-full bg-slate-100"></div>
          <h3 class="text-lg font-semibold text-slate-800">{{ $t('gushi.admin.disputes.emptyTitle') }}</h3>
          <p class="mt-2 text-sm text-slate-500">{{ $t('gushi.admin.disputes.emptyDesc') }}</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-5">
          <div
            v-for="dispute in pendingDisputes"
            :key="dispute.id"
            class="rounded-2xl border border-slate-200 bg-white/75 backdrop-blur-xl p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.03] dark:backdrop-blur-xl"
          >
            <div class="flex flex-col gap-4 md:flex-row">
              <img
                :src="dispute.order?.items?.[0]?.image || dispute.order?.gushiProduct?.officialImage"
                class="h-32 w-full rounded-xl bg-slate-100 object-cover md:w-40"
              />
              <div class="flex-1 space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-lg font-semibold text-slate-900">{{ dispute.order?.items?.[0]?.title || dispute.orderId }}</h3>
                  <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    {{ $t('gushi.admin.disputes.pendingBadge') }}
                  </span>
                </div>
                <p class="text-sm text-slate-600">{{ $t('gushi.admin.disputes.orderId') }}: {{ dispute.orderId }}</p>
                <p class="text-sm text-slate-600">
                  {{ $t('gushi.admin.disputes.buyerSeller') }}: {{ dispute.buyer?.username }} / {{ dispute.seller?.username }}
                </p>
                <p class="text-sm text-slate-700 dark:text-slate-200">
                  {{ $t('gushi.admin.disputes.amount') }}: CNY {{ formatPrice(dispute.order?.amount) }}
                </p>
                <div class="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200">
                  <p class="mb-1 font-semibold">{{ $t('gushi.admin.disputes.reason') }}</p>
                  <p class="whitespace-pre-wrap">{{ dispute.reason }}</p>
                </div>
                <div v-if="dispute.images?.length" class="space-y-2">
                  <p class="text-xs font-semibold text-slate-500">{{ $t('gushi.admin.disputes.evidence') }}</p>
                  <div class="grid grid-cols-4 gap-2">
                    <a
                      v-for="(url, idx) in dispute.images"
                      :key="`${dispute.id}-img-${idx}`"
                      :href="url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="block overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                    >
                      <img :src="url" class="h-16 w-full object-cover transition hover:scale-105" />
                    </a>
                  </div>
                </div>

                <input
                  v-model="disputeNotes[dispute.id]"
                  type="text"
                  :placeholder="$t('gushi.admin.disputes.notePlaceholder')"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 md:max-w-md"
                />

                <div class="flex gap-2 pt-1">
                  <button
                    @click="resolveDispute(dispute, 'release')"
                    :disabled="disputeActionMap[dispute.id]"
                    class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {{ disputeActionMap[dispute.id] ? $t('gushi.admin.common.processing') : $t('gushi.admin.disputes.forceRelease') }}
                  </button>
                  <button
                    @click="resolveDispute(dispute, 'refund')"
                    :disabled="disputeActionMap[dispute.id]"
                    class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
                  >
                    {{ disputeActionMap[dispute.id] ? $t('gushi.admin.common.processing') : $t('gushi.admin.disputes.forceRefund') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div class="flex justify-end">
          <button
            @click="loadPendingProductRequests"
            :disabled="loadingProductRequests"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {{ loadingProductRequests ? $t('gushi.admin.requests.refreshing') : $t('gushi.admin.requests.refresh') }}
          </button>
        </div>

        <div v-if="loadingProductRequests" class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          {{ $t('gushi.admin.requests.loading') }}
        </div>

        <div v-else-if="!pendingProductRequests.length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div class="mx-auto mb-4 h-14 w-14 rounded-full bg-slate-100"></div>
          <h3 class="text-lg font-semibold text-slate-800">{{ $t('gushi.admin.requests.emptyTitle') }}</h3>
          <p class="mt-2 text-sm text-slate-500">{{ $t('gushi.admin.requests.emptyDesc') }}</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-5">
          <div
            v-for="item in pendingProductRequests"
            :key="item.id"
            class="rounded-2xl border border-slate-200 bg-white/75 backdrop-blur-xl p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.03] dark:backdrop-blur-xl"
          >
            <div class="flex flex-col gap-5 md:flex-row">
              <img
                :src="item.officialImage || 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80'"
                class="h-36 w-full rounded-xl bg-slate-100 object-cover md:w-44"
              />
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-slate-900">{{ item.ipName }} | {{ item.characterName }}</h3>
                <div class="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <p>{{ $t('gushi.admin.requests.category') }}: {{ item.category }}</p>
                  <p>{{ $t('gushi.admin.requests.series') }}: {{ item.seriesName || '--' }}</p>
                  <p>{{ $t('gushi.admin.requests.price') }}: {{ item.officialPrice ? `CNY ${formatPrice(item.officialPrice)}` : '--' }}</p>
                  <p>{{ $t('gushi.admin.requests.requester') }}: {{ item.user?.username }} ({{ item.user?.email }})</p>
                </div>
                <p class="mt-1 text-xs text-slate-400">
                  {{ $t('gushi.admin.requests.submittedAt') }}: {{ new Date(item.createdAt).toLocaleString() }}
                </p>

                <div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    v-model="requestNotes[item.id]"
                    type="text"
                    :placeholder="$t('gushi.admin.requests.notePlaceholder')"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 md:max-w-xs"
                  />
                  <div class="flex gap-2">
                    <button
                      @click="approveRequest(item.id)"
                      :disabled="requestActionMap[item.id]"
                      class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {{ requestActionMap[item.id] ? $t('gushi.admin.common.processing') : $t('gushi.admin.requests.approveConvert') }}
                    </button>
                    <button
                      @click="rejectRequest(item.id)"
                      :disabled="requestActionMap[item.id]"
                      class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
                    >
                      {{ requestActionMap[item.id] ? $t('gushi.admin.common.processing') : $t('gushi.admin.common.reject') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
