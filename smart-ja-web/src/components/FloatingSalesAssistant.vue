<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from '../composables/useToast';
import { callDeepseekAPIStream } from '../services/aiService';
import { MarketService, UserService } from '../services/api';

const router = useRouter();
const { t } = useI18n();
const { show: showToast } = useToast();

const isOpen = ref(false);
const services = ref([]);
const catalogLoading = ref(true);
const catalogError = ref('');
const isStreaming = ref(false);
const inputMessage = ref('');
const chatContainer = ref(null);
const purchasingIds = ref([]);

const quickPrompts = computed(() => [
  t('assistant.prompts.petGift'),
  t('assistant.prompts.affordableService'),
  t('assistant.prompts.friendGift')
]);

const messages = ref([
  {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: t('assistant.welcome'),
    recommendations: []
  }
]);

const normalizeService = (service) => ({
  id: String(service?.id ?? ''),
  title: service?.title || service?.name || t('assistant.defaultTitle'),
  description: service?.description || service?.desc || t('assistant.defaultDescription'),
  price: Number(service?.price ?? 0),
  image: service?.image || service?.img || '',
  provider: service?.provider || t('assistant.defaultProvider'),
  userId: service?.userId || null,
  tags: Array.isArray(service?.tags) ? service.tags.filter(Boolean).slice(0, 5) : [],
  sales: Number(service?.sales ?? 0),
  views: Number(service?.views ?? 0)
});

const formatPrice = (value) => `\u00A5${Number(value ?? 0).toFixed(2)}`;
const isPurchasing = (serviceId) => purchasingIds.value.includes(serviceId);

const loadServices = async () => {
  catalogLoading.value = true;
  try {
    const response = await MarketService.getAllServices();
    const records = Array.isArray(response) ? response : [];
    services.value = records.map((service) => normalizeService(service));
    catalogError.value = '';
  } catch (error) {
    services.value = [];
    catalogError.value = error?.message || t('assistant.errors.catalog');
  } finally {
    catalogLoading.value = false;
  }
};

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
};

watch(isOpen, (value) => {
  if (value) void scrollToBottom();
});

const catalogPrompt = computed(() => {
  if (!services.value.length) return t('assistant.catalogEmpty');
  return services.value
    .slice(0, 24)
    .map((service) => {
      const tags = service.tags.length ? service.tags.join(', ') : 'none';
      return `- ${service.title} | ${formatPrice(service.price)} | provider: ${service.provider} | tags: ${tags} | description: ${service.description}`;
    })
    .join('\n');
});

const buildSystemPrompt = () => `${t('assistant.systemPrompt')}\n${t('assistant.systemCatalogLabel')}\n${catalogPrompt.value}`;

