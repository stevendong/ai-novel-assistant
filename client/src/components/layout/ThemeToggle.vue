<template>
  <a-tooltip :title="getTooltipText" :mouseEnterDelay="0.5">
    <a-button
      type="text"
      class="header-action-btn theme-toggle"
      :class="getThemeClass"
      @click="handleThemeToggle"
    >
      <template #icon>
        <component :is="getCurrentIcon" class="theme-icon" />
      </template>
    </a-button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore, type ThemeSetting } from '@/stores/theme'
import { SyncOutlined } from '@ant-design/icons-vue'
import SunIcon from '@/components/icons/SunIcon.vue'
import MoonIcon from '@/components/icons/MoonIcon.vue'

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
      return SyncOutlined  // 同步图标表示跟随系统
    default:
      return SunIcon
  }
})

// 获取主题类名
const getThemeClass = computed(() => {
  return `theme-mode-${themeStore.themeSetting}`
})

// 获取工具提示文本 - 显示当前状态和下一个状态
const getTooltipText = computed(() => {
  const currentText = getThemeText(themeStore.themeSetting)
  const nextTheme = getNextTheme()
  const nextThemeText = getThemeText(nextTheme)
  return `当前：${currentText}\n点击切换至：${nextThemeText}`
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
      return '亮色主题 ☀️'
    case 'dark':
      return '暗色主题 🌙'
    case 'system':
      return '跟随系统 🔄'
    default:
      return '主题设置'
  }
}

// 处理主题切换
const handleThemeToggle = () => {
  const nextTheme = getNextTheme()

  // 添加切换动画反馈
  const button = document.querySelector('.theme-toggle')
  if (button) {
    button.classList.add('theme-switching')
    setTimeout(() => {
      button.classList.remove('theme-switching')
    }, 500)
  }

  themeStore.setThemeSetting(nextTheme)
}
</script>

<style scoped>
/* 主题切换按钮基础样式 */
.theme-toggle {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px !important;
  overflow: visible;
  z-index: 1;
}

/* 亮色主题样式 */
.theme-toggle.theme-mode-light {
  color: #faad14;
}

.theme-toggle.theme-mode-light::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg,
    rgba(250, 173, 20, 0.08) 0%,
    rgba(255, 193, 7, 0.12) 50%,
    rgba(250, 173, 20, 0.08) 100%);
  border-radius: 8px;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
}

.theme-toggle.theme-mode-light:hover::before {
  opacity: 1;
  transform: scale(1);
}

.theme-toggle.theme-mode-light:hover {
  color: #faad14 !important;
  background-color: transparent !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(250, 173, 20, 0.2);
}

.theme-toggle.theme-mode-light:hover .theme-icon {
  transform: rotate(90deg) scale(1.15);
  filter: drop-shadow(0 2px 6px rgba(250, 173, 20, 0.4));
}

/* 暗色主题样式 */
.theme-toggle.theme-mode-dark {
  color: #7c6cff;
}

.theme-toggle.theme-mode-dark::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg,
    rgba(124, 108, 255, 0.08) 0%,
    rgba(124, 77, 255, 0.12) 50%,
    rgba(124, 108, 255, 0.08) 100%);
  border-radius: 8px;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
}

.theme-toggle.theme-mode-dark:hover::before {
  opacity: 1;
  transform: scale(1);
}

.theme-toggle.theme-mode-dark:hover {
  color: #7c6cff !important;
  background-color: transparent !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 108, 255, 0.3);
}

.theme-toggle.theme-mode-dark:hover .theme-icon {
  transform: rotate(-30deg) scale(1.15);
  filter: drop-shadow(0 2px 6px rgba(124, 108, 255, 0.5));
}

/* 系统主题样式 */
.theme-toggle.theme-mode-system {
  color: #13c2c2;
}

.theme-toggle.theme-mode-system::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg,
    rgba(19, 194, 194, 0.08) 0%,
    rgba(19, 194, 194, 0.12) 50%,
    rgba(19, 194, 194, 0.08) 100%);
  border-radius: 8px;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
}

.theme-toggle.theme-mode-system:hover::before {
  opacity: 1;
  transform: scale(1);
}

.theme-toggle.theme-mode-system:hover {
  color: #13c2c2 !important;
  background-color: transparent !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(19, 194, 194, 0.3);
}

.theme-toggle.theme-mode-system:hover .theme-icon {
  animation: syncRotate 1s linear infinite;
  filter: drop-shadow(0 2px 6px rgba(19, 194, 194, 0.5));
}

/* 图标基础动画 */
.theme-icon {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
  display: inline-block;
}

/* 主题切换中的动画 */
.theme-toggle.theme-switching {
  animation: themeSwitching 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-toggle.theme-switching .theme-icon {
  animation: themeSwitchingIcon 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 切换动画 - 按钮 */
@keyframes themeSwitching {
  0% { transform: scale(1) rotate(0deg); }
  20% {
    transform: scale(1.15) rotate(5deg);
  }
  40% {
    transform: scale(0.95) rotate(-3deg);
  }
  60% { transform: scale(1.05) rotate(2deg); }
  80% { transform: scale(0.98) rotate(-1deg); }
  100% { transform: scale(1) rotate(0deg); }
}

/* 切换动画 - 图标 */
@keyframes themeSwitchingIcon {
  0% {
    transform: rotate(0deg) scale(1);
    opacity: 1;
  }
  50% {
    transform: rotate(180deg) scale(0.3);
    opacity: 0.3;
  }
  100% {
    transform: rotate(360deg) scale(1);
    opacity: 1;
  }
}

/* 同步图标旋转动画 */
@keyframes syncRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 焦点状态 */
.theme-toggle:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
  opacity: 0.6;
}

/* 触觉反馈增强 */
@media (hover: hover) {
  .theme-toggle:active {
    transform: scale(0.92);
    transition-duration: 0.1s;
  }
}

/* 高对比度模式适配 */
@media (prefers-contrast: high) {
  .theme-toggle {
    border: 1px solid currentColor;
  }

  .theme-toggle::before {
    display: none;
  }
}

/* 减少动画偏好适配 */
@media (prefers-reduced-motion: reduce) {
  .theme-toggle,
  .theme-icon {
    transition: none !important;
    animation: none !important;
  }

  .theme-toggle:hover .theme-icon {
    transform: none !important;
    animation: none !important;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .theme-toggle:hover {
    transform: none;
    box-shadow: none;
  }

  .theme-toggle:hover .theme-icon {
    transform: scale(1.05);
  }
}

/* 移动端触摸反馈 */
@media (hover: none) and (pointer: coarse) {
  .theme-toggle:active {
    transform: scale(0.95);
  }
}
</style>
