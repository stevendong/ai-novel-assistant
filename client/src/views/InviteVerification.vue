<template>
  <div class="invite-verification-container">
    <!-- Settings Controls -->
    <div class="settings-controls">
      <div class="control-buttons">
        <!-- User Info Display -->
        <div v-if="authStore.isAuthenticated" class="user-info-section">
          <a-dropdown :trigger="['click']" placement="bottomRight">
            <template #overlay>
              <a-menu>
                <a-menu-item-group :title="$t('auth.inviteVerification.currentUser')">
                  <a-menu-item key="user-info" disabled class="user-menu-info">
                    <div class="user-details">
                      <div class="user-avatar">
                        <a-avatar
                          :src="authStore.user?.avatar"
                          :size="24"
                        >
                          {{ authStore.user?.nickname?.charAt(0) || authStore.user?.username?.charAt(0) }}
                        </a-avatar>
                      </div>
                      <div class="user-text">
                        <div class="user-name">
                          {{ authStore.user?.nickname || authStore.user?.username }}
                        </div>
                        <div class="user-email">{{ authStore.user?.email }}</div>
                      </div>
                    </div>
                  </a-menu-item>
                </a-menu-item-group>
                <a-menu-divider />
                <a-menu-item key="switch-account" @click="handleSwitchAccount">
                  <template #icon>
                    <SwapOutlined />
                  </template>
                  {{ $t('auth.inviteVerification.switchAccount') }}
                </a-menu-item>
                <a-menu-item key="logout" @click="handleLogout">
                  <template #icon>
                    <LogoutOutlined />
                  </template>
                  {{ $t('auth.inviteVerification.logout') }}
                </a-menu-item>
              </a-menu>
            </template>
            <a-button type="text" class="user-info-button">
              <template #icon>
                <a-avatar
                  :src="authStore.user?.avatar"
                  :size="32"
                  class="user-avatar-button"
                >
                  {{ authStore.user?.nickname?.charAt(0) || authStore.user?.username?.charAt(0) }}
                </a-avatar>
              </template>
              <span class="user-name-display">
                {{ authStore.user?.nickname || authStore.user?.username }}
              </span>
              <DownOutlined class="dropdown-icon" />
            </a-button>
          </a-dropdown>
        </div>

        <LanguageToggle />
        <ThemeToggle />
      </div>
    </div>

    <div class="invite-verification-content">
      <!-- Logo/Icon Area -->
      <div class="logo-section">
        <div class="logo-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
          </svg>
        </div>
        <h1 class="title">{{ $t('auth.inviteVerification.title') }}</h1>
        <p class="subtitle">{{ $t('auth.inviteVerification.subtitle') }}</p>
      </div>

      <!-- Main Form -->
      <div class="form-section">
        <a-form
          :model="formData"
          :rules="rules"
          layout="vertical"
          @submit.prevent="handleSubmit"
        >
          <a-form-item
            name="inviteCode"
            :label="$t('auth.inviteVerification.inviteCode')"
          >
            <a-input
              v-model:value="formData.inviteCode"
              :placeholder="$t('auth.inviteVerification.enterInviteCode')"
              size="large"
              :maxlength="15"
              class="invite-input"
              @input="handleInputChange"
            />
            <div class="input-hint">
              {{ $t('auth.inviteVerification.formatHint') }}
            </div>
          </a-form-item>

          <div class="button-group">
            <a-button
              type="primary"
              size="large"
              block
              :loading="loading"
              @click="handleSubmit"
              class="verify-button"
            >
              <template #icon>
                <CheckOutlined v-if="!loading" />
              </template>
              {{ $t('auth.inviteVerification.verifyButton') }}
            </a-button>
          </div>
        </a-form>
      </div>

      <!-- Info Section -->
      <div class="info-section">
        <a-alert
          :message="$t('auth.inviteVerification.description')"
          type="info"
          show-icon
          banner
        />

        <!-- Apply for Invite Code Section -->
        <a-alert
          :message="$t('auth.inviteVerification.applyTitle')"
          type="warning"
          show-icon
          banner
          class="apply-alert"
        >
          <template #description>
            <div class="apply-description">
              {{ $t('auth.inviteVerification.applyDescription', {
                email: applyEmail
              }) }}
            </div>
            <div class="email-link">
              <a
                :href="`mailto:${applyEmail}`"
                target="_blank"
                class="email-button"
              >
                <MailOutlined />
                {{ applyEmail }}
              </a>
              <a-button
                class="copy-email-button"
                type="default"
                @click="handleCopyEmail"
              >
                <template #icon>
                  <CopyOutlined />
                </template>
                {{ $t('auth.inviteVerification.copyEmail') }}
              </a-button>
            </div>
          </template>
        </a-alert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  CheckOutlined,
  SwapOutlined,
  LogoutOutlined,
  DownOutlined,
  MailOutlined,
  CopyOutlined
} from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'
import LanguageToggle from '@/components/layout/LanguageToggle.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const applyEmail = 'admin@myaichatbox.com'

