import { computed, reactive } from 'vue';
import { MarketService } from '../services/api';

const MOCK_NAME_PATTERNS = [
  'ecofuture notebook',
  'techkid kit',
  'artspace hoodie',
  'liusheng toy',
  'image placeholder'
];

const state = reactive({
  products: [],
  loading: false,
  loaded: false,
  lastLoadedAt: 0
});

const normalizeProduct = (item = {}) => ({
  id: String(item.id || ''),
  name: item.name || item.title || '',
  desc: item.desc || item.description || '',
  company: item.company || item.provider || '',
  price: Number(item.price || 0),
  img: item.img || item.image || '',
  type: item.type || ''
});

const isMockLike = (item) => {
  const text = `${item?.name || item?.title || ''} ${item?.desc || item?.description || ''}`.toLowerCase();
  if (text.includes('mvp smoke') || text.includes('smoke-test')) return true;
  return MOCK_NAME_PATTERNS.some((pattern) => text.includes(pattern));
};

const isTrustedProduct = (item) => {
  const product = normalizeProduct(item);
  if (!product.id || !product.name) return false;
  const type = String(product.type || '').toLowerCase();
  if (type === 'crowdfunding' || type === 'gushi') return false;
  return !isMockLike(product);
};

const refreshProducts = async ({ force = false } = {}) => {
  if (state.loading) return;
  if (!force && state.loaded && state.products.length) return;

  state.loading = true;
  try {
    const response = await MarketService.getAllServices({ limit: 200, sortBy: 'latest' });
    const list = Array.isArray(response?.data) ? response.data : [];
    state.products = list.map(normalizeProduct).filter(isTrustedProduct);
    state.loaded = true;
    state.lastLoadedAt = Date.now();
  } catch (_) {
    // Real-data mode: never keep stale ghosts when API is unavailable.
    state.products = [];
    state.loaded = true;
  } finally {
    state.loading = false;
  }
};

export const useProducts = () => {
  if (!state.loaded && !state.loading) {
    void refreshProducts();
  }

  const updateProductImage = (id, newImgUrl) => {
    const product = state.products.find((item) => String(item.id) === String(id));
    if (product) product.img = newImgUrl;
  };

  const updateProductPrice = (id, newPrice) => {
    const product = state.products.find((item) => String(item.id) === String(id));
    if (product) product.price = Number.parseFloat(newPrice);
  };

  const deleteProduct = (id) => {
    const index = state.products.findIndex((item) => String(item.id) === String(id));
    if (index !== -1) state.products.splice(index, 1);
  };

  const addProduct = (product) => {
    const normalized = normalizeProduct(product);
    if (!isTrustedProduct(normalized)) return;
    state.products.unshift(normalized);
  };

  const updateProduct = (id, updates) => {
    const product = state.products.find((item) => String(item.id) === String(id));
    if (!product) return;
    const merged = { ...product, ...updates };
    if (!isTrustedProduct(merged)) return;
    Object.assign(product, normalizeProduct(merged));
  };

  return {
    products: computed(() => state.products || []),
    loading: computed(() => state.loading),
    loaded: computed(() => state.loaded),
    getAllProducts: () => state.products,
    getProductById: (id) => state.products.find((item) => String(item.id) === String(id)),
    refreshProducts,
    updateProductImage,
    updateProductPrice,
    deleteProduct,
    addProduct,
    updateProduct
  };
};
