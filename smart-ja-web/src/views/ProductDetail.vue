<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCart } from '../store/cart';
import { useCheckout } from '../store/checkout';
import { useFavorites } from '../store/favorites';
import { useProducts } from '../store/products';
import { useReviews } from '../store/reviews';
import { useToast } from '../composables/useToast';
import { MarketService, UserService } from '../services/api';

gsap.registerPlugin(ScrollTrigger);

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const { addToCart } = useCart();
const { setCheckoutItems } = useCheckout();
const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
const { getProductById } = useProducts();
const reviewStore = useReviews();
const { show: showToast } = useToast();

const pageRoot = ref(null);
const heroHeadline = ref(null);
const heroSummary = ref(null);
const heroVisual = ref(null);
const fundingCard = ref(null);

const product = ref(null);
const loading = ref(true);
const errorMessage = ref('');
const reviewForm = ref({
  rating: 0,
  content: ''
});
const selectedSkuId = ref('');
const selectedOrderId = ref('');
const submittingReview = ref(false);
const purchaseChecking = ref(false);
const eligibleOrders = ref([]);
const reviewLoadError = ref('');

let animationContext = null;

const productId = computed(() => String(route.params.id ?? ''));
const isAuthenticated = computed(() => Boolean(localStorage.getItem('auth_token')));
const currentUserId = computed(() => {
  try {
    const raw = localStorage.getItem('user_info');
    return raw ? JSON.parse(raw)?.id || '' : '';
  } catch {
    return '';
  }
});

const collectSkuCandidates = (source = {}) => {
  const candidates = [source?.skus, source?.serviceSkus, source?.skuList, source?.variants, source?.options];
  for (const item of candidates) {
    if (Array.isArray(item)) {
      return item;
    }
  }
  return [];
};

const normalizeSku = (sku = {}, index = 0, fallbackPrice = 0) => {
  const stockValue = Number(sku?.stock);
  const parsedPrice = Number(sku?.price ?? fallbackPrice);
  const composedName = [sku?.color, sku?.memory, sku?.version].filter(Boolean).join(' · ');

  return {
    id: String(sku?.id || `sku-${index + 1}`),
    name: sku?.name || sku?.title || composedName || `规格 ${index + 1}`,
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    stock: Number.isFinite(stockValue) ? stockValue : null,
    image: sku?.image || '',
    sort: Number.isFinite(Number(sku?.sort)) ? Number(sku.sort) : index
  };
};

const normalizeProduct = (source) => ({
  id: String(source?.id ?? ''),
  title: source?.title || source?.name || t('product.defaultTitle'),
  description:
    source?.description ||
    source?.desc ||
    t('product.defaultDescription'),
  details:
    source?.details ||
    source?.longDesc ||
    source?.description ||
    source?.desc ||
    t('product.defaultDetails'),
  provider: source?.provider || source?.company || t('product.defaultProvider'),
  price: Number(source?.price ?? 0),
  image: source?.image || source?.img || '',
  tags: Array.isArray(source?.tags) ? source.tags.filter(Boolean).slice(0, 8) : [],
  sales: Number(source?.sales ?? 0),
  views: Number(source?.views ?? 0),
  createdAt: source?.createdAt || null,
  type: source?.type || t('product.defaultType'),
  factoryData: source?.factoryData && typeof source.factoryData === 'object' ? source.factoryData : {},
  fundingGoal: Number(source?.fundingGoal ?? 10000),
  pledgedAmount: Number(source?.pledgedAmount ?? 0),
  backersCount: Number(source?.backersCount ?? 0),
  skus: collectSkuCandidates(source)
    .map((sku, index) => normalizeSku(sku, index, Number(source?.price ?? 0)))
    .sort((a, b) => a.sort - b.sort)
});

