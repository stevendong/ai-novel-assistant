<template>
  <div class="general-settings">
    <div class="settings-section">
      <h4>{{ t('user.settings.general.accountSecurity') }}</h4>
      <a-button @click="emit('logoutAll')" block>
        {{ t('user.settings.general.logoutAll') }}
      </a-button>
    </div>

    <div class="settings-section">
      <h4>{{ t('user.settings.general.dangerZone') }}</h4>
      <a-button danger @click="emit('deleteAccount')" block>
        {{ t('user.settings.general.deleteAccount') }}
      </a-button>
      <small class="form-hint">{{ t('user.settings.general.deleteHint') }}</small>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['logoutAll', 'deleteAccount'])

const { t } = useI18n()
</script>

<style scoped>
.general-settings {
  padding: 8px 0;
}

.form-hint {
  color: var(--theme-text-secondary);
  font-size: 12px;
  transition: color 0.3s ease;
}

.settings-section {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  background-color: var(--theme-bg-elevated);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.settings-section h4 {
  margin: 0 0 12px 0;
  font-weight: 600;
  color: var(--theme-text);
  transition: color 0.3s ease;
}
</style>
