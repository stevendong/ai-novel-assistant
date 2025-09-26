<template>
  <div class="user-menu-wrapper">
    <!-- 用户菜单 -->
    <a-dropdown v-if="authStore.isAuthenticated && authStore.user" :trigger="['click']" placement="bottomRight">
      <a-button type="text" size="large" class="user-menu-trigger">
        <template v-if="authStore.user?.avatar">
          <a-avatar :src="authStore.user.avatar" :size="32" />
        </template>
        <template v-else>
          <a-avatar :size="32" style="background-color: #87d068">
            {{ getInitials(authStore.user?.nickname || authStore.user?.username) }}
          </a-avatar>
        </template>
        <span class="username">{{ authStore.user?.nickname || authStore.user?.username || '用户' }}</span>
        <DownOutlined />
      </a-button>

      <template #overlay>
        <a-menu @click="handleMenuClick">
          <a-menu-item key="profile" :icon="h(UserOutlined)">
            个人资料
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="settings" :icon="h(SettingOutlined)">
            设置
          </a-menu-item>
          <a-menu-item key="help" :icon="h(QuestionCircleOutlined)">
            帮助
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="logout" :icon="h(LogoutOutlined)" class="logout-item">
            退出登录
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </div>

  <!-- Profile Modal -->
  <a-modal
    v-model:open="profileModalVisible"
    title="个人资料"
    :width="500"
    @ok="handleUpdateProfile"
    @cancel="cancelProfileEdit"
    :confirmLoading="authStore.isLoading"
    ok-text="保存"
    cancel-text="取消"
  >
    <a-form :form="profileForm" layout="vertical">
      <div class="profile-avatar">
        <a-avatar
          :size="80"
          :src="profileData.avatar || authStore.user?.avatar"
          style="background-color: #87d068"
        >
          {{ getInitials(profileData.nickname || profileData.username) }}
        </a-avatar>
      </div>

      <a-form-item label="用户名" required>
        <a-input
          v-model:value="profileData.username"
          disabled
          placeholder="用户名"
        />
        <small class="form-hint">用户名不可修改</small>
      </a-form-item>

      <a-form-item label="邮箱" required>
        <a-input
          v-model:value="profileData.email"
          disabled
          placeholder="邮箱"
        />
        <small class="form-hint">邮箱不可修改</small>
      </a-form-item>

      <a-form-item label="昵称">
        <a-input
          v-model:value="profileData.nickname"
          placeholder="请输入昵称"
          :maxlength="50"
        />
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- Settings Modal -->
  <a-modal
    v-model:open="settingsModalVisible"
    title="设置"
    :width="600"
    footer=""
  >
    <a-tabs default-active-key="general">
      <a-tab-pane key="general" tab="常规设置">
        <div class="settings-section">
          <h4>账户安全</h4>
          <a-button @click="showLogoutAllModal" block>
            登出所有设备
          </a-button>
        </div>

        <div class="settings-section">
          <h4>危险操作</h4>
          <a-button danger @click="showDeleteAccountModal" block>
            删除账户
          </a-button>
          <small class="form-hint">此操作将永久删除您的账户和所有数据，无法恢复</small>
        </div>
      </a-tab-pane>

      <a-tab-pane key="ai" tab="AI设置">
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
      </a-tab-pane>
    </a-tabs>
  </a-modal>

  <!-- Logout All Confirmation -->
  <a-modal
    v-model:open="logoutAllModalVisible"
    title="登出所有设备"
    @ok="handleLogoutAll"
    @cancel="logoutAllModalVisible = false"
    :confirmLoading="authStore.isLoading"
    ok-text="确认"
    cancel-text="取消"
  >
    <p>您确定要登出所有设备吗？这将使所有已登录的设备失效。</p>
  </a-modal>

  <!-- Delete Account Confirmation -->
  <a-modal
    v-model:open="deleteAccountModalVisible"
    title="删除账户"
    @ok="handleDeleteAccount"
    @cancel="cancelDeleteAccount"
    :confirmLoading="authStore.isLoading"
    ok-text="确认删除"
    cancel-text="取消"
    ok-type="danger"
  >
    <div class="delete-account-form">
      <p>此操作将永久删除您的账户和所有相关数据，包括：</p>
      <ul>
        <li>所有小说项目</li>
        <li>角色和世界设定</li>
        <li>章节内容</li>
        <li>写作统计</li>
      </ul>
      <p><strong>此操作无法撤销！</strong></p>

      <a-form-item label="请输入您的密码确认删除" required>
        <a-input-password
          v-model:value="deleteAccountPassword"
          placeholder="请输入密码"
        />
      </a-form-item>
    </div>
  </a-modal>

</template>

<script setup>
import { ref, reactive, h, nextTick, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Form, message, Modal } from 'ant-design-vue'
import {
  UserOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  DownOutlined,
  ReloadOutlined,
  SaveOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useAIChatStore } from '@/stores/aiChat'
import { apiClient } from '@/utils/api'

const router = useRouter()
const authStore = useAuthStore()
const aiChatStore = useAIChatStore()

const profileModalVisible = ref(false)
const settingsModalVisible = ref(false)
const logoutAllModalVisible = ref(false)
const deleteAccountModalVisible = ref(false)
const deleteAccountPassword = ref('')

