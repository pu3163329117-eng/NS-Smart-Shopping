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
const imageLoadError = ref(false);

const handleImageError = () => {
  imageLoadError.value = true;
};

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
  <div ref="pageRoot" class="min-h-screen overflow-hidden bg-[#050507] pb-24 pt-24 text-white">
    <!-- Liquid Glass Background Elements -->
    <div class="pointer-events-none fixed inset-0 -z-10">
      <div class="absolute inset-0 bg-[#050507]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,_rgba(99,102,241,0.12),_transparent_25%),radial-gradient(circle_at_78%_10%,_rgba(217,70,239,0.1),_transparent_25%),radial-gradient(circle_at_52%_48%,_rgba(255,255,255,0.03),_transparent_35%)]"></div>
      <div class="absolute inset-0 backdrop-blur-[120px]"></div>
      <div class="absolute h-[600px] w-[600px] -top-40 -left-40 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div class="absolute h-[500px] w-[500px] -bottom-40 -right-40 bg-fuchsia-500/10 rounded-full blur-[100px] animate-pulse" style="animation-delay: 2s"></div>
    </div>
    <div class="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mb-10 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          class="rounded-full border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08]"
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
        <section class="product-hero relative overflow-hidden rounded-[3.5rem] border border-white/10 bg-white/[0.02] shadow-[0_48px_120px_rgba(0,0,0,0.8)] backdrop-blur-3xl">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,_rgba(255,255,255,0.04),_transparent_24%),radial-gradient(circle_at_84%_16%,_rgba(99,102,241,0.12),_transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_40%)]"></div>
          <div class="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          <!-- Hero Layout: Split Desktop / Stacked Mobile -->
          <div class="relative grid gap-12 px-6 py-10 lg:grid-cols-[1.4fr_0.6fr] lg:px-12 lg:py-16">
            <!-- Left Column: Visual Centerpiece -->
            <div class="space-y-12">
               <div ref="heroVisual" class="relative group">
                 <div class="absolute inset-0 rounded-[4rem] bg-indigo-500/10 blur-[120px] transition-all group-hover:bg-indigo-500/20"></div>
                 <div class="relative overflow-hidden rounded-[3.5rem] border border-white/20 bg-white/[0.04] p-6 backdrop-blur-3xl shadow-[0_64px_180px_rgba(0,0,0,0.9)]">
                   <img 
                     v-if="product.image && !imageLoadError" 
                     :src="product.image" 
                     :alt="product.title" 
                     @error="handleImageError"
                     class="w-full h-auto rounded-[2.5rem] object-cover transition-transform duration-1000 group-hover:scale-[1.03]" 
                   />
                   <div v-else class="aspect-[16/10] flex flex-col items-center justify-center bg-gradient-to-br from-white/10 to-indigo-500/5 rounded-[2.5rem] relative overflow-hidden">
                     <div class="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.4)_0%,transparent_70%)]"></div>
                     <p class="text-8xl font-black text-white/10 relative z-10">{{ product.title.charAt(0) }}</p>
                     <p v-if="imageLoadError" class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mt-4 relative z-10">Visual Pending / Unavailable</p>
                   </div>
                 </div>
               </div>

              <!-- Extra Product Info / Metrics Integrated -->
              <div class="grid grid-cols-3 gap-6">
                <div v-for="metric in metrics" :key="metric.label" class="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl transition hover:border-white/20">
                  <p class="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">{{ metric.label }}</p>
                  <p class="mt-4 text-4xl font-black text-white">{{ metric.value }}</p>
                </div>
              </div>
            </div>

            <!-- Right Column: Sticky Detail & Action Card -->
            <div class="relative">
              <div class="lg:sticky lg:top-32 space-y-8">
                <!-- Title & Meta -->
                <div ref="heroHeadline" class="space-y-6">
                  <div class="flex items-center gap-3">
                    <span class="rounded-full bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/60">
                      {{ $t('product.hero.eyebrow') }}
                    </span>
                    <span class="text-[10px] uppercase tracking-widest text-white/70">
                      {{ formatDate(product.createdAt) }}
                    </span>
                  </div>
                  <h1 class="text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-[4.5rem] xl:leading-[1.1]">
                    {{ product.title }}
                  </h1>
                  <p class="text-[14px] uppercase tracking-[0.4em] text-white/50">{{ product.provider }}</p>
                </div>

                <!-- Purchase & SKU Card -->
                <div class="rounded-[2.8rem] border border-white/15 bg-white/[0.06] p-8 backdrop-blur-3xl shadow-2xl space-y-8">
                  <div>
                    <p class="text-lg leading-relaxed text-slate-200">{{ product.description }}</p>
                  </div>

                  <!-- SKU Selector -->
                  <div class="space-y-4">
                    <div class="flex items-end justify-between">
                       <span class="text-4xl font-black text-white">{{ formatMoney(displayPrice) }}</span>
                       <span class="text-xs uppercase tracking-widest text-white/40">
                         {{ isSelectedSkuOutOfStock ? 'OUT OF STOCK' : `Stock: ${selectedSkuStock ?? 'High'}` }}
                       </span>
                    </div>
                    
                    <div class="flex flex-wrap gap-2">
                       <button
                         v-for="sku in availableSkus"
                         :key="sku.id"
                         @click="selectedSkuId = sku.id"
                         class="rounded-full border px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all"
                         :class="selectedSkuId === sku.id ? 'border-white bg-white text-black' : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'"
                       >
                         {{ sku.name }}
                       </button>
                    </div>
                  </div>

                  <!-- Checkout Actions -->
                  <div class="grid gap-3 pt-4">
                    <button @click="handleBuyNow" class="cta-pulse cta-shine rounded-full bg-white py-5 text-[13px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-slate-100">
                      {{ $t('product.actions.buyNow') }}
                    </button>
                    <div class="grid grid-cols-2 gap-3">
                       <button @click="handleAddToCart" class="rounded-full border border-white/10 bg-white/5 py-4 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-white/10 transition">
                         {{ $t('product.actions.addToCart') }}
                       </button>
                       <button @click="handleToggleFavorite" class="rounded-full border border-white/10 bg-white/5 py-4 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-white/10 transition">
                         {{ isCurrentFavorite ? $t('product.actions.saved') : $t('product.actions.save') }}
                       </button>
                    </div>
                  </div>
                </div>

                <!-- Funding Widget Integrated -->
                <div ref="fundingCard" class="rounded-[2.8rem] border border-white/10 bg-indigo-500/[0.03] p-8 backdrop-blur-2xl">
                  <div class="flex justify-between items-start mb-6">
                    <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400/60">{{ $t('product.crowdfunding.eyebrow') }}</p>
                    <span class="text-2xl font-black text-white">{{ Math.round(fundingProgress) }}%</span>
                  </div>
                  <div class="h-1.5 overflow-hidden rounded-full bg-white/10 mb-8">
                    <div class="funding-aurora h-full rounded-full" :style="{ width: `${fundingProgress}%` }"></div>
                  </div>
                  <div class="flex justify-between items-end">
                    <div>
                      <p class="text-[9px] uppercase tracking-widest text-white/60">{{ $t('product.crowdfunding.pledged') }}</p>
                      <p class="text-2xl font-bold text-white mt-1">{{ formatMoney(pledgedAmount) }}</p>
                    </div>
                    <button @click="handleBuyNow" class="rounded-full bg-indigo-500/20 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition">
                      JOIN PROJECT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-5 lg:grid-cols-3">
            <article
              v-for="metric in metrics"
              :key="metric.label"
              class="parallax-spec rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl"
            >
              <p class="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/60">{{ metric.label }}</p>
              <p class="mt-4 text-4xl font-semibold tracking-tight text-white">{{ metric.value }}</p>
              <p class="mt-4 text-sm leading-7 text-white/70">{{ metric.note }}</p>
            </article>
        </section>

        <section class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div class="parallax-copy rounded-[3rem] border border-white/10 bg-white/[0.03] p-10 backdrop-blur-3xl sm:p-12 shadow-2xl">
            <p class="text-[11px] font-semibold uppercase tracking-[0.36em] text-white/75">{{ $t('product.story.eyebrow') }}</p>
            <h2 class="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {{ $t('product.story.title') }}
            </h2>
            <div class="mt-10 space-y-6">
              <p
                v-for="(paragraph, index) in detailParagraphs"
                :key="`${product.id}-paragraph-${index}`"
                class="text-lg leading-relaxed text-slate-200"
              >
                {{ paragraph }}
              </p>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
          <div
            v-for="spec in specBlocks"
            :key="`${spec.label}-${spec.value}`"
            class="parallax-spec rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl"
          >
            <p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">{{ spec.label }}</p>
            <p class="mt-4 text-xl font-semibold text-white">{{ spec.value }}</p>
          </div>
          </div>
        </section>

        <section class="space-y-8">
          <article
            v-for="(panel, index) in storyPanels"
            :key="panel.eyebrow"
            class="story-panel relative overflow-hidden rounded-[3rem] border border-white/10 bg-white/[0.02] backdrop-blur-3xl"
          >
            <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,_rgba(99,102,241,0.1),_transparent_25%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_40%)]"></div>
            <div
              class="relative grid gap-8 px-8 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"
              :class="{ 'lg:grid-cols-[1.1fr_0.9fr]': index % 2 === 1 }"
            >
              <div class="story-copy" :class="{ 'lg:order-2': index % 2 === 1 }">
                <p class="text-[11px] font-semibold uppercase tracking-[0.42em] text-white/30">{{ panel.eyebrow }}</p>
                <h2 class="mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-[5rem] lg:leading-[0.94]">
                  {{ panel.title }}
                </h2>
                <p class="mt-8 max-w-2xl text-lg leading-relaxed text-slate-300">
                  {{ panel.body }}
                </p>
                <div class="mt-10 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                  <span class="h-px w-10 bg-gradient-to-r from-white/40 to-transparent"></span>
                  {{ panel.note }}
                </div>
              </div>

              <div class="story-visual flex items-center justify-center" :class="{ 'lg:order-1': index % 2 === 1 }">
                  <img :src="panel.image || product.image" class="w-full h-full object-cover rounded-[2rem]" />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div class="absolute bottom-6 left-6">
                    <p class="text-[10px] uppercase tracking-widest text-white/40 mb-3">{{ $t('product.specs.dataSync') }}</p>
                    <div class="flex gap-4">
                       <div class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                         <div class="text-[9px] uppercase tracking-widest text-white/30">{{ $t('product.specs.views') }}</div>
                         <div class="text-xl font-bold text-white mt-1">{{ product.views }}</div>
                       </div>
                       <div class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                         <div class="text-[9px] uppercase tracking-widest text-white/30">{{ $t('product.specs.sales') }}</div>
                         <div class="text-xl font-bold text-white mt-1">{{ product.sales }}</div>
                       </div>
                    </div>
                  </div>
              </div>
            </div>
          </article>
        </section>

        <section class="rounded-[3rem] border border-white/10 bg-white/[0.03] p-10 backdrop-blur-3xl">
          <div class="flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-8">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/30">Community Intelligence</p>
              <h2 class="mt-4 text-4xl font-semibold tracking-tight text-white">{{ $t('product.reviews.title') }}</h2>
            </div>
            <div class="text-right">
              <p class="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ reviewAverage || '0.0' }}</p>
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ reviewCount }} {{ $t('product.reviews.count') }}</p>
            </div>
          </div>

          <div class="mt-10 rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-2xl">
            <div class="flex flex-wrap items-center gap-4">
              <p class="text-sm font-semibold text-white/80">{{ $t('product.reviews.myRating') }}</p>
              <div class="flex items-center gap-1.5">
                <button
                  v-for="star in 5"
                  :key="`star-${star}`"
                  type="button"
                  class="transition-all hover:scale-110"
                  :class="reviewForm.rating >= star ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.3)]' : 'text-white/20 hover:text-white/40'"
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
              class="mt-6 w-full resize-none rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/30 focus:bg-white/[0.05] transition-all"
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

          <div v-if="reviews.length" class="mt-10 space-y-6">
            <article
              v-for="review in reviews"
              :key="review.id"
              class="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl"
            >
              <div class="flex items-start justify-between gap-5">
                <div class="flex items-center gap-4">
                  <img :src="review.userAvatar" :alt="review.userName" class="h-14 w-14 rounded-full border-2 border-white/10 object-cover shadow-xl">
                  <div>
                    <p class="text-base font-semibold text-white">{{ review.userName }}</p>
                    <p class="text-xs uppercase tracking-widest text-white/30 mt-1">{{ formatReviewDate(review.createdAt) }}</p>
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
  inset: -100% 0;
  background: linear-gradient(115deg, transparent 20%, rgba(255, 255, 255, 0.2) 50%, transparent 80%);
  transform: translateX(-120%) rotate(25deg);
  animation: fundingSweep 6s ease-in-out infinite;
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
  inset: -150% -50%;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.25) 50%, transparent 60%);
  transform: translateX(-150%) rotate(25deg);
  animation: ctaSheen 5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes fundingSweep {
  0% {
    transform: translateX(-150%) rotate(25deg);
  }
  20%, 100% {
    transform: translateX(200%) rotate(25deg);
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
    transform: translateX(-150%) rotate(25deg);
  }
  15%, 100% {
    transform: translateX(200%) rotate(25deg);
  }
}
</style>
