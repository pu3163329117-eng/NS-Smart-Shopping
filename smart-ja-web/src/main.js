import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import i18n from './locales'
import './style.css'
import App from './App.vue'
import { useAppTheme } from './store/appConfig'

const pinia = createPinia()
const app = createApp(App)
const { initTheme } = useAppTheme()

initTheme()

app.use(pinia)
app.use(router)
app.use(i18n)
app.mount('#app')
