<script setup>
import { reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { UserService } from '../services/api';

const props = defineProps({
  isOpen: Boolean,
  initialData: Object
});

const emit = defineEmits(['close', 'save']);
const { t } = useI18n();

const formData = reactive({
  name: '',
  sign: '',
  avatar: '',
  backgroundImage: ''
});

const isUploading = ref(false);

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.initialData) {
      formData.name = props.initialData.name || '';
      formData.sign = props.initialData.sign || '';
      formData.avatar = props.initialData.avatar || '';
      formData.backgroundImage = props.initialData.backgroundImage || '';
    }
  }
);

const closeModal = () => {
  if (!isUploading.value) {
    emit('close');
  }
};

const handleSave = () => {
  emit('save', { ...formData });
};

const handleFileChange = async (field, event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  isUploading.value = true;

  try {
    const response = await UserService.uploadFile(file);
    if (response?.url) {
      formData[field] = response.url;
    }
  } catch (error) {
    console.error('File upload failed:', error);
  } finally {
    isUploading.value = false;
    event.target.value = '';
  }
};

const randomizeAvatar = () => {
  formData.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`;
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-md" @click="closeModal"></div>

    <div class="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0c]/95 shadow-2xl">
      <div class="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-6 py-5 backdrop-blur-2xl">
        <div>
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/35">{{ t('profile.edit.modalLabel') }}</p>
          <h3 class="mt-2 text-2xl font-medium tracking-tight text-white">{{ t('profile.edit.title') }}</h3>
        </div>
        <button
          class="rounded-full border border-white/10 p-2 text-white/45 transition hover:bg-white/[0.04] hover:text-white/75 disabled:opacity-40"
          :disabled="isUploading"
          @click="closeModal"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18 18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="space-y-8 overflow-y-auto px-6 py-6">
        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('profile.edit.background') }}</label>
            <span class="text-xs text-white/28">{{ t('profile.edit.backgroundHint') }}</span>
          </div>

          <label class="group relative block h-40 cursor-pointer overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
            <img v-if="formData.backgroundImage" :src="formData.backgroundImage" class="h-full w-full object-cover opacity-90">
            <div v-else class="flex h-full items-center justify-center bg-white/[0.02] text-sm tracking-wide text-white/35">
              {{ t('profile.edit.uploadBackground') }}
            </div>

            <div v-if="isUploading" class="absolute inset-0 flex items-center justify-center bg-black/55">
              <svg class="h-7 w-7 animate-spin text-white/75" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z"></path>
              </svg>
            </div>
            <div v-else class="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
              <span class="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/70">
                {{ t('profile.edit.changeBackground') }}
              </span>
            </div>

            <input
              type="file"
              accept="image/*"
              class="absolute inset-0 cursor-pointer opacity-0"
              :disabled="isUploading"
              @change="(event) => handleFileChange('backgroundImage', event)"
            >
          </label>
        </section>

        <section class="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
          <div class="space-y-3">
            <label class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('profile.edit.avatar') }}</label>
            <label class="group relative block h-32 w-32 cursor-pointer overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
              <img :src="formData.avatar" class="h-full w-full object-cover">

              <div v-if="isUploading" class="absolute inset-0 flex items-center justify-center bg-black/55">
                <svg class="h-6 w-6 animate-spin text-white/75" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z"></path>
                </svg>
              </div>
              <div v-else class="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
                <span class="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/70">
                  {{ t('profile.edit.changeAvatar') }}
                </span>
              </div>

              <input
                type="file"
                accept="image/*"
                class="absolute inset-0 cursor-pointer opacity-0"
                :disabled="isUploading"
                @change="(event) => handleFileChange('avatar', event)"
              >
            </label>
            <button
              type="button"
              class="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55 transition hover:bg-white/[0.04] hover:text-white/80"
              @click="randomizeAvatar"
            >
              {{ t('profile.edit.randomAvatar') }}
            </button>
          </div>

          <div class="space-y-5">
            <div class="space-y-2">
              <label class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('profile.edit.name') }}</label>
              <input
                v-model="formData.name"
                type="text"
                class="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition placeholder:text-white/22 focus:border-white/20 focus:bg-white/[0.05]"
                :placeholder="t('profile.edit.namePlaceholder')"
              >
            </div>

            <div class="space-y-2">
              <label class="text-[11px] uppercase tracking-[0.24em] text-white/38">{{ t('profile.edit.signature') }}</label>
              <textarea
                v-model="formData.sign"
                rows="5"
                class="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition placeholder:text-white/22 focus:border-white/20 focus:bg-white/[0.05]"
                :placeholder="t('profile.edit.signaturePlaceholder')"
              ></textarea>
            </div>
          </div>
        </section>
      </div>

      <div class="flex gap-3 border-t border-white/10 bg-white/[0.02] px-6 py-5">
        <button
          class="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/55 transition hover:bg-white/[0.04] hover:text-white/80"
          @click="closeModal"
        >
          {{ t('profile.edit.cancel') }}
        </button>
        <button
          class="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
          @click="handleSave"
        >
          {{ t('profile.edit.save') }}
        </button>
      </div>
    </div>
  </div>
</template>