const errorMessageMap: Record<string, string> = {
  INVITE_REQUIRED: 'auth.inviteVerification.errors.inviteRequired',
  ALREADY_VERIFIED: 'auth.inviteVerification.errors.alreadyVerified',
  INVALID_FORMAT: 'auth.inviteVerification.errors.invalidFormat',
  INVALID_CHECKSUM: 'auth.inviteVerification.errors.invalidChecksum',
  NOT_FOUND: 'auth.inviteVerification.errors.notFound',
  INACTIVE: 'auth.inviteVerification.errors.inactive',
  EXPIRED: 'auth.inviteVerification.errors.expired',
  MAX_USES_REACHED: 'auth.inviteVerification.errors.maxUsesReached',
  ALREADY_USED: 'auth.inviteVerification.errors.alreadyUsed',
  IP_LIMIT_EXCEEDED: 'auth.inviteVerification.errors.ipLimit',
  SERVER_ERROR: 'auth.inviteVerification.errors.serverError'
}

const getLocalizedErrorMessage = (code?: string, fallback?: string) => {
  if (code && errorMessageMap[code]) {
    return t(errorMessageMap[code])
  }

  if (fallback) {
    return fallback
  }

  return t('auth.inviteVerification.verificationFailed')
}

const formData = reactive({
  inviteCode: ''
})

const rules = computed(() => ({
  inviteCode: [
    { required: true, message: t('auth.inviteVerification.enterInviteCode') },
    { pattern: /^[A-Z]{2}-[A-Z0-9]{8}-[A-Z0-9]{2}$/, message: t('auth.inviteVerification.formatHint') }
  ]
}))

// 处理输入变化，自动转换为大写
const handleInputChange = () => {
  formData.inviteCode = formData.inviteCode.toUpperCase()
}

// 验证邀请码
const handleSubmit = async () => {
  if (!formData.inviteCode.trim()) {
    message.error(t('auth.inviteVerification.enterInviteCode'))
    return
  }

  loading.value = true

  try {
    const response = await authStore.apiClient.post('/api/auth/verify-invite', {
      inviteCode: formData.inviteCode
    }, { skipErrorHandler: true })

    message.success(t('auth.inviteVerification.verificationSuccess'))

    // 更新用户信息
    authStore.updateUser(response.data.user)

    // 跳转到主页
    router.push('/')
  } catch (error: any) {
    console.error('Invite verification failed:', error)

    const apiError = error.response?.data
    const errorMessage = getLocalizedErrorMessage(apiError?.code || apiError?.error, apiError?.message)
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}

// 切换账号
const handleSwitchAccount = async () => {
  try {
    await authStore.logout()
    // 登出后跳转到登录页面
    router.push('/login')
  } catch (error) {
    console.error('Switch account failed:', error)
  }
}

// 登出
const handleLogout = async () => {
  try {
    await authStore.logout()
    // 登出后跳转到登录页面
    router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

const handleCopyEmail = async () => {
  const email = applyEmail

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(email)
    } else if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea')
      textarea.value = email
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    } else {
      throw new Error('Clipboard API not available')
    }

    message.success(t('auth.inviteVerification.copySuccess'))
  } catch (error) {
    console.error('Failed to copy email:', error)
    message.error(t('auth.inviteVerification.copyError'))
  }
}

// 检查用户是否已验证邀请码
onMounted(async () => {
  // 等待认证状态完全初始化
  if (!authStore.isInitialized) {
    console.log('[InviteVerification] Auth not initialized, initializing...')
    await authStore.init()
  }

  console.log('[InviteVerification] User state:', {
    user: authStore.user,
    inviteVerified: authStore.user?.inviteVerified,
    isAuthenticated: authStore.isAuthenticated
  })

  // 如果用户已经验证过邀请码，直接跳转到主页
  if (authStore.user?.inviteVerified) {
    console.log('[InviteVerification] User already verified, redirecting to home')
    message.info('您已经验证过邀请码了')
    router.push('/')
    return
  }
})

// Components handle their own state - no additional initialization needed
</script>

<style scoped>
.invite-verification-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--theme-bg-base);
  transition: all 0.3s ease;
  position: relative;
}

/* Settings Controls */
.settings-controls {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1000;
}

.control-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* User Info Section */
.user-info-section {
  display: flex;
  align-items: center;
  margin-right: 8px;
}

.user-info-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  height: auto;
  min-height: 40px;
  border-radius: 8px;
  background: var(--theme-bg-container);
  border: 1px solid var(--theme-border);
  transition: all 0.3s ease;
  color: var(--theme-text);
}

