import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import { clerkPlugin } from '@clerk/vue'

import App from './App.vue'
import router from './router'
import i18n from './i18n'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key')
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(clerkPlugin, {
  publishableKey: CLERK_PUBLISHABLE_KEY
})
app.use(router)
app.use(Antd)
app.use(i18n)

// 初始化认证 store - 使用 Clerk
import { useClerkAuthStore } from './stores/clerkAuth'
const authStore = useClerkAuthStore()
authStore.init()

app.mount('#app')
