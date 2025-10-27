<template>
  <div class="custom-ai-config">
    <div class="config-header">
      <h4>自定义AI提供商</h4>
      <p class="section-description">配置您自己的 AI 服务接口</p>
      <a-button type="primary" @click="showAddModal">
        <template #icon><PlusOutlined /></template>
        添加自定义配置
      </a-button>
    </div>

    <div class="config-list" v-if="configs.length > 0">
      <div class="config-item" v-for="(config, index) in configs" :key="index">
        <div class="config-info">
          <div class="config-name">{{ config.name }}</div>
          <div class="config-details">
            <span class="detail-item">类型: {{ config.type }}</span>
            <span class="detail-item">模型: {{ config.model }}</span>
            <span class="detail-item">接口: {{ config.baseURL }}</span>
          </div>
        </div>
        <div class="config-actions">
          <a-button size="small" @click="editConfig(index)">编辑</a-button>
          <a-button size="small" danger @click="deleteConfig(index)">删除</a-button>
        </div>
      </div>
    </div>

    <a-empty v-else description="还没有自定义配置" />

    <!-- 添加/编辑配置弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingIndex !== null ? '编辑自定义配置' : '添加自定义配置'"
      @ok="handleSaveConfig"
      @cancel="handleCancelConfig"
      width="600px"
    >
      <a-form :model="formData" layout="vertical">
        <a-form-item label="配置名称" required>
          <a-input
            v-model:value="formData.name"
            placeholder="例如: 我的OpenAI"
          />
        </a-form-item>

        <a-form-item label="提供商类型" required>
          <a-select v-model:value="formData.type" placeholder="选择类型">
            <a-select-option value="openai">OpenAI 兼容</a-select-option>
            <a-select-option value="claude">Claude</a-select-option>
            <a-select-option value="gemini">Gemini</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="API 基础地址" required>
          <a-input
            v-model:value="formData.baseURL"
            placeholder="例如: https://api.openai.com/v1"
          />
          <small class="form-hint">完整的 API 基础地址，包含协议和路径</small>
        </a-form-item>

        <a-form-item label="API Key" required>
          <a-input-password
            v-model:value="formData.apiKey"
            placeholder="输入您的 API Key"
          />
          <small class="form-hint">您的 API 密钥将被安全加密存储</small>
        </a-form-item>

        <a-form-item label="模型名称" required>
          <a-input-group compact style="display: flex;">
            <a-select
              v-if="availableModels.length > 0"
              v-model:value="formData.model"
              placeholder="选择模型"
              style="flex: 1"
              :options="availableModels"
              show-search
            />
            <a-input
              v-else
              v-model:value="formData.model"
              placeholder="例如: gpt-3.5-turbo"
              style="flex: 1"
            />
            <a-button
              @click="fetchModels"
              :loading="loadingModels"
              :disabled="!formData.apiKey || !formData.baseURL"
            >
              <template #icon><ReloadOutlined /></template>
              获取模型
            </a-button>
          </a-input-group>
          <small class="form-hint">
            {{ availableModels.length > 0 ? '从API获取到的可用模型' : '使用的具体模型名称，或点击"获取模型"从API获取' }}
          </small>
        </a-form-item>

        <a-form-item label="超时时间 (毫秒)">
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

// Props
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update:modelValue'])

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

// Watch props
watch(() => props.modelValue, (newVal) => {
  configs.value = [...newVal]
})

// Methods
const fetchModels = async () => {
  if (!formData.value.apiKey || !formData.value.baseURL) {
    message.warning('请先填写 API Key 和基础地址')
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
      message.success(`成功获取 ${models.length} 个模型`)
      // 如果当前没有选择模型，自动选择第一个
      if (!formData.value.model) {
        formData.value.model = models[0].id
      }
    } else {
      message.warning('未获取到可用模型')
    }
  } catch (error) {
    console.error('Failed to fetch models:', error)
    message.error('获取模型列表失败: ' + (error.response?.data?.message || error.message))
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
  message.success('配置已删除')
}

const handleSaveConfig = () => {
  // 验证表单
  if (!formData.value.name || !formData.value.baseURL || !formData.value.apiKey || !formData.value.model) {
    message.error('请填写所有必填项')
    return
  }

  // 保存配置
  if (editingIndex.value !== null) {
    configs.value[editingIndex.value] = { ...formData.value }
    message.success('配置已更新')
  } else {
    configs.value.push({ ...formData.value })
    message.success('配置已添加')
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
