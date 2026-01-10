import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useReviews = defineStore('reviews', () => {
  // Map of productId -> array of reviews
  const reviewsByProduct = ref({});

  const getReviews = (productId) => {
    if (!reviewsByProduct.value[productId]) {
      // Initialize with mock data if empty
      reviewsByProduct.value[productId] = [
        { id: 1, user: 'Alex M.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', rating: 5, date: '2025-12-10', content: '质量非常好，穿着很舒服，尺码标准！' },
        { id: 2, user: 'Sarah L.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', rating: 4, date: '2025-12-08', content: '颜色很正，物流也很快，就是稍微有点贵。' },
        { id: 3, user: 'Mike T.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', rating: 5, date: '2025-12-05', content: 'NS的设计一如既往的棒，不仅是衣服，更是一种态度。' }
      ];
    }
    return reviewsByProduct.value[productId];
  };

  const addReview = (productId, review) => {
    if (!reviewsByProduct.value[productId]) {
      getReviews(productId); // Initialize if needed
    }
    
    const newReview = {
      id: Date.now(),
      user: '我', // In a real app, get from auth store
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me',
      date: new Date().toLocaleDateString(),
      ...review
    };
    
    reviewsByProduct.value[productId].unshift(newReview);
    return true;
  };

  return {
    reviewsByProduct,
    getReviews,
    addReview
  };
});
