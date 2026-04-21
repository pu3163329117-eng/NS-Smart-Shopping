<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFavorites } from '../store/favorites';
import { useProducts } from '../store/products';
import { useToast } from '../composables/useToast';
import { useRouter } from 'vue-router';

const props = defineProps({
  show: Boolean,
  initialTab: {
    type: String,
    default: 'want'
  }
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { favorites, toggleFavorite } = useFavorites();
const { products, refreshProducts } = useProducts();
const { show: showToast } = useToast();
const router = useRouter();

const activeTab = ref(props.initialTab);

watch(
  () => props.initialTab,
  (tab) => {
    if (tab) activeTab.value = tab;
  }
);

watch(
  () => props.show,
  (open) => {
    if (open) {
      activeTab.value = props.initialTab || 'want';
      void refreshProducts();
    }
  }
);

const tabs = computed(() => [
  { id: 'want', name: t('interactionModal.tabs.want') },
  { id: 'owned', name: t('interactionModal.tabs.owned') },
  { id: 'footprints', name: t('interactionModal.tabs.footprints') },
  { id: 'following', name: t('interactionModal.tabs.following') }
]);

const ownedItems = computed(() =>
  products.value.slice(0, 2).map((item) => ({
    ...item,
    purchaseDate: '2026-12-15',
    status: t('interactionModal.owned.status')
  }))
);

const footprintItems = computed(() => {
  const dates = [
    t('interactionModal.footprints.justNow'),
    t('interactionModal.footprints.oneHour'),
    t('interactionModal.footprints.yesterday')
  ];

  return products.value.slice(0, 3).map((item, index) => ({
    ...item,
    viewDate: dates[index] || t('interactionModal.footprints.recent')
  }));
});

const followingItems = ref([
  { id: 1, name: t('interactionModal.following.brands.one.name'), fans: '12.5w', isFollowing: true, description: t('interactionModal.following.brands.one.description') },
  { id: 2, name: t('interactionModal.following.brands.two.name'), fans: '8.2w', isFollowing: true, description: t('interactionModal.following.brands.two.description') },
  { id: 3, name: t('interactionModal.following.brands.three.name'), fans: '5.6w', isFollowing: true, description: t('interactionModal.following.brands.three.description') }
]);

const formatCurrency = (value) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const handleUnfollow = (brand) => {
  brand.isFollowing = !brand.isFollowing;
  showToast(
    t(brand.isFollowing ? 'interactionModal.feedback.followed' : 'interactionModal.feedback.unfollowed', {
      brand: brand.name
    }),
    brand.isFollowing ? 'success' : 'info'
  );
};

const goToProduct = (id) => {
  emit('close');
  router.push(`/product/${id}`);
};

const closeModal = () => {
  emit('close');
};

onMounted(() => {
  void refreshProducts();
});
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-md" @click="closeModal"></div>

    <div class="relative flex h-[85vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#0a0a0c]/95 sm:h-[820px] sm:w-[560px] sm:rounded-[2rem]">
      <div class="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
        <div>
          <p class="text-[11px] uppercase tracking-[0.24em] text-white/35">{{ t('interactionModal.modalLabel') }}</p>
          <h2 class="mt-2 text-2xl font-medium tracking-tight text-white">{{ t('interactionModal.title') }}</h2>
        </div>
        <button class="rounded-full border border-white/10 p-2 text-white/45 transition hover:bg-white/[0.04] hover:text-white/75" @click="closeModal">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18 18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex overflow-x-auto border-b border-white/10 bg-white/[0.02] px-2 pt-2 scrollbar-hide">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="relative flex-1 whitespace-nowrap px-4 py-3 text-center text-sm font-medium transition-colors"
          :class="activeTab === tab.id ? 'text-white' : 'text-white/38 hover:text-white/68'"
          @click="activeTab = tab.id"
        >
          {{ tab.name }}
          <span v-if="activeTab === tab.id" class="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-white/80"></span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide sm:px-5">
        <div v-if="activeTab === 'want'" class="space-y-4">
          <div v-if="favorites.items.length === 0" class="flex min-h-[300px] flex-col items-center justify-center rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-2xl">
            <p class="text-2xl font-medium tracking-tight text-white">{{ t('interactionModal.empty.wantTitle') }}</p>
            <p class="mt-3 max-w-xs text-sm leading-7 text-white/45">{{ t('interactionModal.empty.wantBody') }}</p>
            <button class="mt-6 rounded-full bg-white px-5 py-2 text-xs font-medium uppercase tracking-[0.2em] text-black transition hover:bg-white/90" @click="closeModal">
              {{ t('interactionModal.empty.explore') }}
            </button>
          </div>

          <div v-else class="grid grid-cols-2 gap-4">
            <button
              v-for="product in favorites.items"
              :key="product.id"
              class="overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.03] text-left backdrop-blur-2xl transition hover:bg-white/[0.045]"
              @click="goToProduct(product.id)"
            >
              <div class="relative aspect-square overflow-hidden border-b border-white/8 bg-black/20">
                <img :src="product.img" class="h-full w-full object-cover opacity-90">
                <button class="absolute right-2 top-2 rounded-full border border-white/10 bg-black/40 p-2 text-white/75 backdrop-blur-xl" @click.stop="toggleFavorite(product)">
                  <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 0 1 5.656 0L10 6.343l1.172-1.171a4 4 0 1 1 5.656 5.656L10 17.657l-6.828-6.829a4 4 0 0 1 0-5.656Z" />
                  </svg>
                </button>
              </div>
              <div class="p-4">
                <h3 class="truncate text-sm font-medium text-white">{{ product.name }}</h3>
                <div class="mt-3 flex items-end justify-between gap-3">
                  <span class="text-lg font-medium tracking-tight text-white">{{ formatCurrency(product.price) }}</span>
                  <span class="truncate text-[11px] uppercase tracking-[0.18em] text-white/35">{{ product.company }}</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div v-else-if="activeTab === 'owned'" class="space-y-3">
          <div v-if="ownedItems.length === 0" class="flex min-h-[300px] flex-col items-center justify-center rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-2xl">
            <p class="text-2xl font-medium tracking-tight text-white">{{ t('interactionModal.empty.ownedTitle') }}</p>
          </div>

          <template v-else>
            <button
              v-for="item in ownedItems"
              :key="item.id"
              class="flex w-full gap-4 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 text-left backdrop-blur-2xl transition hover:bg-white/[0.045]"
              @click="goToProduct(item.id)"
            >
              <img :src="item.img" class="h-20 w-20 rounded-xl object-cover">
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-sm font-medium text-white">{{ item.name }}</h3>
                <p class="mt-2 line-clamp-2 text-xs leading-6 text-white/45">{{ item.desc }}</p>
                <div class="mt-3 flex items-center justify-between gap-3">
                  <span class="text-[11px] uppercase tracking-[0.18em] text-white/35">{{ item.purchaseDate }}</span>
                  <span class="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55">{{ item.status }}</span>
                </div>
              </div>
            </button>
          </template>
        </div>

        <div v-else-if="activeTab === 'footprints'" class="space-y-4">
          <div v-if="footprintItems.length === 0" class="flex min-h-[300px] flex-col items-center justify-center rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-2xl">
            <p class="text-2xl font-medium tracking-tight text-white">{{ t('interactionModal.empty.footprintsTitle') }}</p>
          </div>

          <template v-else>
            <div class="space-y-4">
              <button
                v-for="item in footprintItems"
                :key="item.id"
                class="flex w-full gap-4 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 text-left backdrop-blur-2xl transition hover:bg-white/[0.045]"
                @click="goToProduct(item.id)"
              >
                <img :src="item.img" class="h-16 w-16 rounded-xl object-cover">
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] uppercase tracking-[0.18em] text-white/35">{{ item.viewDate }}</p>
                  <h3 class="mt-2 truncate text-sm font-medium text-white">{{ item.name }}</h3>
                  <div class="mt-3 flex items-end justify-between gap-3">
                    <span class="text-sm font-medium text-white">{{ formatCurrency(item.price) }}</span>
                    <span class="truncate text-[11px] uppercase tracking-[0.18em] text-white/35">{{ item.company }}</span>
                  </div>
                </div>
              </button>
            </div>
          </template>
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="brand in followingItems"
            :key="brand.id"
            class="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-2xl"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <h3 class="truncate text-sm font-medium text-white">{{ brand.name }}</h3>
                <p class="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/35">{{ t('interactionModal.following.fans', { count: brand.fans }) }}</p>
              </div>
              <button
                class="rounded-full border border-white/10 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.18em] transition"
                :class="brand.isFollowing ? 'text-white/55 hover:bg-white/[0.04]' : 'bg-white text-black hover:bg-white/90'"
                @click="handleUnfollow(brand)"
              >
                {{ brand.isFollowing ? t('interactionModal.following.following') : t('interactionModal.following.follow') }}
              </button>
            </div>
            <p class="mt-3 text-sm leading-6 text-white/45">{{ brand.description }}</p>
          </article>
        </div>
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
