<template>
  <div class="invite-verification-container">
    <!-- Settings Controls -->
    <div class="settings-controls">
      <div class="control-buttons">
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  CheckOutlined
} from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'
import LanguageToggle from '@/components/layout/LanguageToggle.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)

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
    })

    message.success(t('auth.inviteVerification.verificationSuccess'))

    // 更新用户信息
    authStore.updateUser(response.data.user)

    // 跳转到主页
    router.push('/')
  } catch (error: any) {
    console.error('Invite verification failed:', error)

    const errorMessage = error.response?.data?.message || t('auth.inviteVerification.verificationFailed')
    message.error(errorMessage)
  } finally {
    loading.value = false
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
