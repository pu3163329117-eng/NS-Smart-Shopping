/**
 * 用户订单组合式函数
 * 提取自 UserProfile.vue 的订单相关逻辑
 */

import { ref, computed } from 'vue';

/**
 * 用户订单相关状态和逻辑
 */
export function useUserOrders() {
  // 订单统计
  const orderCounts = ref({
    pendingPay: 2,
    pendingShip: 3,
    pendingRecv: 1,
    review: 5
  });

  // 最近订单
  const recentOrders = ref([
    {
      id: 1001,
      productName: '智能编程机器人',
      productImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12',
      price: 299,
      status: 'shipped' as const,
      statusText: '已发货',
      date: '2026-02-26'
    },
    {
      id: 1002,
      productName: '3D打印笔套装',
      productImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12',
      price: 159,
      status: 'pending' as const,
      statusText: '待付款',
      date: '2026-02-25'
    },
    {
      id: 1003,
      productName: 'AI绘画数位板',
      productImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12',
      price: 499,
      status: 'delivered' as const,
      statusText: '待评价',
      date: '2026-02-24'
    }
  ]);

  // 订单趋势数据
  const orderTrend = ref([
    { day: '一', count: 3, height: 60, color: 'bg-blue-400' },
    { day: '二', count: 5, height: 100, color: 'bg-blue-500' },
    { day: '三', count: 2, height: 40, color: 'bg-blue-400' },
    { day: '四', count: 4, height: 80, color: 'bg-blue-500' },
    { day: '五', count: 6, height: 120, color: 'bg-blue-600' },
    { day: '六', count: 8, height: 160, color: 'bg-blue-700' },
    { day: '日', count: 4, height: 80, color: 'bg-blue-500' }
  ]);

  /**
   * 获取订单数据
   */
  const fetchOrders = async () => {
    try {
      // 这里应该调用API获取实际数据
      // 暂时使用模拟数据
      console.log('获取订单数据...');
      
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 更新数据
      orderCounts.value = {
        pendingPay: Math.floor(Math.random() * 5),
        pendingShip: Math.floor(Math.random() * 5),
        pendingRecv: Math.floor(Math.random() * 5),
        review: Math.floor(Math.random() * 5)
      };
      
      // 更新趋势数据
      orderTrend.value = orderTrend.value.map(item => ({
        ...item,
        count: Math.floor(Math.random() * 10),
        height: Math.floor(Math.random() * 100) + 30
      }));
      
    } catch (error) {
      console.error('获取订单数据失败:', error);
    }
  };

  /**
   * 获取订单详情
   */
  const fetchOrderDetail = async (orderId: number) => {
    try {
      // 这里应该调用API获取订单详情
      console.log('获取订单详情:', orderId);
      
      // 模拟数据
      return {
        id: orderId,
        productName: '测试产品',
        price: 100,
        status: 'pending',
        createdAt: '2026-02-27',
        items: []
      };
    } catch (error) {
      console.error('获取订单详情失败:', error);
      throw error;
    }
  };

  /**
   * 更新订单状态
   */
  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      console.log('更新订单状态:', orderId, status);
      // 这里应该调用API更新订单状态
      return { success: true };
    } catch (error) {
      console.error('更新订单状态失败:', error);
      throw error;
    }
  };

  /**
   * 删除订单
   */
  const deleteOrder = async (orderId: number) => {
    try {
      console.log('删除订单:', orderId);
      // 这里应该调用API删除订单
      return { success: true };
    } catch (error) {
      console.error('删除订单失败:', error);
      throw error;
    }
  };

  // 计算属性：总订单数
  const totalOrders = computed(() => {
    return Object.values(orderCounts.value).reduce((sum, count) => sum + count, 0);
  });

  // 计算属性：是否有待处理订单
  const hasPendingOrders = computed(() => {
    return orderCounts.value.pendingPay > 0 || 
           orderCounts.value.pendingShip > 0 || 
           orderCounts.value.pendingRecv > 0;
  });

  // 计算属性：订单统计摘要
  const orderSummary = computed(() => {
    return {
      total: totalOrders.value,
      pending: orderCounts.value.pendingPay + orderCounts.value.pendingShip + orderCounts.value.pendingRecv,
      completed: orderCounts.value.review,
      needsAttention: orderCounts.value.pendingPay > 0 // 待付款需要特别关注
    };
  });

  return {
    // 状态
    orderCounts,
    recentOrders,
    orderTrend,
    
    // 计算属性
    totalOrders,
    hasPendingOrders,
    orderSummary,
    
    // 方法
    fetchOrders,
    fetchOrderDetail,
    updateOrderStatus,
    deleteOrder
  };
}

/**
 * 订单过滤和搜索功能
 */
export function useOrderFilters() {
  const searchQuery = ref('');
  const statusFilter = ref('all');
  const dateFilter = ref('all');
  const sortBy = ref('date-desc');

  /**
   * 过滤订单列表
   */
  const filterOrders = (orders: any[]) => {
    return orders.filter(order => {
      // 搜索过滤
      const matchesSearch = searchQuery.value === '' || 
        order.productName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        order.id.toString().includes(searchQuery.value);
      
      // 状态过滤
      const matchesStatus = statusFilter.value === 'all' || 
        order.status === statusFilter.value;
      
      // 日期过滤（简化实现）
      const matchesDate = dateFilter.value === 'all' || true;
      
      return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => {
      // 排序逻辑
      switch (sortBy.value) {
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        default:
          return 0;
      }
    });
  };

  /**
   * 重置过滤器
   */
  const resetFilters = () => {
    searchQuery.value = '';
    statusFilter.value = 'all';
    dateFilter.value = 'all';
    sortBy.value = 'date-desc';
  };

  return {
    searchQuery,
    statusFilter,
    dateFilter,
    sortBy,
    filterOrders,
    resetFilters
  };
}