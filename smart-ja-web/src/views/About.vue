<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const { t } = useI18n();
const pageRoot = ref(null);
let ctx;

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.from('.reveal-text', {
      y: 60,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out',
      stagger: 0.15
    });

    gsap.utils.toArray('.feature-box').forEach((box) => {
      gsap.from(box, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: box,
          start: 'top 85%'
        }
      });
    });
  }, pageRoot.value);
});

onBeforeUnmount(() => {
  if (ctx) {
    ctx.revert();
  }
});
</script>

<template>
  <div ref="pageRoot" class="relative min-h-screen overflow-hidden bg-black pb-32 pt-32 text-white selection:bg-white/20">
    <div class="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.06),_transparent_50%)]"></div>
    <div class="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

    <div class="relative z-10 mx-auto max-w-4xl px-6">
      <div class="reveal-text mb-32 text-center">
        <h1 class="mb-8 bg-gradient-to-br from-white to-white/40 bg-clip-text text-6xl font-medium tracking-tighter text-transparent md:text-[6rem]">
          {{ $t('about.hero.title') }}
        </h1>
        <p class="mx-auto max-w-2xl text-xl font-light leading-relaxed tracking-normal text-slate-400 md:text-3xl">
          {{ $t('about.hero.subtitle') }}
        </p>
      </div>

      <div class="space-y-32">
        <div class="reveal-text">
          <p class="text-xl font-light leading-snug tracking-tight text-slate-300 md:text-[1.75rem]">
            {{ $t('about.story.paragraphOne') }}
          </p>
          <p class="mt-8 text-xl font-light leading-snug tracking-tight text-slate-300 md:text-[1.75rem]">
            {{ $t('about.story.paragraphTwo') }}
          </p>
        </div>

        <div class="group relative overflow-hidden rounded-[3rem] border border-white/10 bg-white/[0.02] p-8 md:p-16">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.04),_transparent_60%)] opacity-0 transition-opacity duration-1000 group-hover:opacity-100"></div>
          <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_25%,transparent_75%,rgba(255,255,255,0.03))]"></div>

          <h3 class="mb-12 text-3xl font-medium tracking-tighter text-white md:text-5xl">{{ $t('about.architecture.title') }}</h3>

          <div class="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div class="feature-box rounded-3xl border border-white/5 bg-black/40 p-8 backdrop-blur-md transition-all hover:border-white/10 hover:bg-white/[0.04]">
              <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <h4 class="mb-3 text-xl font-medium text-white">{{ $t('about.features.research.title') }}</h4>
              <p class="text-sm font-light leading-relaxed text-slate-400">{{ $t('about.features.research.body') }}</p>
            </div>

            <div class="feature-box rounded-3xl border border-white/5 bg-black/40 p-8 backdrop-blur-md transition-all hover:border-white/10 hover:bg-white/[0.04]">
              <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
              </div>
              <h4 class="mb-3 text-xl font-medium text-white">{{ $t('about.features.data.title') }}</h4>
              <p class="text-sm font-light leading-relaxed text-slate-400">{{ $t('about.features.data.body') }}</p>
            </div>

            <div class="feature-box rounded-3xl border border-white/5 bg-black/40 p-8 backdrop-blur-md transition-all hover:border-white/10 hover:bg-white/[0.04]">
              <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              </div>
              <h4 class="mb-3 text-xl font-medium text-white">{{ $t('about.features.strategy.title') }}</h4>
              <p class="text-sm font-light leading-relaxed text-slate-400">{{ $t('about.features.strategy.body') }}</p>
            </div>

            <div class="feature-box rounded-3xl border border-white/5 bg-black/40 p-8 backdrop-blur-md transition-all hover:border-white/10 hover:bg-white/[0.04]">
              <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
              </div>
              <h4 class="mb-3 text-xl font-medium text-white">{{ $t('about.features.execution.title') }}</h4>
              <p class="text-sm font-light leading-relaxed text-slate-400">{{ $t('about.features.execution.body') }}</p>
            </div>
          </div>
        </div>

        <div class="reveal-text">
          <h3 class="mb-8 text-3xl font-medium tracking-tighter text-white md:text-5xl">{{ $t('about.horizon.title') }}</h3>
          <p class="text-xl font-light leading-snug tracking-tight text-slate-300 md:text-[1.5rem]">
            {{ $t('about.horizon.body') }}
          </p>
        </div>
      </div>

      <div class="mt-40 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs uppercase tracking-widest text-slate-500 md:flex-row">
        <span>{{ $t('about.footer.copyright') }}</span>
        <span class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-white/30"></span>
          {{ $t('about.footer.version') }}
        </span>
      </div>
    </div>
  </div>
</template>
