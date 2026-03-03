<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCart } from '../store/cart';
import { useFavorites } from '../store/favorites';
import { useProducts } from '../store/products';
import { useToast } from '../composables/useToast';
import { MarketService } from '../services/api';

gsap.registerPlugin(ScrollTrigger);

const route = useRoute();
const router = useRouter();

const { addToCart, toggleCart } = useCart();
const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
const { getProductById } = useProducts();
const { show: showToast } = useToast();

const pageRoot = ref(null);
const heroHeadline = ref(null);
const heroMeta = ref(null);
const heroVisual = ref(null);
const product = ref(null);
const loading = ref(true);
const errorMessage = ref('');

let animationContext = null;

const productId = computed(() => String(route.params.id ?? ''));

const normalizeProduct = (source) => ({
  id: String(source?.id ?? ''),
  title: source?.title || source?.name || 'Flagship Service',
  description:
    source?.description ||
    source?.desc ||
    'A modern release crafted for hands-on coaching, student innovation, and premium maker showcases.',
  details:
    source?.details ||
    source?.longDesc ||
    source?.description ||
    source?.desc ||
    'No extended details are available yet.',
  provider: source?.provider || source?.company || 'NS Studio',
  price: Number(source?.price ?? 0),
  image: source?.image || source?.img || '',
  tags: Array.isArray(source?.tags) ? source.tags.filter(Boolean).slice(0, 6) : [],
  sales: Number(source?.sales ?? 0),
  views: Number(source?.views ?? 0),
  createdAt: source?.createdAt || null,
  type: source?.type || 'Live release'
});

const formatPrice = (value) => {
  const amount = Number(value ?? 0);
  const hasCents = Math.abs(amount % 1) > 0.001;
  return `¥${amount.toFixed(hasCents ? 2 : 0)}`;
};

