<template>
  <a-tooltip :title="getTooltipText">
    <a-button
      type="text"
      class="header-action-btn theme-toggle"
      @click="handleThemeToggle"
    >
      <template #icon>
        <component :is="getCurrentIcon" />
      </template>
    </a-button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore, type ThemeSetting } from '@/stores/theme'
import {
  BulbOutlined,
  BulbFilled,
  SettingOutlined
} from '@ant-design/icons-vue'

const themeStore = useThemeStore()

// 主题切换顺序：light -> dark -> system -> light
const themeOrder: ThemeSetting[] = ['light', 'dark', 'system']

// 获取当前图标
const getCurrentIcon = computed(() => {
  if (themeStore.themeSetting === 'system') {
    return SettingOutlined
  }
  return themeStore.isDark ? BulbOutlined : BulbFilled
})

// 获取工具提示文本
const getTooltipText = computed(() => {
  const nextTheme = getNextTheme()
  const nextThemeText = getThemeText(nextTheme)
  return `点击切换至：${nextThemeText}`
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
  
  // 添加切换动画反馈
  const button = document.querySelector('.theme-toggle')
  if (button) {
    button.classList.add('theme-switching')
    setTimeout(() => {
      button.classList.remove('theme-switching')
    }, 600)
  }
  
  themeStore.setThemeSetting(nextTheme)
}
</script>

<style scoped>
/* 主题切换按钮样式 */
.theme-toggle {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px !important;
  overflow: hidden;
  z-index: 1;
}

.theme-toggle::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(250, 219, 20, 0.1) 0%, 
    rgba(255, 193, 7, 0.15) 50%, 
    rgba(250, 219, 20, 0.1) 100%);
  border-radius: 8px;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
}

.theme-toggle:hover::before {
  opacity: 1;
  transform: scale(1);
}

.theme-toggle:hover {
  color: #fadb14 !important;
  background-color: transparent !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(250, 219, 20, 0.2);
}

/* 图标动画 */
.theme-toggle :deep(.anticon) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
}

.theme-toggle:hover :deep(.anticon) {
  transform: rotate(10deg) scale(1.1);
  filter: drop-shadow(0 2px 4px rgba(250, 219, 20, 0.3));
}

/* 主题切换中的动画 */
.theme-toggle.theme-switching {
  animation: themeSwitching 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-toggle.theme-switching :deep(.anticon) {
  animation: themeSwitchingIcon 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes themeSwitching {
  0% { transform: scale(1); }
  25% { 
    transform: scale(1.2) rotate(15deg); 
    box-shadow: 0 4px 16px rgba(250, 219, 20, 0.4);
  }
  50% { 
    transform: scale(0.9) rotate(-5deg); 
    filter: brightness(1.3);
  }
  75% { transform: scale(1.1) rotate(3deg); }
  100% { transform: scale(1) rotate(0deg); }
}

@keyframes themeSwitchingIcon {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(180deg) scale(1.3); }
  50% { transform: rotate(270deg) scale(0.7); }
  75% { transform: rotate(350deg) scale(1.2); }
  100% { transform: rotate(360deg) scale(1); }
}

/* 焦点状态 */
.theme-toggle:focus-visible {
  outline: 2px solid rgba(250, 219, 20, 0.4);
  outline-offset: 2px;
}

/* 触觉反馈增强 */
@media (hover: hover) {
  .theme-toggle:active {
    transform: scale(0.95);
    transition-duration: 0.1s;
  }
}

/* 高对比度模式适配 */
@media (prefers-contrast: high) {
  .theme-toggle {
    border: 1px solid currentColor;
  }
}

/* 减少动画偏好适配 */
@media (prefers-reduced-motion: reduce) {
  .theme-toggle,
  .theme-toggle :deep(.anticon) {
    transition: none !important;
    animation: none !important;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .theme-toggle:hover {
    transform: none;
    box-shadow: none;
  }
}
</style>
