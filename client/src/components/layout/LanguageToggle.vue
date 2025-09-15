<template>
  <a-dropdown :trigger="['click']" placement="bottomRight">
    <a-button type="text" class="language-toggle-btn">
      <template #icon>
        <GlobalOutlined />
      </template>
      {{ getCurrentLanguageLabel() }}
    </a-button>

    <template #overlay>
      <a-menu @click="handleLanguageChange" :selected-keys="[currentLanguage]">
        <a-menu-item key="zh">
          <span>{{ $t('language.chinese') }}</span>
        </a-menu-item>
        <a-menu-item key="en">
          <span>{{ $t('language.english') }}</span>
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
.language-toggle-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.85);
  border: none;
  height: 32px;
  padding: 0 8px;
}

.language-toggle-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.language-toggle-btn:focus {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}
</style>