const formatDate = (value) => {
  if (!value) {
    return 'Live now';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Live now';
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const splitParagraphs = (value) => {
  const text = String(value || '').trim();
  if (!text) {
    return [];
  }

  const blocks = text
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return blocks.length ? blocks : [text];
};

const detailParagraphs = computed(() => {
  return splitParagraphs(product.value?.details || product.value?.description).slice(0, 3);
});

const metrics = computed(() => {
  if (!product.value) {
    return [];
  }

  const aiMatch = Math.min(99, 86 + product.value.tags.length * 2 + Math.min(product.value.sales, 5));
  const craftScore = Math.min(98, 78 + Math.round(product.value.views / 25) + product.value.tags.length);
  const performance = Math.max(72, Math.min(97, 80 + Math.round(product.value.sales / 4)));

  return [
    {
      label: 'AI Match',
      value: `${aiMatch}%`,
      note: 'fit for the current learning scene'
    },
    {
      label: 'Craft Index',
      value: `${craftScore}`,
      note: 'material and finish confidence'
    },
    {
      label: 'Performance',
      value: `${performance}`,
      note: 'maker-side delivery readiness'
    }
  ];
});

const storyPanels = computed(() => {
  if (!product.value) {
    return [];
  }

  return [
    {
      eyebrow: 'Feature Layer',
      title: 'Built to command attention in a clean, high-contrast showcase.',
      body:
        product.value.description ||
        'The product is positioned as a premium release for makers, coaches, and students who need a stronger presentation.',
      kicker: product.value.provider
    },
    {
      eyebrow: 'Parameter Layer',
      title: 'Specs rise into view as the page scrolls deeper.',
      body:
        detailParagraphs.value[0] ||
        'Every detail panel is now treated like a launch keynote, with motion and contrast doing the heavy lifting.',
      kicker: product.value.type
    },
    {
      eyebrow: 'Decision Layer',
      title: 'High clarity for evaluation, quick action for purchase.',
      body:
        detailParagraphs.value[1] ||
        detailParagraphs.value[0] ||
        'The final section keeps the decision path obvious: buy now, add to cart, or save for later.',
      kicker: `${product.value.sales} sold`
    }
  ];
});

const cartPayload = computed(() => {
  if (!product.value) {
    return null;
  }

  return {
    ...product.value,
    name: product.value.title,
    img: product.value.image,
    desc: product.value.description,
    description: product.value.description
  };
});

const isCurrentFavorite = computed(() => {
  if (!product.value) {
    return false;
  }

  return isFavorite(product.value.id);
});

const loadProduct = async () => {
  loading.value = true;
  errorMessage.value = '';
  product.value = null;

  try {
    const response = await MarketService.getServiceById(productId.value);
    product.value = normalizeProduct(response);
  } catch (error) {
    const exactFallback = getProductById(productId.value);
    const numericId = Number(productId.value);
    const numericFallback = Number.isNaN(numericId) ? null : getProductById(numericId);
    const fallback = exactFallback || numericFallback;

    if (fallback) {
      product.value = normalizeProduct(fallback);
      errorMessage.value = '';
    } else {
      errorMessage.value = error?.message || 'Unable to load this product right now.';
    }
  } finally {
    loading.value = false;
    await nextTick();
    initAnimations();
  }
};

const clearAnimations = () => {
  if (animationContext) {
    animationContext.revert();
    animationContext = null;
  }
};

const initAnimations = () => {
  clearAnimations();

  if (!pageRoot.value || !product.value) {
    return;
  }

  animationContext = gsap.context(() => {
    gsap.set([heroHeadline.value, heroMeta.value], { opacity: 0, y: 40 });
    gsap.set(heroVisual.value, { opacity: 0, scale: 0.88, filter: 'brightness(0.55)' });

    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .to(heroHeadline.value, { opacity: 1, y: 0, duration: 0.9 })
      .to(heroMeta.value, { opacity: 1, y: 0, duration: 0.9 }, '-=0.5')
      .to(heroVisual.value, { opacity: 1, scale: 1, duration: 1.15, filter: 'brightness(1)' }, '-=0.75');

    gsap.to(heroVisual.value, {
      yPercent: -10,
      scale: 1.06,
      ease: 'none',
      scrollTrigger: {
        trigger: '.detail-hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true
      }
    });

    gsap.utils.toArray('.detail-panel').forEach((panel) => {
      const copy = panel.querySelector('.detail-copy');
      const card = panel.querySelector('.detail-card');
      const eyebrow = panel.querySelector('.detail-eyebrow');

      if (copy) {
        gsap.fromTo(
          copy,
          { opacity: 0.18, y: 60 },
          {
            opacity: 1,
            y: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: panel,
              start: 'top 70%',
              end: 'top 35%',
              scrub: 0.7
            }
          }
        );
      }

      if (card) {
        gsap.fromTo(
          card,
          { opacity: 0, y: 90, scale: 0.92, filter: 'brightness(0.55)' },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'brightness(1)',
            ease: 'power2.out',
            scrollTrigger: {
              trigger: panel,
              start: 'top 72%',
              end: 'top 30%',
              scrub: 0.9
            }
          }
        );
      }

      if (eyebrow) {
        gsap.fromTo(
          eyebrow,
          { opacity: 0, x: -24 },
          {
            opacity: 1,
            x: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: panel,
              start: 'top 80%',
              end: 'top 50%',
              scrub: 0.6
            }
          }
        );
      }
    });

    gsap.utils.toArray('.metric-card').forEach((item, index) => {
      gsap.fromTo(
        item,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          delay: index * 0.08,
          scrollTrigger: {
            trigger: item,
            start: 'top 84%'
          }
        }
      );
    });
  }, pageRoot.value);
};

watch(
  productId,
  () => {
    if (productId.value) {
      void loadProduct();
    }
  },
  { immediate: true }
);

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  router.push({ name: 'Market' });
};

const handleAddToCart = () => {
  if (!cartPayload.value) {
    return;
  }

  addToCart(cartPayload.value);
  showToast('Added to cart', 'success');
};

const handleBuyNow = () => {
  if (!cartPayload.value) {
    return;
  }

  addToCart(cartPayload.value);
  toggleCart();
  showToast('Added to cart and opened the cart', 'success');
};

const handleToggleFavorite = () => {
  if (!cartPayload.value) {
    return;
  }

  if (isCurrentFavorite.value) {
    removeFromFavorites(product.value.id);
    showToast('Removed from favorites', 'info');
    return;
  }

  addToFavorites(cartPayload.value);
  showToast('Saved to favorites', 'success');
};

onBeforeUnmount(() => {
  clearAnimations();
});
</script>

