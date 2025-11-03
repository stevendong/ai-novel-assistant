<template>
  <div class="custom-ai-config">
    <div class="config-header">
      <h4>{{ t('user.settings.custom.title') }}</h4>
      <p class="section-description">{{ t('user.settings.custom.description') }}</p>
      <a-button type="primary" @click="showAddModal">
        <template #icon><PlusOutlined /></template>
        {{ t('user.settings.custom.add') }}
      </a-button>
    </div>

    <div class="config-list" v-if="configs.length > 0">
      <div class="config-item" v-for="(config, index) in configs" :key="index">
        <div class="config-info">
          <div class="config-name">{{ config.name }}</div>
          <div class="config-details">
            <span class="detail-item">{{ t('user.settings.custom.detail.type') }}: {{ getProviderTypeLabel(config.type) }}</span>
            <span class="detail-item">{{ t('user.settings.custom.detail.model') }}: {{ config.model }}</span>
            <span class="detail-item">{{ t('user.settings.custom.detail.endpoint') }}: {{ config.baseURL }}</span>
          </div>
        </div>
        <div class="config-actions">
          <a-button size="small" @click="editConfig(index)">{{ t('user.settings.custom.actions.edit') }}</a-button>
          <a-button size="small" danger @click="deleteConfig(index)">{{ t('user.settings.custom.actions.delete') }}</a-button>
        </div>
      </div>
    </div>

    <a-empty v-else :description="t('user.settings.custom.empty')" />

    <!-- 添加/编辑配置弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingIndex !== null ? t('user.settings.custom.modal.editTitle') : t('user.settings.custom.modal.addTitle')"
      @ok="handleSaveConfig"
      @cancel="handleCancelConfig"
      width="600px"
    >
      <a-form :model="formData" layout="vertical">
        <a-form-item :label="t('user.settings.custom.fields.name.label')" required>
          <a-input
            v-model:value="formData.name"
            :placeholder="t('user.settings.custom.fields.name.placeholder')"
          />
        </a-form-item>

        <a-form-item :label="t('user.settings.custom.fields.type.label')" required>
          <a-select v-model:value="formData.type" :placeholder="t('user.settings.custom.fields.type.placeholder')">
            <a-select-option value="openai">{{ t('user.settings.custom.fields.type.options.openai') }}</a-select-option>
            <a-select-option value="claude">{{ t('user.settings.custom.fields.type.options.claude') }}</a-select-option>
            <a-select-option value="gemini">{{ t('user.settings.custom.fields.type.options.gemini') }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="t('user.settings.custom.fields.baseURL.label')" required>
          <a-input
            v-model:value="formData.baseURL"
            :placeholder="t('user.settings.custom.fields.baseURL.placeholder')"
          />
          <small class="form-hint">{{ t('user.settings.custom.fields.baseURL.hint') }}</small>
        </a-form-item>

        <a-form-item :label="t('user.settings.custom.fields.apiKey.label')" required>
          <a-input-password
            v-model:value="formData.apiKey"
            :placeholder="t('user.settings.custom.fields.apiKey.placeholder')"
          />
          <small class="form-hint">{{ t('user.settings.custom.fields.apiKey.hint') }}</small>
        </a-form-item>

        <a-form-item :label="t('user.settings.custom.fields.model.label')" required>
          <a-input-group compact style="display: flex;">
            <a-select
              v-if="availableModels.length > 0"
              v-model:value="formData.model"
              :placeholder="t('user.settings.custom.fields.model.placeholder')"
              style="flex: 1"
              :options="availableModels"
              show-search
            />
            <a-input
              v-else
              v-model:value="formData.model"
              :placeholder="t('user.settings.custom.fields.model.placeholder')"
              style="flex: 1"
            />
            <a-button
              @click="fetchModels"
              :loading="loadingModels"
              :disabled="!formData.apiKey || !formData.baseURL"
            >
              <template #icon><ReloadOutlined /></template>
              {{ t('user.settings.custom.buttons.fetchModels') }}
            </a-button>
          </a-input-group>
          <small class="form-hint">
            {{ availableModels.length > 0 ? t('user.settings.custom.fields.model.hintFetched') : t('user.settings.custom.fields.model.hintManual') }}
          </small>
        </a-form-item>

        <a-form-item :label="t('user.settings.custom.fields.timeout.label')">
          <a-input-number
            v-model:value="formData.timeout"
            :min="5000"
            :max="120000"
            :step="1000"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { apiClient } from '@/utils/api'
import { useI18n } from 'vue-i18n'

// Props
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

// Local state
const configs = ref([...props.modelValue])
const modalVisible = ref(false)
const editingIndex = ref(null)
const loadingModels = ref(false)
const availableModels = ref([])
const formData = ref({
  name: '',
  type: 'openai',
  baseURL: '',
  apiKey: '',
  model: '',
  timeout: 60000
})

const getProviderTypeLabel = (type) => {
  const key = `user.settings.custom.fields.type.options.${type}`
  const translated = t(key)
  return translated === key ? type : translated
}

// Watch props
watch(() => props.modelValue, (newVal) => {
  configs.value = [...newVal]
})

// Methods
const fetchModels = async () => {
  if (!formData.value.apiKey || !formData.value.baseURL) {
    message.warning(t('user.settings.custom.messages.missingCredentials'))
    return
  }

  loadingModels.value = true
  try {
    const response = await apiClient.post('/api/ai/models/list', {
      provider: formData.value.name || 'custom',
      apiKey: formData.value.apiKey,
      baseURL: formData.value.baseURL
    })

    const models = response.data.models || []
    availableModels.value = models.map(model => ({
      label: model.name,
      value: model.id
    }))

    if (models.length > 0) {
      message.success(t('user.settings.custom.messages.fetchSuccess', { count: models.length }))
      // 如果当前没有选择模型，自动选择第一个
      if (!formData.value.model) {
        formData.value.model = models[0].id
      }
    } else {
      message.warning(t('user.settings.custom.messages.fetchNone'))
    }
  } catch (error) {
    console.error('Failed to fetch models:', error)
    message.error(t('user.settings.custom.messages.fetchError', { error: error.response?.data?.message || error.message }))
    availableModels.value = []
  } finally {
    loadingModels.value = false
  }
}

const showAddModal = () => {
  editingIndex.value = null
  availableModels.value = []
  formData.value = {
    name: '',
    type: 'openai',
    baseURL: '',
    apiKey: '',
    model: '',
    timeout: 60000
  }
  modalVisible.value = true
}

const editConfig = (index) => {
  editingIndex.value = index
  availableModels.value = []
  formData.value = { ...configs.value[index] }
  modalVisible.value = true
}

const deleteConfig = (index) => {
  configs.value.splice(index, 1)
  emit('update:modelValue', configs.value)
  message.success(t('user.settings.custom.messages.deleteSuccess'))
}

const handleSaveConfig = () => {
  // 验证表单
  if (!formData.value.name || !formData.value.baseURL || !formData.value.apiKey || !formData.value.model) {
    message.error(t('user.settings.custom.messages.fieldsRequired'))
    return
  }

  // 保存配置
  if (editingIndex.value !== null) {
    configs.value[editingIndex.value] = { ...formData.value }
    message.success(t('user.settings.custom.messages.updateSuccess'))
  } else {
    configs.value.push({ ...formData.value })
    message.success(t('user.settings.custom.messages.createSuccess'))
  }

  emit('update:modelValue', configs.value)
  modalVisible.value = false
}

const handleCancelConfig = () => {
  modalVisible.value = false
}
</script>

<style scoped>
.custom-ai-config {
  padding: 8px 0;
}

.config-header {
  margin-bottom: 16px;
}

.config-header h4 {
  margin: 0 0 8px 0;
  font-weight: 600;
  color: var(--theme-text);
  transition: color 0.3s ease;
}

.section-description {
  color: var(--theme-text-secondary);
  font-size: 14px;
  margin-bottom: 12px;
  transition: color 0.3s ease;
}

.config-list {
  margin-top: 16px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  background: var(--theme-bg-elevated);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.config-item:hover {
  border-color: var(--theme-primary);
}

.config-info {
  flex: 1;
}

.config-name {
  font-weight: 600;
  font-size: 16px;
  color: var(--theme-text);
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.config-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.detail-item {
  font-size: 12px;
  color: var(--theme-text-secondary);
  transition: color 0.3s ease;
}

.config-actions {
  display: flex;
  gap: 8px;
}

.form-hint {
  color: var(--theme-text-secondary);
  font-size: 12px;
  display: block;
  margin-top: 4px;
  transition: color 0.3s ease;
}
</style>
