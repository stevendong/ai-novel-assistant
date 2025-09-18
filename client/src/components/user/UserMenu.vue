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
  DownOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const profileModalVisible = ref(false)
const settingsModalVisible = ref(false)
const logoutAllModalVisible = ref(false)
const deleteAccountModalVisible = ref(false)
const deleteAccountPassword = ref('')

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

// 生命周期
onMounted(async () => {
  try {
    // 确保认证 store 已初始化
    await authStore.init()
  } catch (error) {
    console.error('Failed to initialize auth store:', error)
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
</style>
