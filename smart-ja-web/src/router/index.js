import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import About from '../views/About.vue';
import Login from '../views/Login.vue';
import Crowdfunding from '../views/Crowdfunding.vue';
import Market from '../views/Market.vue';
import Social from '../views/Social.vue';
import UserProfile from '../views/UserProfile.vue';
import Wallet from '../views/Wallet.vue';
import Settings from '../views/Settings.vue';
import ProductDetail from '../views/ProductDetail.vue';
import Checkout from '../views/Checkout.vue';
import DataCenter from '../views/DataCenter.vue';
import AILab from '../views/AILab.vue';
import AILabWorkspace from '../views/AILabWorkspace.vue';
import InvestorDashboard from '../views/InvestorDashboard.vue';
import HelpCenter from '../views/HelpCenter.vue';
import Terms from '../views/Terms.vue';
import Privacy from '../views/Privacy.vue';
import MakerLayout from '../layouts/MakerLayout.vue';
import MakerDashboard from '../views/maker/MakerDashboard.vue';
import MakerServices from '../views/maker/MakerServices.vue';
import MakerOrders from '../views/maker/MakerOrders.vue';
import MakerWallet from '../views/maker/MakerWallet.vue';
import AdminAudit from '../views/admin/AdminAudit.vue';

// Gushi Market
import GushiHome from '../views/GushiHome.vue';
import GushiDetail from '../views/GushiDetail.vue';
import GushiSell from '../views/GushiSell.vue';
import GushiCabinet from '../views/GushiCabinet.vue';
import GushiOrderDetail from '../views/GushiOrderDetail.vue';
import GushiExplore from '../views/GushiExplore.vue';
import GushiRequestProduct from '../views/GushiRequestProduct.vue';
import GushiNotifications from '../views/GushiNotifications.vue';

const routes = [
  // ... existing routes ...
  {
    path: '/admin/audit',
    name: 'AdminAudit',
    component: AdminAudit,
    meta: { requiresAuth: true, isAdmin: true } // In real app, check role
  },
  {
    path: '/maker',
    component: MakerLayout,
    redirect: '/maker/dashboard',
    children: [
      { path: 'dashboard', name: 'MakerDashboard', component: MakerDashboard },
      { path: 'services', name: 'MakerServices', component: MakerServices },
      { path: 'orders', name: 'MakerOrders', component: MakerOrders },
      { path: 'wallet', name: 'MakerWallet', component: MakerWallet },
    ]
  },
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/market',
    name: 'Market',
    component: Market
  },
  {
    path: '/social',
    name: 'Social',
    component: Social
  },
  {
    path: '/profile',
    name: 'Profile',
    component: UserProfile
  },
  {
    path: '/wallet',
    name: 'Wallet',
    component: Wallet,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: ProductDetail
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: Checkout,
    meta: { requiresAuth: true }
  },
  {
    path: '/about',
    name: 'About',
    component: About
  },
  {
    path: '/crowdfunding',
    name: 'Crowdfunding',
    component: Crowdfunding
  },
  {
    path: '/data-center',
    name: 'DataCenter',
    component: DataCenter
  },
  {
    path: '/investor-dashboard',
    name: 'InvestorDashboard',
    component: InvestorDashboard,
    meta: { requiresAuth: true, isAdmin: true }
  },
  {
    path: '/ai-lab',
    name: 'AILab',
    component: AILab
  },
  {
    path: '/ailab',
    name: 'AILabWorkspace',
    component: AILabWorkspace,
    meta: { requiresAuth: true }
  },
  {
    path: '/help',
    name: 'HelpCenter',
    component: HelpCenter
  },
  {
    path: '/terms',
    name: 'Terms',
    component: Terms
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: Privacy
  },
  { path: '/gushi', name: 'GushiHome', component: GushiHome },
  { path: '/gushi/market', name: 'GushiExplore', component: GushiExplore },
  { path: '/gushi/sell', name: 'GushiSell', component: GushiSell, meta: { requiresAuth: true } },
  { path: '/gushi/request-product', name: 'GushiRequestProduct', component: GushiRequestProduct, meta: { requiresAuth: true } },
  { path: '/gushi/my', name: 'GushiCabinet', component: GushiCabinet, meta: { requiresAuth: true } },
  { path: '/gushi/notifications', name: 'GushiNotifications', component: GushiNotifications, meta: { requiresAuth: true } },
  { path: '/gushi/orders/:id', name: 'GushiOrderDetail', component: GushiOrderDetail, meta: { requiresAuth: true } },
  { path: '/gushi/:productId', name: 'GushiDetail', component: GushiDetail }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 };
  }
});

import { useAuth } from '../store/auth';

router.beforeEach((to, from, next) => {
  const { auth } = useAuth();
  
  const requiresAuth = to.meta.requiresAuth || to.meta.isAdmin;
  
  if (requiresAuth && !auth.isAuthenticated) {
    return next({
      path: '/login',
      query: { redirect: to.fullPath }
    });
  }

  if (to.meta.isAdmin && auth.isAuthenticated) {
    let user = auth.user;
    if (!user) {
      try {
        const stored = localStorage.getItem('user_info');
        if (stored && stored !== 'undefined' && stored !== 'null') {
          user = JSON.parse(stored);
        }
      } catch (e) {}
    }

    if (user) {
      if (user.isAdmin === true || user.role === 'admin') {
        return next();
      }
      
      const definitelyNotAdmin = user.isAdmin === false || (typeof user.role === 'string' && user.role !== 'admin');
      
      if (definitelyNotAdmin) {
        return next('/');
      }
    }
  }

  next();
});

export default router;
