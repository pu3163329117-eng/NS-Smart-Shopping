<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h2 class="modal-title">添加好友</h2>
        <button @click="$emit('close')" class="close-button">
          ×
        </button>
      </div>
      
      <div class="modal-content">
        <div class="form-group">
          <label for="friendName" class="form-label">好友名称</label>
          <input
            id="friendName"
            v-model="friendName"
            type="text"
            class="form-input"
            placeholder="请输入好友名称"
            @keydown.enter="handleAdd"
          />
        </div>
        
        <div class="form-group">
          <label for="friendAvatar" class="form-label">头像URL (可选)</label>
          <input
            id="friendAvatar"
            v-model="friendAvatar"
            type="text"
            class="form-input"
            placeholder="https://example.com/avatar.jpg"
          />
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="$emit('close')" class="cancel-button">
          取消
        </button>
        <button 
          @click="handleAdd"
          :disabled="!canAdd"
          class="add-button"
        >
          添加好友
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Emits {
  (e: 'close'): void;
  (e: 'add', name: string, avatar?: string): void;
}

const emit = defineEmits<Emits>();

const friendName = ref('');
const friendAvatar = ref('');

const canAdd = computed(() => {
  return friendName.value.trim().length > 0;
});

const handleAdd = () => {
  if (!canAdd.value) return;
  
  emit('add', friendName.value.trim(), friendAvatar.value.trim() || undefined);
  friendName.value = '';
  friendAvatar.value = '';
};
</script>

<style scoped>
.modal-overlay {
  @apply fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50;
}

.modal-container {
  @apply bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden;
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
  @apply p-6;
}

.form-group {
  @apply mb-4;
}

.form-label {
  @apply block text-sm font-medium text-gray-700 mb-2;
}

.form-input {
  @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.modal-footer {
  @apply flex justify-end gap-3 p-6 border-t border-gray-200;
}

.cancel-button {
  @apply px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors;
}

.add-button {
  @apply px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>