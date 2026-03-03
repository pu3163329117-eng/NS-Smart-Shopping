<script setup>
import { onMounted, ref } from 'vue';
import { MakerService } from '../../services/api';
import { useToast } from '../../composables/useToast';
import ServiceWizard from './ServiceWizard.vue';

const services = ref([]);
const showWizard = ref(false);
const editingService = ref(null);
const isLoading = ref(true);
const { show: showToast } = useToast();

const fetchServices = async () => {
  isLoading.value = true;

  try {
    services.value = await MakerService.getServices();
  } catch (error) {
    showToast(`加载服务失败：${error.message}`, 'error');
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
  const confirmed = window.confirm(`确认下架“${service.title || service.name}”吗？`);
  if (!confirmed) {
    return;
  }

  try {
    await MakerService.deleteService(service.id);
    services.value = services.value.filter((item) => item.id !== service.id);
    showToast('服务已下架。', 'success');
  } catch (error) {
    showToast(`下架失败：${error.message}`, 'error');
  }
};

const getTypeLabel = (service) => {
  if (service.type === 'course') {
    return '课程';
  }

  if (service.type === '3d_print') {
    return '代工';
  }

  return '定制';
};

const getStatusLabel = (service) => ((service.status || 'active') === 'active' ? '已上架' : '审核中');

const formatPrice = (value) => `¥${Number(value || 0).toFixed(2)}`;

onMounted(() => {
  void fetchServices();
});
</script>

<template>
  <div class="space-y-8 text-slate-900 transition-colors duration-500 dark:text-white">
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-400 dark:text-slate-500">Service Deck</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">我的作品与服务</h1>
        <p class="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
          用统一的作品工作台管理上架内容，在暗色模式下保持更克制的展示质感。
        </p>
      </div>

      <button
        type="button"
        class="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-100"
        @click="showWizard = true"
      >
        发布新作品
      </button>
    </div>

    <div
      v-if="isLoading"
      class="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm transition-colors dark:border-white/5 dark:bg-white/[0.02] dark:backdrop-blur-xl"
    >
      <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700 dark:border-white/10 dark:border-t-white/70"></div>
      <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">正在同步作品列表...</p>
    </div>

    <div
      v-else-if="services.length === 0"
      class="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm transition-colors dark:border-white/10 dark:bg-white/[0.02] dark:backdrop-blur-xl"
    >
      <div class="text-5xl text-slate-300 dark:text-white/30">+</div>
      <h2 class="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">还没有发布作品</h2>
      <p class="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
        发布第一个作品后，它会立即出现在这里，并进入你的创客经营流。
      </p>
      <button
        type="button"
        class="mt-6 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.06]"
        @click="showWizard = true"
      >
        立即发布
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
            v-if="service.image"
            :src="service.image"
            :alt="service.title || service.name"
            class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div v-else class="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            暂无封面
          </div>

          <div class="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
            <span class="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-black/40 dark:text-white">
              {{ getTypeLabel(service) }}
            </span>
            <span
              class="rounded-full border px-3 py-1 text-xs font-semibold"
              :class="
                (service.status || 'active') === 'active'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/15 dark:bg-emerald-300/10 dark:text-emerald-100'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/15 dark:bg-amber-300/10 dark:text-amber-100'
              "
            >
              {{ getStatusLabel(service) }}
            </span>
          </div>
        </div>

        <div class="flex flex-1 flex-col p-5">
          <div class="flex items-start justify-between gap-3">
            <h2 class="line-clamp-1 text-lg font-semibold text-slate-900 transition-colors group-hover:text-slate-700 dark:text-white dark:group-hover:text-slate-100">
              {{ service.title || service.name }}
            </h2>
            <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ formatPrice(service.price) }}</span>
          </div>

          <p class="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-7 text-slate-500 dark:text-slate-400">
            {{ service.description || service.desc || '这是一项正在经营中的创客服务。' }}
          </p>

          <div class="mt-5 grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-white/5 dark:bg-white/[0.03]">
            <div>
              <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">浏览</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{{ service.views || 0 }}</p>
            </div>
            <div>
              <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">成交</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{{ service.sales || 0 }}</p>
            </div>
            <div>
              <p class="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">模式</p>
              <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                {{ service.productionMode === 'factory' ? 'C2M' : '标准' }}
              </p>
            </div>
          </div>

          <div class="mt-5 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:bg-white/[0.06]"
              @click="handleEdit(service)"
            >
              编辑
            </button>
            <button
              type="button"
              class="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-100"
              @click="handleDelete(service)"
            >
              下架
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