const inferRecommendations = (userText, assistantText = '') => {
  if (!services.value.length) return [];

  const query = `${String(userText || '')} ${String(assistantText || '')}`.toLowerCase();
  const wholeQuery = String(userText || '').trim().toLowerCase();
  const hasGiftIntent = query.includes('礼物') || query.includes('gift') || query.includes('送') || query.includes('猫') || query.includes('pet');

  const terms = wholeQuery
    .split(/[\s,，。！？._\-\/]+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 8);

  const ranked = services.value
    .map((service) => {
      const text = [service.title, service.description, service.provider, service.tags.join(' ')].join(' ').toLowerCase();
      let score = service.sales * 2 + service.views * 0.2;
      if (wholeQuery && text.includes(wholeQuery)) score += 24;
      for (const term of terms) {
        if (term.length >= 2 && text.includes(term)) score += 10;
      }
      if (hasGiftIntent) score += Math.max(0, 180 - Math.min(service.price, 180));
      return { service, score };
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.service);

  return ranked.slice(0, 3);
};

const openProduct = (service) => {
  router.push({ name: 'ProductDetail', params: { id: service.id } });
};

const handleBuy = async (service) => {
  if (isPurchasing(service.id)) return;
  purchasingIds.value = [...purchasingIds.value, service.id];

  try {
    await UserService.createOrder({
      items: [
        {
          id: service.id,
          name: service.title,
          title: service.title,
          price: service.price,
          image: service.image,
          provider: service.provider,
          userId: service.userId,
          providerId: service.userId
        }
      ],
      total: service.price
    });
    showToast(t('assistant.toast.orderCreated', { title: service.title }), 'success');
  } catch (error) {
    showToast(error?.message || t('assistant.errors.order'), 'error');
  } finally {
    purchasingIds.value = purchasingIds.value.filter((id) => id !== service.id);
  }
};

const sendMessage = async (presetMessage = '') => {
  const rawMessage = presetMessage || inputMessage.value;
  const content = rawMessage.trim();
  if (!content || isStreaming.value) return;

  inputMessage.value = '';
  messages.value.push({ id: `user-${Date.now()}`, role: 'user', content, recommendations: [] });

  const assistantMessage = { id: `assistant-${Date.now()}-pending`, role: 'assistant', content: '', recommendations: [] };
  messages.value.push(assistantMessage);

  isStreaming.value = true;
  await scrollToBottom();

  try {
    const history = messages.value.slice(-8, -1).map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content
    }));

    const finalContent = await callDeepseekAPIStream(
      [{ role: 'system', content: buildSystemPrompt() }, ...history, { role: 'user', content }],
      'sales',
      (_chunk, buffer) => {
        assistantMessage.content = buffer;
        void scrollToBottom();
      }
    );

    assistantMessage.content = finalContent || t('assistant.fallbackReply');
    assistantMessage.recommendations = inferRecommendations(content, assistantMessage.content);
  } catch (error) {
    assistantMessage.content = t('assistant.modelUnavailable');
    assistantMessage.recommendations = inferRecommendations(content);
  } finally {
    isStreaming.value = false;
    await scrollToBottom();
  }
};

onMounted(() => {
  void loadServices();
});
</script>

