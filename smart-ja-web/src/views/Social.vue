<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSocial } from '../store/social';
import { useProducts } from '../store/products';
import { useCart } from '../store/cart';
import { useToast } from '../composables/useToast';
import { useAIChat } from '../store/aiChat';
import ProductDetail from '../components/ProductDetail.vue';

const { t } = useI18n();
const { videos, uploadVideo, interact, addChatMessage, addFriend, friendsList, addComment } = useSocial();
const { products } = useProducts();
const { addToCart } = useCart();
const { show: showToast } = useToast();
const { openChatWith } = useAIChat();

const showUploadModal = ref(false);
const showProductDetail = ref(false);
const selectedProduct = ref(null);
const showCommentsDrawer = ref(false);
const currentVideoId = ref(null);
const currentVideoComments = ref([]);
const newCommentContent = ref('');

const likeAnimationVideoId = ref(null);
const videoProgress = ref(0);
const activeVideoIndex = ref(0);

const uploadForm = ref({
  description: '',
  productId: '',
  videoUrl: ''
});

const handleScroll = (event) => {
  const { scrollTop, clientHeight } = event.target;
  activeVideoIndex.value = Math.round(scrollTop / clientHeight);
  videoProgress.value = 0;
};

const handleTimeUpdate = (event) => {
  const { currentTime, duration } = event.target;
  if (duration) {
    videoProgress.value = (currentTime / duration) * 100;
  }
};

const handleDoubleTap = (video) => {
  handleLike(video);
  likeAnimationVideoId.value = video.id;
  setTimeout(() => {
    likeAnimationVideoId.value = null;
  }, 800);
};

const openComments = (video) => {
  currentVideoId.value = video.id;
  currentVideoComments.value = video.commentsList || [];
  showCommentsDrawer.value = true;
};

const submitComment = () => {
  if (!newCommentContent.value.trim()) {
    return;
  }

  addComment(currentVideoId.value, newCommentContent.value.trim());
  newCommentContent.value = '';

  const video = videos.value.find((item) => item.id === currentVideoId.value);
  if (video) {
    currentVideoComments.value = video.commentsList;
  }
};

const handleLike = (video) => {
  interact(video.id, 'like');
  showToast(t('social.liked'), 'success');
};

const handleDislike = (video) => {
  interact(video.id, 'dislike');
  showToast(t('social.disliked'), 'info');
};

const handleShare = (video) => {
  addChatMessage({
    user: 'Me',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me',
    content: t('social.shareContent', { desc: video.description }),
    type: 'share',
    videoId: video.id
  });
  showToast(t('social.shared'), 'success');
};

const isFriend = (userId) => {
  return friendsList.value.some((friend) => friend.id === userId);
};

const handleAddFriend = (video) => {
  const success = addFriend(video.userId);
  if (success) {
    showToast(t('social.friendAdded', { name: video.userName }), 'success');
  } else {
    showToast(t('social.alreadyFriend'), 'info');
  }
};

const handleChat = (video) => {
  if (!isFriend(video.userId)) {
    addFriend(video.userId);
    showToast(t('social.autoFriend', { name: video.userName }), 'success');
  }

  openChatWith(video.userId);
};

const submitUpload = async () => {
  if (!uploadForm.value.description || !uploadForm.value.videoUrl) {
    showToast(t('social.fillInfo'), 'warning');
    return;
  }

  showUploadModal.value = false;

  await uploadVideo({
    description: uploadForm.value.description,
    productId: uploadForm.value.productId,
    videoUrl: uploadForm.value.videoUrl
  });

  uploadForm.value = { description: '', productId: '', videoUrl: '' };
};

const getProductInfo = (productId) => {
  return products.value.find((product) => product.id === productId);
};

const openProductDetail = (productId) => {
  const product = getProductInfo(productId);
  if (!product) {
    return;
  }

  selectedProduct.value = product;
  showProductDetail.value = true;
};

