import { defineStore } from 'pinia';
import { ref } from 'vue';
import { MockAPI } from '../services/mock/api';
import { UserService } from '../services/api';

export const useOrderStore = defineStore('order', () => {
  // State
  const orders = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  // Actions
  const fetchMyOrders = async () => {
    isLoading.value = true;
    try {
      const data = await UserService.getMyOrders();
      orders.value = data;
    } catch (err) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchMakerOrders = async () => {
    isLoading.value = true;
    try {
      // Still mock for now as backend endpoint might differ slightly
      const data = await MockAPI.getOrders('maker');
      orders.value = data;
    } catch (err) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  };

  const createOrder = async (orderData) => {
    isLoading.value = true;
    try {
      const newOrder = await UserService.createOrder(orderData);
      return newOrder;
    } catch (err) {
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateOrderStatus = async (id, status) => {
    isLoading.value = true;
    try {
      const updatedOrder = await UserService.updateOrderStatus(id, status);
      // Update local state
      const index = orders.value.findIndex(o => o.id === id);
      if (index !== -1) {
        orders.value[index] = updatedOrder;
      }
      return updatedOrder;
    } catch (err) {
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    orders,
    isLoading,
    fetchMyOrders,
    fetchMakerOrders,
    createOrder,
    updateOrderStatus
  };
});
