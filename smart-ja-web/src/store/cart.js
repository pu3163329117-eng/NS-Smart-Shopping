import { reactive, computed } from 'vue';

const state = reactive({
  items: [],
  isOpen: false
});

const addToCart = (product) => {
  const existingItem = state.items.find(item => item.id === product.id);
  if (existingItem) {
    existingItem.quantity = (existingItem.quantity || 1) + 1;
  } else {
    state.items.push({ ...product, quantity: 1 });
  }
  state.isOpen = true;
};

const updateQuantity = (index, delta) => {
  const item = state.items[index];
  if (item) {
    const newQty = (item.quantity || 1) + delta;
    if (newQty > 0) {
      item.quantity = newQty;
    }
  }
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
  return state.items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0).toFixed(2);
});

export const useCart = () => {
  return {
    cart: state,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    toggleCart,
    total
  };
};
