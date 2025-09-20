<template>
  <a-dropdown placement="bottomRight">
    <a-button
      type="text"
      class="header-action-btn language-toggle-btn"
      data-button-type="language"
    >
      <template #icon>
        <GlobalOutlined data-icon="language" />
      </template>
      <span class="language-label">{{ getCurrentLanguageLabel() }}</span>
    </a-button>

    <template #overlay>
      <a-menu
        @click="handleLanguageChange"
        :selected-keys="[currentLanguage]"
        class="language-dropdown-menu"
      >
        <a-menu-item key="zh">
          <div class="language-option">
            <span class="language-flag">🇨🇳</span>
            <span>{{ $t('language.chinese') }}</span>
          </div>
        </a-menu-item>
        <a-menu-item key="en">
          <div class="language-option">
            <span class="language-flag">🇺🇸</span>
            <span>{{ $t('language.english') }}</span>
          </div>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { GlobalOutlined } from '@ant-design/icons-vue'
import { setLocale, getCurrentLocale } from '@/i18n'

const { t } = useI18n()

const currentLanguage = computed(() => getCurrentLocale())

const getCurrentLanguageLabel = () => {
  const locale = currentLanguage.value
  return locale === 'zh' ? '中文' : 'English'
}

const handleLanguageChange = ({ key }: { key: string }) => {
  setLocale(key)
}
</script>

<style scoped>
/* 语言切换按钮 */
.language-toggle-btn {
  min-width: 60px !important;
  justify-content: center !important;
  gap: 6px !important;
  background: linear-gradient(135deg,
    rgba(59, 130, 246, 0.05) 0%,
    rgba(37, 99, 235, 0.08) 100%) !important;
  border: 1px solid rgba(59, 130, 246, 0.1) !important;
}

.language-toggle-btn:hover {
  color: #3b82f6 !important;
  background: linear-gradient(135deg,
    rgba(59, 130, 246, 0.12) 0%,
    rgba(37, 99, 235, 0.15) 100%) !important;
  border-color: rgba(59, 130, 246, 0.25) !important;
  box-shadow:
    0 4px 12px rgba(59, 130, 246, 0.2),
    0 2px 4px rgba(59, 130, 246, 0.15) !important;
}

.language-label {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.language-toggle-btn:hover .language-label {
  transform: scale(1.05);
}

/* 语言下拉菜单 */
.language-dropdown-menu {
  min-width: 160px;
  border-radius: 12px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--theme-border);
  background: var(--theme-bg-container);
  backdrop-filter: blur(12px);
  overflow: hidden;
}

.language-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.language-flag {
  font-size: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 暗黑模式适配 */
.dark .language-toggle-btn {
  background: linear-gradient(135deg,
    rgba(96, 165, 250, 0.08) 0%,
    rgba(59, 130, 246, 0.12) 100%) !important;
  border-color: rgba(96, 165, 250, 0.15) !important;
}

.dark .language-toggle-btn:hover {
  color: #60a5fa !important;
  background: linear-gradient(135deg,
    rgba(96, 165, 250, 0.15) 0%,
    rgba(59, 130, 246, 0.2) 100%) !important;
  border-color: rgba(96, 165, 250, 0.3) !important;
  box-shadow:
    0 4px 12px rgba(96, 165, 250, 0.25),
    0 2px 4px rgba(96, 165, 250, 0.2) !important;
}

.dark .language-dropdown-menu {
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.4),
    0 10px 10px -5px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .language-dropdown-menu :deep(.ant-menu-item):hover {
  background-color: rgba(96, 165, 250, 0.1);
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.12);
}

.dark .language-dropdown-menu :deep(.ant-menu-item-selected) {
  background-color: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
}

.dark .language-dropdown-menu :deep(.ant-menu-item-selected):hover {
  background-color: rgba(96, 165, 250, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .language-toggle-btn {
    min-width: 32px !important;
  }

  .language-label {
    display: none;
  }
}

/* 减少动画偏好适配 */
@media (prefers-reduced-motion: reduce) {
  .language-toggle-btn,
  .language-toggle-btn :deep(.anticon),
  .language-label,
  .language-flag,
  .language-dropdown-menu :deep(.ant-menu-item) {
    transition: none !important;
    animation: none !important;
  }

  .language-toggle-btn:hover,
  .language-dropdown-menu :deep(.ant-menu-item):hover {
    transform: none !important;
  }
}
</style>
