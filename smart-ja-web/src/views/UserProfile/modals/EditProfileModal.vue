<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <!-- 模态框头部 -->
      <div class="modal-header">
        <h2 class="modal-title">编辑资料</h2>
        <button @click="$emit('close')" class="close-button">
          ×
        </button>
      </div>

      <!-- 模态框内容 -->
      <div class="modal-content">
        <!-- 头像上传 -->
        <div class="avatar-section">
          <div class="avatar-preview">
            <img 
              :src="form.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + form.name" 
              :alt="form.name"
              class="avatar-image"
            />
            <button 
              @click="triggerAvatarUpload"
              class="avatar-upload-button"
            >
              📷
            </button>
            <input 
              ref="avatarInput"
              type="file" 
              accept="image/*"
              class="hidden"
              @change="handleAvatarUpload"
            />
          </div>
          <p class="avatar-hint">点击相机图标更换头像</p>
        </div>

        <!-- 表单 -->
        <form @submit.prevent="handleSubmit" class="profile-form">
          <!-- 姓名 -->
          <div class="form-group">
            <label for="name" class="form-label">姓名</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              class="form-input"
              placeholder="请输入你的姓名"
              required
            />
          </div>

          <!-- 简介 -->
          <div class="form-group">
            <label for="bio" class="form-label">个人简介</label>
            <textarea
              id="bio"
              v-model="form.bio"
              class="form-textarea"
              placeholder="介绍一下你自己吧~"
              rows="3"
              maxlength="200"
            ></textarea>
            <div class="char-count">
              {{ form.bio?.length || 0 }}/200
            </div>
          </div>

          <!-- 性别 -->
          <div class="form-group">
            <label class="form-label">性别</label>
            <div class="radio-group">
              <label class="radio-label">
                <input
                  type="radio"
                  v-model="form.gender"
                  value="male"
                  class="radio-input"
                />
                <span class="radio-custom"></span>
                <span class="radio-text">男</span>
              </label>
              <label class="radio-label">
                <input
                  type="radio"
                  v-model="form.gender"
                  value="female"
                  class="radio-input"
                />
                <span class="radio-custom"></span>
                <span class="radio-text">女</span>
              </label>
              <label class="radio-label">
                <input
                  type="radio"
                  v-model="form.gender"
                  value="other"
                  class="radio-input"
                />
                <span class="radio-custom"></span>
                <span class="radio-text">其他</span>
              </label>
            </div>
          </div>

          <!-- 生日 -->
          <div class="form-group">
            <label for="birthday" class="form-label">生日</label>
            <input
              id="birthday"
              v-model="form.birthday"
              type="date"
              class="form-input"
            />
          </div>

          <!-- 地区 -->
          <div class="form-group">
            <label for="location" class="form-label">所在地区</label>
            <input
              id="location"
              v-model="form.location"
              type="text"
              class="form-input"
              placeholder="例如：北京"
            />
          </div>

          <!-- 学校/公司 -->
          <div class="form-group">
            <label for="organization" class="form-label">学校/公司</label>
            <input
              id="organization"
              v-model="form.organization"
              type="text"
              class="form-input"
              placeholder="请输入学校或公司名称"
            />
          </div>

          <!-- 兴趣爱好 -->
          <div class="form-group">
            <label for="interests" class="form-label">兴趣爱好</label>
            <div class="tags-input">
              <div class="tags-container">
                <span
                  v-for="(tag, index) in form.interests"
                  :key="index"
                  class="tag"
                >
                  {{ tag }}
                  <button 
                    type="button"
                    @click="removeInterest(index)"
                    class="tag-remove"
                  >
                    ×
                  </button>
                </span>
                <input
                  v-model="newInterest"
                  type="text"
                  class="tag-input"
                  placeholder="添加兴趣标签"
                  @keydown.enter.prevent="addInterest"
                  @keydown.backspace="handleBackspace"
                />
              </div>
              <p class="tags-hint">按 Enter 添加标签，最多10个</p>
            </div>
          </div>

          <!-- 社交链接 -->
          <div class="form-group">
            <label class="form-label">社交链接</label>
            <div class="social-links">
              <div class="social-input-group">
                <span class="social-icon">🌐</span>
                <input
                  v-model="form.website"
                  type="url"
                  class="social-input"
                  placeholder="个人网站"
                />
              </div>
              <div class="social-input-group">
                <span class="social-icon">🐦</span>
                <input
                  v-model="form.twitter"
                  type="text"
                  class="social-input"
                  placeholder="Twitter/X"
                />
              </div>
              <div class="social-input-group">
                <span class="social-icon">📷</span>
                <input
                  v-model="form.instagram"
                  type="text"
                  class="social-input"
                  placeholder="Instagram"
                />
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- 模态框底部 -->
      <div class="modal-footer">
        <button 
          @click="$emit('close')"
          class="cancel-button"
        >
          取消
        </button>
        <button 
          @click="handleSubmit"
          :disabled="isSubmitting"
          class="save-button"
        >
          <span v-if="isSubmitting" class="loading-spinner"></span>
          {{ isSubmitting ? '保存中...' : '保存更改' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';

interface User {
  id: number;
  name: string;
  avatar?: string;
  bio?: string;
  gender?: string;
  birthday?: string;
  location?: string;
  organization?: string;
  interests?: string[];
  website?: string;
  twitter?: string;
  instagram?: string;
}

interface Props {
  user: User;
}

interface Emits {
  (e: 'close'): void;
  (e: 'save', user: User): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 表单数据
const form = reactive<User>({
  id: props.user.id,
  name: props.user.name || '',
  avatar: props.user.avatar,
  bio: props.user.bio || '',
  gender: props.user.gender || 'other',
  birthday: props.user.birthday || '',
  location: props.user.location || '',
  organization: props.user.organization || '',
  interests: props.user.interests || [],
  website: props.user.website || '',
  twitter: props.user.twitter || '',
  instagram: props.user.instagram || ''
});

// 新兴趣标签
const newInterest = ref('');
const avatarInput = ref<HTMLInputElement | null>(null);

// 提交状态
const isSubmitting = ref(false);

// 监听用户数据变化
watch(() => props.user, (newUser) => {
  Object.assign(form, newUser);
}, { deep: true });

/**
 * 触发头像上传
 */
const triggerAvatarUpload = () => {
  avatarInput.value?.click();
};

/**
 * 处理头像上传
 */
const handleAvatarUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (file) {
    // 这里应该上传文件到服务器
    // 暂时使用本地URL预览
    const reader = new FileReader();
    reader.onload = (e) => {
      form.avatar = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
  
  // 重置input
  input.value = '';
};

/**
 * 添加兴趣标签
 */
const addInterest = () => {
  const tag = newInterest.value.trim();
  if (tag && form.interests && form.interests.length < 10) {
    if (!form.interests.includes(tag)) {
      form.interests.push(tag);
    }
    newInterest.value = '';
  }
};

/**
 * 移除兴趣标签
 */
const removeInterest = (index: number) => {
  if (form.interests) {
    form.interests.splice(index, 1);
  }
};

/**
 * 处理退格键删除标签
 */
const handleBackspace = () => {
  if (newInterest.value === '' && form.interests && form.interests.length > 0) {
    form.interests.pop();
  }
};

/**
 * 处理表单提交
 */
const handleSubmit = async () => {
  if (isSubmitting.value) return;
  
  try {
    isSubmitting.value = true;
    
    // 验证表单
    if (!form.name.trim()) {
      alert('请输入姓名');
      return;
    }
    
    // 这里应该调用API保存数据
    console.log('保存用户资料:', form);
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 触发保存事件
    emit('save', { ...form });
    
    // 关闭模态框
    emit('close');
    
  } catch (error) {
    console.error('保存失败:', error);
    alert('保存失败，请重试');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  @apply fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50;
  animation: fadeIn 0.3s ease-out;
}

.modal-container {
  @apply bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden;
  animation: slideUp 0.3s ease-out;
}

.modal-header {
  @apply flex items-center justify-between p-6 border-b border-gray-200;
}

.modal-title {
  @apply text-2xl font-bold text-gray-800;
}

.close-button {
  @apply text-3xl text-gray-400 hover:text-gray-600 transition-colors;
}

.modal-content {
  @apply p-6 overflow-y-auto max-h-[60vh];
}

.avatar-section {
  @apply text-center mb-8;
}

.avatar-preview {
  @apply relative inline-block mb-2;
}

.avatar-image {
  @apply w-24 h-24 rounded-full border-4 border-white shadow-lg;
}

.avatar-upload-button {
  @apply absolute bottom-0 right-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors;
}

.avatar-hint {
  @apply text-sm text-gray-500;
}

.profile-form {
  @apply space-y-6;
}

.form-group {
  @apply space-y-2;
}

.form-label {
  @apply block text-sm font-medium text-gray-700;
}

.form-input,
.form-textarea {
  @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all;
}

.form-textarea {
  @apply resize-none;
}

.char-count {
  @apply text-xs text-gray-500 text-right;
}

.radio-group {
  @apply flex gap-4;
}

.radio-label {
  @apply flex items-center gap-2 cursor-pointer;
}

.radio-input {
  @apply sr-only;
}

.radio-custom {
  @apply w-4 h-4 border-2 border-gray-300 rounded-full transition-all;
}

.radio-input:checked + .radio-custom {
  @apply border-blue-500 bg-blue-500;
}

.radio-text {
  @apply text-gray-700;
}

.tags-input {
  @apply space-y-2;
}

.tags-container {
  @apply flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg min-h-[44px];
}

.tag {
  @apply inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm;
}

.tag-remove {
  @apply text-blue-600 hover:text-blue-800;
}

.tag-input {
  @apply flex-1 min-w-[120px] border-none outline-none bg-transparent;
}

.tags-hint {
  @apply text-xs text-gray-500;
}

.social-links {
  @apply space-y-3;
}

.social-input-group {
  @apply flex items-center gap-2;
}

.social-icon {
  @apply text-lg;
}

.social-input {
  @apply flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.modal-footer {
  @apply flex justify-end gap-3 p-6 border-t border-gray-200;
}

.cancel-button {
  @apply px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors;
}

.save-button {
  @apply px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2;
}

.loading-spinner {
  @apply w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>