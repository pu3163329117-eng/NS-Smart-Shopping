import { reactive, computed } from 'vue';

const STORAGE_KEY = 'ja_checkout_session';

const normalizeItem = (item = {}) => {
  const quantity = Number(item.quantity || 1);
  const price = Number(item.price || 0);

  return {
    lineKey: item.lineKey || `${String(item.id || '')}::${String(item.skuId || 'default')}`,
    id: String(item.id || ''),
    title: item.title || item.name || 'Product',
    name: item.name || item.title || 'Product',
    image: item.image || item.img || item.cover || '',
    price: Number.isFinite(price) ? price : 0,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    providerId: item.providerId || item.userId || null,
    skuId: item.skuId || null,
    skuName: item.skuName || '',
    stock: Number.isFinite(Number(item.stock)) ? Number(item.stock) : null
  };
};

const readPersisted = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return {
      source: parsed?.source || 'cart',
      items: Array.isArray(parsed?.items) ? parsed.items.map(normalizeItem) : []
    };
  } catch {
    return null;
  }
};

const persisted = readPersisted();

const state = reactive({
  source: persisted?.source || 'cart',
  items: persisted?.items || []
});

const persist = () => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        source: state.source,
        items: state.items
      })
    );
  } catch {
    // ignore storage errors
  }
};

const setCheckoutItems = (items, source = 'cart') => {
  state.source = source;
  state.items = (Array.isArray(items) ? items : []).map(normalizeItem).filter((item) => item.id);
  persist();
};

const clearCheckout = () => {
  state.source = 'cart';
  state.items = [];
  persist();
};

const subtotal = computed(() =>
  state.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
);

export const useCheckout = () => ({
  checkout: state,
  subtotal,
  setCheckoutItems,
  clearCheckout
});
