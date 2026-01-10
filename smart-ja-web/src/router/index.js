import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import About from '../views/About.vue';
import Login from '../views/Login.vue';
import Crowdfunding from '../views/Crowdfunding.vue';
import Market from '../views/Market.vue';
import Social from '../views/Social.vue';
import UserProfile from '../views/UserProfile.vue';
import Settings from '../views/Settings.vue';
import ProductDetail from '../views/ProductDetail.vue';
import DataCenter from '../views/DataCenter.vue';
import AILab from '../views/AILab.vue';
import HelpCenter from '../views/HelpCenter.vue';
import Terms from '../views/Terms.vue';
import Privacy from '../views/Privacy.vue';

const routes = [
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
    path: '/ai-lab',
    name: 'AILab',
    component: AILab
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
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 };
  }
});

export default router;
