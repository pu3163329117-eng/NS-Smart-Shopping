import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Raise warning threshold to avoid noise — real chunks are split below
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Vendor: Vue ecosystem ──
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/vue-i18n') || id.includes('node_modules/pinia')) {
            return 'vendor-vue'
          }

          // ── Vendor: Animation / 3D (heavy) ──
          if (id.includes('node_modules/gsap')) return 'vendor-gsap'
          if (id.includes('node_modules/three')) return 'vendor-three'

          // ── Vendor: Charts ──
          if (id.includes('node_modules/echarts') || id.includes('node_modules/vue-echarts') || id.includes('node_modules/zrender')) {
            return 'vendor-charts'
          }

          // ── Vendor: Utilities ──
          if (id.includes('node_modules/axios') || id.includes('node_modules/lodash')) return 'vendor-utils'

          // ── App: Gushi Market (large feature module) ──
          if (id.includes('/views/Gushi') || id.includes('/views/gushi')) return 'feature-gushi'

          // ── App: AILab / Workspace ──
          if (id.includes('/views/AILab') || id.includes('/views/AILabWorkspace') || id.includes('/views/maker')) return 'feature-ailab'

          // ── App: Admin / DataCenter ──
          if (id.includes('/views/DataCenter') || id.includes('/views/admin') || id.includes('/views/InvestorDashboard')) return 'feature-admin'

          // ── App: Social / Crowdfunding ──
          if (id.includes('/views/Social') || id.includes('/views/Crowdfunding')) return 'feature-social'
        }
      }
    }
  }
})
