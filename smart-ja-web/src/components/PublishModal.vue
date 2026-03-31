<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'select']);
const { t } = useI18n();

const iconMap = {
  video: ['M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14', 'M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z'],
  post: ['M5 5h14', 'M5 12h14', 'M5 19h8'],
  ai: ['M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z']
};

const contentTypes = computed(() => [
  { id: 'video', name: t('publish.types.video.name'), desc: t('publish.types.video.desc') },
  { id: 'post', name: t('publish.types.post.name'), desc: t('publish.types.post.desc') },
  { id: 'ai', name: t('publish.types.ai.name'), desc: t('publish.types.ai.desc') }
]);

const getIconPaths = (id) => iconMap[id] || iconMap.post;

const handleSelect = (type) => {
  emit('select', type);
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-md" @click="emit('close')"></div>

    <div class="relative w-full max-w-2xl overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#0a0a0c]/95 sm:rounded-[2rem]">
      <div class="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-6 py-5">
        <div>
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/35">{{ $t('publish.modalLabel') }}</p>
          <h3 class="mt-2 text-2xl font-medium tracking-tight text-white">{{ $t('publish.title') }}</h3>
        </div>
        <button class="rounded-full border border-white/10 p-2 text-white/45 transition hover:bg-white/[0.04] hover:text-white/75" @click="emit('close')">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18 18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="grid gap-4 p-6 sm:grid-cols-3">
        <button
          v-for="type in contentTypes"
          :key="type.id"
          class="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5 text-left backdrop-blur-2xl transition hover:bg-white/[0.05]"
          @click="handleSelect(type)"
        >
          <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              v-for="(path, index) in getIconPaths(type.id)"
              :key="`${type.id}-${index}`"
              :d="path"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
            ></path>
          </svg>
          <p class="mt-6 text-lg font-medium tracking-tight text-white">{{ type.name }}</p>
          <p class="mt-2 text-sm leading-6 text-white/45">{{ type.desc }}</p>
        </button>
      </div>

      <div class="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-6 py-5 text-xs uppercase tracking-[0.2em] text-white/35">
        <button class="transition hover:text-white/70">{{ $t('publish.drafts') }}</button>
        <span>{{ $t('publish.notice') }}</span>
      </div>
    </div>
  </div>
</template>