<template>
  <div ref="pageRoot" class="min-h-screen overflow-hidden bg-black pt-20 pb-24 text-white">
    <div class="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_18%,_rgba(255,255,255,0.12),_transparent_18%),radial-gradient(circle_at_80%_18%,_rgba(148,163,184,0.14),_transparent_16%),radial-gradient(circle_at_50%_68%,_rgba(255,255,255,0.05),_transparent_26%)]"></div>
    <div class="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent"></div>

    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          class="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/18 hover:bg-white/[0.08]"
          @click="goBack"
        >
          Back to market
        </button>

        <button
          type="button"
          class="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/18 hover:bg-white/[0.08]"
          @click="loadProduct"
        >
          Refresh data
        </button>
      </div>

      <div v-if="loading" class="space-y-6">
        <div class="overflow-hidden rounded-[2.75rem] border border-white/8 bg-white/[0.04] p-5">
          <div class="animate-pulse">
            <div class="aspect-[16/10] rounded-[2rem] bg-white/10"></div>
            <div class="mt-6 h-4 w-36 rounded-full bg-white/10"></div>
            <div class="mt-4 h-12 w-4/5 rounded-full bg-white/10"></div>
            <div class="mt-4 h-5 w-2/3 rounded-full bg-white/10"></div>
          </div>
        </div>
        <div class="grid gap-5 md:grid-cols-3">
          <div
            v-for="index in 3"
            :key="index"
            class="animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.04] p-6"
          >
            <div class="h-3 w-24 rounded-full bg-white/10"></div>
            <div class="mt-5 h-10 w-28 rounded-full bg-white/10"></div>
            <div class="mt-4 h-4 w-4/5 rounded-full bg-white/10"></div>
          </div>
        </div>
      </div>

      <div
        v-else-if="errorMessage && !product"
        class="rounded-[2.75rem] border border-white/10 bg-white/[0.04] px-6 py-12 text-center backdrop-blur-sm"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-500">Load error</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">This product could not be loaded.</h1>
        <p class="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">{{ errorMessage }}</p>
        <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            class="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-slate-100"
            @click="loadProduct"
          >
            Try again
          </button>
          <button
            type="button"
            class="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white transition hover:border-white/18 hover:bg-white/[0.08]"
            @click="goBack"
          >
            Return to market
          </button>
        </div>
      </div>

      <div v-else-if="product" class="space-y-10">
        <section class="detail-hero relative overflow-hidden rounded-[3rem] border border-white/10 bg-white/[0.03] shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,_rgba(255,255,255,0.08),_transparent_24%),radial-gradient(circle_at_78%_20%,_rgba(255,255,255,0.12),_transparent_20%),linear-gradient(135deg,rgba(255,255,255,0.035),transparent_32%,transparent_74%,rgba(255,255,255,0.025))]"></div>
          <div class="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"></div>

          <div class="relative grid min-h-[78vh] gap-10 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div class="flex flex-col justify-center">
              <div ref="heroHeadline">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-300">
                    Live Product
                  </span>
                  <span class="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {{ formatDate(product.createdAt) }}
                  </span>
                </div>

                <p class="mt-8 text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-500">{{ product.provider }}</p>
                <h1 class="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.06em] text-white sm:text-6xl lg:text-[6rem] lg:leading-[0.92]">
                  {{ product.title }}
                </h1>
              </div>

              <div ref="heroMeta" class="mt-8 max-w-2xl space-y-8">
                <p class="text-base leading-8 text-slate-300 sm:text-lg">
                  {{ product.description }}
                </p>

                <div class="flex flex-wrap items-center gap-3">
                  <span
                    v-for="tag in product.tags"
                    :key="tag"
                    class="rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300"
                  >
                    {{ tag }}
                  </span>
                  <span class="rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {{ product.type }}
                  </span>
                </div>

                <div class="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                  <p class="text-[11px] uppercase tracking-[0.28em] text-slate-500">Live price</p>
                  <p class="mt-3 text-4xl font-semibold text-white sm:text-5xl">{{ formatPrice(product.price) }}</p>
                  <p class="mt-3 text-sm leading-7 text-slate-400">
                    Directly loaded from <code>/api/market/services/{{ product.id }}</code>, including string-based service IDs.
                  </p>
                </div>

                <div class="flex flex-col gap-4 sm:flex-row">
                  <button
                    type="button"
                    class="cta-pulse cta-shine relative overflow-hidden rounded-full bg-white px-7 py-4 text-sm font-semibold text-black transition hover:bg-slate-100"
                    @click="handleBuyNow"
                  >
                    Buy now
                  </button>
                  <button
                    type="button"
                    class="relative rounded-full border border-white/10 bg-white/[0.04] px-7 py-4 text-sm font-semibold text-white transition hover:border-white/18 hover:bg-white/[0.08]"
                    @click="handleAddToCart"
                  >
                    Add to cart
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-semibold text-white transition hover:border-white/18 hover:bg-white/[0.08]"
                    @click="handleToggleFavorite"
                  >
                    {{ isCurrentFavorite ? 'Saved' : 'Save' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-center lg:justify-end">
              <div ref="heroVisual" class="relative w-full max-w-[52rem]">
                <div class="absolute inset-0 rounded-[3rem] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.22),_transparent_42%)] blur-3xl"></div>
                <div class="relative overflow-hidden rounded-[3rem] border border-white/10 bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.02] p-4 shadow-[0_45px_140px_rgba(0,0,0,0.7)] sm:p-6">
                  <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_28%,transparent_72%,rgba(255,255,255,0.03))]"></div>
                  <div class="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-black">
                    <div class="aspect-[4/5] sm:aspect-[16/11]">
                      <img
                        v-if="product.image"
                        :src="product.image"
                        :alt="product.title"
                        class="h-full w-full object-cover"
                      />
                      <div
                        v-else
                        class="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.14),_transparent_42%)] text-8xl font-semibold text-white"
                      >
                        {{ product.title.charAt(0).toUpperCase() }}
                      </div>
                    </div>
                    <div class="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"></div>
                    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,_rgba(255,255,255,0.12),_transparent_34%)]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-5 md:grid-cols-3">
          <article
            v-for="metric in metrics"
            :key="metric.label"
            class="metric-card rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
          >
            <p class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">{{ metric.label }}</p>
            <p class="mt-4 text-4xl font-semibold tracking-tight text-white">{{ metric.value }}</p>
            <p class="mt-4 text-sm leading-7 text-slate-400">{{ metric.note }}</p>
          </article>
        </section>

        <section class="space-y-10">
          <article
            v-for="(panel, index) in storyPanels"
            :key="panel.eyebrow"
            class="detail-panel relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-white/[0.03]"
          >
            <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(255,255,255,0.08),_transparent_18%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_36%,transparent_74%,rgba(255,255,255,0.02))]"></div>
            <div class="relative grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center" :class="{ 'lg:grid-cols-[1.1fr_0.9fr]': index % 2 === 1 }">
              <div class="detail-copy" :class="{ 'lg:order-2': index % 2 === 1 }">
                <p class="detail-eyebrow text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-500">
                  {{ panel.eyebrow }}
                </p>
                <h2 class="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-[4.5rem] lg:leading-[0.94]">
                  {{ panel.title }}
                </h2>
                <p class="mt-6 max-w-2xl text-sm leading-8 text-slate-300 sm:text-base">
                  {{ panel.body }}
                </p>
                <div class="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                  <span class="h-1 w-8 bg-gradient-to-r from-white/65 to-transparent"></span>
                  {{ panel.kicker }}
                </div>
              </div>

              <div class="flex items-center justify-center" :class="{ 'lg:order-1': index % 2 === 1 }">
                <div class="detail-card relative w-full max-w-[42rem]">
                  <div class="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.18),_transparent_46%)] blur-3xl"></div>
                  <div class="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-4">
                    <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),transparent_30%,transparent_76%,rgba(255,255,255,0.03))]"></div>
                    <div class="relative rounded-[2rem] border border-white/10 bg-black/70 p-5">
                      <div class="grid gap-4 sm:grid-cols-2">
                        <div class="rounded-[1.6rem] border border-white/8 bg-white/[0.04] p-5">
                          <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">Views</p>
                          <p class="mt-4 text-3xl font-semibold text-white">{{ product.views }}</p>
                        </div>
                        <div class="rounded-[1.6rem] border border-white/8 bg-white/[0.04] p-5">
                          <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">Sales</p>
                          <p class="mt-4 text-3xl font-semibold text-white">{{ product.sales }}</p>
                        </div>
                      </div>

                      <div class="mt-4 rounded-[1.8rem] border border-white/8 bg-white/[0.04] p-5">
                        <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">Details</p>
                        <div class="mt-4 space-y-3">
                          <p
                            v-for="(paragraph, paragraphIndex) in detailParagraphs"
                            :key="`${product.id}-detail-${paragraphIndex}`"
                            class="text-sm leading-7 text-slate-300"
                          >
                            {{ paragraph }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cta-pulse {
  animation: cta-breathe 2.8s ease-in-out infinite;
}

.cta-shine::after {
  content: '';
  position: absolute;
  inset: -20%;
  background: linear-gradient(115deg, transparent 32%, rgba(255, 255, 255, 0.85) 48%, transparent 64%);
  transform: translateX(-135%) rotate(8deg);
  animation: cta-sheen 3.4s linear infinite;
}

@keyframes cta-breathe {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(255, 255, 255, 0);
    transform: translateY(0);
  }
  50% {
    box-shadow: 0 0 32px rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
  }
}

@keyframes cta-sheen {
  0% {
    transform: translateX(-140%) rotate(8deg);
  }
  100% {
    transform: translateX(140%) rotate(8deg);
  }
}
</style>
