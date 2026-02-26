import { reactive, computed } from 'vue';
import { AuthService } from '../services/api';

const state = reactive({
  isAuthenticated: false,
  user: null,
  verificationCode: null // Store the generated code for verification
});

// Initialize from localStorage
const storedToken = localStorage.getItem('auth_token');
const storedUser = localStorage.getItem('user_info');

if (storedToken && storedUser) {
  try {
    state.user = JSON.parse(storedUser);
    state.isAuthenticated = true;
  } catch (e) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
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
  // Client-side verification for demo code (in real app, code is verified by backend)
  if (!state.verificationCode || state.verificationCode !== code) {
    throw new Error('验证码错误');
  }

  // Call Backend API
  try {
    const response = await AuthService.register({ // Using register for demo to auto-create user
      email: phoneNumber + '@example.com', // Mock email
      password: 'password', // Mock password
      username: `用户${phoneNumber.slice(-4)}`
    });

    // Or try login if register fails (user exists)
    // For simplicity in this demo, we'll assume success or handle 400 in catch block
    
    handleAuthSuccess(response);
    return response.user;
  } catch (error) {
    console.log('Register failed, trying login...', error);
    // If user already exists, try login
    // Check for 400 status OR specific error message (backend returns 'User already exists')
    const isUserExistsError = 
      (error.response && error.response.status === 400) || 
      (error.message && (error.message.includes('exists') || error.message.includes('已存在')));

    if (isUserExistsError) {
       try {
         const loginResponse = await AuthService.login({
           email: phoneNumber + '@example.com',
           password: 'password'
         });
         handleAuthSuccess(loginResponse);
         return loginResponse.user;
       } catch (loginError) {
         console.error('Login fallback failed:', loginError);
         // If login fails (e.g. wrong password), throw clearer error
         if (loginError.response && loginError.response.status === 401) {
            throw new Error('账户已存在但密码不匹配，请联系管理员重置');
         }
         throw loginError;
       }
    }
    throw error;
  }
};

const handleAuthSuccess = (data) => {
  state.isAuthenticated = true;
  state.user = data.user;
  state.verificationCode = null;
  
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('user_info', JSON.stringify(data.user));
};

const logout = () => {
  state.isAuthenticated = false;
  state.user = null;
  state.verificationCode = null;
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