const handleBadgeMouseMove = (event) => {
  const badge = event.currentTarget;
  const rect = badge.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const rotateX = ((y - centerY) / centerY) * -10;
  const rotateY = ((x - centerX) / centerX) * 10;

  badge.style.transform = `perspective(500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
};

const handleBadgeMouseLeave = (event) => {
  event.currentTarget.style.transform = 'perspective(500px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
};
</script>

<template>
  <div class="relative h-screen w-full overflow-hidden bg-black pt-16 text-white">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,_rgba(255,255,255,0.08),_transparent_18%),radial-gradient(circle_at_82%_22%,_rgba(59,130,246,0.12),_transparent_16%),radial-gradient(circle_at_50%_70%,_rgba(255,255,255,0.04),_transparent_22%)]"></div>
    <div class="pointer-events-none absolute inset-0 starfield opacity-70"></div>
    <div class="pointer-events-none absolute inset-x-0 top-16 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>

    <div
      class="relative z-10 h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      @scroll="handleScroll"
    >
      <section
        v-for="(video, index) in videos"
        :key="video.id"
        class="relative flex h-full w-full snap-start items-center justify-center bg-[radial-gradient(circle_at_50%_30%,_rgba(255,255,255,0.05),_transparent_32%),linear-gradient(180deg,#050505,#0d1117_48%,#050505)]"
        @dblclick="handleDoubleTap(video)"
      >
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.04),_transparent_34%)]"></div>

        <div
          v-if="likeAnimationVideoId === video.id"
          class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
        >
          <div class="animate-like">
            <svg class="h-32 w-32 text-rose-500 drop-shadow-2xl" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>

        <div class="relative mx-auto flex h-full w-full max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
          <div class="relative w-full max-w-md">
            <div class="pointer-events-none absolute inset-0 rounded-[2.4rem] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12),_transparent_44%)] blur-3xl"></div>
            <div class="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-white/[0.03] p-3 shadow-[0_35px_100px_rgba(0,0,0,0.65)] backdrop-blur-md">
              <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_32%,transparent_76%,rgba(255,255,255,0.025))]"></div>
              <div class="relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-black">
                <video
                  class="h-full w-full object-cover"
                  :src="video.videoUrl"
                  loop
                  playsinline
                  :autoplay="index === activeVideoIndex"
                  :muted="index !== activeVideoIndex"
                  controls
                  @timeupdate="handleTimeUpdate"
                ></video>
                <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent"></div>
                <div class="pointer-events-none absolute inset-x-5 top-5 flex items-center justify-between">
                  <span class="rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300 backdrop-blur-md">
                    NS Reel
                  </span>
                  <span class="rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 backdrop-blur-md">
                    {{ index + 1 }}/{{ videos.length }}
                  </span>
                </div>
                <div class="absolute inset-x-5 bottom-4 h-1 overflow-hidden rounded-full bg-white/10">
                  <div class="h-full rounded-full bg-white/70 transition-all duration-300" :style="{ width: `${videoProgress}%` }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="absolute bottom-20 left-4 right-20 mx-auto max-w-md pointer-events-none">
          <div class="pointer-events-auto">
            <div class="rounded-[1.75rem] border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
              <h3 class="text-lg font-bold text-white drop-shadow-md">@{{ video.userName }}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-200 drop-shadow-md">{{ video.description }}</p>

              <div
                v-if="video.productId && getProductInfo(video.productId)"
                class="mt-4 inline-flex items-center rounded-2xl border border-white/12 bg-black/55 p-3 backdrop-blur-xl cursor-pointer transition-all duration-200 ease-out will-change-transform group/product hover:border-white/25 hover:bg-black/75 hover:shadow-[0_20px_45px_rgba(255,255,255,0.08)]"
                @click.stop="openProductDetail(video.productId)"
                @mousemove="handleBadgeMouseMove"
                @mouseleave="handleBadgeMouseLeave"
              >
                <div class="relative">
                  <img :src="getProductInfo(video.productId).img" class="mr-3 h-10 w-10 rounded-lg border border-white/10 object-cover">
                  <div class="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-500 group-hover/product:opacity-100"></div>
                </div>
                <div>
                  <div class="mb-0.5 flex items-center text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300">
                    <svg class="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                    </svg>
                    {{ $t('social.sameStyle') }}
                  </div>
                  <div class="w-32 truncate text-sm font-bold text-white">{{ getProductInfo(video.productId).name }}</div>
                </div>
                <button class="ml-3 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-all duration-300 group-hover/product:-translate-y-0.5 group-hover/product:bg-white/15">
                  {{ $t('social.checkItOut') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="pointer-events-none absolute bottom-20 right-4 flex w-full max-w-md flex-col items-center space-y-6">
          <div class="pointer-events-auto ml-auto flex w-12 flex-col items-center space-y-5">
            <div class="relative">
              <div class="h-12 w-12 overflow-hidden rounded-full border-2 border-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                <img :src="video.userAvatar" class="h-full w-full object-cover">
              </div>
              <button
                v-if="!isFriend(video.userId) && video.userId !== 'current_user'"
                class="absolute -bottom-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-white text-black shadow-md transition hover:scale-110"
                @click="handleAddFriend(video)"
              >
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
              </button>
            </div>

            <button class="flex flex-col items-center group" @click="handleLike(video)">
              <div class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition group-hover:bg-white/10">
                <svg class="h-6 w-6 text-white transition group-hover:text-rose-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <span class="mt-1 text-xs font-bold">{{ video.likes }}</span>
            </button>

            <button class="flex flex-col items-center group" @click="openComments(video)">
              <div class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition group-hover:bg-white/10">
                <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h8M8 14h5m8-2a9 9 0 11-18 0a9 9 0 0118 0z"></path>
                </svg>
              </div>
              <span class="mt-1 text-[10px] font-bold uppercase tracking-[0.18em]">Talk</span>
            </button>

            <button class="flex flex-col items-center group" @click="handleDislike(video)">
              <div class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition group-hover:bg-white/10">
                <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"></path>
                </svg>
              </div>
              <span class="mt-1 text-[10px] font-bold uppercase tracking-[0.18em]">{{ $t('social.dislikeLabel') }}</span>
            </button>

            <button class="flex flex-col items-center group" @click="handleShare(video)">
              <div class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition group-hover:bg-white/10">
                <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                </svg>
              </div>
              <span class="mt-1 text-[10px] font-bold uppercase tracking-[0.18em]">{{ $t('social.shareLabel') }}</span>
            </button>

            <button class="flex flex-col items-center group" @click="handleChat(video)">
              <div class="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition group-hover:bg-white/10">
                <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </div>
              <span class="mt-1 text-[10px] font-bold uppercase tracking-[0.18em]">{{ $t('social.chatLabel') }}</span>
            </button>
          </div>
        </div>
      </section>
    </div>

    <button
      class="absolute top-20 right-4 z-40 rounded-full border border-white/12 bg-black/55 p-3 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:scale-110 hover:bg-black/70"
      @click="showUploadModal = true"
    >
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
    </button>

    <div v-if="showUploadModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div class="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#090909]/90 p-6 text-white shadow-[0_40px_120px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <h2 class="mb-4 text-xl font-bold">{{ $t('social.uploadTitle') }}</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-300">{{ $t('social.videoUrl') }}</label>
            <input
              v-model="uploadForm.videoUrl"
              type="text"
              class="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white placeholder:text-slate-500"
              placeholder="Paste a .mp4 URL"
            >
            <p class="mt-1 text-xs text-slate-500">Example: https://media.w3.org/2010/05/sintel/trailer.mp4</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-300">{{ $t('social.desc') }}</label>
            <textarea
              v-model="uploadForm.description"
              rows="3"
              class="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white placeholder:text-slate-500"
              placeholder="Describe the reel"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-300">{{ $t('social.relatedProduct') }}</label>
            <select v-model="uploadForm.productId" class="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white">
              <option value="">{{ $t('social.noRelated') }}</option>
              <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
            </select>
          </div>
        </div>

        <div class="mt-6 flex justify-end space-x-3">
          <button class="rounded-xl px-4 py-2 text-slate-300 transition hover:bg-white/[0.06]" @click="showUploadModal = false">
            {{ $t('social.cancel') }}
          </button>
          <button class="rounded-xl bg-white px-4 py-2 font-semibold text-black transition hover:bg-slate-100" @click="submitUpload">
            {{ $t('social.publish') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showCommentsDrawer"
      class="fixed inset-0 z-50 flex items-end justify-center"
      @click.self="showCommentsDrawer = false"
    >
      <div class="flex h-[60vh] w-full max-w-md flex-col rounded-t-[2rem] border border-white/10 bg-[#090909]/95 text-white shadow-[0_-30px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-transform duration-300 ease-out" :class="showCommentsDrawer ? 'translate-y-0' : 'translate-y-full'">
        <div class="flex items-center justify-between border-b border-white/10 p-4">
          <h3 class="text-lg font-bold">{{ $t('social.comments') }} ({{ currentVideoComments.length }})</h3>
          <button class="text-slate-500" @click="showCommentsDrawer = false">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="flex-1 space-y-4 overflow-y-auto p-4">
          <div v-if="currentVideoComments.length === 0" class="py-10 text-center text-slate-500">
            {{ $t('social.noComments') }}
          </div>
          <div v-for="comment in currentVideoComments" :key="comment.id" class="flex space-x-3">
            <div class="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-white/10">
              <img :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user}`" class="h-full w-full object-cover">
            </div>
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <span class="text-sm font-bold text-slate-300">{{ comment.user }}</span>
                <span class="text-xs text-slate-500">{{ comment.time }}</span>
              </div>
              <p class="mt-1 text-sm text-slate-200">{{ comment.content }}</p>
            </div>
          </div>
        </div>

        <div class="border-t border-white/10 bg-white/[0.03] p-4">
          <div class="flex items-center space-x-2">
            <input
              v-model="newCommentContent"
              type="text"
              :placeholder="$t('social.commentPlaceholder')"
              class="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              @keyup.enter="submitComment"
            >
            <button
              class="rounded-full bg-white p-2 text-black disabled:opacity-50"
              :disabled="!newCommentContent.trim()"
              @click="submitComment"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <ProductDetail
        v-if="showProductDetail"
        :product="selectedProduct"
        @close="showProductDetail = false"
        @add-to-cart="addToCart"
      />
    </Transition>
  </div>
</template>

<style scoped>
.starfield,
.starfield::before,
.starfield::after {
  position: absolute;
  inset: 0;
  content: '';
  background-image:
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.9) 0, transparent 1.5px),
    radial-gradient(circle at 70% 20%, rgba(255, 255, 255, 0.6) 0, transparent 1.4px),
    radial-gradient(circle at 35% 70%, rgba(255, 255, 255, 0.55) 0, transparent 1.3px),
    radial-gradient(circle at 80% 78%, rgba(255, 255, 255, 0.45) 0, transparent 1.2px),
    radial-gradient(circle at 55% 48%, rgba(255, 255, 255, 0.4) 0, transparent 1.1px);
  background-size: 320px 320px;
  animation: drift 18s linear infinite;
}

.starfield::before {
  opacity: 0.45;
  transform: scale(1.2);
  animation-duration: 26s;
}

.starfield::after {
  opacity: 0.25;
  transform: scale(1.35);
  animation-duration: 34s;
}

@keyframes drift {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(-20px, 24px, 0);
  }
}

@keyframes like-heart-animation {
  0% {
    transform: scale(0) rotate(-45deg);
    opacity: 0;
  }
  15% {
    transform: scale(1.2) rotate(0deg);
    opacity: 1;
  }
  30% {
    transform: scale(0.9);
  }
  45% {
    transform: scale(1.1);
  }
  80% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0) translateY(-50px);
    opacity: 0;
  }
}

.animate-like {
  animation: like-heart-animation 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.snap-mandatory {
  scroll-snap-type: y mandatory;
}

.snap-start {
  scroll-snap-align: start;
}
</style>
