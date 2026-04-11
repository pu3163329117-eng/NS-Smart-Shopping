<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useSocial } from '../store/social';
import { useAuth } from '../store/auth';
import { useToast } from '../composables/useToast';
import { UserService } from '../services/api';

const { auth } = useAuth();
const currentUserId = computed(() => auth.user?.id);

const { show: showToast } = useToast();
const { posts, loadingPosts, hasMorePosts, creatingPost, fetchPosts, createPost, toggleLike, deletePost } = useSocial();

const showComposer = ref(false);
const publishing = ref(false);
const likeAnimatingPostId = ref('');
const postForm = ref({
  content: '',
  files: [],
  previews: []
});

const isEmpty = computed(() => !loadingPosts.value && posts.value.length === 0);

const resetComposer = () => {
  postForm.value.previews.forEach((url) => URL.revokeObjectURL(url));
  postForm.value = {
    content: '',
    files: [],
    previews: []
  };
};

const openComposer = () => {
  resetComposer();
  showComposer.value = true;
};

const closeComposer = () => {
  showComposer.value = false;
  resetComposer();
};

const onSelectImages = (event) => {
  const fileList = Array.from(event.target.files || []);
  const nextFiles = fileList.slice(0, 9);

  postForm.value.previews.forEach((url) => URL.revokeObjectURL(url));
  postForm.value.files = nextFiles;
  postForm.value.previews = nextFiles.map((file) => URL.createObjectURL(file));
};

const uploadImages = async (files) => {
  const urls = [];
  for (const file of files) {
    const response = await UserService.uploadFile(file);
    if (response?.url) {
      urls.push(response.url);
    }
  }
  return urls;
};

const submitPost = async () => {
  const content = postForm.value.content.trim();
  const files = postForm.value.files;

  if (!content && files.length === 0) {
    showToast('请至少填写正文或上传一张图片', 'warning');
    return;
  }

  publishing.value = true;
  try {
    const imageUrls = files.length ? await uploadImages(files) : [];
    await createPost({
      content,
      images: imageUrls
    });

    showToast('动态发布成功', 'success');
    closeComposer();
  } catch (error) {
    showToast(error?.message || '发布失败，请稍后重试', 'error');
  } finally {
    publishing.value = false;
  }
};

const loadMore = async () => {
  try {
    await fetchPosts({ reset: false, limit: 12 });
  } catch (error) {
    showToast(error?.message || '加载失败', 'error');
  }
};

const refreshPosts = async () => {
  try {
    await fetchPosts({ reset: true, limit: 12 });
  } catch (error) {
    showToast(error?.message || '刷新失败', 'error');
  }
};

const likePost = async (post) => {
  try {
    await toggleLike(post.id);
    likeAnimatingPostId.value = post.id;
    window.setTimeout(() => {
      if (likeAnimatingPostId.value === post.id) {
        likeAnimatingPostId.value = '';
      }
    }, 260);
  } catch (error) {
    showToast(error?.message || '点赞失败', 'error');
  }
};

const removePost = async (postId) => {
  try {
    showToast('正在删除...', 'info');
    await deletePost(postId);
    showToast('动态已永久删除', 'success');
  } catch (error) {
    console.error('Delete post error:', error);
    const msg = error?.response?.data?.message || error?.message || '删除失败，可能没有权限';
    showToast(`删除失败：${msg}`, 'error');
  }
};

