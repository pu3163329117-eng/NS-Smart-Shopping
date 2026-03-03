import { defineStore } from 'pinia';
import { ref } from 'vue';
import { MakerService, UserService } from '../services/api';

export const useOrderStore = defineStore('order', () => {
  const orders = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  const fetchMyOrders = async () => {
    isLoading.value = true;
    try {
      orders.value = await UserService.getMyOrders();
      error.value = null;
    } catch (err) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchMakerOrders = async (status) => {
    isLoading.value = true;
    try {
      orders.value = await MakerService.getOrders(status);
      error.value = null;
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
      error.value = null;
      return newOrder;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateOrderStatus = async (id, status) => {
    isLoading.value = true;
    try {
      const updatedOrder = await UserService.updateOrderStatus(id, status);
      const index = orders.value.findIndex((order) => order.id === id);
      if (index !== -1) {
        orders.value[index] = updatedOrder;
      }
      error.value = null;
      return updatedOrder;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateMakerOrderStatus = async (id, status) => {
    isLoading.value = true;
    try {
      const updatedOrder = await MakerService.updateOrderStatus(id, status);
      const index = orders.value.findIndex((order) => order.id === id);
      if (index !== -1) {
        orders.value[index] = updatedOrder;
      }
      error.value = null;
      return updatedOrder;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const completeMakerOrder = async (id) => {
    isLoading.value = true;
    try {
      const updatedOrder = await MakerService.completeOrder(id);
      const index = orders.value.findIndex((order) => order.id === id);
      if (index !== -1) {
        orders.value[index] = updatedOrder || { ...orders.value[index], status: 'completed' };
      }
      error.value = null;
      return updatedOrder || orders.value.find((order) => order.id === id);
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    orders,
    isLoading,
    error,
    fetchMyOrders,
    fetchMakerOrders,
    createOrder,
    updateOrderStatus,
    updateMakerOrderStatus,
    completeMakerOrder
  };
});
