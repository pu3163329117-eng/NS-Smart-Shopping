import { reactive } from 'vue';
import { AuthService } from '../services/api';

const state = reactive({
  isAuthenticated: false,
  user: null
});

// Initialize from localStorage
const storedToken = localStorage.getItem('auth_token');
const storedUser = localStorage.getItem('user_info');

if (storedToken && storedUser) {
  try {
    if (storedUser === 'undefined' || storedUser === 'null') {
      throw new Error('Invalid user info string');
    }
    state.user = JSON.parse(storedUser);
    state.isAuthenticated = true;
  } catch (e) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
  }
} else if (storedToken || storedUser) {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
}

const RATE_LIMIT_MESSAGE = '您发送得太频繁了，喝口水休息一下吧（请等待60秒）';

const extractAuthPayload = (response, phoneNumber = '') => {
  const token =
    response?.token ||
    response?.accessToken ||
    response?.jwt ||
    response?.data?.token ||
    response?.data?.accessToken ||
    response?.data?.jwt;

  const user =
    response?.user ||
    response?.profile ||
    response?.data?.user ||
    response?.data?.profile ||
    (phoneNumber ? { phone: phoneNumber, username: `用户${String(phoneNumber).slice(-4)}` } : null);

  return { token, user };
};

const toFriendlyError = (error, fallbackMessage) => {
  const status = Number(error?.status || error?.response?.status || 0);
  if (status === 429) {
    const rateLimitError = new Error(RATE_LIMIT_MESSAGE);
    rateLimitError.status = 429;
    throw rateLimitError;
  }

  if (error?.message) {
    throw error;
  }

  throw new Error(fallbackMessage);
};

const sendCode = async (phoneNumber) => {
  try {
    return await AuthService.sendCode({ phone: phoneNumber });
  } catch (error) {
    toFriendlyError(error, '验证码发送失败');
  }
};

const login = async (phoneNumber, code) => {
  try {
    const response = await AuthService.loginWithCode({
      phone: phoneNumber,
      code
    });

    handleAuthSuccess(response, phoneNumber);
    return state.user;
  } catch (error) {
    toFriendlyError(error, '登录失败');
  }
};

const handleAuthSuccess = (data, phoneNumber = '') => {
  const { token, user } = extractAuthPayload(data, phoneNumber);
  if (!token) {
    throw new Error('登录响应缺少 token');
  }

  state.isAuthenticated = true;
  state.user = user;
  
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user_info', JSON.stringify(user || {}));
};

const logout = () => {
  state.isAuthenticated = false;
  state.user = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
};

export const useAuth = () => {
  return {
    auth: state,
    login,
    logout,
    sendCode
  };
};
