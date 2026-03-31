<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MakerService } from '../../services/api';
import { useToast } from '../../composables/useToast';
import ServiceWizard from './ServiceWizard.vue';

const services = ref([]);
const showWizard = ref(false);
const editingService = ref(null);
const isLoading = ref(true);
const { show: showToast } = useToast();
const { t } = useI18n();

const fetchServices = async () => {
  isLoading.value = true;

  try {
    services.value = await MakerService.getServices();
  } catch (error) {
    showToast(
      t('maker.servicesPage.toast.loadFailed', { message: error?.message || 'Unknown error' }),
      'error'
    );
  } finally {
    isLoading.value = false;
  }
};

const handlePublishSuccess = () => {
  showWizard.value = false;
  editingService.value = null;
  void fetchServices();
};

const handleWizardClose = () => {
  showWizard.value = false;
  editingService.value = null;
};

const handleEdit = (service) => {
  editingService.value = service;
  showWizard.value = true;
};

const handleDelete = async (service) => {
  const title = service?.title || service?.name || t('maker.unknownService');
  const confirmed = window.confirm(t('maker.servicesPage.confirmUnlist', { title }));
  if (!confirmed) {
    return;
  }

  try {
    await MakerService.deleteService(service.id);
    services.value = services.value.filter((item) => item.id !== service.id);
    showToast(t('maker.servicesPage.toast.unlistSuccess'), 'success');
  } catch (error) {
    showToast(
      t('maker.servicesPage.toast.unlistFailed', { message: error?.message || 'Unknown error' }),
      'error'
    );
  }
};

const getTypeLabel = (service) => {
  if (service.type === 'course') {
    return t('maker.servicesPage.type.course');
  }

  if (service.type === '3d_print') {
    return t('maker.servicesPage.type.print3d');
  }

  return t('maker.servicesPage.type.custom');
};

const getStatusLabel = (service) => (
  (service.status || 'active') === 'active'
    ? t('maker.servicesPage.status.active')
    : t('maker.servicesPage.status.pending')
);

const formatPrice = (value) => `¥${Number(value || 0).toFixed(2)}`;
const getServiceCover = (service) => service?.image || service?.imageUrl || service?.cover || '';