.user-info-button:hover {
  background: var(--theme-bg-hover);
  border-color: var(--theme-icon-text);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.user-avatar-button {
  flex-shrink: 0;
}

.user-name-display {
  font-size: 14px;
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-icon {
  font-size: 12px;
  color: var(--theme-text-secondary);
  transition: transform 0.3s ease;
}

.user-info-button:hover .dropdown-icon {
  transform: translateY(1px);
}

/* User Menu Styles */
.user-menu-info {
  cursor: default !important;
  pointer-events: none !important;
}

.user-details {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px;
  min-width: 200px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-text {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--theme-text);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  font-size: 12px;
  color: var(--theme-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Menu Item Hover Effects */
:deep(.ant-dropdown-menu-item:not(.user-menu-info)) {
  transition: all 0.3s ease;
}

:deep(.ant-dropdown-menu-item:not(.user-menu-info):hover) {
  background: var(--theme-selected-bg);
}

:deep(.ant-dropdown-menu-item-group-title) {
  color: var(--theme-text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.invite-verification-content {
  width: 100%;
  max-width: 400px;
  padding: 48px 40px;
  background: var(--theme-bg-container);
  border-radius: 12px;
  box-shadow:
    0 6px 16px 0 rgba(0, 0, 0, 0.08),
    0 3px 6px -4px rgba(0, 0, 0, 0.12),
    0 9px 28px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--theme-border);
  transition: all 0.3s ease;
}

/* Logo Section */
.logo-section {
  text-align: center;
  margin-bottom: 40px;
}

.logo-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: 24px;
  background: var(--theme-icon-text);
  border-radius: 50%;
  color: white;
  transition: all 0.3s ease;
}

.logo-icon:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(22, 119, 255, 0.2);
}

.title {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
  margin: 0 0 8px 0;
  color: var(--theme-text);
  transition: color 0.3s ease;
}

.subtitle {
  font-size: 16px;
  color: var(--theme-text-secondary);
  margin: 0;
  line-height: 1.5;
  transition: color 0.3s ease;
}

/* Form Section */
.form-section {
  margin-bottom: 32px;
}

.invite-input {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 16px;
  letter-spacing: 2px;
  text-align: center;
  text-transform: uppercase;
  font-weight: 600;
  transition: all 0.3s ease;
}

.invite-input:focus {
  box-shadow: 0 0 0 2px var(--theme-selected-bg);
  border-color: var(--theme-icon-text);
}

.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--theme-text-secondary);
  text-align: center;
  transition: color 0.3s ease;
}

/* Button Group */
.button-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.verify-button {
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.verify-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.3);
}

/* Info Section */
.info-section {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-section :deep(.ant-alert) {
  border-radius: 8px;
  border: 1px solid var(--theme-selected-border);
  background: var(--theme-selected-bg);
}

.info-section :deep(.ant-alert-message) {
  font-size: 14px;
  line-height: 1.5;
  color: var(--theme-text-secondary);
}

/* Apply Alert Styling */
.apply-alert {
  margin-top: 0 !important;
}

.apply-alert :deep(.ant-alert-message) {
  font-weight: 600;
  font-size: 15px;
}

.apply-description {
  margin-bottom: 12px;
  line-height: 1.6;
  color: var(--theme-text-secondary);
}

.email-link {
  display: flex;
  justify-content: flex-start;
  margin-top: 8px;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.email-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--theme-icon-text);
  color: white;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.3s ease;
  border: none;
}

.email-button:hover {
  background: var(--theme-icon-text);
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.3);
  color: white;
}

.email-button:active {
  transform: translateY(0);
}

.copy-email-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  border: 1px solid var(--theme-border);
  color: var(--theme-text);
  background: var(--theme-bg-container);
  transition: all 0.3s ease;
}

.copy-email-button:hover,
.copy-email-button:focus {
  color: var(--theme-text);
  border-color: var(--theme-icon-text);
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.1);
}

.copy-email-button:active {
  transform: translateY(0);
}

/* Form Item Styling */
:deep(.ant-form-item-label > label) {
  font-weight: 600;
  font-size: 14px;
  color: var(--theme-text);
}

:deep(.ant-form-item) {
  margin-bottom: 24px;
}

/* Dark Mode Enhancements are now handled by theme variables */

/* Responsive Design */
@media (max-width: 768px) {
  .invite-verification-container {
    padding: 16px;
  }

  .invite-verification-content {
    padding: 32px 24px;
    max-width: 350px;
  }

  .title {
    font-size: 24px;
  }

  .subtitle {
    font-size: 14px;
  }

  .logo-icon {
    width: 64px;
    height: 64px;
    margin-bottom: 20px;
  }

  .settings-controls {
    top: 16px;
    right: 16px;
  }

  .control-buttons {
    gap: 8px;
  }

  /* Mobile User Info Adjustments */
  .user-info-button {
    padding: 4px 8px;
    min-height: 36px;
  }

  .user-name-display {
    max-width: 80px;
    font-size: 13px;
  }

  .user-details {
    min-width: 180px;
    padding: 6px 4px;
  }

  .user-name {
    font-size: 13px;
  }

  .user-email {
    font-size: 11px;
  }
}

/* Animation */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.invite-verification-content {
  animation: fadeInUp 0.6s ease-out;
}

.logo-section,
.form-section,
.info-section {
  animation: fadeInUp 0.6s ease-out;
  animation-fill-mode: both;
}

.form-section {
  animation-delay: 0.1s;
}

.info-section {
  animation-delay: 0.2s;
}
</style>
