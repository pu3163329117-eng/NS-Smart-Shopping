<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MarketService } from '../services/api';
import { useProducts } from '../store/products';
import ProductSphere from '../components/ProductSphere.vue';

gsap.registerPlugin(ScrollTrigger);

const router = useRouter();
const { t } = useI18n();
const { products: storeProducts } = useProducts();

const pageRoot = ref(null);
const heroTitle = ref(null);
const heroKicker = ref(null);
const heroMeta = ref(null);
const heroMedia = ref(null);
const showcaseServices = ref([]);
const showSphere = ref(false);

let animationContext = null;

const normalizeService = (service, index = 0) => ({
  id: String(service?.id ?? `featured-${index}`),
  title: service?.title || service?.name || 'Flagship Service',
  description:
    service?.description ||
    service?.desc ||
    'Built for makers, educators, and ambitious students who want a high-signal product experience.',
  provider: service?.provider || service?.company || 'NS Studio',
  price: Number(service?.price ?? 0),
  image: service?.image || service?.img || '',
  accent: index === 0 ? 'from-white/40 via-white/5 to-transparent' : 'from-slate-300/30 via-white/5 to-transparent'
});

const fallbackServices = computed(() => {
  const mapped = Array.isArray(storeProducts.value)
    ? storeProducts.value.slice(0, 2).map((service, index) => normalizeService(service, index))
    : [];

  if (mapped.length) {
    return mapped;
  }

  return [
    normalizeService(
      {
        id: 'fallback-0',
        title: 'Future Maker Kit',
        description: 'A premium launchpad for student innovation programs and coach-led learning labs.',
        provider: 'NS Studio',
        price: 199,
        image: ''
      },
      0
    )
  ];
});

const heroService = computed(() => showcaseServices.value[0] || fallbackServices.value[0]);

const secondaryService = computed(() => {
  return showcaseServices.value[1] || showcaseServices.value[0] || fallbackServices.value[0];
});

const statItems = computed(() => {
  const services = showcaseServices.value.length ? showcaseServices.value : fallbackServices.value;
  const averagePrice = services.length
    ? services.reduce((sum, service) => sum + Number(service.price || 0), 0) / services.length
    : 0;

  return [
    { label: t('home.statFeatured'), value: `${services.length}` },
    { label: t('home.statAvgTicket'), value: `¥${averagePrice.toFixed(0)}` },
    { label: t('home.statMode'), value: t('home.statLiveData') }
  ];
});

const formatPrice = (value) => `¥${Number(value || 0).toFixed(0)}`;

const fetchFeatured = async () => {
  try {
    const response = await MarketService.getFeaturedServices();
    const records = Array.isArray(response) ? response : [];
    showcaseServices.value = (records.length ? records : fallbackServices.value)
      .slice(0, 2)
      .map((service, index) => normalizeService(service, index));
  } catch (error) {
    showcaseServices.value = fallbackServices.value;
  }
};

const openMarket = () => {
  router.push('/market');
};

const openFeatured = (service) => {
  if (!service?.id) {
    router.push('/market');
    return;
  }

  router.push(`/product/${service.id}`);
};

const initAnimations = () => {
  if (!pageRoot.value) {
    return;
  }

  if (animationContext) {
    animationContext.revert();
  }

  animationContext = gsap.context(() => {
    gsap.set([heroTitle.value, heroKicker.value, heroMeta.value], { opacity: 0, y: 48 });
    gsap.set(heroMedia.value, { opacity: 0, scale: 0.92, filter: 'brightness(0.65)' });

    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .to(heroKicker.value, { opacity: 1, y: 0, duration: 0.7 })
      .to(heroTitle.value, { opacity: 1, y: 0, duration: 1.1 }, '-=0.4')
      .to(heroMeta.value, { opacity: 1, y: 0, duration: 0.9 }, '-=0.7')
      .to(heroMedia.value, { opacity: 1, scale: 1, duration: 1.2, filter: 'brightness(1)' }, '-=1.0');

    gsap.to(heroMedia.value, {
      yPercent: -10,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero-screen',
        start: 'top top',
        end: 'bottom top',
        scrub: true
      }
    });

    gsap.utils.toArray('.story-panel').forEach((panel) => {
      const media = panel.querySelector('.story-media');
      const copy = panel.querySelector('.story-copy');
      const caption = panel.querySelector('.story-caption');

      if (copy) {
        gsap.fromTo(
          copy,
          { opacity: 1, y: 48 },
          {
            opacity: 0.12,
            y: -88,
            ease: 'none',
            scrollTrigger: {
              trigger: panel,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
            }
          }
        );
      }

      if (caption) {
        gsap.fromTo(
          caption,
          { opacity: 0.4, y: 24 },
          {
            opacity: 1,
            y: -24,
            ease: 'none',
            scrollTrigger: {
              trigger: panel,
              start: 'top 65%',
              end: 'bottom top',
              scrub: true
            }
          }
        );
      }

      if (media) {
        gsap.fromTo(
          media,
          { scale: 0.72, yPercent: 14, filter: 'brightness(0.45)' },
          {
            scale: 1.08,
            yPercent: -12,
            filter: 'brightness(1)',
            ease: 'none',
            scrollTrigger: {
              trigger: panel,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
            }
          }
        );
      }
    });
  }, pageRoot.value);
};