// AI设置相关数据
const aiSettings = reactive({
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  autoSave: true,
  maxHistoryLength: 50,
  taskPreferences: {}
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

// const profileForm = Form.useForm()
const profileData = reactive({
  username: '',
  email: '',
  nickname: '',
  avatar: ''
})

const getInitials = (name) => {
  if (!name) return 'U'
  return name.charAt(0).toUpperCase()
}

const handleMenuClick = ({ key }) => {
  switch (key) {
    case 'profile':
      showProfile()
      break
    case 'settings':
      settingsModalVisible.value = true
      break
    case 'help':
      showHelp()
      break
    case 'logout':
      handleLogout()
      break
  }
}

const showProfile = () => {
  // 显示用户资料页面
  Object.assign(profileData, {
    username: authStore.user?.username || '',
    email: authStore.user?.email || '',
    nickname: authStore.user?.nickname || '',
    avatar: authStore.user?.avatar || ''
  })
  profileModalVisible.value = true
}

const handleUpdateProfile = async () => {
  try {
    const updateData = {}
    if (profileData.nickname !== authStore.user?.nickname) {
      updateData.nickname = profileData.nickname
    }

    if (Object.keys(updateData).length === 0) {
      profileModalVisible.value = false
      return
    }

    const result = await authStore.updateProfile(updateData)
    if (result.success) {
      profileModalVisible.value = false
    }
  } catch (error) {
    console.error('Update profile error:', error)
  }
}

const cancelProfileEdit = () => {
  profileModalVisible.value = false
}


const showHelp = () => {
  message.info('帮助文档开发中...')
}

const handleLogout = () => {
  Modal.confirm({
    title: '确认登出',
    content: '您确定要登出当前账户吗？',
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      const result = await authStore.logout()
      if (result.success) {
        router.push('/login')
      }
    }
  })
}

const showLogoutAllModal = () => {
  logoutAllModalVisible.value = true
}

const handleLogoutAll = async () => {
  const result = await authStore.logoutAllSessions()
  if (result.success) {
    logoutAllModalVisible.value = false
    router.push('/login')
  }
}

const showDeleteAccountModal = () => {
  deleteAccountPassword.value = ''
  deleteAccountModalVisible.value = true
}

const handleDeleteAccount = async () => {
  if (!deleteAccountPassword.value) {
    message.error('请输入密码确认删除')
    return
  }

  const result = await authStore.deleteAccount(deleteAccountPassword.value)
  if (result.success) {
    deleteAccountModalVisible.value = false
    router.push('/login')
  }
}

const cancelDeleteAccount = () => {
  deleteAccountPassword.value = ''
  deleteAccountModalVisible.value = false
}

// AI设置相关方法
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
        taskPreferences: preferences.taskPreferences || {}
      })
    } catch (error) {
      console.warn('加载用户偏好失败，使用默认设置:', error)
      Object.assign(aiSettings, {
        provider: config.defaultProvider,
        model: config.defaultModel,
        autoSave: true,
        maxHistoryLength: 50,
        taskPreferences: {}
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

const updateAvailableModels = () => {
  const selectedProvider = availableProviders.value.find(p => p.value === aiSettings.provider)
  if (!selectedProvider) {
    availableModels.value = []
    return
  }

  // 这里应该根据实际的API返回的provider信息来设置模型列表
  // 暂时使用简化的逻辑
  const modelMap = {
    'openai': [
      { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
      { label: 'GPT-4', value: 'gpt-4' },
      { label: 'Kimi K2 Instruct', value: 'kimi-k2-instruct' }
    ],
    'claude': [
      { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
      { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
      { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' }
    ]
  }

  availableModels.value = modelMap[aiSettings.provider] || []
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
      taskPreferences: aiSettings.taskPreferences
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

// 生命周期
onMounted(async () => {
  try {
    // 确保认证 store 已初始化
    await authStore.init()
    // 加载AI配置
    await loadAIConfig()
  } catch (error) {
    console.error('Failed to initialize:', error)
  }
})
</script>

<style scoped>
.user-menu-wrapper {
  display: flex;
  align-items: center;
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  height: auto;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.user-menu-trigger:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.username {
  font-weight: 500;
  color: var(--theme-text);
}

:deep(.logout-item) {
  color: #ef4444 !important;
}

:deep(.logout-item:hover) {
  background-color: #fef2f2 !important;
  color: #dc2626 !important;
}

.profile-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 20px 0;
  border-bottom: 1px solid #f0f0f0;
}


.form-hint {
  color: #6b7280;
  font-size: 12px;
}

.settings-section {
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.settings-section h4 {
  margin: 0 0 12px 0;
  font-weight: 600;
  color: #1f2937;
}

.delete-account-form ul {
  margin: 16px 0;
  padding-left: 20px;
}

.delete-account-form li {
  margin-bottom: 4px;
  color: #6b7280;
}

/* AI设置相关样式 */
.ai-settings {
  max-height: 500px;
  overflow-y: auto;
}

.section-description {
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 12px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
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
}

.setting-label small {
  color: #6b7280;
  font-size: 12px;
}

.task-preferences {
  space-y: 12px;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 8px;
}

.task-info {
  flex: 1;
}

.task-name {
  font-weight: 500;
  color: #1f2937;
  display: block;
  margin-bottom: 2px;
}

.task-desc {
  color: #6b7280;
  font-size: 12px;
}
</style>
