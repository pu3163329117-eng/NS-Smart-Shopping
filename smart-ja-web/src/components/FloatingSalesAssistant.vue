<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '../composables/useToast';
import { callDeepseekAPIStream } from '../services/aiService';
import { MarketService, UserService } from '../services/api';

const router = useRouter();
const { show: showToast } = useToast();

const isOpen = ref(false);
const services = ref([]);
const catalogLoading = ref(true);
const catalogError = ref('');
const isStreaming = ref(false);
const inputMessage = ref('');
const chatContainer = ref(null);
const purchasingIds = ref([]);

const quickPrompts = [
  '我想给小猫买个礼物',
  '帮我推荐一个便宜一点的创客服务',
  '我想找适合送朋友的商品'
];

const messages = ref([
  {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content:
      '你好，我是 AI 导购。告诉我你的需求，我会基于当前商城里真实已发布的商品给你推荐。',
    recommendations: []
  }
]);

const normalizeService = (service) => ({
  id: String(service?.id ?? ''),
  title: service?.title || service?.name || 'Untitled service',
  description:
    service?.description ||
    service?.desc ||
    'No description has been published for this service yet.',
  price: Number(service?.price ?? 0),
  image: service?.image || service?.img || '',
  provider: service?.provider || 'Maker Studio',
  userId: service?.userId || null,
  tags: Array.isArray(service?.tags) ? service.tags.filter(Boolean).slice(0, 5) : [],
  sales: Number(service?.sales ?? 0),
  views: Number(service?.views ?? 0)
});

const formatPrice = (value) => {
  const amount = Number(value ?? 0);
  const hasCents = Math.abs(amount % 1) > 0.001;
  return `CNY ${amount.toFixed(hasCents ? 2 : 0)}`;
};

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
    catalogError.value = error?.message || 'Unable to sync the live market catalog.';
  } finally {
    catalogLoading.value = false;
  }
};

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

watch(isOpen, (value) => {
  if (value) {
    void scrollToBottom();
  }
});

const catalogPrompt = computed(() => {
  if (!services.value.length) {
    return 'No live products are currently available in the catalog.';
  }

  return services.value
    .slice(0, 24)
    .map((service) => {
      const tags = service.tags.length ? service.tags.join(', ') : 'none';
      return `- ${service.title} | ${formatPrice(service.price)} | provider: ${service.provider} | tags: ${tags} | description: ${service.description}`;
    })
    .join('\n');
});

const buildSystemPrompt = () => `你是“NS AI 导购”，负责给用户推荐当前商城中真实上架的商品。

你只能基于下面这份实时商品目录来推荐，不要编造不存在的商品。
如果用户需求和目录并不完全匹配，也要从目录里挑出最接近的 1 到 3 个商品，说明推荐理由，并明确写出商品标题。
回答简洁、友好、像高端电商网站的导购客服，不要输出 Markdown 标题。

当前实时商品目录：
${catalogPrompt.value}`;

const inferRecommendations = (userText, assistantText = '') => {
  if (!services.value.length) {
    return [];
  }

  const query = `${String(userText || '')} ${String(assistantText || '')}`.toLowerCase();
  const wholeQuery = String(userText || '').trim().toLowerCase();
  const hasGiftIntent =
    query.includes('礼物') ||
    query.includes('gift') ||
    query.includes('送') ||
    query.includes('猫') ||
    query.includes('pet');

  const terms = wholeQuery
    .split(/[\s,，。！？!?\-_/]+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 8);

  const ranked = services.value
    .map((service) => {
      const text = [
        service.title,
        service.description,
        service.provider,
        service.tags.join(' ')
      ]
        .join(' ')
        .toLowerCase();

      let score = service.sales * 2 + service.views * 0.2;

      if (wholeQuery && text.includes(wholeQuery)) {
        score += 24;
      }

      for (const term of terms) {
        if (term.length >= 2 && text.includes(term)) {
          score += 10;
        }
      }

      if (hasGiftIntent) {
        score += Math.max(0, 180 - Math.min(service.price, 180));
      }

      return {
        service,
        score
      };
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.service);

  return ranked.slice(0, 3);
};

const openProduct = (service) => {
  router.push({
    name: 'ProductDetail',
    params: { id: service.id }
  });
};

const handleBuy = async (service) => {
  if (isPurchasing(service.id)) {
    return;
  }

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

    showToast(`Order created for ${service.title}`, 'success');
  } catch (error) {
    showToast(error?.message || 'Unable to place the order right now.', 'error');
  } finally {
    purchasingIds.value = purchasingIds.value.filter((id) => id !== service.id);
  }
};

