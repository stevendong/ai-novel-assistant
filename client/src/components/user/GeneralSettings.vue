<template>
  <div class="general-settings">
    <div class="settings-section">
      <h4>账户安全</h4>
      <a-button @click="emit('logoutAll')" block>
        登出所有设备
      </a-button>
    </div>

    <div class="settings-section">
      <h4>危险操作</h4>
      <a-button danger @click="emit('deleteAccount')" block>
        删除账户
      </a-button>
      <small class="form-hint">此操作将永久删除您的账户和所有数据,无法恢复</small>
    </div>
  </div>
</template>

<script setup>
// Emits
const emit = defineEmits(['logoutAll', 'deleteAccount'])
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
