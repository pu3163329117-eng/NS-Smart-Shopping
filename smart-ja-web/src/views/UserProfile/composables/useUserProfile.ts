/**
 * 用户资料组合式函数
 * 提取自 UserProfile.vue 的用户资料相关逻辑
 */

import { ref, computed } from 'vue';
import { useUserProfile as useUserProfileStore } from '../../../store/userProfile';
import { useToast } from '../../../composables/useToast';
import { UserService } from '../../../services/api';

/**
 * 用户资料相关状态和逻辑
 */
export function useUserProfile() {
  const { userProfile, fetchProfile, updateProfile, dailyCheckin } = useUserProfileStore();
  const { show: showToast } = useToast();

  // 模态框状态
  const isEditModalOpen = ref(false);
  const isPublishModalOpen = ref(false);
  const isIncomeModalOpen = ref(false);
  const isOrderModalOpen = ref(false);
  const isInteractionModalOpen = ref(false);
  const isWalletModalOpen = ref(false);
  const isAddressModalOpen = ref(false);
  const isSellerModalOpen = ref(false);
  const isActivityModalOpen = ref(false);
  const isServiceModalOpen = ref(false);

  // 标签页状态
  const currentOrderTab = ref('all');
  const currentInteractionTab = ref('want');
  const currentWalletTab = ref('balance');
  const currentSellerTab = ref('personal');
  const currentServiceTab = ref('help');
  const activeTab = ref('personal'); // 'personal' or 'maker'
  const currentMakerTab = ref('dashboard');

  /**
   * 处理签到功能
   */
  const handleCheckin = async () => {
    try {
      const result = await dailyCheckin();
      showToast(`签到成功！获得 ${result.award.points} 积分和 ${result.award.exp} 经验`, 'success');
      return result;
    } catch (error: any) {
      if (error.response && error.response.status === 400) {
        showToast('今天已经签到过了哦', 'info');
      } else {
        showToast('签到失败，请稍后再试', 'error');
      }
      throw error;
    }
  };

  /**
   * 打开编辑资料模态框
   */
  const openEditModal = () => {
    isEditModalOpen.value = true;
  };

  /**
   * 关闭编辑资料模态框
   */
  const closeEditModal = () => {
    isEditModalOpen.value = false;
  };

  /**
   * 打开发布模态框
   */
  const openPublishModal = () => {
    isPublishModalOpen.value = true;
  };

  /**
   * 关闭发布模态框
   */
  const closePublishModal = () => {
    isPublishModalOpen.value = false;
  };

  /**
   * 切换个人/创客标签页
   */
  const toggleTab = (tab: 'personal' | 'maker') => {
    activeTab.value = tab;
  };

  /**
   * 切换创客内部标签页
   */
  const switchMakerTab = (tab: string) => {
    currentMakerTab.value = tab;
  };

  // 计算属性：用户等级信息
  const userLevelInfo = computed(() => {
    const level = userProfile.value?.level || 1;
    const exp = userProfile.value?.exp || 0;
    const nextLevelExp = level * 100; // 简单计算下一级所需经验
    
    return {
      level,
      exp,
      nextLevelExp,
      progress: Math.min((exp / nextLevelExp) * 100, 100)
    };
  });

  // 计算属性：用户统计信息
  const userStats = computed(() => {
    return {
      points: userProfile.value?.points || 0,
      todayChecked: userProfile.value?.todayChecked || false,
      orderCount: userProfile.value?.orderCount || 0,
      favoriteCount: userProfile.value?.favoriteCount || 0,
      followerCount: userProfile.value?.followerCount || 0,
      followingCount: userProfile.value?.followingCount || 0
    };
  });

  return {
    // 状态
    userProfile,
    isEditModalOpen,
    isPublishModalOpen,
    isIncomeModalOpen,
    isOrderModalOpen,
    isInteractionModalOpen,
    isWalletModalOpen,
    isAddressModalOpen,
    isSellerModalOpen,
    isActivityModalOpen,
    isServiceModalOpen,
    currentOrderTab,
    currentInteractionTab,
    currentWalletTab,
    currentSellerTab,
    currentServiceTab,
    activeTab,
    currentMakerTab,
    
    // 计算属性
    userLevelInfo,
    userStats,
    
    // 方法
    fetchProfile,
    updateProfile,
    handleCheckin,
    openEditModal,
    closeEditModal,
    openPublishModal,
    closePublishModal,
    toggleTab,
    switchMakerTab
  };
}

/**
 * 创客工作室相关逻辑
 */
export function useMakerStudio() {
  const makerMenuItems = [
    { id: 'dashboard', name: '工作室概览', icon: '🎮' },
    { id: 'services', name: '我的作品/服务', icon: '🎨' },
    { id: 'orders', name: '接单任务', icon: '📜' },
    { id: 'projects', name: 'AI 孵化记录', icon: '🧪' },
    { id: 'wallet', name: '零花钱钱包', icon: '💰' },
  ];

  // 创客统计数据
  const makerStats = ref({
    totalEarnings: 0,
    completedOrders: 0,
    activeServices: 0,
    pendingProjects: 0,
    rating: 4.5
  });

  /**
   * 获取创客统计数据
   */
  const fetchMakerStats = async () => {
    try {
      // 这里应该调用API获取实际数据
      // 暂时返回模拟数据
      makerStats.value = {
        totalEarnings: 1250,
        completedOrders: 24,
        activeServices: 5,
        pendingProjects: 3,
        rating: 4.5
      };
    } catch (error) {
      console.error('获取创客统计数据失败:', error);
    }
  };

  return {
    makerMenuItems,
    makerStats,
    fetchMakerStats
  };
}