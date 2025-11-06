import './assets/main.css'
import 'tippy.js/dist/tippy.css'
import './assets/tippy-theme.css'

import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(Antd)
app.use(i18n)

const getPageTitle = (route?: RouteLocationNormalizedLoaded) => {
  const currentRoute = route ?? router.currentRoute.value
  const defaultTitle = i18n.global.t('app.title') as string

  if (!currentRoute) {
    return defaultTitle
  }

  const titleKey = currentRoute.meta?.titleKey as string | undefined
  if (titleKey && typeof i18n.global.te === 'function' && i18n.global.te(titleKey)) {
    const translated = i18n.global.t(titleKey) as string
    return `${translated} - ${defaultTitle}`
  }

  if (typeof currentRoute.meta?.title === 'string') {
    return `${currentRoute.meta.title} - ${defaultTitle}`
  }

  return defaultTitle
}

const updateDocumentTitle = (route?: RouteLocationNormalizedLoaded) => {
  document.title = getPageTitle(route)
}

router.afterEach((to) => {
  updateDocumentTitle(to)
})

watch(
  () => i18n.global.locale.value,
  () => {
    updateDocumentTitle()
  }
)

updateDocumentTitle()

// 过滤 Cloudflare Turnstile 内部请求的错误日志
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason
  const errorMessage = error?.message || ''
  const errorStack = error?.stack || ''

  // 检查是否是 Cloudflare Turnstile 相关的错误
  if (
    errorMessage.includes('challenges.cloudflare.com') ||
    errorMessage.includes('cdn-cgi/challenge-platform') ||
    errorStack.includes('challenges.cloudflare.com') ||
    errorStack.includes('turnstile')
  ) {
    // 阻止错误显示在控制台
    event.preventDefault()
    return
  }
})

// 过滤控制台中的网络错误
const originalConsoleError = console.error
console.error = function(...args) {
  const message = args.join(' ')

  // 过滤 Cloudflare Turnstile 相关的错误
  if (
    message.includes('challenges.cloudflare.com') ||
    message.includes('cdn-cgi/challenge-platform') ||
    message.includes('401') && message.includes('turnstile')
  ) {
    return
  }

  originalConsoleError.apply(console, args)
}

app.mount('#app')
