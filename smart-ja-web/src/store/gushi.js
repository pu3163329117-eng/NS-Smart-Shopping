import { defineStore } from 'pinia';
import { GushiService } from '../services/api';

export const useGushiStore = defineStore('gushi', {
  state: () => ({
    homeData: { hotProducts: [], latestTrades: [] },
    productMap: {},
    myListings: [],
    myOrders: [],
    myFavorites: [],
    loadingStates: {
      home: false,
      productDetail: false,
      myCabinet: false,
      action: false
    }
  }),
  actions: {
    async loadHome() {
      this.loadingStates.home = true;
      try {
        const res = await GushiService.getHome();
        if (res.success) Object.assign(this.homeData, res.data);
      } catch (err) {
        console.error('Failed to load Gushi Home', err);
      } finally {
        this.loadingStates.home = false;
      }
    },
    async loadProduct(productId) {
      this.loadingStates.productDetail = true;
      try {
        const res = await GushiService.getProductById(productId);
        if (res.success) {
          // ensure reactivity for product map
          this.productMap = { ...this.productMap, [productId]: res.data };
          return res.data;
        }
      } catch(err) {
        console.error('Failed to load Gushi Product', err);
      } finally {
        this.loadingStates.productDetail = false;
      }
    },
    async createListing(payload) {
      this.loadingStates.action = true;
      try {
        return await GushiService.createListing(payload);
      } finally {
        this.loadingStates.action = false;
      }
    },
    async createOrder(payload) {
      this.loadingStates.action = true;
      try {
        return await GushiService.createOrder(payload);
      } finally {
        this.loadingStates.action = false;
      }
    },
    async loadMyCabinet() {
      this.loadingStates.myCabinet = true;
      try {
        const [listingsRes, ordersRes, favRes] = await Promise.all([
          GushiService.getMyListings(),
          GushiService.getMyOrders({}),
          GushiService.getMyFavorites()
        ]);
        if (listingsRes.success) this.myListings = listingsRes.data || [];
        if (ordersRes.success) this.myOrders = ordersRes.data || [];
        if (favRes.success) this.myFavorites = favRes.data || [];
      } catch (err) {
        console.error('Failed to load Gushi Cabinet', err);
      } finally {
        this.loadingStates.myCabinet = false;
      }
    }
  }
});
