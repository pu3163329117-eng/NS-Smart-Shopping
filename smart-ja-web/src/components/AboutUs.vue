<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import gsap from 'gsap';

const emit = defineEmits(['close']);
const { t } = useI18n();
const modalContent = ref(null);

onMounted(() => {
  gsap.from(modalContent.value, {
    y: 50,
    opacity: 0,
    duration: 0.5,
    ease: 'power3.out'
  });
});
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center px-4">
    <div class="absolute inset-0 bg-black/30 backdrop-blur-md transition-opacity" @click="emit('close')"></div>

    <div
      ref="modalContent"
      class="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
    >
      <button
        class="absolute right-6 top-6 z-10 rounded-full bg-slate-100 p-2 transition-colors hover:bg-slate-200"
        @click="emit('close')"
      >
        <svg class="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>

      <div class="custom-scrollbar overflow-y-auto p-8 md:p-12">
        <div class="mx-auto max-w-3xl">
          <h2 class="mb-4 text-3xl font-bold">{{ $t('about.modal.title') }}</h2>
          <div class="mb-8 h-1 w-20 bg-blue-600"></div>

          <div class="space-y-8 text-justify text-lg leading-relaxed text-slate-600">
            <p>{{ $t('about.modal.intro') }}</p>

            <div class="rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <h3 class="mb-4 flex items-center text-xl font-bold text-slate-900">
                <svg class="mr-2 h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                {{ $t('about.modal.systemTitle') }}
              </h3>
              <p>{{ $t('about.modal.systemIntro') }}</p>
              <ul class="mt-4 list-inside list-disc space-y-2 text-base">
                <li>{{ $t('about.modal.systemResearch') }}</li>
                <li>{{ $t('about.modal.systemData') }}</li>
                <li>{{ $t('about.modal.systemStrategy') }}</li>
                <li>{{ $t('about.modal.systemExecution') }}</li>
              </ul>
            </div>

            <p>{{ $t('about.modal.outro') }}</p>
          </div>

          <div class="mt-12 flex justify-center">
            <span class="text-sm text-slate-400">{{ $t('about.modal.footer') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 20px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(107, 114, 128, 0.8);
}
</style>
