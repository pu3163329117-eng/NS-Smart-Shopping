import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ReviewService } from '../services/api';

const normalizeReview = (review = {}) => {
  const author = review.author || review.user || {};
  return {
    id: String(review.id || ''),
    rating: Number(review.rating || 0),
    content: review.content || '',
    images: Array.isArray(review.images) ? review.images : [],
    createdAt: review.createdAt || review.date || '',
    orderId: review.orderId || null,
    userId: review.userId || author.id || null,
    userName: author.username || author.name || review.userName || '匿名用户',
    userAvatar: author.avatar || review.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(author.username || review.userName || 'user')}`
  };
};

const extractList = (response) => {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  if (Array.isArray(response?.reviews)) {
    return response.reviews;
  }
  if (Array.isArray(response?.items)) {
    return response.items;
  }
  return [];
};

export const useReviews = defineStore('reviews', () => {
  const reviewsByProduct = ref({});
  const loadingByProduct = ref({});
  const errorByProduct = ref({});

  const getReviews = (productId) => reviewsByProduct.value[String(productId)] || [];

  const fetchReviews = async (productId) => {
    const key = String(productId);
    loadingByProduct.value[key] = true;
    errorByProduct.value[key] = '';

    try {
      const response = await ReviewService.getProductReviews(key);
      const list = extractList(response).map(normalizeReview);
      reviewsByProduct.value[key] = list;
      return list;
    } catch (error) {
      errorByProduct.value[key] = error?.message || '评价加载失败';
      reviewsByProduct.value[key] = [];
      throw error;
    } finally {
      loadingByProduct.value[key] = false;
    }
  };

  const addReview = async (productId, reviewData) => {
    const key = String(productId);
    const response = await ReviewService.createProductReview(key, reviewData);
    const created = normalizeReview(response?.data || response?.review || response);
    const current = reviewsByProduct.value[key] || [];
    reviewsByProduct.value[key] = [created, ...current];
    return created;
  };

  return {
    reviewsByProduct,
    loadingByProduct,
    errorByProduct,
    getReviews,
    fetchReviews,
    addReview
  };
});
