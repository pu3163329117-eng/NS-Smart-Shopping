import { reactive } from 'vue';

const toasts = reactive([]);
let idCounter = 0;

export const useToast = () => {
  const show = (message, type = 'info') => {
    const id = idCounter++;
    toasts.push({ id, message, type });
    setTimeout(() => {
      remove(id);
    }, 3000);
  };

  const remove = (id) => {
    const index = toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      toasts.splice(index, 1);
    }
  };

  return { toasts, show, remove };
};