const formatTime = (value) => {
  if (!value) {
    return '刚刚';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
};

onMounted(async () => {
  await refreshPosts();
});

onBeforeUnmount(() => {
  postForm.value.previews.forEach((url) => URL.revokeObjectURL(url));
});
</script>

<template>
  <div class="min-h-screen bg-transparent pb-20 pt-24 text-slate-900 dark:text-white">
    <div class="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_16%_12%,_rgba(255,255,255,0.08),_transparent_18%),radial-gradient(circle_at_84%_16%,_rgba(56,189,248,0.12),_transparent_16%),radial-gradient(circle_at_52%_72%,_rgba(99,102,241,0.1),_transparent_26%),linear-gradient(180deg,#030303_0%,#07090c_60%,#030303_100%)]"></div>
    <div class="pointer-events-none fixed inset-x-0 top-16 -z-10 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>

    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mb-8 flex items-end justify-between gap-4">
        <div>
          <p class="text-[11px] uppercase tracking-[0.32em] text-slate-600 dark:text-slate-400">UGC Community</p>
          <h1 class="mt-3 text-4xl font-semibold tracking-tight">NS 动态社区</h1>
          <p class="mt-3 text-sm text-slate-700 dark:text-slate-300">真实用户动态、真实点赞互动、真实内容沉淀。</p>
        </div>

        <button
          type="button"
          class="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-900 dark:text-white/80 transition hover:bg-slate-200 dark:bg-white/[0.08]"
          @click="refreshPosts"
        >
          刷新
        </button>
      </div>

      <div v-if="isEmpty" class="rounded-[2.5rem] border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] p-12 text-center backdrop-blur-xl">
        <p class="text-lg text-slate-800 dark:text-white/75">社区里还没有内容</p>
        <p class="mt-2 text-sm text-slate-600 dark:text-white/40">发第一条动态，点燃整个社区。</p>
        <button type="button" class="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90" @click="openComposer">
          发布动态
        </button>
      </div>

      <section v-else class="masonry-grid">
        <article
          v-for="post in posts"
          :key="post.id"
          class="masonry-item mb-5 overflow-hidden rounded-[1.8rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4 backdrop-blur-xl transition hover:border-slate-200 dark:border-white/20 hover:bg-white/[0.05]"
        >
          <header class="mb-3 flex items-start justify-between">
            <div class="flex items-center gap-3">
              <img :src="post.author.avatar" :alt="post.author.username" class="h-10 w-10 rounded-full border border-slate-200 dark:border-white/10 object-cover">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">{{ post.author.username }}</p>
                <p class="text-xs text-slate-700 dark:text-slate-400">{{ formatTime(post.createdAt) }}</p>
              </div>
            </div>

            <button
              v-if="post.author.id === currentUserId"
              type="button"
              class="rounded-full p-2 text-slate-500 transition hover:bg-white/[0.05] hover:text-rose-400"
              title="删除动态"
              @click.stop.prevent="removePost(post.id)"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </header>

          <p class="whitespace-pre-wrap text-sm leading-7 text-slate-800 dark:text-white/95">{{ post.content }}</p>

          <div v-if="post.images.length" class="mt-4 grid grid-cols-2 gap-2">
            <img
              v-for="(image, idx) in post.images"
              :key="`${post.id}-image-${idx}`"
              :src="image"
              class="h-36 w-full rounded-xl border border-slate-200 dark:border-white/10 object-cover"
              :class="post.images.length === 1 ? 'col-span-2 h-56' : ''"
            >
          </div>

          <footer class="mt-4 flex items-center justify-between border-t border-slate-200 dark:border-white/8 pt-3">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition"
              :class="post.likedByMe ? 'border-rose-400/40 bg-rose-400/10 text-rose-300' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-white/70 hover:bg-slate-200 dark:bg-white/[0.08]'"
              @click="likePost(post)"
            >
              <svg
                class="h-4 w-4 transition"
                :class="likeAnimatingPostId === post.id ? 'scale-125' : ''"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span>{{ post.likes }}</span>
            </button>
            <span class="text-xs uppercase tracking-[0.15em] text-slate-700 dark:text-slate-400">{{ post.commentsCount }} comments</span>
          </footer>
        </article>
      </section>

      <div class="mt-6 flex justify-center">
        <button
          v-if="hasMorePosts"
          type="button"
          class="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-600 dark:text-white/75 transition hover:bg-slate-200 dark:bg-white/[0.08] disabled:opacity-60"
          :disabled="loadingPosts"
          @click="loadMore"
        >
          {{ loadingPosts ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </div>

    <button
      type="button"
      class="fixed bottom-24 right-6 z-40 rounded-full bg-white p-4 text-black shadow-[0_24px_60px_rgba(0,0,0,0.45)] transition hover:scale-105 hover:bg-slate-100"
      @click="openComposer"
    >
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
    </button>

    <div v-if="showComposer" class="fixed inset-0 z-[1200] flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-slate-50 dark:bg-black/40 dark:bg-black/70 backdrop-blur-sm" @click="closeComposer"></div>
      <div class="relative w-full max-w-2xl rounded-[2.5rem] border border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-[#0a0a0c]/95 p-6 shadow-2xl backdrop-blur-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">发布动态</h3>
          <button type="button" class="rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 p-2 text-slate-500 dark:text-white/60 transition hover:bg-slate-100 dark:hover:bg-slate-200 dark:bg-white/[0.08]" @click="closeComposer">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <textarea
          v-model="postForm.content"
          rows="5"
          class="mt-5 w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:text-white/30 focus:border-slate-300 dark:focus:border-slate-200 dark:border-white/25 focus:ring-1 focus:ring-slate-300 dark:focus:ring-white/25 transition-colors"
          placeholder="这一刻你想分享什么？"
        ></textarea>

        <div class="mt-4">
          <label class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 dark:border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-50 dark:bg-white/[0.03] px-4 py-2 text-sm text-slate-600 dark:text-white/75 transition hover:bg-slate-100 dark:hover:bg-slate-200 dark:bg-white/[0.08]">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 16.5V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8.5m-18 0A2.5 2.5 0 0 0 5.5 19h13a2.5 2.5 0 0 0 2.5-2.5m-18 0V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-.5M8 11h.01M12 11h.01M16 11h.01" />
            </svg>
            上传图片（最多 9 张）
            <input type="file" accept="image/*" multiple class="hidden" @change="onSelectImages">
          </label>
        </div>

        <div v-if="postForm.previews.length" class="mt-4 grid grid-cols-3 gap-2">
          <img
            v-for="(preview, idx) in postForm.previews"
            :key="`preview-${idx}`"
            :src="preview"
            class="h-24 w-full rounded-xl border border-slate-200 dark:border-slate-200 dark:border-white/10 object-cover"
          >
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="rounded-xl border border-slate-200 dark:border-slate-200 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-white/70 transition hover:bg-slate-50 dark:hover:bg-slate-200 dark:bg-white/[0.08]" @click="closeComposer">
            取消
          </button>
          <button
            type="button"
            class="rounded-xl bg-slate-900 dark:bg-white px-5 py-2 text-sm font-semibold text-slate-900 dark:text-white dark:text-black transition hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-60"
            :disabled="publishing || creatingPost"
            @click="submitPost"
          >
            {{ publishing || creatingPost ? '发布中...' : '发布动态' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.masonry-grid {
  column-count: 1;
  column-gap: 1.25rem;
}

.masonry-item {
  break-inside: avoid;
}

@media (min-width: 768px) {
  .masonry-grid {
    column-count: 2;
  }
}

@media (min-width: 1200px) {
  .masonry-grid {
    column-count: 3;
  }
}
</style>
