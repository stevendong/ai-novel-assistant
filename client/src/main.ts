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

app.mount('#app')