const normalizeTags = (service) => {
  const raw = service?.tags;
  if (Array.isArray(raw)) {
    return raw.map((tag) => String(tag || '').trim()).filter(Boolean);
  }

  if (typeof raw === 'string') {
    return raw
      .split(/[,\s，、|/]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const isAiService = (service) => {
  const tags = normalizeTags(service);
  if (!tags.length) {
    return false;
  }

  return tags.some((tag) => {
    const normalized = tag.toLowerCase();
    if (normalized === 'ai incubated' || normalized === 'ai maker') {
      return true;
    }

    return normalized.includes('ai')
      && (
        tag.includes('孵化')
        || tag.includes('创客')
        || normalized.includes('incubat')
        || normalized.includes('maker')
      );
  });
};

onMounted(() => {
  void fetchServices();
});
</script>

<template>
  <div class="space-y-8 text-slate-900 transition-colors duration-500 dark:text-white">
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-400 dark:text-slate-500">
          {{ $t('maker.servicesPage.deck') }}
        </p>
        <h1 class="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">
          {{ $t('maker.servicesPage.title') }}
        </h1>
        <p class="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
          {{ $t('maker.servicesPage.subtitle') }}
        </p>
      </div>

      <button
        type="button"
        class="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-100"
        @click="showWizard = true"
      >
        {{ $t('maker.servicesPage.publishNew') }}
      </button>
    </div>

    <div
      v-if="isLoading"
      class="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl"
    >
      <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700 dark:border-white/10 dark:border-t-white/70"></div>
      <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">{{ $t('maker.servicesPage.loading') }}</p>
    </div>

    <div
      v-else-if="services.length === 0"
      class="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm transition-colors dark:border-white/10 dark:bg-white/[0.02] dark:backdrop-blur-xl"
    >
      <div class="text-5xl text-slate-300 dark:text-white/30">+</div>
      <h2 class="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {{ $t('maker.servicesPage.emptyTitle') }}
      </h2>
      <p class="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
        {{ $t('maker.servicesPage.emptyDesc') }}
      </p>
      <button
        type="button"
        class="mt-6 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.06]"
        @click="showWizard = true"
      >
        {{ $t('maker.servicesPage.publishNow') }}
      </button>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="service in services"
        :key="service.id"
        class="group flex h-full flex-col overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-white/5 dark:bg-white/[0.02] dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)] dark:backdrop-blur-xl dark:hover:border-white/10"
      >
        <div class="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-white/[0.03]">
          <img
            v-if="getServiceCover(service)"
            :src="getServiceCover(service)"
            :alt="service.title || service.name"
            class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div v-else class="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            {{ $t('maker.servicesPage.noCover') }}
          </div>

          <div
            v-if="isAiService(service)"
            class="ai-badge absolute right-4 top-4 rounded-full border border-cyan-200/55 bg-cyan-400/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.45)] backdrop-blur-xl"
          >
            <span class="relative z-10">{{ $t('maker.servicesPage.aiBadge') }}</span>
          </div>

          <span class="absolute left-4 top-4 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-black/40 dark:text-white">
            {{ getTypeLabel(service) }}
          </span>

          <span
            class="absolute bottom-4 right-4 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm"
            :class="
              (service.status || 'active') === 'active'
                ? 'border-emerald-200 bg-emerald-50/92 text-emerald-700 dark:border-emerald-300/15 dark:bg-emerald-300/10 dark:text-emerald-100'
                : 'border-amber-200 bg-amber-50/92 text-amber-700 dark:border-amber-300/15 dark:bg-amber-300/10 dark:text-amber-100'
            "
          >
            {{ getStatusLabel(service) }}
          </span>
        </div>

        <div class="flex flex-1 flex-col p-5">
          <div class="flex items-start justify-between gap-3">
            <h2 class="line-clamp-1 text-lg font-semibold text-slate-900 transition-colors group-hover:text-slate-700 dark:text-white dark:group-hover:text-slate-100">
              {{ service.title || service.name }}
            </h2>
            <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ formatPrice(service.price) }}</span>
          </div>

          <p class="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-7 text-slate-500 dark:text-slate-400">
            {{ service.description || service.desc || $t('maker.servicesPage.descriptionFallback') }}
          </p>

          <div class="mt-5 grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-white/5 dark:bg-white/[0.03]">
            <div>
              <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{{ $t('maker.servicesPage.stats.views') }}</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{{ service.views || 0 }}</p>
            </div>
            <div>
              <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{{ $t('maker.servicesPage.stats.sales') }}</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{{ service.sales || 0 }}</p>
            </div>
            <div>
              <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{{ $t('maker.servicesPage.stats.mode') }}</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                {{ service.productionMode === 'factory' ? $t('maker.servicesPage.mode.c2m') : $t('maker.servicesPage.mode.standard') }}
              </p>
            </div>
          </div>

          <div class="mt-5 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.06]"
              @click="handleEdit(service)"
            >
              {{ $t('maker.servicesPage.actions.edit') }}
            </button>
            <button
              type="button"
              class="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-100"
              @click="handleDelete(service)"
            >
              {{ $t('maker.servicesPage.actions.unlist') }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <ServiceWizard
      v-if="showWizard"
      :initial-data="editingService"
      @close="handleWizardClose"
      @success="handlePublishSuccess"
    />
  </div>
</template>

<style scoped>
.ai-badge {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  animation: aiBadgePulse 3.2s ease-in-out infinite;
}

.ai-badge::before {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-120%);
  background: linear-gradient(
    112deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 28%,
    rgba(255, 255, 255, 0.85) 50%,
    rgba(255, 255, 255, 0.08) 72%,
    transparent 100%
  );
  animation: aiBadgeSweep 2.8s ease-in-out infinite;
}

.ai-badge::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 9999px;
  border: 1px solid rgba(125, 211, 252, 0.6);
  opacity: 0.55;
  animation: aiBadgeHalo 2.4s ease-in-out infinite;
}

@keyframes aiBadgeSweep {
  0% {
    transform: translateX(-120%);
  }
  65%,
  100% {
    transform: translateX(130%);
  }
}

@keyframes aiBadgeHalo {
  0%,
  100% {
    opacity: 0.28;
  }
  50% {
    opacity: 0.75;
  }
}

@keyframes aiBadgePulse {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(0, -1px, 0);
  }
}
</style>