<template>
  <div class="fixed bottom-24 right-4 z-50 md:bottom-8 md:right-8">
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-220 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-3 scale-95"
    >
      <section
        v-if="isOpen"
        class="assistant-shell relative mb-4 flex h-[36rem] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2rem] p-0 text-white"
      >
        <div class="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/22 blur-3xl"></div>
        <div class="pointer-events-none absolute -right-14 top-20 h-44 w-44 rounded-full bg-cyan-500/18 blur-3xl"></div>

        <header class="relative z-10 px-5 pb-3 pt-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-[10px] font-medium uppercase tracking-[0.26em] text-white/48">{{ $t('assistant.headerEyebrow') }}</p>
              <h2 class="mt-1 text-lg font-semibold tracking-tight text-white">{{ $t('assistant.title') }}</h2>
              <p class="mt-1 text-xs text-white/56">
                <span v-if="catalogLoading">{{ $t('assistant.status.loading') }}</span>
                <span v-else-if="catalogError">{{ catalogError }}</span>
                <span v-else>{{ $t('assistant.status.synced', { count: services.length }) }}</span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" class="assistant-chip px-3 py-1.5 text-[11px] font-medium text-white/82" @click="loadServices">
                {{ $t('assistant.actions.refresh') }}
              </button>
              <button type="button" class="assistant-chip flex h-8 w-8 items-center justify-center text-white/74 hover:text-white" @click="isOpen = false">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <div ref="chatContainer" class="relative z-10 flex-1 space-y-4 overflow-y-auto px-4 pb-3">
          <article v-for="message in messages" :key="message.id" :class="message.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
            <div :class="message.role === 'user' ? 'assistant-bubble-user' : 'assistant-bubble-ai'">
              <p v-if="message.role === 'assistant'" class="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/42">{{ $t('assistant.guideLabel') }}</p>
              <p class="whitespace-pre-wrap text-sm leading-6">{{ message.content || (isStreaming ? '...' : '') }}</p>

              <div v-if="message.recommendations?.length" class="mt-4 space-y-3">
                <button
                  v-for="service in message.recommendations"
                  :key="`${message.id}-${service.id}`"
                  type="button"
                  class="assistant-rec-card group block w-full p-3 text-left"
                  @click="openProduct(service)"
                >
                  <div class="flex gap-3">
                    <div class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white/10">
                      <img
                        v-if="service.image"
                        :src="service.image"
                        :alt="service.title"
                        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/20 to-white/5 text-lg font-semibold text-white/85">
                        {{ service.title.charAt(0).toUpperCase() }}
                      </div>
                    </div>

                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-semibold text-white">{{ service.title }}</p>
                      <p class="mt-1 truncate text-xs text-white/52">{{ service.provider }}</p>
                      <p class="mt-2 line-clamp-2 text-xs leading-5 text-white/62">{{ service.description }}</p>
                      <div class="mt-2 flex items-center justify-between gap-2">
                        <span class="text-sm font-semibold text-white">{{ formatPrice(service.price) }}</span>
                        <span class="text-[11px] uppercase tracking-[0.14em] text-white/45">{{ $t('assistant.actions.viewDetails') }}</span>
                      </div>
                    </div>
                  </div>
                </button>

                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="service in message.recommendations"
                    :key="`${message.id}-${service.id}-buy`"
                    type="button"
                    class="assistant-buy-btn px-2 py-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="isPurchasing(service.id)"
                    @click.stop="handleBuy(service)"
                  >
                    {{ isPurchasing(service.id) ? $t('assistant.actions.purchasing') : $t('assistant.actions.buyShort', { title: service.title.slice(0, 4) }) }}
                  </button>
                </div>
              </div>
            </div>
          </article>

          <div v-if="isStreaming" class="flex justify-start">
            <div class="assistant-bubble-ai inline-flex gap-1.5 px-4 py-3">
              <span class="h-2 w-2 animate-bounce rounded-full bg-white/55 [animation-delay:-0.2s]"></span>
              <span class="h-2 w-2 animate-bounce rounded-full bg-white/55 [animation-delay:-0.1s]"></span>
              <span class="h-2 w-2 animate-bounce rounded-full bg-white/55"></span>
            </div>
          </div>
        </div>

        <div class="relative z-10 px-4 pb-4 pt-2">
          <div class="mb-3 flex flex-wrap gap-2">
            <button
              v-for="prompt in quickPrompts"
              :key="prompt"
              type="button"
              class="assistant-chip px-3 py-1.5 text-xs text-white/74 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isStreaming"
              @click="sendMessage(prompt)"
            >
              {{ prompt }}
            </button>
          </div>

          <div class="assistant-input-shell flex items-end gap-2 p-2.5">
            <textarea
              v-model="inputMessage"
              rows="1"
              :placeholder="$t('assistant.inputPlaceholder')"
              class="max-h-28 min-h-[2.75rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/42"
              @keydown.enter.exact.prevent="sendMessage()"
            ></textarea>

            <button
              type="button"
              class="assistant-send-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="!inputMessage.trim() || isStreaming"
              @click="sendMessage()"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 12h14m-6-6l6 6l-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </transition>

    <div class="group flex justify-end">
      <div class="pointer-events-none absolute right-[4.9rem] top-1/2 hidden -translate-y-1/2 rounded-2xl bg-white/[0.08] px-4 py-2 text-xs font-medium text-white/78 backdrop-blur-2xl transition duration-300 group-hover:opacity-100 md:block md:opacity-0">
        {{ $t('assistant.title') }}
      </div>

      <button
        type="button"
        class="assistant-trigger relative flex h-16 w-16 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] shadow-[0_22px_44px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition duration-300 hover:scale-105"
        :class="{ 'assistant-trigger-streaming': isStreaming }"
        @click="isOpen = !isOpen"
      >
        <span class="assistant-trigger-pulse absolute inset-0 rounded-full"></span>
        <span class="assistant-trigger-core absolute inset-[3px] rounded-full"></span>
        <span v-if="isStreaming" class="assistant-trigger-ripple pointer-events-none absolute inset-0 rounded-full"></span>
        <svg class="relative z-10 h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 10h8M8 14h4m-5 6h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.assistant-shell {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.55),
    inset 0 1px 1px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(30px);
}

