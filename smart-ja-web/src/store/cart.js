import { reactive, computed } from 'vue';

const state = reactive({
  items: [],
  isOpen: false
});

const addToCart = (product) => {
  state.items.push(product);
  state.isOpen = true;
};

const removeFromCart = (index) => {
  state.items.splice(index, 1);
};

const clearCart = () => {
  state.items = [];
};

const toggleCart = () => {
  state.isOpen = !state.isOpen;
};

const total = computed(() => {
  return state.items.reduce((sum, item) => sum + item.price, 0).toFixed(2);
});

export const useCart = () => {
  return {
    cart: state,
    addToCart,
    removeFromCart,
    clearCart,
    toggleCart,
    total
  };
};
