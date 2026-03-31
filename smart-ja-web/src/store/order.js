import { defineStore } from 'pinia';
import { ref } from 'vue';
import { MakerService, UserService } from '../services/api';

const normalizeOrders = (response) => {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  if (Array.isArray(response?.orders)) {
    return response.orders;
  }
  if (Array.isArray(response?.items)) {
    return response.items;
  }
  return [];
};

const normalizeSingleOrder = (response, fallback) => {
  if (!response) {
    return fallback;
  }
  if (response.split && Array.isArray(response.orders) && response.orders.length > 0) {
    return response.orders[0];
  }
  if (response.order && typeof response.order === 'object') {
    return response.order;
  }
  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }
  if (typeof response === 'object' && !Array.isArray(response)) {
    return response;
  }
  return fallback;
};

const upsertOrderInList = (orderList, targetOrder) => {
  if (!targetOrder || typeof targetOrder !== 'object') {
    return;
  }

  const index = orderList.findIndex((order) => String(order.id) === String(targetOrder.id));
  if (index !== -1) {
    orderList[index] = targetOrder;
    return;
  }

  orderList.unshift(targetOrder);
};

export const useOrderStore = defineStore('order', () => {
  const orders = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  const fetchMyOrders = async () => {
    isLoading.value = true;
    try {
      const response = await UserService.getMyOrders();
      orders.value = normalizeOrders(response);
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
      const response = await MakerService.getOrders(status);
      orders.value = normalizeOrders(response);
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
      return normalizeSingleOrder(newOrder, null);
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
      const response = await UserService.updateOrderStatus(id, status);
      const current = orders.value.find((order) => String(order.id) === String(id));
      const updatedOrder = normalizeSingleOrder(response, current ? { ...current, status } : null);
      const index = orders.value.findIndex((order) => String(order.id) === String(id));
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

  const updateMakerOrderStatus = async (id, status, extra = {}) => {
    isLoading.value = true;
    try {
      const response = await MakerService.updateOrderStatus(id, status, extra);
      const current = orders.value.find((order) => String(order.id) === String(id));
      const updatedOrder = normalizeSingleOrder(
        response,
        current ? { ...current, status, ...extra } : null
      );
      const index = orders.value.findIndex((order) => String(order.id) === String(id));
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
      const response = await MakerService.completeOrder(id);
      const updatedOrder = normalizeSingleOrder(response, null);
      const index = orders.value.findIndex((order) => String(order.id) === String(id));
      if (index !== -1) {
        orders.value[index] = updatedOrder || { ...orders.value[index], status: 'completed' };
      }
      error.value = null;
      return updatedOrder || orders.value.find((order) => String(order.id) === String(id));
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const fulfillMakerOrder = async (id, payload = {}) => {
    isLoading.value = true;
    try {
      const response = await MakerService.fulfillOrder(id, payload);
      const current = orders.value.find((order) => String(order.id) === String(id));
      const updatedOrder = normalizeSingleOrder(
        response,
        current
          ? {
              ...current,
              status: 'shipped',
              trackingCompany: payload.trackingCompany || current.trackingCompany || '',
              trackingNumber: payload.trackingNumber || current.trackingNumber || '',
              shippedAt: new Date().toISOString()
            }
          : null
      );
      const index = orders.value.findIndex((order) => String(order.id) === String(id));
      if (index !== -1 && updatedOrder) {
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

  const confirmReceipt = async (id) => {
    isLoading.value = true;
    try {
      const response = await UserService.confirmOrderReceipt(id);
      const updatedOrder = normalizeSingleOrder(response, null);
      const index = orders.value.findIndex((order) => String(order.id) === String(id));
      if (index !== -1) {
        orders.value[index] = updatedOrder || { ...orders.value[index], status: 'completed' };
      }
      error.value = null;
      return updatedOrder || orders.value.find((order) => String(order.id) === String(id));
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const cancelOrder = async (id) => {
    isLoading.value = true;
    try {
      const response = await UserService.cancelOrder(id);
      const current = orders.value.find((order) => String(order.id) === String(id));
      const updatedOrder = normalizeSingleOrder(
        response,
        current ? { ...current, status: 'cancelled' } : { id, status: 'cancelled' }
      );
      upsertOrderInList(orders.value, updatedOrder);
      error.value = null;
      return updatedOrder;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const refundOrder = async (id, payload = {}) => {
    isLoading.value = true;
    try {
      const response = await UserService.refundOrder(id, payload);
      const current = orders.value.find((order) => String(order.id) === String(id));
      const updatedOrder = normalizeSingleOrder(
        response,
        current ? { ...current, status: 'refunded' } : { id, status: 'refunded' }
      );
      upsertOrderInList(orders.value, updatedOrder);
      error.value = null;
      return updatedOrder;
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
    completeMakerOrder,
    fulfillMakerOrder,
    confirmReceipt,
    cancelOrder,
    refundOrder
  };
});
