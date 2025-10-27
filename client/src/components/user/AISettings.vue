<template>
  <div class="ai-settings">
    <div class="settings-section">
      <h4>AI提供商</h4>
      <p class="section-description">选择您偏好的AI服务提供商</p>
      <a-select
        v-model:value="aiSettings.provider"
        style="width: 100%"
        :options="availableProviders"
        :loading="loadingProviders"
        @change="onProviderChange"
      />
    </div>

    <div class="settings-section">
      <h4>AI模型</h4>
      <p class="section-description">选择具体的AI模型</p>
      <a-select
        v-model:value="aiSettings.model"
        style="width: 100%"
        :options="availableModels"
        :disabled="!aiSettings.provider"
        @change="onModelChange"
      />
    </div>

    <div class="settings-section">
      <h4>对话设置</h4>
      <div class="setting-item">
        <div class="setting-label">
          <span>自动保存对话</span>
          <small>自动保存AI对话记录</small>
        </div>
        <a-switch v-model:checked="aiSettings.autoSave" @change="onAutoSaveChange" />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span>对话历史长度</span>
          <small>保留的对话消息数量 (10-200)</small>
        </div>
        <a-input-number
          v-model:value="aiSettings.maxHistoryLength"
          :min="10"
          :max="200"
          :step="10"
          style="width: 120px"
          @change="onHistoryLengthChange"
        />
      </div>
    </div>

    <div class="settings-section">
      <h4>任务偏好</h4>
      <p class="section-description">为不同类型的任务配置偏好模型</p>
      <div class="task-preferences">
        <div class="task-item" v-for="task in taskTypes" :key="task.key">
          <div class="task-info">
            <span class="task-name">{{ task.name }}</span>
            <small class="task-desc">{{ task.description }}</small>
          </div>
          <a-select
            v-model:value="aiSettings.taskPreferences[task.key]"
            style="width: 160px"
            :options="taskModelOptions"
            placeholder="使用默认"
            allow-clear
            @change="onTaskPreferenceChange"
          />
        </div>
      </div>
    </div>

    <!-- 自定义AI配置 -->
    <div class="settings-section">
      <CustomAIConfig v-model="aiSettings.customConfigs" />
    </div>

    <div class="settings-section">
      <h4>快速操作</h4>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-button @click="resetAISettings" block>
            <template #icon><ReloadOutlined /></template>
            重置为默认
          </a-button>
        </a-col>
        <a-col :span="12">
          <a-button type="primary" @click="saveAISettings" :loading="savingSettings" block>
            <template #icon><SaveOutlined /></template>
            保存设置
          </a-button>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons-vue'
import { useAIChatStore } from '@/stores/aiChat'
import { apiClient } from '@/utils/api'
import CustomAIConfig from './CustomAIConfig.vue'

// Stores
const aiChatStore = useAIChatStore()

// Local state
const aiSettings = reactive({
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  autoSave: true,
  maxHistoryLength: 50,
  taskPreferences: {},
  customConfigs: []
})

const availableProviders = ref([])
const availableModels = ref([])
const loadingProviders = ref(false)
const savingSettings = ref(false)

// 任务类型定义
const taskTypes = [
  { key: 'consistency', name: '一致性检查', description: '检查内容的逻辑一致性' },
  { key: 'creative', name: '创意写作', description: '生成创意内容和情节' },
  { key: 'analysis', name: '内容分析', description: '分析文本结构和质量' },
  { key: 'content_generation', name: '内容生成', description: '生成章节和段落内容' }
]

const taskModelOptions = computed(() => {
  const options = availableModels.value.map(model => ({
    label: model.label,
    value: model.value
  }))
  return options
})

// Methods
const loadAIConfig = async () => {
  try {
    loadingProviders.value = true

    // 获取配置信息
    const configResponse = await apiClient.get('/api/ai/config')
    const config = configResponse.data

    // 设置可用提供商
    availableProviders.value = config.availableProviders.map(provider => ({
      label: `${provider.name} (${provider.type})`,
      value: provider.name
    }))

    // 获取用户偏好设置
    try {
      const preferencesResponse = await apiClient.get('/api/ai/preferences')
      const preferences = preferencesResponse.data

      Object.assign(aiSettings, {
        provider: preferences.preferredProvider || config.defaultProvider,
        model: preferences.preferredModel || config.defaultModel,
        autoSave: preferences.autoSave ?? true,
        maxHistoryLength: preferences.maxHistoryLength || 50,
        taskPreferences: preferences.taskPreferences || {},
        customConfigs: preferences.customConfigs || []
      })
    } catch (error) {
      console.warn('加载用户偏好失败,使用默认设置:', error)
      Object.assign(aiSettings, {
        provider: config.defaultProvider,
        model: config.defaultModel,
        autoSave: true,
        maxHistoryLength: 50,
        taskPreferences: {},
        customConfigs: []
      })
    }

    // 设置当前提供商的可用模型
    updateAvailableModels()
  } catch (error) {
    console.error('加载AI配置失败:', error)
    message.error('加载AI配置失败')
  } finally {
    loadingProviders.value = false
  }
}

