import { reactive } from 'vue';
import { UserService } from '../services/api';

// Initial default state (real-data empty state)
const initialState = {
  userInfo: {
    name: '',
    id: '',
    gender: '',
    level: 1,
    reputation: '',
    sign: '',
    isVerified: false,
    avatar: '',
    backgroundImage: null
  },
  stats: {
    likes: 0,
    following: 0,
    followers: 0
  },
  wallet: {
    coupons: 0,
    balance: 0,
    points: 0
  },
  transactions: [],
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
      name: profile.username || profile.name || '',
      id: profile.id || '',
      gender: profile.gender || '',
      level: profile.level ?? 1,
      reputation: profile.reputation || '',
      sign: profile.sign || '',
      isVerified: Boolean(profile.isVerified),
      avatar: profile.avatar || '',
      backgroundImage: profile.backgroundImage || null
    };

    state.stats = { ...initialState.stats, ...(profile.stats || {}) };
    state.wallet = { ...initialState.wallet, ...(profile.wallet || {}) };
    state.transactions = Array.isArray(profile.transactions) ? profile.transactions : [];
    state.interactionCounts = {
      ...initialState.interactionCounts,
      ...(profile.interactionCounts || {})
    };
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    state.stats = { ...initialState.stats };
    state.wallet = { ...initialState.wallet };
    state.transactions = [];
    state.interactionCounts = { ...initialState.interactionCounts };
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
    return true;
  } catch (error) {
    console.error('Failed to update profile:', error);
    return false;
  }
};

const dailyCheckin = async () => {
  try {
    const result = await UserService.dailyCheckin();
    state.wallet.points = result.points;
    state.userInfo.level = result.level;
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
