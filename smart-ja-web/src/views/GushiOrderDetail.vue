<template>
  <div class="min-h-screen bg-slate-50 dark:bg-black px-4 pt-24 pb-12 text-slate-900 dark:text-white sm:px-6 lg:px-8">
    <div v-if="order" class="mx-auto max-w-4xl">
      <div class="mb-8 flex items-center gap-2 text-sm text-gray-400">
        <router-link to="/gushi/my" class="transition hover:text-slate-900 dark:text-white">{{ $t('gushi.orderDetail.breadcrumbCabinet') }}</router-link>
        <span>/</span>
        <span class="font-medium text-slate-900 dark:text-white">{{ $t('gushi.orderDetail.breadcrumbOrder', { id: order.id }) }}</span>
      </div>

      <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div class="space-y-6 md:col-span-2">
          <div class="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] p-6">
            <div class="mb-6 flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-6">
              <h2 class="text-xl font-semibold">{{ $t('gushi.orderDetail.statusTitle') }}</h2>
              <span class="rounded-full px-3 py-1 text-sm font-medium" :class="statusColor(displayStatus)">
                {{ formatOrderStatus(displayStatus) }}
              </span>
            </div>

            <div class="mb-6 flex items-start gap-4">
              <img :src="order.items?.[0]?.image" class="h-24 w-24 rounded-lg bg-slate-50 dark:bg-black object-cover" />
              <div>
                <h3 class="text-lg font-medium">{{ order.items?.[0]?.title }}</h3>
                <div class="mt-1 space-y-1 text-sm text-gray-400">
                  <p>{{ $t('gushi.orderDetail.grade') }}: {{ order.items?.[0]?.itemMeta?.conditionGrade || '--' }}</p>
                  <p>{{ $t('gushi.orderDetail.opened') }}: {{ order.items?.[0]?.itemMeta?.isOpened ? $t('gushi.common.yes') : $t('gushi.common.no') }}</p>
                  <p>{{ $t('gushi.orderDetail.originalBox') }}: {{ order.items?.[0]?.itemMeta?.hasOriginalPackage ? $t('gushi.common.yes') : $t('gushi.common.no') }}</p>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-black p-4">
              <div class="text-sm text-gray-400">{{ $t('gushi.orderDetail.totalAmount') }}</div>
              <div class="font-mono text-2xl font-bold">CNY {{ formatPrice(order.amount) }}</div>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] p-6">
            <h3 class="mb-4 text-sm font-medium text-gray-400">{{ $t('gushi.orderDetail.timelineTitle') }}</h3>
            <div class="space-y-6 border-l-2 border-green-500/30 py-2 pl-4">
              <div class="relative">
                <div class="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-green-500"></div>
                <p class="text-sm font-medium">{{ $t('gushi.orderDetail.timelinePaid') }}</p>
                <p class="text-xs text-gray-500">{{ formatDateTime(order.createdAt) }}</p>
              </div>
              <div class="relative" :class="order.shippedAt ? 'opacity-100' : 'opacity-40'">
                <div class="absolute -left-[21px] top-1 h-3 w-3 rounded-full" :class="order.shippedAt ? 'bg-green-500' : 'bg-gray-600'"></div>
                <p class="text-sm font-medium">{{ $t('gushi.orderDetail.timelineShipped') }}</p>
                <p v-if="order.shippedAt" class="text-xs text-gray-500">{{ formatDateTime(order.shippedAt) }}</p>
              </div>
              <div class="relative" :class="order.settledAt ? 'opacity-100' : 'opacity-40'">
                <div class="absolute -left-[21px] top-1 h-3 w-3 rounded-full" :class="order.settledAt ? 'bg-green-500' : 'bg-gray-600'"></div>
                <p class="text-sm font-medium">{{ $t('gushi.orderDetail.timelineSettled') }}</p>
                <p v-if="order.settledAt" class="text-xs text-gray-500">{{ formatDateTime(order.settledAt) }}</p>
              </div>
              <div v-if="order.settlementStatus === 'disputed' || disputeInfo" class="relative">
                <div class="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-amber-400"></div>
                <p class="text-sm font-medium text-amber-300">{{ $t('gushi.orderDetail.timelineDisputed') }}</p>
                <p class="text-xs text-gray-500">{{ formatDateTime(disputeInfo?.createdAt || order.updatedAt) }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] p-6">
            <h3 class="mb-4 font-medium">{{ $t('gushi.orderDetail.orderInfo') }}</h3>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">{{ $t('gushi.orderDetail.buyer') }}</span>
                <span>{{ order.buyer?.username || '--' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">{{ $t('gushi.orderDetail.seller') }}</span>
                <span>{{ order.provider?.username || '--' }}</span>
              </div>
              <div v-if="order.trackingNumber" class="flex justify-between">
                <span class="text-gray-500">{{ $t('gushi.orderDetail.tracking', { company: order.trackingCompany || '--' }) }}</span>
                <span class="font-mono text-gray-300">{{ order.trackingNumber }}</span>
              </div>
              <div v-if="order.settlementStatus" class="flex justify-between">
                <span class="text-gray-500">{{ $t('gushi.orderDetail.settlementStatus') }}</span>
                <span>{{ formatSettlementStatus(order.settlementStatus) }}</span>
              </div>
            </div>
          </div>

          <div v-if="disputeInfo" class="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-6">
            <h3 class="mb-3 font-medium text-amber-300">{{ $t('gushi.orderDetail.disputeCardTitle') }}</h3>
            <p class="whitespace-pre-wrap text-sm text-gray-300">{{ disputeInfo.reason }}</p>
            <div v-if="disputeInfo.images?.length" class="mt-3 grid grid-cols-3 gap-2">
              <a
                v-for="(url, idx) in disputeInfo.images"
                :key="`${url}-${idx}`"
                :href="url"
                target="_blank"
                rel="noopener noreferrer"
                class="group block overflow-hidden rounded-lg border border-amber-200/20"
              >
                <img :src="url" class="h-20 w-full object-cover transition group-hover:scale-105" />
              </a>
            </div>
            <p class="mt-3 text-xs text-gray-500">
              {{ $t('gushi.orderDetail.disputeStatusLabel') }}: {{ formatDisputeStatus(disputeInfo.status) }}
            </p>
          </div>

          <div v-if="actionNeeded" class="rounded-2xl border border-blue-500/20 bg-gray-900 p-6">
            <h3 class="mb-4 flex items-center gap-2 font-medium text-yellow-400">
              {{ $t('gushi.orderDetail.actionRequired') }}
            </h3>

            <div v-if="isSeller && order.status === 'paid'" class="space-y-4">
              <input
                v-model="tracking.company"
                :placeholder="$t('gushi.orderDetail.courierPlaceholder')"
                class="w-full rounded-lg border border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-black px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
              <input
                v-model="tracking.number"
                :placeholder="$t('gushi.orderDetail.trackingPlaceholder')"
                class="w-full rounded-lg border border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-black px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
              <button
                @click="shipOrder"
                :disabled="loadingAction"
                class="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-slate-900 dark:text-white transition hover:bg-blue-500"
              >
                {{ loadingAction ? $t('gushi.orderDetail.processing') : $t('gushi.orderDetail.markShipped') }}
              </button>
            </div>

            <div v-if="isBuyer && order.status === 'shipped'" class="space-y-4">
              <template v-if="order.settlementStatus !== 'disputed' && !disputeInfo">
                <p class="mb-2 text-sm text-gray-400">{{ $t('gushi.orderDetail.confirmHint') }}</p>
                <div class="grid grid-cols-1 gap-3">
                  <button
                    @click="confirmReceipt"
                    :disabled="loadingAction"
                    class="w-full rounded-lg bg-green-600 py-3 text-sm font-medium text-slate-900 dark:text-white transition hover:bg-green-500"
                  >
                    {{ loadingAction ? $t('gushi.orderDetail.processing') : $t('gushi.orderDetail.confirmReceipt') }}
                  </button>
                  <button
                    @click="showDisputeModal = true"
                    :disabled="loadingAction"
                    class="w-full rounded-lg bg-amber-600/90 py-3 text-sm font-medium text-slate-900 dark:text-white transition hover:bg-amber-500"
                  >
                    {{ $t('gushi.orderDetail.disputeAction') }}
                  </button>
                </div>
              </template>
              <p v-else class="text-sm text-amber-300">{{ $t('gushi.orderDetail.disputePendingHint') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex justify-center py-20">
      <div class="animate-pulse text-gray-400">{{ $t('gushi.orderDetail.loading') }}</div>
    </div>

    <transition name="gushi-fade">
      <div v-if="showDisputeModal" class="fixed inset-0 z-40 flex items-center justify-center bg-slate-50 dark:bg-slate-900/40 dark:bg-black/70 px-4">
        <div class="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 bg-[#0b0b0f] p-6 shadow-2xl">
          <h3 class="mb-2 text-lg font-semibold">{{ $t('gushi.orderDetail.disputeModalTitle') }}</h3>
          <p class="mb-4 text-sm text-gray-400">{{ $t('gushi.orderDetail.disputeModalDesc') }}</p>
          <textarea
            v-model="disputeForm.reason"
            rows="4"
            class="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-black px-3 py-3 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
            :placeholder="$t('gushi.orderDetail.disputeReasonPlaceholder')"
          ></textarea>
          <div class="mt-4 space-y-2">
            <p class="text-sm text-gray-300">{{ $t('gushi.orderDetail.disputeEvidenceLabel') }}</p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              class="block w-full text-xs text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-900 dark:text-white hover:file:bg-white/20"
              @change="onSelectDisputeFiles"
            />
            <p class="text-xs text-gray-500">{{ $t('gushi.orderDetail.disputeEvidenceHint', { count: MAX_DISPUTE_FILES, size: MAX_DISPUTE_FILE_SIZE_MB }) }}</p>
            <div v-if="disputeForm.evidenceItems.length" class="grid grid-cols-3 gap-2 pt-1">
              <div
                v-for="item in disputeForm.evidenceItems"
                :key="item.id"
                class="relative overflow-hidden rounded-lg border border-slate-200 dark:border-white/10"
              >
                <img :src="item.preview" class="h-20 w-full object-cover" />
                <div class="absolute inset-x-0 bottom-0 bg-slate-50 dark:bg-black/65 px-2 py-1 text-[10px] text-gray-200">
                  {{ evidenceStatusText(item.status) }}
                </div>
                <button
                  v-if="item.status === 'failed'"
                  @click="retryEvidenceUpload(item.id)"
                  type="button"
                  class="absolute right-1 top-1 rounded bg-rose-500/90 px-1.5 py-0.5 text-[10px] text-slate-900 dark:text-white"
                >
                  {{ $t('gushi.orderDetail.disputeEvidenceRetry') }}
                </button>
              </div>
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-3">
            <button @click="closeDisputeModal" class="rounded-lg border border-slate-200 dark:border-white/20 px-4 py-2 text-gray-300 hover:text-slate-900 dark:text-white">
              {{ $t('gushi.orderDetail.disputeCancel') }}
            </button>
            <button
              @click="submitDispute"
              :disabled="loadingAction || hasUploadingEvidence"
              class="rounded-lg bg-amber-600 px-4 py-2 font-medium text-slate-900 dark:text-white hover:bg-amber-500 disabled:opacity-60"
            >
              {{ loadingAction ? $t('gushi.orderDetail.processing') : $t('gushi.orderDetail.disputeSubmit') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useToast } from '../composables/useToast';
import { GushiService, UserService } from '../services/api';

const MAX_DISPUTE_FILES = 6;
const MAX_DISPUTE_FILE_SIZE_MB = 5;
const ALLOWED_DISPUTE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const { t } = useI18n();
const route = useRoute();
const { show: showToast } = useToast();

const orderId = route.params.id;
const order = ref(null);
const currentUserId = ref(null);
const loadingAction = ref(false);
const tracking = ref({ company: '', number: '' });
const showDisputeModal = ref(false);
const disputeForm = ref({ reason: '', evidenceItems: [] });

const resolveUserIdFromToken = () => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id || payload.userId || null;
  } catch (error) {
    return null;
  }
};

onMounted(async () => {
  currentUserId.value = resolveUserIdFromToken();
  await loadOrder();
});

onBeforeUnmount(() => {
  clearDisputePreviews();
});

const loadOrder = async () => {
  try {
    const res = await GushiService.getOrderDetail(orderId);
    if (res.success) {
      order.value = res.data;
    }
  } catch (error) {
    showToast(t('gushi.orderDetail.loadFailed'), 'error');
  }
};

const isBuyer = computed(() => order.value?.buyerId === currentUserId.value);
const isSeller = computed(() => order.value?.providerId === currentUserId.value);
const disputeInfo = computed(() => order.value?.gushiDispute || null);
const displayStatus = computed(() =>
  order.value?.settlementStatus === 'disputed' ? 'disputed' : order.value?.status
);
const hasUploadingEvidence = computed(() =>
  disputeForm.value.evidenceItems.some((item) => item.status === 'uploading')
);

const actionNeeded = computed(() => {
  if (isSeller.value && order.value?.status === 'paid') return true;
  if (isBuyer.value && order.value?.status === 'shipped') return true;
  return false;
});

const statusColor = (status) => {
  const map = {
    paid: 'bg-blue-900/40 text-blue-400',
    shipped: 'bg-yellow-900/40 text-yellow-400',
    disputed: 'bg-amber-900/50 text-amber-300',
    completed: 'bg-green-900/40 text-green-400',
    cancelled: 'bg-red-900/40 text-red-400'
  };
  return map[status] || 'bg-gray-800 text-gray-400';
};

const formatOrderStatus = (status) => {
  const key = `gushi.status.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
};

const formatSettlementStatus = (status) => {
  const key = `gushi.settlement.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
};

const formatDisputeStatus = (status) => {
  const key = `gushi.disputeStatus.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
};

const shipOrder = async () => {
  if (!isSeller.value) {
    showToast(t('gushi.orderDetail.invalidShipState'), 'warning');
    return;
  }
  if (order.value?.status !== 'paid') {
    showToast(t('gushi.orderDetail.invalidShipState'), 'warning');
    return;
  }
  if (!tracking.value.company || !tracking.value.number) {
    showToast(t('gushi.orderDetail.trackingRequired'), 'info');
    return;
  }

  loadingAction.value = true;
  try {
    const res = await GushiService.shipOrder(orderId, {
      trackingCompany: tracking.value.company,
      trackingNumber: tracking.value.number
    });
    if (res.success) {
      showToast(t('gushi.orderDetail.shipSuccess'), 'success');
      await loadOrder();
    }
  } catch (error) {
    showToast(error?.message || t('gushi.orderDetail.shipFailed'), 'error');
  } finally {
    loadingAction.value = false;
  }
};

const confirmReceipt = async () => {
  if (!isBuyer.value || order.value?.status !== 'shipped' || order.value?.settlementStatus === 'disputed') {
    showToast(t('gushi.orderDetail.invalidConfirmState'), 'warning');
    return;
  }

  const ok = window.confirm(t('gushi.orderDetail.confirmReceiptDialog'));
  if (!ok) return;

  loadingAction.value = true;
  try {
    const res = await GushiService.confirmOrder(orderId);
    if (res.success) {
      showToast(t('gushi.orderDetail.confirmSuccess'), 'success');
      window.dispatchEvent(
        new CustomEvent('gushi:settled', {
          detail: {
            productId: order.value?.gushiProductId || order.value?.gushiListing?.gushiProductId || null,
            orderId
          }
        })
      );
      await loadOrder();
    }
  } catch (error) {
    showToast(error?.message || t('gushi.orderDetail.confirmFailed'), 'error');
  } finally {
    loadingAction.value = false;
  }
};

const createEvidenceItem = (file) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  file,
  preview: URL.createObjectURL(file),
  status: 'ready',
  uploadedUrl: '',
  error: ''
});

const clearDisputePreviews = () => {
  disputeForm.value.evidenceItems.forEach((item) => URL.revokeObjectURL(item.preview));
  disputeForm.value.evidenceItems = [];
};

const evidenceStatusText = (status) => {
  const map = {
    ready: t('gushi.orderDetail.disputeEvidencePending'),
    uploading: t('gushi.orderDetail.disputeEvidenceUploading'),
    uploaded: t('gushi.orderDetail.disputeEvidenceUploaded'),
    failed: t('gushi.orderDetail.disputeEvidenceFailed')
  };
  return map[status] || status;
};

const onSelectDisputeFiles = (event) => {
  const selected = Array.from(event.target.files || []);
  event.target.value = '';
  if (!selected.length) return;

  const currentCount = disputeForm.value.evidenceItems.length;
  let remaining = MAX_DISPUTE_FILES - currentCount;
  if (remaining <= 0) {
    showToast(t('gushi.orderDetail.disputeEvidenceTooMany', { count: MAX_DISPUTE_FILES }), 'info');
    return;
  }

  let added = 0;
  for (const file of selected) {
    if (remaining <= 0) break;

    if (!ALLOWED_DISPUTE_IMAGE_TYPES.has(file.type)) {
      showToast(t('gushi.orderDetail.disputeEvidenceTypeInvalid', { name: file.name || 'file' }), 'warning');
      continue;
    }

    if (file.size > MAX_DISPUTE_FILE_SIZE_MB * 1024 * 1024) {
      showToast(
        t('gushi.orderDetail.disputeEvidenceFileTooLarge', {
          name: file.name || 'file',
          size: MAX_DISPUTE_FILE_SIZE_MB
        }),
        'warning'
      );
      continue;
    }

    disputeForm.value.evidenceItems.push(createEvidenceItem(file));
    remaining -= 1;
    added += 1;
  }

  if (added < selected.length) {
    showToast(t('gushi.orderDetail.disputeEvidenceTooMany', { count: MAX_DISPUTE_FILES }), 'info');
  }
};

const uploadSingleEvidence = async (itemId) => {
  const item = disputeForm.value.evidenceItems.find((candidate) => candidate.id === itemId);
  if (!item || !item.file) return false;

  item.status = 'uploading';
  item.error = '';
  try {
    const response = await UserService.uploadFile(item.file);
    if (!response?.url) {
      throw new Error('No uploaded url returned');
    }
    item.uploadedUrl = response.url;
    item.status = 'uploaded';
    return true;
  } catch (error) {
    item.status = 'failed';
    item.error = error?.message || 'upload failed';
    return false;
  }
};

const uploadDisputeImages = async () => {
  const pendingItems = disputeForm.value.evidenceItems.filter((item) =>
    ['ready', 'failed'].includes(item.status)
  );
  for (const item of pendingItems) {
    // Keep uploads sequential for better UX and simpler retry state.
    await uploadSingleEvidence(item.id);
  }

  const hasFailed = disputeForm.value.evidenceItems.some((item) => item.status === 'failed');
  if (hasFailed) {
    throw new Error(t('gushi.orderDetail.disputeEvidenceUploadFailed'));
  }

  return disputeForm.value.evidenceItems
    .filter((item) => item.status === 'uploaded' && item.uploadedUrl)
    .map((item) => item.uploadedUrl);
};

const retryEvidenceUpload = async (itemId) => {
  if (loadingAction.value) return;
  const ok = await uploadSingleEvidence(itemId);
  if (!ok) {
    showToast(t('gushi.orderDetail.disputeEvidenceUploadFailed'), 'error');
  }
};

const closeDisputeModal = () => {
  if (loadingAction.value) return;
  showDisputeModal.value = false;
  disputeForm.value.reason = '';
  clearDisputePreviews();
};

const submitDispute = async () => {
  if (!isBuyer.value || order.value?.status !== 'shipped') {
    showToast(t('gushi.orderDetail.invalidDisputeState'), 'warning');
    return;
  }
  if (order.value?.settlementStatus === 'disputed' || disputeInfo.value) {
    showToast(t('gushi.orderDetail.disputePendingHint'), 'info');
    return;
  }

  const reason = String(disputeForm.value.reason || '').trim();
  if (!reason) {
    showToast(t('gushi.orderDetail.disputeReasonRequired'), 'info');
    return;
  }

  loadingAction.value = true;
  try {
    const images = await uploadDisputeImages();
    const res = await GushiService.createDispute(orderId, { reason, images });
    if (res.success) {
      showToast(t('gushi.orderDetail.disputeSuccess'), 'success');
      closeDisputeModal();
      await loadOrder();
    }
  } catch (error) {
    showToast(error?.message || t('gushi.orderDetail.disputeFailed'), 'error');
  } finally {
    loadingAction.value = false;
  }
};

const formatDateTime = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleString();
};

const formatPrice = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return Number(value).toFixed(2);
};
</script>

<style scoped>
.gushi-fade-enter-active,
.gushi-fade-leave-active {
  transition: opacity 0.18s ease;
}

.gushi-fade-enter-from,
.gushi-fade-leave-to {
  opacity: 0;
}
</style>
