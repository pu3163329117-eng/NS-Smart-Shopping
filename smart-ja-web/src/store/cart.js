import { reactive, computed } from 'vue';

const state = reactive({
  items: [],
  isOpen: false
});

const getLineKey = (item = {}) => `${String(item.id || '')}::${String(item.skuId || 'default')}`;

const addToCart = (product) => {
  const lineKey = getLineKey(product);
  const existingItem = state.items.find((item) => getLineKey(item) === lineKey);
  if (existingItem) {
    existingItem.quantity = (existingItem.quantity || 1) + 1;
  } else {
    state.items.push({
      ...product,
      lineKey,
      skuId: product.skuId || null,
      skuName: product.skuName || '',
      quantity: 1
    });
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
  return state.items
    .reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
    .toFixed(2);
});

const hasCrossProvider = computed(() => {
  if (state.items.length <= 1) return false;
  const providers = new Set(state.items.map((i) => i.providerId || i.userId || i.sellerId || 'unknown'));
  return providers.size > 1;
});

export const useCart = () => {
  return {
    cart: state,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    toggleCart,
    total,
    hasCrossProvider
  };
};