onMounted(async () => {
  await fetchFeatured();
  await nextTick();
  initAnimations();
});

onBeforeUnmount(() => {
  if (animationContext) {
    animationContext.revert();
  }
});
</script>

<template>
  <div ref="pageRoot" class="bg-black text-white">
    <section class="hero-screen relative flex min-h-screen items-center overflow-hidden border-b border-white/10">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.12),_transparent_28%),radial-gradient(circle_at_80%_24%,_rgba(148,163,184,0.12),_transparent_24%),radial-gradient(circle_at_50%_100%,_rgba(255,255,255,0.06),_transparent_45%)]"></div>
      <div class="pointer-events-none absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

      <div class="relative mx-auto grid min-h-screen w-full max-w-7xl gap-12 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pt-32">
        <div class="flex flex-col justify-center">
          <p ref="heroKicker" class="text-xs font-semibold uppercase tracking-[0.42em] text-slate-400">
            {{ $t('home.heroKicker') }}
          </p>

          <h1
            ref="heroTitle"
            class="mt-6 max-w-5xl text-5xl font-semibold tracking-[-0.06em] text-white sm:text-7xl lg:text-[7.5rem] lg:leading-[0.94]"
          >
            {{ $t('home.heroTitle') }}
          </h1>

          <div ref="heroMeta" class="mt-10 max-w-2xl space-y-8">
            <p class="text-base leading-8 text-slate-300 sm:text-lg">
              {{ $t('home.heroDesc') }}
            </p>

            <div class="flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                class="group relative overflow-hidden rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                @click="openMarket"
              >
                <span class="relative z-10">{{ $t('home.enterMarket') }}</span>
              </button>
              <button
                type="button"
                class="group relative overflow-hidden rounded-full border border-white/15 bg-white/5 px-8 py-4 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                @click="openFeatured(heroService)"
              >
                <span class="relative z-10 flex items-center gap-2">
                  {{ $t('home.viewFeatured') }}
                </span>
              </button>
              <button
                type="button"
                class="group relative overflow-hidden rounded-full border border-white/15 bg-white/5 px-8 py-4 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                @click="showSphere = true"
              >
                <span class="relative z-10 flex items-center gap-2">
                  {{ $t('home.exploreUniverse') }}
                  <svg class="h-4 w-4 transition-transform group-hover:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                </span>
              </button>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <div
                v-for="item in statItems"
                :key="item.label"
                class="rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-5 backdrop-blur-sm"
              >
                <p class="text-[11px] uppercase tracking-[0.28em] text-slate-500">{{ item.label }}</p>
                <p class="mt-3 text-2xl font-semibold text-white">{{ item.value }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-center lg:justify-end">
          <div ref="heroMedia" class="relative w-full max-w-[42rem]">
            <div class="absolute inset-0 rounded-[3rem] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.18),_transparent_46%)] blur-3xl"></div>
            <div class="absolute left-6 right-6 top-6 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            <div class="relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-gradient-to-br from-[#121214] via-[#050505] to-[#0e0e10] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.65)] sm:p-6">
              <div class="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_28%,transparent_72%,rgba(255,255,255,0.04))]"></div>
              <div class="relative rounded-[2.25rem] border border-white/10 bg-black/60 p-4 sm:p-5">
                <div class="mb-4 flex items-center justify-between">
                  <div>
                    <p class="text-[11px] uppercase tracking-[0.28em] text-slate-500">{{ $t('home.featuredDrop') }}</p>
                    <p class="mt-2 text-xl font-semibold text-white">{{ heroService.title }}</p>
                  </div>
                  <p class="text-lg font-semibold text-white">{{ formatPrice(heroService.price) }}</p>
                </div>

                <div class="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-black to-slate-900">
                  <div class="aspect-[4/5] relative">
                    <img
                      v-if="heroService.image"
                      :src="heroService.image"
                      :alt="heroService.title"
                      @error="e => e.target.style.display = 'none'"
                      class="absolute inset-0 h-full w-full object-cover z-10"
                    />
                    <div
                      class="absolute inset-0 flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12),_transparent_40%)] text-8xl font-semibold text-white z-0"
                    >
                      {{ heroService.title.charAt(0).toUpperCase() }}
                    </div>
                  </div>
                  <div class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                </div>

                <div class="mt-4 flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-5 py-4">
                  <div>
                    <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">{{ heroService.provider }}</p>
                    <p class="mt-2 text-sm leading-6 text-slate-300">{{ heroService.description }}</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="absolute -bottom-4 right-4 rounded-full border border-white/10 bg-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white backdrop-blur-md transition hover:bg-white/15"
              @click="openFeatured(heroService)"
            >
              {{ $t('home.openStory') }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section
      v-for="(service, index) in showcaseServices"
      :key="service.id"
      class="story-panel relative h-[170vh] border-b border-white/10"
    >
      <div class="sticky top-0 flex min-h-screen items-center overflow-hidden">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.06),_transparent_38%)]"></div>
        <div class="pointer-events-none absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

        <div
          class="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8"
          :class="{ 'lg:grid-cols-[1.1fr_0.9fr]': index % 2 === 1 }"
        >
          <div
            class="story-copy flex flex-col justify-center"
            :class="{ 'lg:order-2': index % 2 === 1 }"
          >
            <p class="text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-500">
              0{{ index + 1 }} / {{ $t('home.flagshipSequence') }}
            </p>
            <h2 class="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl lg:text-[6rem] lg:leading-[0.92]">
              {{ service.title }}
            </h2>
            <p class="story-caption mt-8 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              {{ service.description }}
            </p>
            <div class="mt-10 flex flex-wrap items-center gap-5 text-sm text-slate-400">
              <span class="inline-flex items-center gap-2">
                <span class="h-1 w-10 bg-gradient-to-r from-white/60 to-transparent"></span>
                {{ service.provider }}
              </span>
              <span>{{ formatPrice(service.price) }}</span>
            </div>
          </div>

          <div
            class="flex items-center justify-center"
            :class="{ 'lg:order-1': index % 2 === 1 }"
          >
            <div class="story-media relative w-full max-w-[50rem]">
              <div class="absolute inset-0 rounded-[3rem] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.18),_transparent_42%)] blur-3xl"></div>
              <div class="relative overflow-hidden rounded-[3rem] border border-white/10 bg-gradient-to-br from-[#121214] via-black to-[#08080a] p-4 shadow-[0_40px_140px_rgba(0,0,0,0.75)] sm:p-6">
                <div class="absolute inset-0 bg-gradient-to-br" :class="service.accent"></div>
                <div class="relative overflow-hidden rounded-[2.35rem] border border-white/10 bg-black">
                  <div class="aspect-[4/5] sm:aspect-[5/4] relative">
                    <img
                      v-if="service.image"
                      :src="service.image"
                      :alt="service.title"
                      @error="e => e.target.style.display = 'none'"
                      class="absolute inset-0 h-full w-full object-cover z-10"
                    />
                    <div
                      class="absolute inset-0 flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1),_transparent_42%)] text-8xl font-semibold text-white z-0"
                    >
                      {{ service.title.charAt(0).toUpperCase() }}
                    </div>
                  </div>
                  <div class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/35 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="relative overflow-hidden py-32">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.05),_transparent_60%)]"></div>

      <div class="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <div class="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 mb-8 backdrop-blur-md">
          <span class="text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-400">
            {{ $t('home.bottomEyebrow') }}
          </span>
        </div>
        <h2 class="text-4xl font-semibold tracking-[-0.05em] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 sm:text-6xl lg:text-[5rem] lg:leading-[1.1]">
          {{ $t('home.bottomTitle') }}
        </h2>
        <p class="mx-auto mt-8 max-w-3xl text-base leading-8 text-slate-400 sm:text-lg">
          {{ $t('home.bottomDesc') }}
        </p>

        <div class="mt-14 flex flex-col items-center justify-center gap-6 sm:flex-row">
          <button
            type="button"
            class="group relative overflow-hidden rounded-full bg-white px-9 py-4 text-sm font-semibold text-black transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            @click="openMarket"
          >
            <span class="relative z-10">{{ $t('home.viewAllProducts') }}</span>
          </button>
          <button
            type="button"
            class="group relative overflow-hidden rounded-full border border-white/15 bg-white/5 px-9 py-4 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            @click="openFeatured(secondaryService)"
          >
            <span class="relative z-10 flex items-center gap-2">
              {{ $t('home.continueFeatured') }}
              <svg class="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </span>
          </button>
        </div>
      </div>
    </section>

    <!-- 3D 宇宙视图 -->
    <transition name="fade">
      <ProductSphere 
        v-if="showSphere" 
        :products="storeProducts" 
        @close="showSphere = false"
      />
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
