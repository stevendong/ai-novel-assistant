<template>
  <button
    class="theme-toggle-btn"
    :class="getThemeClass"
    @click="handleThemeToggle"
    :aria-label="getAriaLabel"
  >
    <component :is="getCurrentIcon" class="theme-icon" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore, type ThemeSetting } from '@/stores/theme'
import SunIcon from '@/components/icons/SunIcon.vue'
import MoonIcon from '@/components/icons/MoonIcon.vue'
import SystemIcon from '@/components/icons/SystemIcon.vue'

const themeStore = useThemeStore()

// 主题切换顺序：light -> dark -> system -> light
const themeOrder: ThemeSetting[] = ['light', 'dark', 'system']

// 获取当前图标 - 使用更直观的图标
const getCurrentIcon = computed(() => {
  switch (themeStore.themeSetting) {
    case 'light':
      return SunIcon       // 太阳图标表示亮色
    case 'dark':
      return MoonIcon      // 月亮图标表示暗色
    case 'system':
      return SystemIcon    // 显示器图标表示跟随系统
    default:
      return SunIcon
  }
})

// 获取主题类名
const getThemeClass = computed(() => {
  return `theme-mode-${themeStore.themeSetting}`
})

// 获取无障碍标签
const getAriaLabel = computed(() => {
  return getThemeText(themeStore.themeSetting)
})

// 获取下一个主题
const getNextTheme = (): ThemeSetting => {
  const currentIndex = themeOrder.indexOf(themeStore.themeSetting)
  const nextIndex = (currentIndex + 1) % themeOrder.length
  return themeOrder[nextIndex]
}

// 获取主题名称文本
const getThemeText = (theme: ThemeSetting): string => {
  switch (theme) {
    case 'light':
      return '亮色主题'
    case 'dark':
      return '暗色主题'
    case 'system':
      return '跟随系统'
    default:
      return '主题设置'
  }
}

// 处理主题切换
const handleThemeToggle = () => {
  const nextTheme = getNextTheme()
  themeStore.setThemeSetting(nextTheme)
}
</script>

<style scoped>
/* 主题切换按钮基础样式 */
.theme-toggle-btn {
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid;
  border-color: var(--theme-border, rgba(0, 0, 0, 0.1));
  background: transparent;
  color: currentColor;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 35px;
  min-height: 35px;
}

.theme-toggle-btn:hover {
  background: var(--theme-bg-hover, rgba(0, 0, 0, 0.05));
  transform: translateY(-1px);
}

.theme-toggle-btn:active {
  transform: translateY(0);
}

/* 图标基础样式 */
.theme-icon {
  display: inline-block;
  width: 1.25rem;
  height: 1.25rem;
  transition: transform 0.3s ease;
}

/* 亮色主题 - 太阳图标 */
.theme-toggle-btn.theme-mode-light {
  color: #faad14;
  border-color: rgba(250, 173, 20, 0.3);
}

.theme-toggle-btn.theme-mode-light:hover {
  border-color: #faad14;
  background: rgba(250, 173, 20, 0.08);
}

.theme-toggle-btn.theme-mode-light:hover .theme-icon {
  transform: rotate(90deg);
}

/* 暗色主题 - 月亮图标 */
.theme-toggle-btn.theme-mode-dark {
  color: #7c6cff;
  border-color: rgba(124, 108, 255, 0.3);
}

.theme-toggle-btn.theme-mode-dark:hover {
  border-color: #7c6cff;
  background: rgba(124, 108, 255, 0.08);
}

.theme-toggle-btn.theme-mode-dark:hover .theme-icon {
  transform: rotate(-30deg);
}

/* 系统主题 - 显示器图标 */
.theme-toggle-btn.theme-mode-system {
  color: #13c2c2;
  border-color: rgba(19, 194, 194, 0.3);
}

.theme-toggle-btn.theme-mode-system:hover {
  border-color: #13c2c2;
  background: rgba(19, 194, 194, 0.08);
}

.theme-toggle-btn.theme-mode-system:hover .theme-icon {
  transform: scale(1.1);
}

/* 焦点状态 */
.theme-toggle-btn:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* 暗色模式适配 */
:global(.dark) .theme-toggle-btn {
  border-color: rgba(255, 255, 255, 0.2);
}

:global(.dark) .theme-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* 减少动画偏好适配 */
@media (prefers-reduced-motion: reduce) {
  .theme-toggle-btn,
  .theme-icon {
    transition: none !important;
  }

  .theme-toggle-btn:hover .theme-icon {
    transform: none !important;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .theme-toggle-btn {
    padding: 0.4rem;
    min-width: 36px;
    min-height: 36px;
  }

  .theme-icon {
    width: 1.125rem;
    height: 1.125rem;
  }

  .theme-toggle-btn:hover {
    transform: none;
  }
}
</style>
