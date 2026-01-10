import { reactive, computed } from 'vue';

const generateRandomNums = (length) => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
};

// Try to load from localStorage
const storedProfile = localStorage.getItem('ja_user_profile');
let initialState = {
  userInfo: {
    name: `NS 用户${generateRandomNums(11)}`,
    id: generateRandomNums(15),
    gender: 'male', // 'male' or 'female'
    level: 1,
    reputation: '优秀',
    sign: '让生活更简单',
    isVerified: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JA_User',
    backgroundImage: null // Custom background image
  },
  stats: {
    likes: 0,
    following: 0,
    followers: 0
  },
  wallet: {
    coupons: 2,
    balance: 0.00, // 余额
    points: 100    // 积分
  },
  orderCounts: {
    pendingPay: 0,
    pendingShip: 0,
    pendingRecv: 0,
    review: 0,
    refund: 0
  },
  interactionCounts: {
    want: 0,
    owned: 0,
    footprints: 0,
    brandFollowing: 0
  }
};

if (storedProfile) {
  try {
    const parsed = JSON.parse(storedProfile);
    // Merge stored profile with initial structure to ensure all fields exist
    initialState = { ...initialState, ...parsed, userInfo: { ...initialState.userInfo, ...parsed.userInfo }, wallet: { ...initialState.wallet, ...parsed.wallet } };
  } catch (e) {
    console.error('Failed to parse user profile', e);
  }
} else {
  // Save initial state
  localStorage.setItem('ja_user_profile', JSON.stringify(initialState));
}

const state = reactive(initialState);

// Watch for changes and save to localStorage (simple implementation)
// In a real app, we might use a plugin or specific actions to save
import { watch } from 'vue';
watch(state, (newVal) => {
  localStorage.setItem('ja_user_profile', JSON.stringify(newVal));
}, { deep: true });

export const useUserProfile = () => {
  return {
    userProfile: state
  };
};
