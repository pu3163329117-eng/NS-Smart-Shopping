<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();

const faqs = computed(() => [
  {
    id: 'launch',
    question: t('help.faq.launch.question'),
    answer: t('help.faq.launch.answer')
  },
  {
    id: 'order',
    question: t('help.faq.order.question'),
    answer: t('help.faq.order.answer')
  },
  {
    id: 'refund',
    question: t('help.faq.refund.question'),
    answer: t('help.faq.refund.answer')
  },
  {
    id: 'wallet',
    question: t('help.faq.wallet.question'),
    answer: t('help.faq.wallet.answer')
  }
]);

const openAssistant = () => {
  router.push('/social');
};
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0c] pb-20 pt-24 text-white">
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <section class="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl md:p-10">
        <div class="mb-8">
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/35">{{ $t('help.modalLabel') }}</p>
          <h1 class="mt-3 text-4xl font-medium tracking-tighter">{{ $t('help.title') }}</h1>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-white/45">{{ $t('help.subtitle') }}</p>
        </div>

        <div class="space-y-4">
          <article
            v-for="item in faqs"
            :key="item.id"
            class="rounded-[1.25rem] border border-white/10 bg-black/20 p-5"
          >
            <h2 class="text-lg font-medium tracking-tight text-white">{{ item.question }}</h2>
            <p class="mt-3 text-sm leading-7 text-white/48">{{ item.answer }}</p>
          </article>
        </div>

        <div class="mt-8 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-6">
          <h3 class="text-lg font-medium tracking-tight text-white">{{ $t('help.contact.title') }}</h3>
          <p class="mt-3 text-sm leading-7 text-white/45">{{ $t('help.contact.body') }}</p>
          <button
            class="mt-5 rounded-full bg-white px-5 py-2 text-xs font-medium uppercase tracking-[0.2em] text-black transition hover:bg-white/90"
            @click="openAssistant"
          >
            {{ $t('help.contact.action') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
