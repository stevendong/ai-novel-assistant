<template>
  <a-config-provider :theme="themeStore.antdTheme">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import { onMounted } from 'vue'

const themeStore = useThemeStore()

onMounted(() => {
  themeStore.initTheme()
})
</script>