const updateAvailableModels = async () => {
  const selectedProvider = availableProviders.value.find(p => p.value === aiSettings.provider)
  if (!selectedProvider) {
    availableModels.value = []
    return
  }

  // 从 API 动态获取模型列表
  try {
    const response = await apiClient.post('/api/ai/models/list', {
      provider: aiSettings.provider
    })

    const models = response.data.models || []
    availableModels.value = models.map(model => ({
      label: model.name + (model.description ? ` - ${model.description}` : ''),
      value: model.id
    }))

    // 如果当前选择的模型不在列表中，清除选择
    if (aiSettings.model && !availableModels.value.find(m => m.value === aiSettings.model)) {
      aiSettings.model = availableModels.value[0]?.value || ''
    }
  } catch (error) {
    console.error('Failed to load models:', error)
    // 降级到默认模型列表
    const modelMap = {
      'openai': [
        { label: 'GPT-4', value: 'gpt-4' },
        { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
      ],
      'claude': [
        { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
        { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
        { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
      ],
      'gemini': [
        { label: 'Gemini Pro', value: 'gemini-pro' },
        { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' }
      ]
    }

    availableModels.value = modelMap[aiSettings.provider] || []
  }
}

const onProviderChange = (value) => {
  aiSettings.provider = value
  updateAvailableModels()
  // 重置模型选择为第一个可用模型
  if (availableModels.value.length > 0) {
    aiSettings.model = availableModels.value[0].value
  }
}

const onModelChange = (value) => {
  aiSettings.model = value
}

const onAutoSaveChange = (checked) => {
  aiSettings.autoSave = checked
}

const onHistoryLengthChange = (value) => {
  aiSettings.maxHistoryLength = value
}

const onTaskPreferenceChange = () => {
  // 任务偏好变更处理逻辑
}

const resetAISettings = async () => {
  try {
    const configResponse = await apiClient.get('/api/ai/config')
    const config = configResponse.data

    Object.assign(aiSettings, {
      provider: config.defaultProvider,
      model: config.defaultModel,
      autoSave: true,
      maxHistoryLength: 50,
      taskPreferences: {}
    })

    updateAvailableModels()
    message.success('已重置为默认设置')
  } catch (error) {
    console.error('重置设置失败:', error)
    message.error('重置设置失败')
  }
}

const saveAISettings = async () => {
  try {
    savingSettings.value = true

    await apiClient.put('/api/ai/preferences', {
      preferredProvider: aiSettings.provider,
      preferredModel: aiSettings.model,
      autoSave: aiSettings.autoSave,
      maxHistoryLength: aiSettings.maxHistoryLength,
      taskPreferences: aiSettings.taskPreferences,
      customConfigs: aiSettings.customConfigs
    })

    // 同步到AI Chat Store
    await aiChatStore.updateSettingsEnhanced({
      provider: aiSettings.provider,
      model: aiSettings.model,
      autoSave: aiSettings.autoSave,
      maxHistoryLength: aiSettings.maxHistoryLength
    })

    message.success('AI设置已保存')
  } catch (error) {
    console.error('保存AI设置失败:', error)
    message.error('保存设置失败')
  } finally {
    savingSettings.value = false
  }
}

// 暴露给父组件的方法
defineExpose({
  loadAIConfig
})

// 组件挂载时加载配置
onMounted(() => {
  loadAIConfig()
})
</script>

<style scoped>
.ai-settings {
  max-height: 500px;
  overflow-y: auto;
  padding: 8px 0;
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

.section-description {
  color: var(--theme-text-secondary);
  font-size: 14px;
  margin-bottom: 12px;
  transition: color 0.3s ease;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--theme-border);
  transition: border-color 0.3s ease;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  flex: 1;
}

.setting-label span {
  display: block;
  font-weight: 500;
  margin-bottom: 2px;
  color: var(--theme-text);
  transition: color 0.3s ease;
}

.setting-label small {
  color: var(--theme-text-secondary);
  font-size: 12px;
  transition: color 0.3s ease;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--theme-bg-container);
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid var(--theme-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.task-info {
  flex: 1;
}

.task-name {
  font-weight: 500;
  color: var(--theme-text);
  display: block;
  margin-bottom: 2px;
  transition: color 0.3s ease;
}

.task-desc {
  color: var(--theme-text-secondary);
  font-size: 12px;
  transition: color 0.3s ease;
}
</style>
