<template>
  <div class="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-12 text-white sm:px-6 lg:px-8">
    <div class="pointer-events-none absolute -left-52 -top-20 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[130px]"></div>
    <div class="pointer-events-none absolute right-[-200px] top-[180px] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[130px]"></div>
    <div class="pointer-events-none absolute bottom-[-230px] left-[30%] h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[130px]"></div>

    <div class="relative z-10 mx-auto max-w-4xl space-y-8">
      <div class="space-y-2">
        <p class="inline-flex items-center gap-2 text-[10px] font-light uppercase tracking-[0.28em] text-white/50">
          <svg class="h-3.5 w-3.5 text-cyan-300/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4" />
          </svg>
          {{ $t('gushi.sell.title') }}
        </p>
        <h1 class="text-3xl font-semibold tracking-tight">{{ $t('gushi.sell.title') }}</h1>
        <p class="text-sm text-white/60">{{ $t('gushi.sell.subtitle') }}</p>
      </div>

      <form @submit.prevent="submitListing" class="glass-card space-y-8 p-8">
        <section class="space-y-3">
          <label class="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/55">
            <svg class="h-4 w-4 text-white/65" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 7h16M4 12h10M4 17h7" />
            </svg>
            {{ $t('gushi.sell.productLabel') }}
          </label>
          <select v-model="form.gushiProductId" required class="gushi-input w-full px-4 py-3.5 text-sm">
            <option value="" disabled>{{ $t('gushi.sell.productPlaceholder') }}</option>
            <option v-for="p in products" :key="p.id" :value="p.id">
              {{ p.ipName }} | {{ p.characterName }} ({{ p.category }})
            </option>
          </select>
          <div class="text-xs text-white/55">
            <span>{{ $t('gushi.sell.productMissingHint') }}</span>
            <router-link to="/gushi/request-product" class="ml-2 text-cyan-200 transition hover:text-cyan-100">
              {{ $t('gushi.sell.requestProduct') }}
            </router-link>
          </div>
        </section>

        <section class="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div class="space-y-3">
            <label class="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/55">
              <svg class="h-4 w-4 text-white/65" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3l2.8 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.5 6.3 20.6l1.1-6.4L2.8 9.7l6.4-.9L12 3z" />
              </svg>
              {{ $t('gushi.sell.conditionLabel') }}
            </label>
            <select v-model="form.conditionGrade" required class="gushi-input w-full px-4 py-3.5 text-sm">
              <option value="S">{{ $t('gushi.sell.conditionS') }}</option>
              <option value="A">{{ $t('gushi.sell.conditionA') }}</option>
              <option value="B">{{ $t('gushi.sell.conditionB') }}</option>
              <option value="C">{{ $t('gushi.sell.conditionC') }}</option>
            </select>
          </div>

          <div class="space-y-3">
            <p class="text-[11px] uppercase tracking-[0.18em] text-white/55">{{ $t('gushi.sell.conditionLabel') }}</p>
            <div class="flex flex-wrap gap-3">
              <label class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/12 bg-white/[0.02] px-4 py-2 text-sm text-white/80">
                <input type="checkbox" v-model="form.hasOriginalPackage" class="h-4 w-4 rounded border-white/20 bg-black/20" />
                <span>{{ $t('gushi.sell.hasOriginalBox') }}</span>
              </label>
              <label class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/12 bg-white/[0.02] px-4 py-2 text-sm text-white/80">
                <input type="checkbox" v-model="form.isOpened" class="h-4 w-4 rounded border-white/20 bg-black/20" />
                <span>{{ $t('gushi.sell.opened') }}</span>
              </label>
            </div>
          </div>
        </section>

        <section class="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div class="space-y-3">
            <label class="text-[11px] uppercase tracking-[0.18em] text-white/55">{{ $t('gushi.sell.priceLabel') }}</label>
            <input
              type="number"
              step="0.01"
              v-model="form.price"
              required
              min="0.01"
              :placeholder="$t('gushi.sell.pricePlaceholder')"
              class="gushi-input w-full px-4 py-3.5 text-sm"
            />
          </div>
          <div class="space-y-3">
            <label class="text-[11px] uppercase tracking-[0.18em] text-white/55">{{ $t('gushi.sell.quantityLabel') }}</label>
            <input type="number" v-model.number="form.quantity" required min="1" class="gushi-input w-full px-4 py-3.5 text-sm" />
          </div>
        </section>

        <section class="glass-sub-card space-y-4 p-5">
          <h3 class="inline-flex items-center gap-2 text-sm font-medium tracking-tight text-white/90">
            <svg class="h-4 w-4 text-emerald-200/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 12h18M7 7l-4 5 4 5m10-10l4 5-4 5" />
            </svg>
            {{ $t('gushi.sell.feeHintTitle') }}
          </h3>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p class="text-xs uppercase tracking-[0.15em] text-white/45">{{ $t('gushi.sell.grossAmount') }}</p>
              <p class="mt-1 font-mono text-white">CNY {{ formatPrice(grossAmount) }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.15em] text-white/45">{{ $t('gushi.sell.platformFee') }}</p>
              <p class="mt-1 font-mono text-amber-200">- CNY {{ formatPrice(feeAmount) }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.15em] text-white/45">{{ $t('gushi.sell.estimatedNet') }}</p>
              <p class="mt-1 font-mono text-emerald-200">CNY {{ formatPrice(netAmount) }}</p>
            </div>
          </div>
          <p class="text-xs text-white/45">{{ $t('gushi.sell.feeRateTip', { rate: (PLATFORM_FEE_RATE * 100).toFixed(0) }) }}</p>
        </section>

        <section class="space-y-3">
          <label class="text-[11px] uppercase tracking-[0.18em] text-white/55">{{ $t('gushi.sell.imageLabel') }}</label>
          <input
            v-model="form.imageUrl"
            type="url"
            :placeholder="$t('gushi.sell.imagePlaceholder')"
            class="gushi-input w-full px-4 py-3.5 text-sm"
          />
        </section>

        <section class="space-y-3">
          <label class="text-[11px] uppercase tracking-[0.18em] text-white/55">{{ $t('gushi.sell.defectLabel') }}</label>
          <textarea
            v-model="form.defectNotes"
            rows="3"
            :placeholder="$t('gushi.sell.defectPlaceholder')"
            class="gushi-input min-h-[110px] w-full px-4 py-3.5 text-sm"
          ></textarea>
        </section>

        <button type="submit" :disabled="submitting" class="gushi-pill-btn flex w-full items-center justify-center gap-2 py-3.5 text-sm font-medium text-white disabled:opacity-50">
          <svg v-if="submitting" class="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4zm2 5.3A8 8 0 014 12H0c0 3 1.1 5.8 3 7.9l3-2.6z"></path>
          </svg>
          {{ submitting ? $t('gushi.sell.publishing') : $t('gushi.sell.publish') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import { GushiService } from '../services/api';
import { useGushiStore } from '../store/gushi';
import { useToast } from '../composables/useToast';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const store = useGushiStore();
const { show: showToast } = useToast();
const PLATFORM_FEE_RATE = 0.03;

const products = ref([]);
const submitting = ref(false);

const form = ref({
  gushiProductId: route.query.productId || '',
  conditionGrade: 'A',
  hasOriginalPackage: true,
  isOpened: false,
  price: null,
  quantity: 1,
  defectNotes: '',
  imageUrl: ''
});

const grossAmount = computed(() => {
  const price = Number(form.value.price || 0);
  const quantity = Number(form.value.quantity || 0);
  return Number.isFinite(price) && Number.isFinite(quantity) ? price * quantity : 0;
});

const feeAmount = computed(() => grossAmount.value * PLATFORM_FEE_RATE);
const netAmount = computed(() => Math.max(0, grossAmount.value - feeAmount.value));

onMounted(async () => {
  try {
    const res = await GushiService.getProducts({ limit: 100 });
    if (res.success) {
      products.value = res.data || [];
    }
  } catch (error) {
    console.error(error);
    showToast(t('gushi.sell.loadProductsFailed'), 'error');
  }
});

const submitListing = async () => {
  submitting.value = true;
  try {
    const payload = {
      ...form.value,
      images: form.value.imageUrl ? [form.value.imageUrl] : []
    };
    delete payload.imageUrl;

    const res = await store.createListing(payload);
    if (res.success) {
      showToast(t('gushi.sell.publishSuccessPending'), 'success');
      router.push('/gushi/my');
    }
  } catch (error) {
    showToast(error?.response?.data?.message || error?.message || t('gushi.sell.publishFailed'), 'error');
  } finally {
    submitting.value = false;
  }
};

const formatPrice = (value) => {
  if (!Number.isFinite(Number(value))) return '0.00';
  return Number(value).toFixed(2);
};
</script>

<style scoped>
.glass-card {
  border-radius: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(24px);
  box-shadow:
    0 8px 32px 0 rgba(0, 0, 0, 0.3),
    inset 0 1px 1px rgba(255, 255, 255, 0.08);
}

.glass-sub-card {
  border-radius: 1.3rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(18px);
  box-shadow:
    0 8px 26px rgba(0, 0, 0, 0.26),
    inset 0 1px 1px rgba(255, 255, 255, 0.06);
}

.gushi-pill-btn {
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-image: linear-gradient(to right, rgba(37, 99, 235, 0.82), rgba(79, 70, 229, 0.82));
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 24px rgba(30, 58, 138, 0.2);
  transition: all 0.25s ease;
}

.gushi-pill-btn:hover {
  background-image: linear-gradient(to right, rgba(59, 130, 246, 0.95), rgba(99, 102, 241, 0.95));
}

.gushi-input {
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
  color: #fff;
  outline: none;
  transition: all 0.2s ease;
}

.gushi-input:focus {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
}
</style>
