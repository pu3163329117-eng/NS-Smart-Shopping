import { reactive, watch } from 'vue';
import { UserService } from '../services/api';

// Initial default state (Guest or Loading)
const initialState = {
  userInfo: {
    name: 'Guest',
    id: '',
    gender: 'male',
    level: 1,
    reputation: 'Unknown',
    sign: 'Login to see your profile',
    isVerified: false,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
    backgroundImage: null
  },
  stats: {
    likes: 0,
    following: 0,
    followers: 0
  },
  wallet: {
    coupons: 0,
    balance: 0.00,
    points: 0
  },
  transactions: [], // Add default transactions array
  interactionCounts: {
    want: 0,
    owned: 0,
    footprints: 0,
    brandFollowing: 0
  }
};

const state = reactive({ ...initialState });

const fetchProfile = async () => {
  try {
    const profile = await UserService.getProfile();
    
    // Map backend response to frontend state structure
    state.userInfo = {
      name: profile.username || profile.name, // Handle both
      id: profile.id,
      gender: profile.gender || 'male',
      level: profile.level || 1,
      reputation: profile.reputation || '优秀',
      sign: profile.sign || '',
      isVerified: true, // Assuming logged in users are verified for now
      avatar: profile.avatar,
      backgroundImage: profile.backgroundImage
    };
    
    if (profile.stats) state.stats = { ...initialState.stats, ...profile.stats };
    if (profile.wallet) state.wallet = { ...initialState.wallet, ...profile.wallet };
    if (profile.transactions) state.transactions = profile.transactions; // Add transactions
    if (profile.interactionCounts) state.interactionCounts = { ...initialState.interactionCounts, ...profile.interactionCounts };
    
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    // Optionally handle 401 by resetting to guest?
  }
};

const updateProfile = async (data) => {
  try {
    // Optimistic update
    if (data.name) state.userInfo.name = data.name;
    if (data.sign) state.userInfo.sign = data.sign;
    if (data.avatar) state.userInfo.avatar = data.avatar;
    if (data.backgroundImage !== undefined) state.userInfo.backgroundImage = data.backgroundImage;
    if (data.gender) state.userInfo.gender = data.gender;

    // Call API
    await UserService.updateProfile(data);
    
    // Re-fetch to ensure sync (optional, but good for consistency)
    // await fetchProfile();
    
    return true;
  } catch (error) {
    console.error('Failed to update profile:', error);
    // Revert optimistic update if needed (complex, skipping for now)
    return false;
  }
};

const dailyCheckin = async () => {
  try {
    const result = await UserService.dailyCheckin();
    // Update local state with new points/exp
    state.wallet.points = result.points;
    state.userInfo.level = result.level;
    // You could also store exp if you track it in state
    return result;
  } catch (error) {
    throw error;
  }
};

export const useUserProfile = () => {
  return {
    userProfile: state,
    fetchProfile,
    updateProfile,
    dailyCheckin
  };
};
