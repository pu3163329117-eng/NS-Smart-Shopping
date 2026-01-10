import { reactive, computed, watch } from 'vue';

const state = reactive({
  items: [],
  isOpen: false
});

// Load from localStorage on init
const storedFavorites = localStorage.getItem('ja_favorites');
if (storedFavorites) {
  try {
    state.items = JSON.parse(storedFavorites);
  } catch (e) {
    localStorage.removeItem('ja_favorites');
  }
}

// Watch for changes and save to localStorage
watch(() => state.items, (newItems) => {
  localStorage.setItem('ja_favorites', JSON.stringify(newItems));
}, { deep: true });

const addToFavorites = (product) => {
  if (!state.items.find(item => item.id === product.id)) {
    state.items.push(product);
  }
};

const removeFromFavorites = (productId) => {
  const index = state.items.findIndex(item => item.id === productId);
  if (index !== -1) {
    state.items.splice(index, 1);
  }
};

const toggleFavorite = (product) => {
  if (isFavorite(product.id)) {
    removeFromFavorites(product.id);
    return false; // Removed
  } else {
    addToFavorites(product);
    return true; // Added
  }
};

const isFavorite = (productId) => {
  return state.items.some(item => item.id === productId);
};

const toggleFavoritesDrawer = () => {
  state.isOpen = !state.isOpen;
};

export const useFavorites = () => {
  return {
    favorites: state,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    toggleFavoritesDrawer
  };
};
