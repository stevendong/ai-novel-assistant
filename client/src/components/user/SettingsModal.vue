<template>
  <!-- Settings Modal -->
  <a-modal
    v-model:open="visible"
    title="设置"
    :width="600"
    footer=""
    @cancel="handleCancel"
  >
    <a-tabs default-active-key="general" @change="onTabChange">
      <a-tab-pane key="general" tab="常规设置">
        <GeneralSettings
          @logout-all="emit('logoutAll')"
          @delete-account="emit('deleteAccount')"
        />
      </a-tab-pane>

      <a-tab-pane key="ai" tab="AI设置">
        <AISettings ref="aiSettingsRef" />
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import GeneralSettings from './GeneralSettings.vue'
import AISettings from './AISettings.vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'logoutAll', 'deleteAccount'])

// Refs
const aiSettingsRef = ref(null)

// Local state
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Methods
const handleCancel = () => {
  visible.value = false
}

const onTabChange = (activeKey) => {
  // 当切换到AI设置tab时,加载配置
  if (activeKey === 'ai' && aiSettingsRef.value) {
    aiSettingsRef.value.loadAIConfig()
  }
}
</script>

<style scoped>
/* 由于样式已经在子组件中,这里不需要额外的样式 */
</style>
