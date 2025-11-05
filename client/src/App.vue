<template>
  <a-config-provider :theme="themeStore.antdTheme">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import { onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'

const themeStore = useThemeStore()
const authStore = useAuthStore()

const handleAuthUnauthorized = (event: CustomEvent) => {
  console.log('[App] Auth unauthorized event received:', event.detail)
  authStore.clearAuth()

  message.warning({
    content: event.detail?.message || '登录已过期，请重新登录',
    duration: 3
  })
}

onMounted(() => {
  themeStore.initTheme()

  window.addEventListener('auth:unauthorized', handleAuthUnauthorized as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('auth:unauthorized', handleAuthUnauthorized as EventListener)
})
</script>
