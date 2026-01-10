import { reactive, computed } from 'vue';

const state = reactive({
  isAuthenticated: false,
  user: null,
  verificationCode: null // Store the generated code for verification
});

// Initialize from localStorage
const storedUser = localStorage.getItem('ja_user');
if (storedUser) {
  try {
    state.user = JSON.parse(storedUser);
    state.isAuthenticated = true;
  } catch (e) {
    localStorage.removeItem('ja_user');
  }
}

const sendCode = async (phoneNumber) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Generate a random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      state.verificationCode = code;
      resolve(code);
    }, 1000);
  });
};

const login = async (phoneNumber, code) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!state.verificationCode || state.verificationCode !== code) {
        reject(new Error('验证码错误'));
        return;
      }

      // Mock user data
      const user = {
        phone: phoneNumber,
        name: `用户${phoneNumber.slice(-4)}`,
        id: Date.now().toString(),
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + phoneNumber
      };
      
      state.isAuthenticated = true;
      state.user = user;
      state.verificationCode = null; // Clear code after successful login
      
      localStorage.setItem('ja_user', JSON.stringify(user));
      resolve(user);
    }, 500);
  });
};

const logout = () => {
  state.isAuthenticated = false;
  state.user = null;
  state.verificationCode = null;
  localStorage.removeItem('ja_user');
};

export const useAuth = () => {
  return {
    auth: state,
    login,
    logout,
    sendCode
  };
};
