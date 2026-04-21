<template>
  <div class="min-h-screen bg-black px-4 pb-12 pt-36 text-white sm:px-6 sm:pt-40 lg:px-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <div class="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#09090c] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ $t('gushi.notifications.title') }}</h1>
          <p class="mt-1 text-sm text-gray-400">{{ $t('gushi.notifications.subtitle') }}</p>
        </div>
        <button
          @click="markAllRead"
          :disabled="markingAll || !notifications.length"
          class="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 px-4 text-sm transition hover:border-white/30 disabled:opacity-50"
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
          class="gushi-notification-item rounded-2xl border p-4 transition sm:p-5"
          :class="item.isRead ? 'border-white/10 bg-[#09090c]' : 'border-blue-400/35 bg-[#0b0e13]'"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-white">{{ displayTitle(item) }}</p>
              <p class="mt-1 text-sm leading-6 text-gray-300">{{ displayContent(item) }}</p>
              <p class="mt-2 text-xs text-gray-500">{{ formatDate(item.createdAt) }}</p>
            </div>
            <button
              v-if="!item.isRead"
              @click="markRead(item)"
              class="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-blue-400/40 px-3 text-xs text-blue-200 transition hover:bg-blue-500/10"
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

const { t, locale } = useI18n();
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

const isChineseLocale = () => String(locale.value || '').toLowerCase().startsWith('zh');

const displayTitle = (item) => {
  const rawTitle = item?.title || '';
  if (!isChineseLocale()) return rawTitle;

  if (rawTitle === 'Application Received') return t('gushi.notifications.dynamic.title.applicationReceived');
  if (rawTitle === 'Roadshow Booking Confirmed') return t('gushi.notifications.dynamic.title.roadshowConfirmed');
  if (rawTitle === 'Roadshow Booking') return t('gushi.notifications.dynamic.title.roadshowBooking');
  if (rawTitle === 'New Project Support') return t('gushi.notifications.dynamic.title.newProjectSupport');
  if (rawTitle === 'Application Approved') return t('gushi.notifications.dynamic.title.applicationApproved');
  if (rawTitle === 'Application Rejected') return t('gushi.notifications.dynamic.title.applicationRejected');
  if (rawTitle === 'Project Update') return t('gushi.notifications.dynamic.title.projectUpdate');
  if (rawTitle === 'Closure Report Published') return t('gushi.notifications.dynamic.title.closureReportPublished');
  return rawTitle;
};

const displayContent = (item) => {
  const rawContent = item?.content || '';
  if (!isChineseLocale()) return rawContent;

  const applyMatch = rawContent.match(/^Your application for \"(.+)\" has been received and is under review\.?$/i);
  if (applyMatch) {
    return t('gushi.notifications.dynamic.content.applicationReceived', { title: applyMatch[1] });
  }

  const supportMatch =
    rawContent.match(/^User supported your project \"(.+)\" with [^\\d]*([\\d.]+)\.?$/i) ||
    rawContent.match(/^A supporter contributed CNY ([\\d.]+) to your project \"(.+)\"\.?$/i);
  if (supportMatch) {
    const amountFirst = /^A supporter contributed/i.test(rawContent);
    return t('gushi.notifications.dynamic.content.newProjectSupport', {
      title: amountFirst ? supportMatch[2] : supportMatch[1],
      amount: amountFirst ? supportMatch[1] : supportMatch[2]
    });
  }

  const approvedMatch = rawContent.match(/^Your crowdfunding application \"(.+)\" is approved and now live\.?$/i);
  if (approvedMatch) {
    return t('gushi.notifications.dynamic.content.applicationApproved', { title: approvedMatch[1] });
  }

  const rejectedMatch = rawContent.match(/^Your crowdfunding application \"(.+)\" was rejected(?:\\. Reason: (.+))?$/i);
  if (rejectedMatch) {
    const reason = rejectedMatch[2] ? ` (${rejectedMatch[2]})` : '';
    return t('gushi.notifications.dynamic.content.applicationRejected', { title: rejectedMatch[1], reason });
  }

  const roadshowConfirmedMatch = rawContent.match(/^Your roadshow booking has been received(?: for \"(.+)\")?\.?$/i);
  if (roadshowConfirmedMatch) {
    const title = roadshowConfirmedMatch[1] ? `(${roadshowConfirmedMatch[1]})` : '';
    return t('gushi.notifications.dynamic.content.roadshowConfirmed', { title });
  }

  const roadshowBookingMatch = rawContent.match(/^A supporter reserved a roadshow slot for \"(.+)\"\.?$/i);
  if (roadshowBookingMatch) {
    return t('gushi.notifications.dynamic.content.roadshowBooking', { title: roadshowBookingMatch[1] });
  }

  const closureReportMatch = rawContent.match(
    /^The project \"(.+)\" you supported has completed its closed loop\. You can now view the closure report\.?$/i
  );
  if (closureReportMatch) {
    return t('gushi.notifications.dynamic.content.closureReportPublished', { title: closureReportMatch[1] });
  }

  return rawContent;
};

const formatDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (isChineseLocale()) {
    return date.toLocaleString('zh-CN', { hour12: false });
  }
  return date.toLocaleString();
};
</script>