.assistant-chip {
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px);
  transition: transform 0.24s ease, border-color 0.24s ease, background-color 0.24s ease;
}

.assistant-chip:hover {
  transform: scale(1.02);
  border-color: rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.08);
}

.assistant-bubble-user {
  max-width: 85%;
  border-radius: 1.25rem 1.25rem 0.5rem 1.25rem;
  background: linear-gradient(120deg, rgba(37, 99, 235, 0.86), rgba(79, 70, 229, 0.82));
  padding: 0.72rem 0.9rem;
  color: #fff;
  box-shadow: 0 10px 28px rgba(37, 99, 235, 0.3);
}

.assistant-bubble-ai {
  max-width: 92%;
  border-radius: 1.25rem 1.25rem 1.25rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 0.78rem 0.9rem;
  color: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);
}

.assistant-rec-card {
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px);
  transition: transform 0.26s ease, box-shadow 0.26s ease, border-color 0.26s ease;
}

.assistant-rec-card:hover {
  transform: scale(1.02);
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow:
    0 16px 34px rgba(0, 0, 0, 0.34),
    0 0 24px rgba(255, 255, 255, 0.1);
}

.assistant-buy-btn {
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background-image: linear-gradient(to right, rgba(37, 99, 235, 0.8), rgba(79, 70, 229, 0.78));
  transition: filter 0.2s ease, transform 0.2s ease;
}

.assistant-buy-btn:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.assistant-input-shell {
  border-radius: 1.2rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(18px);
}

.assistant-send-btn {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background-image: linear-gradient(to right, rgba(37, 99, 235, 0.86), rgba(79, 70, 229, 0.82));
}

.assistant-send-btn:hover {
  filter: brightness(1.08);
}

.assistant-trigger-pulse {
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.24), transparent 40%),
    radial-gradient(circle at 72% 72%, rgba(99, 102, 241, 0.24), transparent 44%),
    linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(236, 72, 153, 0.08));
  animation: assistantPulse 4.6s ease-in-out infinite;
}

.assistant-trigger-core {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background:
    radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.1), transparent 34%),
    radial-gradient(circle at 70% 70%, rgba(148, 163, 184, 0.24), transparent 40%);
}

.assistant-trigger-streaming .assistant-trigger-pulse {
  background:
    conic-gradient(
      from 0deg,
      rgba(99, 102, 241, 0.92),
      rgba(168, 85, 247, 0.9),
      rgba(217, 70, 239, 0.9),
      rgba(99, 102, 241, 0.92)
    );
  animation: assistantSpin 1.15s linear infinite;
}

.assistant-trigger-streaming .assistant-trigger-core {
  border-color: rgba(255, 255, 255, 0.26);
  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0.24), transparent 42%),
    radial-gradient(circle at 50% 55%, rgba(15, 23, 42, 0.32), transparent 62%);
}

.assistant-trigger-ripple::before,
.assistant-trigger-ripple::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 9999px;
  border: 1px solid rgba(165, 180, 252, 0.55);
  opacity: 0;
  animation: assistantRipple 1.6s ease-out infinite;
}

.assistant-trigger-ripple::after {
  animation-delay: 0.8s;
}

@keyframes assistantPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.9;
    filter: saturate(1);
  }

  50% {
    transform: scale(1.05);
    opacity: 1;
    filter: saturate(1.16);
  }
}

@keyframes assistantSpin {
  from {
    transform: rotate(0deg) scale(1);
    filter: saturate(1);
  }

  50% {
    transform: rotate(180deg) scale(1.04);
    filter: saturate(1.25);
  }

  to {
    transform: rotate(360deg) scale(1);
    filter: saturate(1);
  }
}

@keyframes assistantRipple {
  0% {
    transform: scale(0.78);
    opacity: 0.7;
  }

  70% {
    opacity: 0.14;
  }

  100% {
    transform: scale(1.34);
    opacity: 0;
  }
}
</style>
