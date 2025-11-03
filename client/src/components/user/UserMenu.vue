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
        <span class="username">{{ authStore.user?.nickname || authStore.user?.username || t('user.menu.defaultName') }}</span>
        <DownOutlined />
      </a-button>

      <template #overlay>
        <a-menu @click="handleMenuClick">
          <a-menu-item key="profile" :icon="h(UserOutlined)">
            {{ t('user.menu.profile') }}
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="settings" :icon="h(SettingOutlined)">
            {{ t('user.menu.settings') }}
          </a-menu-item>
          <a-menu-item key="help" :icon="h(QuestionCircleOutlined)">
            {{ t('user.menu.help') }}
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="logout" :icon="h(LogoutOutlined)" class="logout-item">
            {{ t('user.menu.logout') }}
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </div>

  <!-- Profile Modal -->
  <a-modal
    v-model:open="profileModalVisible"
    :title="t('user.profile.header.title')"
    :width="500"
    @ok="handleUpdateProfile"
    @cancel="cancelProfileEdit"
    :confirmLoading="authStore.isLoading"
    :ok-text="t('common.save')"
    :cancel-text="t('common.cancel')"
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

      <a-form-item :label="t('user.profile.basicInfo.username')" required>
        <a-input
          v-model:value="profileData.username"
          disabled
          :placeholder="t('user.profile.basicInfo.username')"
          :suffix="t('user.profile.basicInfo.usernameHint')"
        />
        <small class="form-hint">{{ t('user.profile.basicInfo.usernameHint') }}</small>
      </a-form-item>

      <a-form-item :label="t('user.profile.basicInfo.email')" required>
        <a-input
          v-model:value="profileData.email"
          disabled
          :placeholder="t('user.profile.basicInfo.email')"
          :suffix="t('user.profile.basicInfo.emailHint')"
        />
        <small class="form-hint">{{ t('user.profile.basicInfo.emailHint') }}</small>
      </a-form-item>

      <a-form-item :label="t('user.profile.basicInfo.nickname')">
        <a-input
          v-model:value="profileData.nickname"
          :placeholder="t('user.profile.basicInfo.nicknamePlaceholder')"
          :maxlength="50"
        />
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- Settings Modal -->
  <SettingsModal
    v-model="settingsModalVisible"
    @logout-all="showLogoutAllModal"
    @delete-account="showDeleteAccountModal"
  />

  <!-- Logout All Confirmation -->
  <a-modal
    v-model:open="logoutAllModalVisible"
    :title="t('user.menu.logoutAllTitle')"
    @ok="handleLogoutAll"
    @cancel="logoutAllModalVisible = false"
    :confirmLoading="authStore.isLoading"
    :ok-text="t('common.confirm')"
    :cancel-text="t('common.cancel')"
  >
    <p>{{ t('user.menu.logoutAllDescription') }}</p>
  </a-modal>

  <!-- Delete Account Confirmation -->
  <a-modal
    v-model:open="deleteAccountModalVisible"
    :title="t('user.menu.deleteAccountTitle')"
    @ok="handleDeleteAccount"
    @cancel="cancelDeleteAccount"
    :confirmLoading="authStore.isLoading"
    :ok-text="t('common.confirmDelete')"
    :cancel-text="t('common.cancel')"
    ok-type="danger"
  >
    <div class="delete-account-form">
      <p>{{ t('user.menu.deleteAccountDescription') }}</p>
      <ul>
        <li>{{ t('user.menu.deleteAccountItems.novels') }}</li>
        <li>{{ t('user.menu.deleteAccountItems.characters') }}</li>
        <li>{{ t('user.menu.deleteAccountItems.chapters') }}</li>
        <li>{{ t('user.menu.deleteAccountItems.stats') }}</li>
      </ul>
      <p><strong>{{ t('user.menu.deleteAccountWarning') }}</strong></p>

      <a-form-item :label="t('user.menu.deleteAccountPasswordLabel')" required>
        <a-input-password
          v-model:value="deleteAccountPassword"
          :placeholder="t('user.menu.deleteAccountPasswordPlaceholder')"
        />
      </a-form-item>
    </div>
  </a-modal>

</template>

<script setup>
import { ref, reactive, h, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  UserOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  DownOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import SettingsModal from './SettingsModal.vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const profileModalVisible = ref(false)
const settingsModalVisible = ref(false)
const logoutAllModalVisible = ref(false)
const deleteAccountModalVisible = ref(false)
const deleteAccountPassword = ref('')

const profileData = reactive({
  username: '',
  email: '',
  nickname: '',
  avatar: ''
})

const getInitials = (name) => {
  if (!name) return t('user.menu.defaultInitial')
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
  // 跳转到用户资料页面
  router.push('/profile')
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
  message.info(t('user.menu.helpComingSoon'))
}

const handleLogout = () => {
  Modal.confirm({
    title: t('user.menu.logoutConfirmTitle'),
    content: t('user.menu.logoutConfirmDescription'),
    okText: t('common.confirm'),
    cancelText: t('common.cancel'),
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
    message.error(t('user.menu.deleteAccountPasswordRequired'))
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
  background-color: var(--theme-bg-elevated);
}

.username {
  font-weight: 500;
  color: var(--theme-text);
}

@media (prefers-color-scheme: light) {
  :deep(.logout-item) {
    color: #ef4444 !important;
  }
}

@media (prefers-color-scheme: dark) {
  :deep(.logout-item) {
    color: #ff7875 !important;
  }
}

@media (prefers-color-scheme: dark) {
  :deep(.logout-item:hover) {
    color: #ff7875 !important;
  }
}

@media (prefers-color-scheme: light) {
  :deep(.logout-item:hover) {
    background-color: #fef2f2 !important;
    color: #dc2626 !important;
  }
}

.profile-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 20px 0;
  border-bottom: 1px solid var(--theme-border);
}


.form-hint {
  color: var(--theme-text-secondary);
  font-size: 12px;
}

.delete-account-form ul {
  margin: 16px 0;
  padding-left: 20px;
}

.delete-account-form li {
  margin-bottom: 4px;
  color: var(--theme-text-secondary);
}
</style>