const formatMoney = (value) => {
  const amount = Number(value ?? 0);
  return `\u00A5${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
};

const formatDate = (value) => {
  if (!value) {
    return t('product.hero.liveNow');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return t('product.hero.liveNow');
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

const detailParagraphs = computed(() =>
  splitParagraphs(product.value?.details || product.value?.description).slice(0, 4)
);

const availableSkus = computed(() => {
  if (!product.value) {
    return [];
  }
  if (Array.isArray(product.value.skus) && product.value.skus.length) {
    return product.value.skus;
  }
  return [
    {
      id: `${product.value.id}-default`,
      name: '默认版本',
      price: Number(product.value.price || 0),
      stock: null,
      image: product.value.image || ''
    }
  ];
});

const hasSkuVariants = computed(() => availableSkus.value.length > 1);

const selectedSku = computed(() => {
  if (!availableSkus.value.length) {
    return null;
  }
  const matched = availableSkus.value.find((sku) => sku.id === selectedSkuId.value);
  return matched || availableSkus.value[0];
});

const displayPrice = computed(() => Number(selectedSku.value?.price ?? product.value?.price ?? 0));
const selectedSkuStock = computed(() => selectedSku.value?.stock);
const isSelectedSkuOutOfStock = computed(() => {
  const stock = selectedSkuStock.value;
  return Number.isFinite(Number(stock)) && Number(stock) <= 0;
});

const fundingGoal = computed(() => Math.max(0, Number(product.value?.fundingGoal ?? 0)));
const pledgedAmount = computed(() => Math.max(0, Number(product.value?.pledgedAmount ?? 0)));
const backersCount = computed(() => Math.max(0, Number(product.value?.backersCount ?? 0)));

const fundingProgress = computed(() => {
  if (!fundingGoal.value) {
    return 0;
  }

  return Math.max(0, Math.min(100, (pledgedAmount.value / fundingGoal.value) * 100));
});

const fundingRemaining = computed(() =>
  Math.max(0, fundingGoal.value - pledgedAmount.value)
);

const metrics = computed(() => {
  if (!product.value) {
    return [];
  }

  const aiMatch = Math.min(99, 84 + product.value.tags.length * 2 + Math.min(product.value.sales, 5));
  const buildConfidence = Math.min(98, 80 + Math.round(product.value.views / 35) + product.value.tags.length);
  const deliveryReadiness = Math.max(72, Math.min(97, 78 + Math.round(product.value.sales / 4)));

  return [
    {
      label: t('product.metrics.aiMatch'),
      value: `${aiMatch}%`,
      note: t('product.metrics.aiMatchNote')
    },
    {
      label: t('product.metrics.buildConfidence'),
      value: `${buildConfidence}`,
      note: t('product.metrics.buildConfidenceNote')
    },
    {
      label: t('product.metrics.deliveryReadiness'),
      value: `${deliveryReadiness}%`,
      note: t('product.metrics.deliveryReadinessNote')
    }
  ];
});

const specBlocks = computed(() => {
  if (!product.value) {
    return [];
  }

  const factoryEntries = Object.entries(product.value.factoryData || {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 4)
    .map(([key, value]) => ({
      label: key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/^./, (char) => char.toUpperCase()),
      value: String(value)
    }));

  const tagBlocks = product.value.tags.slice(0, 4).map((tag, index) => ({
    label: `Tag 0${index + 1}`,
    value: tag
  }));

  const fallbackBlocks = [
    { label: t('product.specs.views'), value: `${product.value.views}` },
    { label: t('product.specs.sales'), value: `${product.value.sales}` },
    { label: t('product.specs.launchData'), value: product.value.type || t('product.defaultType') },
    { label: t('product.specs.funding'), value: `${Math.round(fundingProgress.value)}%` }
  ];

  return [...factoryEntries, ...tagBlocks, ...fallbackBlocks].slice(0, 6);
});

const storyPanels = computed(() => {
  if (!product.value) {
    return [];
  }

  return [
    {
      eyebrow: t('product.story.conceptEyebrow'),
      title: t('product.story.conceptTitle'),
      body:
        product.value.description ||
        t('product.story.conceptBody'),
      note: product.value.provider
    },
    {
      eyebrow: t('product.story.systemEyebrow'),
      title: t('product.story.systemTitle'),
      body:
        detailParagraphs.value[0] ||
        t('product.story.systemBody'),
      note: `${product.value.tags.length || 0} ${t('product.story.systemNote')}`
    },
    {
      eyebrow: t('product.story.crowdfundingEyebrow'),
      title: t('product.story.crowdfundingTitle'),
      body:
        t('product.story.crowdfundingBody', {
          pledged: formatMoney(pledgedAmount.value),
          goal: formatMoney(fundingGoal.value),
          backers: backersCount.value
        }),
      note: `${Math.round(fundingProgress.value)}% ${t('product.story.funded')}`
    }
  ];
});

const cartPayload = computed(() => {
  if (!product.value || !selectedSku.value) {
    return null;
  }

  return {
    ...product.value,
    skuId: selectedSku.value.id,
    skuName: selectedSku.value.name,
    stock: selectedSku.value.stock,
    name: product.value.title,
    price: displayPrice.value,
    img: selectedSku.value.image || product.value.image,
    image: selectedSku.value.image || product.value.image,
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

const reviews = computed(() => reviewStore.getReviews(productId.value));
const reviewCount = computed(() => reviews.value.length);
const reviewAverage = computed(() => {
  if (!reviews.value.length) {
    return 0;
  }
  const total = reviews.value.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return Number((total / reviews.value.length).toFixed(1));
});

const remainingReviewOrders = computed(() => {
  const reviewedOrderIds = new Set(
    reviews.value
      .filter((item) => item.userId && item.userId === currentUserId.value)
      .map((item) => String(item.orderId || ''))
      .filter(Boolean)
  );

  return eligibleOrders.value.filter((order) => !reviewedOrderIds.has(String(order.id)));
});

const canSubmitReview = computed(
  () =>
    isAuthenticated.value &&
    remainingReviewOrders.value.length > 0 &&
    reviewForm.value.rating > 0 &&
    reviewForm.value.content.trim().length > 0
);

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
    gsap.set([heroHeadline.value, heroSummary.value], { opacity: 0, y: 44 });
    gsap.set(heroVisual.value, { opacity: 0, scale: 0.9, y: 32, filter: 'brightness(0.6)' });
    gsap.set(fundingCard.value, { opacity: 0, y: 40 });

    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .to(heroHeadline.value, { opacity: 1, y: 0, duration: 0.95 })
      .to(heroSummary.value, { opacity: 1, y: 0, duration: 0.9 }, '-=0.55')
      .to(heroVisual.value, { opacity: 1, scale: 1, y: 0, duration: 1.15, filter: 'brightness(1)' }, '-=0.65')
      .to(fundingCard.value, { opacity: 1, y: 0, duration: 0.75 }, '-=0.75');

    gsap.to(heroVisual.value, {
      yPercent: -12,
      scale: 1.06,
      ease: 'none',
      scrollTrigger: {
        trigger: '.product-hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true
      }
    });

    gsap.utils.toArray('.parallax-copy').forEach((item, index) => {
      gsap.fromTo(
        item,
        { opacity: 0, y: 64 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power2.out',
          delay: index * 0.06,
          scrollTrigger: {
            trigger: item,
            start: 'top 82%'
          }
        }
      );
    });

    gsap.utils.toArray('.parallax-spec').forEach((item, index) => {
      gsap.fromTo(
        item,
        { opacity: 0, y: 46, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.85,
          ease: 'power2.out',
          delay: index * 0.05,
          scrollTrigger: {
            trigger: item,
            start: 'top 84%'
          }
        }
      );
    });

    gsap.utils.toArray('.story-panel').forEach((panel) => {
      const copy = panel.querySelector('.story-copy');
      const visual = panel.querySelector('.story-visual');

      if (copy) {
        gsap.fromTo(
          copy,
          { opacity: 0.18, y: 72 },
          {
            opacity: 1,
            y: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: panel,
              start: 'top 74%',
              end: 'top 38%',
              scrub: 0.75
            }
          }
        );
      }

      if (visual) {
        gsap.fromTo(
          visual,
          { opacity: 0, y: 96, scale: 0.92, filter: 'brightness(0.6)' },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'brightness(1)',
            ease: 'power2.out',
            scrollTrigger: {
              trigger: panel,
              start: 'top 76%',
              end: 'top 34%',
              scrub: 0.9
            }
          }
        );
      }
    });
  }, pageRoot.value);
};

const formatReviewDate = (value) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString();
};

const loadReviews = async () => {
  reviewLoadError.value = '';
  try {
    await reviewStore.fetchReviews(productId.value);
  } catch (error) {
    reviewLoadError.value = error?.message || t('product.reviews.loadError');
  }
};

const loadEligibleOrders = async () => {
  if (!isAuthenticated.value) {
    eligibleOrders.value = [];
    selectedOrderId.value = '';
    return;
  }

  purchaseChecking.value = true;
  try {
    const response = await UserService.getMyOrders();
    const orders = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
    const paidStatuses = new Set(['paid', 'shipped', 'completed']);

    eligibleOrders.value = orders.filter((order) => {
      if (!paidStatuses.has(String(order.status || '').toLowerCase())) {
        return false;
      }

      if (String(order.serviceId || '') === productId.value) {
        return true;
      }

      const items = Array.isArray(order.items) ? order.items : [];
      return items.some((item) => String(item.serviceId || item.id || '') === productId.value);
    });
  } catch (error) {
    eligibleOrders.value = [];
  } finally {
    purchaseChecking.value = false;
  }
};

const syncSelectedOrder = () => {
  if (remainingReviewOrders.value.length === 0) {
    selectedOrderId.value = '';
    return;
  }
  const exists = remainingReviewOrders.value.some((order) => String(order.id) === String(selectedOrderId.value));
  if (!exists) {
    selectedOrderId.value = String(remainingReviewOrders.value[0].id);
  }
};

const syncSelectedSku = () => {
  if (!availableSkus.value.length) {
    selectedSkuId.value = '';
    return;
  }
  const exists = availableSkus.value.some((sku) => sku.id === selectedSkuId.value);
  if (!exists) {
    const preferred = availableSkus.value.find((sku) => Number(sku.stock) > 0) || availableSkus.value[0];
    selectedSkuId.value = preferred.id;
  }
};

const setReviewRating = (rating) => {
  reviewForm.value.rating = rating;
};

const submitReview = async () => {
  if (!isAuthenticated.value) {
    showToast(t('product.reviews.requireLoginToast'), 'warning');
    router.push('/login');
    return;
  }

  if (!remainingReviewOrders.value.length) {
    showToast(t('product.reviews.requirePurchaseAuthToast'), 'warning');
    return;
  }

  if (!canSubmitReview.value) {
    showToast(t('product.reviews.requireContentToast'), 'warning');
    return;
  }

  submittingReview.value = true;
  try {
    await reviewStore.addReview(productId.value, {
      orderId: selectedOrderId.value,
      rating: reviewForm.value.rating,
      content: reviewForm.value.content.trim()
    });
    reviewForm.value = { rating: 0, content: '' };
    showToast(t('product.reviews.submitSuccessToast'), 'success');
    await loadEligibleOrders();
    syncSelectedOrder();
  } catch (error) {
    const purchasedBlocked =
      error?.response?.status === 403 ||
      String(error?.message || '').includes('purchase') ||
      String(error?.message || '').includes('order');
    showToast(purchasedBlocked ? t('product.reviews.requirePurchaseToast') : error?.message || t('product.reviews.submitErrorToast'), 'error');
  } finally {
    submittingReview.value = false;
  }
};

const loadProduct = async () => {
  loading.value = true;
  errorMessage.value = '';
  product.value = null;

  try {
    const response = await MarketService.getServiceById(route.params.id);
    product.value = normalizeProduct(response);
  } catch (error) {
    const exactFallback = getProductById(productId.value);
    const numericId = Number(productId.value);
    const numericFallback = Number.isNaN(numericId) ? null : getProductById(numericId);
    const fallback = exactFallback || numericFallback;

    if (fallback) {
      product.value = normalizeProduct(fallback);
    } else {
      errorMessage.value = error?.message || t('product.errorMessage');
    }
  } finally {
    loading.value = false;
    syncSelectedSku();
    await nextTick();
    initAnimations();
  }
};

watch(
  productId,
  () => {
    if (productId.value) {
      void loadProduct();
      void loadReviews();
      void loadEligibleOrders();
    }
  },
  { immediate: true }
);

watch(
  () => remainingReviewOrders.value.length,
  () => {
    syncSelectedOrder();
  }
);

watch(
  () => availableSkus.value.length,
  () => {
    syncSelectedSku();
  }
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

  if (isSelectedSkuOutOfStock.value) {
    showToast('该规格库存已售罄', 'warning');
    return;
  }

  addToCart(cartPayload.value);
  showToast(t('product.toast.addedToCart'), 'success');
};

const handleBuyNow = () => {
  if (!cartPayload.value) {
    return;
  }

  if (isSelectedSkuOutOfStock.value) {
    showToast('该规格库存已售罄', 'warning');
    return;
  }

  setCheckoutItems([{ ...cartPayload.value, quantity: 1 }], 'buy_now');
  router.push('/checkout');
};

const handleToggleFavorite = () => {
  if (!cartPayload.value) {
    return;
  }

  if (isCurrentFavorite.value) {
    removeFromFavorites(product.value.id);
    showToast(t('product.toast.removedFavorite'), 'info');
    return;
  }

  addToFavorites(cartPayload.value);
  showToast(t('product.toast.savedFavorite'), 'success');
};

onBeforeUnmount(() => {
  clearAnimations();
});
</script>

<template>
  <div ref="pageRoot" class="min-h-screen overflow-hidden bg-white dark:bg-[#0a0a0c] pb-24 pt-20 text-slate-900 dark:text-white">
    <div class="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,_rgba(99,102,241,0.18),_transparent_18%),radial-gradient(circle_at_78%_10%,_rgba(217,70,239,0.16),_transparent_16%),radial-gradient(circle_at_52%_48%,_rgba(255,255,255,0.04),_transparent_30%),linear-gradient(180deg,#050507_0%,#0a0a0c_36%,#09090f_100%)]"></div>
    <div class="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>

    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          class="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-900 dark:text-white transition hover:border-slate-200 dark:border-white/20 hover:bg-white/[0.07]"
          @click="goBack"
        >
          {{ $t('product.actions.backToMarket') }}
        </button>

        <button
          type="button"
          class="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-900 dark:text-white transition hover:border-slate-200 dark:border-white/20 hover:bg-white/[0.07]"
          @click="loadProduct"
        >
          {{ $t('product.actions.refresh') }}
        </button>
      </div>

      <div v-if="loading" class="space-y-6">
        <div class="overflow-hidden rounded-[2.8rem] border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/[0.03] p-6">
          <div class="animate-pulse">
            <div class="aspect-[16/10] rounded-[2.25rem] bg-white/8"></div>
            <div class="mt-8 h-5 w-40 rounded-full bg-white/8"></div>
            <div class="mt-5 h-20 w-5/6 rounded-[2rem] bg-white/8"></div>
            <div class="mt-5 h-5 w-2/3 rounded-full bg-white/8"></div>
          </div>
        </div>
        <div class="grid gap-5 lg:grid-cols-3">
          <div
            v-for="index in 3"
            :key="index"
            class="animate-pulse rounded-[2rem] border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/[0.03] p-6"
          >
            <div class="h-3 w-24 rounded-full bg-white/8"></div>
            <div class="mt-5 h-10 w-28 rounded-full bg-white/8"></div>
            <div class="mt-4 h-4 w-4/5 rounded-full bg-white/8"></div>
          </div>
        </div>
      </div>

      <div
        v-else-if="errorMessage && !product"
        class="rounded-[2.8rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-6 py-14 text-center backdrop-blur-sm"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-500">{{ $t('product.errorEyebrow') }}</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white">{{ $t('product.errorTitle') }}</h1>
        <p class="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">{{ errorMessage }}</p>
        <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            class="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-slate-100"
            @click="loadProduct"
          >
            {{ $t('product.actions.tryAgain') }}
          </button>
          <button
            type="button"
            class="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-6 py-3 text-sm font-semibold text-slate-900 dark:text-white transition hover:border-slate-200 dark:border-white/20 hover:bg-white/[0.07]"
            @click="goBack"
          >
            {{ $t('product.actions.returnToMarket') }}
          </button>
        </div>
      </div>

      <div v-else-if="product" class="space-y-10">
        <section class="product-hero relative overflow-hidden rounded-[3rem] border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/[0.02] shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,_rgba(255,255,255,0.05),_transparent_20%),radial-gradient(circle_at_84%_16%,_rgba(99,102,241,0.18),_transparent_18%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_34%,transparent_76%,rgba(255,255,255,0.02))]"></div>
          <div class="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          <div class="relative grid gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-10 lg:py-12">
            <div class="relative z-10">
              <div ref="heroHeadline">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-300">
                    {{ $t('product.hero.eyebrow') }}
                  </span>
                  <span class="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {{ formatDate(product.createdAt) }}
                  </span>
                </div>

                <p class="mt-8 text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500">{{ product.provider }}</p>
                <h1 class="mt-5 text-6xl font-black tracking-[-0.08em] text-transparent sm:text-7xl md:text-8xl lg:text-[7.5rem] lg:leading-[0.88]">
                  <span class="bg-gradient-to-br from-white via-white to-white/45 bg-clip-text product-title-glow">
                    {{ product.title }}
                  </span>
                </h1>
              </div>

              <div ref="heroSummary" class="mt-8 max-w-2xl space-y-8">
                <p class="text-base leading-8 text-slate-300 sm:text-lg sm:leading-9">
                  {{ product.description }}
                </p>

                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in product.tags"
                    :key="tag"
                    class="rounded-full border border-slate-200 dark:border-white/8 bg-slate-100 dark:bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300"
                  >
                    {{ tag }}
                  </span>
                  <span class="rounded-full border border-slate-200 dark:border-white/8 bg-slate-100 dark:bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                    {{ product.type || $t('product.defaultType') }}
                  </span>
                </div>

                <div class="rounded-[1.6rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4 sm:p-5">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">SKU</p>
                      <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ formatMoney(displayPrice) }}</p>
                    </div>
                    <span
                      class="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                      :class="
                        isSelectedSkuOutOfStock
                          ? 'border-rose-400/35 bg-rose-400/10 text-rose-200'
                          : 'border-emerald-300/35 bg-emerald-300/10 text-emerald-100'
                      "
                    >
                      {{
                        isSelectedSkuOutOfStock
                          ? '🔥 售罄啦 (Out of Stock)'
                          : `库存 ${selectedSkuStock ?? '--'}`
                      }}
                    </span>
                  </div>

                  <div class="mt-4 flex flex-wrap gap-2">
                    <button
                      v-for="sku in availableSkus"
                      :key="sku.id"
                      type="button"
                      class="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition"
                      :class="
                        selectedSkuId === sku.id
                          ? 'border-slate-200 dark:border-white/35 bg-white/[0.14] text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-300 hover:border-slate-200 dark:border-white/25 hover:bg-slate-200 dark:bg-white/[0.08]'
                      "
                      @click="selectedSkuId = sku.id"
                    >
                      <span>{{ sku.name }}</span>
                      <span class="ml-2 text-slate-600 dark:text-white/55">{{ formatMoney(sku.price) }}</span>
                    </button>
                  </div>

                  <p v-if="hasSkuVariants" class="mt-3 text-xs text-slate-400">请选择规格后再加入购物车或结算。</p>
                </div>

                <div class="flex flex-col gap-4 sm:flex-row">
                  <button
                    type="button"
                    class="relative overflow-hidden rounded-full px-7 py-4 text-sm font-semibold transition"
                    :class="
                      isSelectedSkuOutOfStock
                        ? 'cursor-not-allowed bg-white/20 text-slate-600 dark:text-white/40'
                        : 'cta-pulse cta-shine bg-white text-black hover:bg-slate-100'
                    "
                    :disabled="isSelectedSkuOutOfStock"
                    @click="handleBuyNow"
                  >
                    {{ isSelectedSkuOutOfStock ? '🔥 售罄啦' : $t('product.actions.buyNow') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full border px-7 py-4 text-sm font-semibold transition"
                    :class="
                      isSelectedSkuOutOfStock
                        ? 'cursor-not-allowed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-400 dark:text-slate-600 dark:text-white/35'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white hover:border-slate-200 dark:border-white/20 hover:bg-slate-200 dark:bg-white/[0.08]'
                    "
                    :disabled="isSelectedSkuOutOfStock"
                    @click="handleAddToCart"
                  >
                    {{ $t('product.actions.addToCart') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white transition hover:border-slate-200 dark:border-white/20 hover:bg-slate-200 dark:bg-white/[0.08]"
                    @click="handleToggleFavorite"
                  >
                    {{ isCurrentFavorite ? $t('product.actions.saved') : $t('product.actions.save') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="relative">
              <div ref="heroVisual" class="relative mx-auto w-full max-w-[52rem]">
                <div class="absolute inset-0 rounded-[3rem] bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.22),_transparent_36%),radial-gradient(circle_at_60%_40%,_rgba(255,255,255,0.12),_transparent_24%)] blur-3xl"></div>
                <div class="relative overflow-hidden rounded-[3rem] border border-slate-200 dark:border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-4 shadow-[0_45px_140px_rgba(0,0,0,0.72)] sm:p-6">
                  <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_26%,transparent_78%,rgba(255,255,255,0.03))]"></div>
                  <div class="relative overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-white/8 bg-[#050507]">
                    <div class="aspect-[4/5] sm:aspect-[16/11]">
                      <img
                        v-if="product.image"
                        :src="product.image"
                        :alt="product.title"
                        class="h-full w-full object-cover"
                      />
                      <div
                        v-else
                        class="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.15),_transparent_34%),radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.08),_transparent_45%)]"
                      >
                        <div class="text-center">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-500">{{ $t('product.hero.renderStage') }}</p>
                          <p class="mt-6 text-7xl font-semibold text-slate-600 dark:text-white/90">{{ product.title.charAt(0).toUpperCase() }}</p>
                        </div>
                      </div>
                    </div>
                    <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"></div>
                    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,_rgba(255,255,255,0.12),_transparent_34%)]"></div>
                  </div>
                </div>
              </div>

              <div
                ref="fundingCard"
                class="floating-fund-card relative z-10 mt-6 rounded-[2.2rem] border border-slate-200 dark:border-white/10 bg-white/5 p-6 backdrop-blur-2xl lg:-mt-16 lg:ml-auto lg:max-w-sm"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">{{ $t('product.crowdfunding.eyebrow') }}</p>
                    <h2 class="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">{{ $t('product.crowdfunding.title') }}</h2>
                  </div>
                  <span class="rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {{ Math.round(fundingProgress) }}%
                  </span>
                </div>

                <div class="mt-6">
                  <div class="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    <span>{{ $t('product.crowdfunding.wave') }}</span>
                    <span>{{ Math.round(fundingProgress) }}% {{ $t('product.crowdfunding.filled') }}</span>
                  </div>
                  <div class="h-3 overflow-hidden rounded-full bg-white/10">
                    <div class="funding-aurora h-full rounded-full" :style="{ width: `${fundingProgress}%` }"></div>
                  </div>
                </div>

                <div class="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  <div>
                    <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">{{ $t('product.crowdfunding.pledged') }}</p>
                    <p class="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{{ formatMoney(pledgedAmount) }}</p>
                  </div>
                  <div>
                    <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">{{ $t('product.crowdfunding.goal') }}</p>
                    <p class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{{ formatMoney(fundingGoal) }}</p>
                  </div>
                  <div>
                    <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">{{ $t('product.crowdfunding.backers') }}</p>
                    <p class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{{ backersCount }}</p>
                  </div>
                </div>

                <p class="mt-5 text-sm leading-7 text-slate-400">
                  {{ $t('product.crowdfunding.remaining', { amount: formatMoney(fundingRemaining) }) }}
                </p>

                <button
                  type="button"
                  class="funding-cta mt-6 w-full rounded-full px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white transition"
                  :class="isSelectedSkuOutOfStock ? 'cursor-not-allowed opacity-45' : ''"
                  :disabled="isSelectedSkuOutOfStock"
                  @click="handleBuyNow"
                >
                  {{ isSelectedSkuOutOfStock ? '🔥 售罄啦 (Out of Stock)' : $t('product.actions.backProject') }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-5 lg:grid-cols-3">
          <article
            v-for="metric in metrics"
            :key="metric.label"
            class="parallax-spec rounded-[2rem] border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/[0.03] p-6 backdrop-blur-sm"
          >
            <p class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">{{ metric.label }}</p>
            <p class="mt-4 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ metric.value }}</p>
            <p class="mt-4 text-sm leading-7 text-slate-400">{{ metric.note }}</p>
          </article>
        </section>

        <section class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div class="parallax-copy rounded-[2.6rem] border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/[0.03] p-7 backdrop-blur-sm sm:p-8">
            <p class="text-[11px] font-semibold uppercase tracking-[0.36em] text-slate-500">{{ $t('product.story.eyebrow') }}</p>
            <h2 class="mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              {{ $t('product.story.title') }}
            </h2>
            <div class="mt-6 space-y-5">
              <p
                v-for="(paragraph, index) in detailParagraphs"
                :key="`${product.id}-paragraph-${index}`"
                class="text-sm leading-8 text-slate-300 sm:text-base"
              >
                {{ paragraph }}
              </p>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div
              v-for="spec in specBlocks"
              :key="`${spec.label}-${spec.value}`"
              class="parallax-spec rounded-[2rem] border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/[0.03] p-5 backdrop-blur-sm"
            >
              <p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{{ spec.label }}</p>
              <p class="mt-4 text-xl font-semibold text-slate-900 dark:text-white">{{ spec.value }}</p>
            </div>
          </div>
        </section>

        <section class="space-y-8">
          <article
            v-for="(panel, index) in storyPanels"
            :key="panel.eyebrow"
            class="story-panel relative overflow-hidden rounded-[2.8rem] border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/[0.02]"
          >
            <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,_rgba(99,102,241,0.16),_transparent_18%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_36%,transparent_74%,rgba(255,255,255,0.02))]"></div>
            <div
              class="relative grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"
              :class="{ 'lg:grid-cols-[1.1fr_0.9fr]': index % 2 === 1 }"
            >
              <div class="story-copy" :class="{ 'lg:order-2': index % 2 === 1 }">
                <p class="text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-500">{{ panel.eyebrow }}</p>
                <h2 class="mt-5 text-3xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white sm:text-5xl lg:text-[4.5rem] lg:leading-[0.92]">
                  {{ panel.title }}
                </h2>
                <p class="mt-6 max-w-2xl text-sm leading-8 text-slate-300 sm:text-base">
                  {{ panel.body }}
                </p>
                <div class="mt-8 inline-flex items-center gap-3 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                  <span class="h-px w-8 bg-gradient-to-r from-white/80 to-transparent"></span>
                  {{ panel.note }}
                </div>
              </div>

              <div class="story-visual flex items-center justify-center" :class="{ 'lg:order-1': index % 2 === 1 }">
                <div class="relative w-full max-w-[42rem]">
                  <div class="absolute inset-0 rounded-[2.4rem] bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.18),_transparent_46%)] blur-3xl"></div>
                  <div class="relative overflow-hidden rounded-[2.4rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4">
                    <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_30%,transparent_76%,rgba(255,255,255,0.025))]"></div>
                    <div class="relative rounded-[2rem] border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-black/60 p-5">
                      <div class="grid gap-4 sm:grid-cols-2">
                        <div class="rounded-[1.6rem] border border-slate-200 dark:border-white/8 bg-slate-100 dark:bg-white/[0.04] p-5">
                          <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">{{ $t('product.specs.views') }}</p>
                          <p class="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">{{ product.views }}</p>
                        </div>
                        <div class="rounded-[1.6rem] border border-slate-200 dark:border-white/8 bg-slate-100 dark:bg-white/[0.04] p-5">
                          <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">{{ $t('product.specs.sales') }}</p>
                          <p class="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">{{ product.sales }}</p>
                        </div>
                      </div>

                      <div class="mt-4 rounded-[1.8rem] border border-slate-200 dark:border-white/8 bg-slate-100 dark:bg-white/[0.04] p-5">
                        <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">{{ $t('product.specs.launchData') }}</p>
                        <div class="mt-4 grid gap-3 sm:grid-cols-2">
                          <div class="rounded-2xl border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-black/30 p-4">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-500">{{ $t('product.specs.price') }}</p>
                            <p class="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{{ formatMoney(product.price) }}</p>
                          </div>
                          <div class="rounded-2xl border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-black/30 p-4">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-500">{{ $t('product.crowdfunding.backers') }}</p>
                            <p class="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{{ backersCount }}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section class="rounded-[2.6rem] border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8">
          <div class="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 dark:border-white/8 pb-5">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">Reviews</p>
              <h2 class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ $t('product.reviews.title') }}</h2>
            </div>
            <div class="text-right">
              <p class="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ reviewAverage || '0.0' }}</p>
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ reviewCount }} {{ $t('product.reviews.count') }}</p>
            </div>
          </div>

          <div class="mt-6 rounded-[1.8rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 p-5">
            <div class="flex flex-wrap items-center gap-3">
              <p class="text-sm font-medium text-slate-800 dark:text-slate-600 dark:text-white/80">{{ $t('product.reviews.myRating') }}</p>
              <div class="flex items-center gap-1">
                <button
                  v-for="star in 5"
                  :key="`star-${star}`"
                  type="button"
                  class="transition"
                  :class="reviewForm.rating >= star ? 'text-amber-300' : 'text-slate-600 dark:text-white/20 hover:text-slate-600 dark:text-white/40'"
                  @click="setReviewRating(star)"
                >
                  <svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.3l6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.76-1.64 7.03z" />
                  </svg>
                </button>
              </div>
            </div>

            <textarea
              v-model="reviewForm.content"
              rows="4"
              class="mt-4 w-full resize-none rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-600 dark:text-white/30 focus:border-slate-200 dark:border-white/20"
              :placeholder="$t('product.reviews.placeholder')"
            ></textarea>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div class="text-xs text-slate-400">
                <span v-if="!isAuthenticated">{{ $t('product.reviews.requireLogin') }}</span>
                <span v-else-if="purchaseChecking">{{ $t('product.reviews.checking') }}</span>
                <span v-else-if="remainingReviewOrders.length === 0">{{ $t('product.reviews.requirePurchaseAuth') }}</span>
                <span v-else>{{ $t('product.reviews.eligibleOrders', { count: remainingReviewOrders.length }) }}</span>
              </div>

              <div class="flex items-center gap-3">
                <select
                  v-if="remainingReviewOrders.length > 1"
                  v-model="selectedOrderId"
                  class="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 py-2 text-xs text-slate-800 dark:text-slate-600 dark:text-white/80 outline-none"
                >
                  <option v-for="order in remainingReviewOrders" :key="order.id" :value="String(order.id)">
                    {{ $t('product.reviews.orderLabel', { id: order.id }) }}
                  </option>
                </select>
                <button
                  type="button"
                  class="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="submittingReview || !canSubmitReview"
                  @click="submitReview"
                >
                  {{ submittingReview ? $t('product.reviews.submitting') : $t('product.reviews.submit') }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="reviewLoadError" class="mt-4 text-sm text-rose-300">{{ reviewLoadError }}</div>

          <div v-if="reviews.length" class="mt-6 space-y-4">
            <article
              v-for="review in reviews"
              :key="review.id"
              class="rounded-[1.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4 sm:p-5"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <img :src="review.userAvatar" :alt="review.userName" class="h-10 w-10 rounded-full border border-slate-200 dark:border-white/10 object-cover">
                  <div>
                    <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ review.userName }}</p>
                    <p class="text-xs text-slate-500">{{ formatReviewDate(review.createdAt) }}</p>
                  </div>
                </div>

                <div class="flex items-center gap-0.5 text-amber-300">
                  <svg
                    v-for="idx in 5"
                    :key="`${review.id}-${idx}`"
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    :class="idx <= review.rating ? 'opacity-100' : 'opacity-20'"
                    fill="currentColor"
                  >
                    <path d="M12 17.3l6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.76-1.64 7.03z" />
                  </svg>
                </div>
              </div>
              <p class="mt-4 text-sm leading-7 text-slate-300">{{ review.content }}</p>
            </article>
          </div>
          <div v-else class="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 dark:border-white/12 bg-slate-50 dark:bg-black/25 p-6 text-center text-sm text-slate-400">
            {{ $t('product.reviews.empty') }}
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-title-glow {
  filter: drop-shadow(0 0 18px rgba(255, 255, 255, 0.08));
}

.funding-aurora {
  position: relative;
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 38%, #d946ef 72%, #f472b6 100%);
  box-shadow: 0 0 24px rgba(139, 92, 246, 0.26);
  overflow: hidden;
}

.funding-aurora::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 28%, rgba(255, 255, 255, 0.65) 48%, transparent 68%);
  transform: translateX(-120%);
  animation: fundingSweep 2.6s linear infinite;
}

.funding-cta {
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.18), transparent 26%),
    linear-gradient(90deg, rgba(99, 102, 241, 0.9), rgba(139, 92, 246, 0.95), rgba(217, 70, 239, 0.92));
  box-shadow: 0 0 0 rgba(139, 92, 246, 0);
}

.funding-cta:hover {
  box-shadow: 0 0 28px rgba(139, 92, 246, 0.3);
  transform: translateY(-1px);
}

.cta-pulse {
  animation: ctaBreathe 2.8s ease-in-out infinite;
}

.cta-shine::after {
  content: '';
  position: absolute;
  inset: -20%;
  background: linear-gradient(115deg, transparent 32%, rgba(255, 255, 255, 0.85) 48%, transparent 64%);
  transform: translateX(-135%) rotate(8deg);
  animation: ctaSheen 3.4s linear infinite;
}

@keyframes fundingSweep {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(150%);
  }
}

@keyframes ctaBreathe {
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

@keyframes ctaSheen {
  0% {
    transform: translateX(-140%) rotate(8deg);
  }

  100% {
    transform: translateX(140%) rotate(8deg);
  }
}
</style>