const sendMessage = async (presetMessage = '') => {
  const rawMessage = presetMessage || inputMessage.value;
  const content = rawMessage.trim();
  if (!content || isStreaming.value) {
    return;
  }

  inputMessage.value = '';
  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content,
    recommendations: []
  });

  const assistantMessage = {
    id: `assistant-${Date.now()}-pending`,
    role: 'assistant',
    content: '',
    recommendations: []
  };
  messages.value.push(assistantMessage);

  isStreaming.value = true;
  await scrollToBottom();

  try {
    const history = messages.value
      .slice(-8, -1)
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content
      }));

    const finalContent = await callDeepseekAPIStream(
      [
        { role: 'system', content: buildSystemPrompt() },
        ...history,
        { role: 'user', content }
      ],
      'sales',
      (_chunk, buffer) => {
        assistantMessage.content = buffer;
        void scrollToBottom();
      }
    );

    assistantMessage.content =
      finalContent || '我已经看过当前商城商品了，可以继续告诉我你更具体的预算、用途或送礼对象。';
    assistantMessage.recommendations = inferRecommendations(content, assistantMessage.content);
  } catch (error) {
    assistantMessage.content =
      'AI 导购暂时没有连上实时模型，我先按当前商城商品给你推荐几件最接近的。';
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
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-3 scale-95"
    >
      <section
        v-if="isOpen"
        class="mb-4 flex h-[36rem] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-2xl"
      >
        <header class="border-b border-white/80 bg-white/50 px-5 py-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">AI Sales</p>
              <h2 class="mt-1 text-lg font-semibold tracking-tight text-slate-900">悬浮导购</h2>
              <p class="mt-1 text-xs text-slate-500">
                <span v-if="catalogLoading">正在同步商品目录...</span>
                <span v-else-if="catalogError">{{ catalogError }}</span>
                <span v-else>已同步 {{ services.length }} 个真实商品</span>
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                @click="loadServices"
              >
                刷新
              </button>
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                @click="isOpen = false"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <div ref="chatContainer" class="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <article
            v-for="message in messages"
            :key="message.id"
            :class="message.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
          >
            <div
              :class="
                message.role === 'user'
                  ? 'max-w-[85%] rounded-[1.4rem] rounded-br-md bg-slate-900 px-4 py-3 text-sm leading-6 text-white'
                  : 'max-w-[92%] rounded-[1.4rem] rounded-bl-md border border-white/90 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm'
              "
            >
              <p
                v-if="message.role === 'assistant'"
                class="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400"
              >
                NS AI Guide
              </p>

              <p class="whitespace-pre-wrap">{{ message.content || (isStreaming ? '...' : '') }}</p>

              <div v-if="message.recommendations?.length" class="mt-4 space-y-3">
                <button
                  v-for="service in message.recommendations"
                  :key="`${message.id}-${service.id}`"
                  type="button"
                  class="block w-full rounded-[1.2rem] border border-slate-100 bg-slate-50/90 p-3 text-left transition hover:border-slate-200 hover:bg-white"
                  @click="openProduct(service)"
                >
                  <div class="flex gap-3">
                    <div class="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-200">
                      <img
                        v-if="service.image"
                        :src="service.image"
                        :alt="service.title"
                        class="h-full w-full object-cover"
                      />
                      <div
                        v-else
                        class="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 text-xl font-semibold text-white"
                      >
                        {{ service.title.charAt(0).toUpperCase() }}
                      </div>
                    </div>

                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-semibold text-slate-900">{{ service.title }}</p>
                      <p class="mt-1 truncate text-xs text-slate-500">{{ service.provider }}</p>
                      <p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{{ service.description }}</p>
                      <div class="mt-3 flex items-center justify-between gap-3">
                        <span class="text-sm font-semibold text-slate-900">{{ formatPrice(service.price) }}</span>
                        <span class="text-[11px] font-medium text-slate-500">查看详情</span>
                      </div>
                    </div>
                  </div>
                </button>

                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="service in message.recommendations"
                    :key="`${message.id}-${service.id}-buy`"
                    type="button"
                    class="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="isPurchasing(service.id)"
                    @click.stop="handleBuy(service)"
                  >
                    {{ isPurchasing(service.id) ? '购买中' : '买 ' + service.title.slice(0, 4) }}
                  </button>
                </div>
              </div>
            </div>
          </article>

          <div v-if="isStreaming" class="flex justify-start">
            <div class="rounded-[1.4rem] rounded-bl-md border border-white/90 bg-white/80 px-4 py-3 shadow-sm">
              <div class="flex gap-1.5">
                <span class="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]"></span>
                <span class="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]"></span>
                <span class="h-2 w-2 animate-bounce rounded-full bg-slate-400"></span>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-white/80 bg-white/50 px-4 py-4">
          <div class="mb-3 flex flex-wrap gap-2">
            <button
              v-for="prompt in quickPrompts"
              :key="prompt"
              type="button"
              class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              :disabled="isStreaming"
              @click="sendMessage(prompt)"
            >
              {{ prompt }}
            </button>
          </div>

          <div class="flex items-end gap-3 rounded-[1.4rem] border border-white/80 bg-white px-3 py-3 shadow-sm">
            <textarea
              v-model="inputMessage"
              rows="1"
              placeholder="描述你的需求，比如预算、送礼对象、用途..."
              class="max-h-28 min-h-[2.75rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400"
              @keydown.enter.exact.prevent="sendMessage()"
            ></textarea>

            <button
              type="button"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
      <div class="pointer-events-none absolute right-[4.75rem] top-1/2 hidden -translate-y-1/2 rounded-2xl border border-white/80 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 shadow-lg backdrop-blur-xl transition group-hover:opacity-100 md:block md:opacity-0">
        AI 导购
      </div>

      <button
        type="button"
        class="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/70 shadow-[0_20px_40px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition hover:scale-105"
        @click="isOpen = !isOpen"
      >
        <span class="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.85),_transparent_38%),radial-gradient(circle_at_70%_70%,_rgba(148,163,184,0.35),_transparent_40%)]"></span>
        <span class="absolute inset-[3px] rounded-full border border-white/80"></span>
        <svg class="relative z-10 h-7 w-7 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 10h8M8 14h4m-5 6h10a3 3 0 003-3V7a3 3 0 00-3-3H7a3 3 0 00-3 3v10a3 3 0 003 3z" />
        </svg>
      </button>
    </div>
  </div>
</template>
