<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '../composables/useToast';

defineProps({
  show: Boolean
});

const emit = defineEmits(['close']);
const { t } = useI18n();
const { show: showToast } = useToast();

const activities = computed(() => [
  {
    id: 1,
    title: t('profile.activity.items.designSprint.title'),
    description: t('profile.activity.items.designSprint.description'),
    date: '2026.01.15 - 2026.03.15',
    tag: t('profile.activity.items.designSprint.tag'),
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 2,
    title: t('profile.activity.items.newCreator.title'),
    description: t('profile.activity.items.newCreator.description'),
    date: t('profile.activity.items.newCreator.date'),
    tag: t('profile.activity.items.newCreator.tag'),
    image: 'https://images.unsplash.com/photo-1499750310159-525446b0d224?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 3,
    title: t('profile.activity.items.heritage.title'),
    description: t('profile.activity.items.heritage.description'),
    date: '2026.02.01',
    tag: t('profile.activity.items.heritage.tag'),
    image: 'https://images.unsplash.com/photo-1459749411177-8c275d84360e?q=80&w=1000&auto=format&fit=crop'
  }
]);

const handleJoin = (activity) => {
  showToast(t('profile.activity.joined', { title: activity.title }), 'success');
};

const closeModal = () => {
  emit('close');
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-md" @click="closeModal"></div>

    <div class="relative flex h-[82vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#0a0a0c]/95 shadow-2xl sm:h-[760px] sm:w-[560px] sm:rounded-[2rem]">
      <div class="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4 backdrop-blur-2xl">
        <div>
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/35">{{ t('profile.activity.modalLabel') }}</p>
          <h2 class="mt-2 text-2xl font-medium tracking-tight text-white">{{ t('profile.activity.title') }}</h2>
        </div>
        <button
          class="rounded-full border border-white/10 p-2 text-white/45 transition hover:bg-white/[0.04] hover:text-white/75"
          @click="closeModal"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18 18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-hide sm:px-5">
        <article
          v-for="item in activities"
          :key="item.id"
          class="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-2xl"
        >
          <div class="relative h-40 overflow-hidden border-b border-white/8 bg-white/[0.02]">
            <img :src="item.image" class="h-full w-full object-cover opacity-85">
            <div class="absolute right-3 top-3 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/75 backdrop-blur-xl">
              {{ item.tag }}
            </div>
          </div>

          <div class="space-y-4 p-5">
            <div class="space-y-2">
              <p class="text-[11px] uppercase tracking-[0.22em] text-white/35">{{ item.date }}</p>
              <h3 class="text-xl font-medium tracking-tight text-white">{{ item.title }}</h3>
              <p class="text-sm leading-6 text-white/48">{{ item.description }}</p>
            </div>

            <div class="flex items-center justify-between gap-3">
              <span class="text-xs uppercase tracking-[0.2em] text-white/35">{{ t('profile.activity.availability') }}</span>
              <button
                class="rounded-full bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-black transition hover:bg-white/90"
                @click="handleJoin(item)"
              >
                {{ t('profile.activity.join') }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
