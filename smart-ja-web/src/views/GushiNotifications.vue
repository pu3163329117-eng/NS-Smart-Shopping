<template>
  <div class="min-h-screen bg-black px-4 py-12 text-white sm:px-6 lg:px-8">
    <div class="mx-auto max-w-4xl space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ $t('gushi.notifications.title') }}</h1>
          <p class="mt-1 text-sm text-gray-400">{{ $t('gushi.notifications.subtitle') }}</p>
        </div>
        <button
          @click="markAllRead"
          :disabled="markingAll || !notifications.length"
          class="rounded-xl border border-white/15 px-4 py-2 text-sm transition hover:border-white/30 disabled:opacity-50"
        >
          {{ markingAll ? $t('gushi.notifications.processing') : $t('gushi.notifications.markAll') }}
        </button>
      </div>

      <div v-if="loading" class="rounded-2xl border border-white/10 bg-[#0a0a0d] p-10 text-center text-gray-400">
        {{ $t('gushi.notifications.loading') }}
      </div>

      <div v-else-if="!notifications.length" class="rounded-2xl border border-dashed border-white/10 bg-[#0a0a0d] p-14 text-center">
        <div class="mx-auto mb-4 h-16 w-16 rounded-full bg-white/[0.05] ring-1 ring-white/10"></div>
        <p class="text-sm text-gray-300">{{ $t('gushi.notifications.emptyTitle') }}</p>
        <p class="mt-2 text-xs text-gray-500">{{ $t('gushi.notifications.emptyDesc') }}</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="item in notifications"
          :key="item.id"
          class="gushi-notification-item rounded-2xl border p-4 transition"
          :class="item.isRead ? 'border-white/10 bg-[#09090c]' : 'border-blue-400/35 bg-[#0b0e13]'"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-semibold">{{ item.title }}</p>
              <p class="mt-1 text-sm text-gray-300">{{ item.content }}</p>
              <p class="mt-2 text-xs text-gray-500">{{ formatDate(item.createdAt) }}</p>
            </div>
            <button
              v-if="!item.isRead"
              @click="markRead(item)"
              class="rounded-lg border border-blue-400/40 px-3 py-1 text-xs text-blue-200 transition hover:bg-blue-500/10"
            >
              {{ $t('gushi.notifications.markRead') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import gsap from 'gsap';
import { NotificationsService } from '../services/api';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const { show: showToast } = useToast();

const loading = ref(false);
const markingAll = ref(false);
const notifications = ref([]);

const animateRows = () => {
  gsap.fromTo(
    '.gushi-notification-item',
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', stagger: 0.04 }
  );
};

const loadNotifications = async () => {
  loading.value = true;
  try {
    const res = await NotificationsService.getMyNotifications({ limit: 80 });
    notifications.value = Array.isArray(res?.data?.notifications) ? res.data.notifications : [];
    animateRows();
  } catch (error) {
    showToast(error?.message || t('gushi.notifications.loadFailed'), 'error');
  } finally {
    loading.value = false;
  }
};

const markRead = async (item) => {
  try {
    await NotificationsService.markAsRead(item.id);
    item.isRead = true;
  } catch (error) {
    showToast(error?.message || t('gushi.notifications.markReadFailed'), 'error');
  }
};

const markAllRead = async () => {
  markingAll.value = true;
  try {
    await NotificationsService.markAllAsRead();
    notifications.value = notifications.value.map((item) => ({ ...item, isRead: true }));
    showToast(t('gushi.notifications.markAllSuccess'), 'success');
  } catch (error) {
    showToast(error?.message || t('gushi.notifications.markAllFailed'), 'error');
  } finally {
    markingAll.value = false;
  }
};

onMounted(() => {
  loadNotifications();
});

const formatDate = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleString();
};
</script>
