<template>
  <a-dropdown
    :trigger="['click']"
    placement="bottomRight"
    @visible-change="handleVisibleChange"
  >
    <a-tooltip :title="getTooltipText">
      <a-button
        type="text"
        class="header-action-btn theme-toggle"
        :class="{ 'active': dropdownVisible }"
      >
        <template #icon>
          <component :is="getCurrentIcon" />
        </template>
      </a-button>
    </a-tooltip>

    <template #overlay>
      <a-menu
        class="theme-menu"
        :selected-keys="[themeStore.themeSetting]"
        @click="handleThemeChange"
      >
        <a-menu-item key="light" class="theme-menu-item">
          <div class="theme-option">
            <BulbFilled class="theme-icon" />
            <div class="theme-info">
              <span class="theme-name">亮色主题</span>
              <span class="theme-description">始终使用亮色外观</span>
            </div>
            <CheckOutlined v-if="themeStore.themeSetting === 'light'" class="check-icon" />
          </div>
        </a-menu-item>

        <a-menu-item key="dark" class="theme-menu-item">
          <div class="theme-option">
            <BulbOutlined class="theme-icon" />
            <div class="theme-info">
              <span class="theme-name">暗色主题</span>
              <span class="theme-description">始终使用暗色外观</span>
            </div>
            <CheckOutlined v-if="themeStore.themeSetting === 'dark'" class="check-icon" />
          </div>
        </a-menu-item>

        <a-menu-divider />

        <a-menu-item key="system" class="theme-menu-item">
          <div class="theme-option">
            <SettingOutlined class="theme-icon" />
            <div class="theme-info">
              <span class="theme-name">跟随系统</span>
              <span class="theme-description">
                跟随系统外观设置
                <span class="system-status">(当前: {{ systemThemeText }})</span>
              </span>
            </div>
            <CheckOutlined v-if="themeStore.themeSetting === 'system'" class="check-icon" />
          </div>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useThemeStore, type ThemeSetting } from '@/stores/theme'
import {
  BulbOutlined,
  BulbFilled,
  SettingOutlined,
  CheckOutlined
} from '@ant-design/icons-vue'

const themeStore = useThemeStore()
const dropdownVisible = ref(false)

// 获取当前图标
const getCurrentIcon = computed(() => {
  if (themeStore.themeSetting === 'system') {
    return SettingOutlined
  }
  return themeStore.isDark ? BulbOutlined : BulbFilled
})

// 获取工具提示文本
const getTooltipText = computed(() => {
  switch (themeStore.themeSetting) {
    case 'light':
      return '当前：亮色主题'
    case 'dark':
      return '当前：暗色主题'
    case 'system':
      return `当前：跟随系统 (${systemThemeText.value})`
    default:
      return '主题设置'
  }
})

// 获取系统主题状态文本
const systemThemeText = computed(() => {
  const systemTheme = themeStore.getSystemTheme()
  return systemTheme === 'dark' ? '暗色' : '亮色'
})

// 处理下拉菜单显示状态变化
const handleVisibleChange = (visible: boolean) => {
  dropdownVisible.value = visible
}

// 处理主题切换
const handleThemeChange = ({ key }: { key: string }) => {
  themeStore.setThemeSetting(key as ThemeSetting)
  dropdownVisible.value = false
}
</script>

<style scoped>
/* 主题切换按钮样式 */
.theme-toggle {
  position: relative;
  transition: all 0.2s ease;
}

.theme-toggle:hover {
  color: #fadb14 !important;
  background-color: rgba(250, 219, 20, 0.1) !important;
}

.theme-toggle.active {
  color: #fadb14 !important;
  background-color: rgba(250, 219, 20, 0.1) !important;
}

/* 主题菜单样式 */
.theme-menu {
  min-width: 280px;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  padding: 8px 0;
}

.theme-menu :deep(.ant-dropdown-menu-item) {
  padding: 0;
  margin: 0;
}

.theme-menu-item {
  padding: 12px 16px !important;
  margin: 0 !important;
  line-height: 1.5;
}

.theme-menu-item:hover {
  background-color: var(--theme-bg-elevated);
}

.theme-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  cursor: pointer;
}

.theme-icon {
  font-size: 16px;
  color: var(--theme-text-secondary);
  margin-top: 2px;
  flex-shrink: 0;
  transition: color 0.3s ease;
}

.theme-menu-item:hover .theme-icon {
  color: #1890ff;
}

.theme-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.theme-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--theme-text);
  transition: color 0.3s ease;
}

.theme-description {
  font-size: 12px;
  color: var(--theme-text-secondary);
  line-height: 1.4;
  transition: color 0.3s ease;
}

.system-status {
  color: #1890ff;
  font-weight: 500;
}

.check-icon {
  font-size: 16px;
  color: #1890ff;
  margin-top: 2px;
  flex-shrink: 0;
}

/* 选中状态样式 */
.theme-menu :deep(.ant-dropdown-menu-item-selected) {
  background-color: var(--theme-selected-bg) !important;
}

.theme-menu :deep(.ant-dropdown-menu-item-selected) .theme-option {
  color: var(--theme-text);
}

.theme-menu :deep(.ant-dropdown-menu-item-selected) .theme-icon {
  color: #1890ff !important;
}

.theme-menu :deep(.ant-dropdown-menu-item-selected) .theme-name {
  color: var(--theme-text) !important;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .theme-menu {
    min-width: 260px;
  }
  
  .theme-option {
    gap: 10px;
  }
  
  .theme-name {
    font-size: 13px;
  }
  
  .theme-description {
    font-size: 11px;
  }
}
</style>
