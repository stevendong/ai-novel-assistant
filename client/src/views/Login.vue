<template>
  <div class="login-page">
    <!-- 页面顶部控制栏 -->
    <div class="login-controls">
      <div class="control-buttons">
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </div>

    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h2>{{ isLogin ? $t('auth.loginTitle') : $t('auth.registerTitle') }}</h2>
          <p>{{ isLogin ? $t('auth.loginSubtitle') : $t('auth.registerSubtitle') }}</p>
        </div>

        <a-form
          @submit="handleSubmit"
          layout="vertical"
          class="login-form"
        >
          <a-form-item
            v-if="!isLogin"
            :label="t('auth.username')"
            :rules="[
              { required: true, message: t('auth.enterUsername') },
              { min: 3, max: 20, message: t('auth.usernameRules') },
              { pattern: /^[a-zA-Z0-9_]+$/, message: t('auth.usernamePattern') }
            ]"
          >
            <a-input
              v-model:value="formData.username"
              :placeholder="t('auth.enterUsername')"
              size="large"
              :disabled="authStore.isLoading"
            >
              <template #prefix>
                <UserOutlined />
              </template>
            </a-input>
          </a-form-item>

          <a-form-item
            :label="isLogin ? t('auth.emailOrUsername') : t('auth.email')"
            :rules="[
              { required: true, message: isLogin ? t('auth.enterEmailOrUsername') : t('auth.enterEmail') },
              ...(isLogin ? [] : [{ type: 'email', message: t('auth.emailRule') }])
            ]"
          >
            <a-input
              v-model:value="formData.identifier"
              :placeholder="isLogin ? t('auth.enterEmailOrUsername') : t('auth.enterEmail')"
              size="large"
              :disabled="authStore.isLoading"
            >
              <template #prefix>
                <MailOutlined />
              </template>
            </a-input>
          </a-form-item>

          <a-form-item
            :label="t('auth.password')"
            :rules="[
              { required: true, message: t('auth.enterPassword') },
              { min: 6, message: t('auth.passwordRule') }
            ]"
          >
            <a-input-password
              v-model:value="formData.password"
              :placeholder="t('auth.enterPassword')"
              size="large"
              :disabled="authStore.isLoading"
            >
              <template #prefix>
                <LockOutlined />
              </template>
            </a-input-password>
          </a-form-item>

          <a-form-item
            v-if="!isLogin"
            :label="t('auth.confirmPassword')"
            :rules="[
              { required: true, message: t('auth.confirmPasswordRule') },
              { validator: validatePasswordConfirm }
            ]"
          >
            <a-input-password
              v-model:value="formData.confirmPassword"
              :placeholder="t('auth.enterConfirmPassword')"
              size="large"
              :disabled="authStore.isLoading"
            >
              <template #prefix>
                <LockOutlined />
              </template>
            </a-input-password>
          </a-form-item>

          <a-form-item v-if="!isLogin" :label="t('auth.nickname')">
            <a-input
              v-model:value="formData.nickname"
              :placeholder="t('auth.enterNickname')"
              size="large"
              :disabled="authStore.isLoading"
            >
              <template #prefix>
                <UserOutlined />
              </template>
            </a-input>
          </a-form-item>

          <!-- Remember me checkbox for login -->
          <a-form-item v-if="isLogin">
            <a-checkbox v-model:checked="formData.rememberMe">
              {{ t('auth.rememberMe') }}
            </a-checkbox>
          </a-form-item>

          <a-form-item>
            <a-button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="authStore.isLoading"
            >
              {{ isLogin ? t('auth.loginButton') : t('auth.registerButton') }}
            </a-button>
          </a-form-item>

          <div class="login-footer">
            <a-button
              type="link"
              @click="toggleMode"
              :disabled="authStore.isLoading"
            >
              {{ isLogin ? t('auth.switchToRegister') : t('auth.switchToLogin') }}
            </a-button>
          </div>
        </a-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Form, message } from 'ant-design-vue'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'
import LanguageToggle from '@/components/layout/LanguageToggle.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const isLogin = ref(true)

const formData = reactive({
  username: '',
  identifier: '',  // email or username for login
  password: '',
  confirmPassword: '',
  nickname: '',
  rememberMe: false
})

const validatePasswordConfirm = (rule, value) => {
  if (value && value !== formData.password) {
    return Promise.reject(t('auth.passwordMismatch'))
  }
  return Promise.resolve()
}

const toggleMode = () => {
  isLogin.value = !isLogin.value

  // 清空表单数据
  Object.keys(formData).forEach(key => {
    if (key === 'rememberMe') {
      formData[key] = false
    } else {
      formData[key] = ''
    }
  })

  // 如果切换到登录模式，恢复记住的用户信息
  if (isLogin.value) {
    const rememberedIdentifier = localStorage.getItem('rememberedIdentifier')
    if (rememberedIdentifier) {
      formData.identifier = rememberedIdentifier
      formData.rememberMe = true
    }
  }
}

const handleSubmit = async (e) => {
  e.preventDefault()

  try {
    // Basic validation
    if (!formData.identifier || !formData.password) {
      message.error(isLogin.value ? t('auth.fillLoginRequired') : t('auth.fillRequired'))
      return
    }

    if (!isLogin.value && !formData.username) {
      message.error(t('auth.enterUsername'))
      return
    }

    if (isLogin.value) {
      const result = await authStore.login({
        identifier: formData.identifier,
        password: formData.password,
        rememberMe: formData.rememberMe
      })

      if (result.success) {
        // 处理记住我功能
        if (formData.rememberMe) {
          localStorage.setItem('rememberedIdentifier', formData.identifier)
        } else {
          localStorage.removeItem('rememberedIdentifier')
        }

        const redirect = router.currentRoute.value.query.redirect || '/'
        router.push(redirect)
      }
    } else {
      if (formData.password !== formData.confirmPassword) {
        message.error(t('auth.passwordMismatch'))
        return
      }

      const result = await authStore.register({
        username: formData.username,
        email: formData.identifier,
        password: formData.password,
        nickname: formData.nickname || formData.username
      })

      if (result.success) {
        router.push('/')
      }
    }
  } catch (error) {
    console.error('Form submission failed:', error)
  }
}

onMounted(() => {
  // 初始化认证状态
  authStore.init()

  // 初始化主题
  themeStore.initTheme()

  // 恢复记住的用户信息
  const rememberedIdentifier = localStorage.getItem('rememberedIdentifier')
  if (rememberedIdentifier) {
    formData.identifier = rememberedIdentifier
    formData.rememberMe = true
  }

  if (authStore.isAuthenticated) {
    const redirect = router.currentRoute.value.query.redirect || '/'
    router.push(redirect)
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  transition: all 0.3s ease;
  position: relative;
}

/* 页面顶部控制栏 */
.login-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

.control-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 控制按钮样式优化 */
.login-controls :deep(.header-action-btn) {
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(10px);
  border-radius: 8px !important;
  transition: all 0.3s ease !important;
}

.login-controls :deep(.header-action-btn):hover {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
  color: white !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

/* 语言切换按钮特殊样式 */
.login-controls :deep(.language-toggle-btn) {
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: rgba(255, 255, 255, 0.9) !important;
}

.login-controls :deep(.language-toggle-btn):hover {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.login-controls :deep(.language-label) {
  color: inherit !important;
}

/* 暗黑模式背景渐变 */
.dark .login-page {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.login-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

/* 暗黑模式卡片 */
.dark .login-card {
  background: var(--theme-bg-container);
  border-color: var(--theme-border);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: bold;
  color: #1a202c;
  transition: color 0.3s ease;
}

/* 暗黑模式标题 */
.dark .login-header h2 {
  color: var(--theme-text);
}

.login-header p {
  margin: 8px 0 0 0;
  color: #718096;
  font-size: 14px;
  transition: color 0.3s ease;
}

/* 暗黑模式描述 */
.dark .login-header p {
  color: var(--theme-text-secondary);
}

.login-form {
  width: 100%;
}

.login-footer {
  text-align: center;
  margin-top: 16px;
}

/* 表单标签 */
:deep(.ant-form-item-label) {
  padding: 0;
}

:deep(.ant-form-item-label > label) {
  color: var(--theme-text);
  transition: color 0.3s ease;
}

.dark :deep(.ant-form-item-label > label) {
  color: var(--theme-text);
}

:deep(.ant-form-item) {
  margin-bottom: 20px;
}

/* 输入框样式 */
:deep(.ant-input-affix-wrapper) {
  border-radius: 8px;
  border-color: #d1d5db;
  transition: all 0.3s ease;
}

.dark :deep(.ant-input-affix-wrapper) {
  border-color: var(--theme-border);
  background-color: var(--theme-bg-elevated);
}

.dark :deep(.ant-input-affix-wrapper:hover) {
  border-color: #4db8ff;
}

.dark :deep(.ant-input-affix-wrapper-focused) {
  border-color: #4db8ff;
  box-shadow: 0 0 0 2px rgba(77, 184, 255, 0.2);
}

:deep(.ant-input) {
  border-radius: 8px;
  border-color: #d1d5db;
  transition: all 0.3s ease;
}

.dark :deep(.ant-input) {
  border-color: var(--theme-border);
  background-color: var(--theme-bg-elevated);
  color: var(--theme-text);
}

.dark :deep(.ant-input:hover) {
  border-color: #4db8ff;
}

.dark :deep(.ant-input:focus) {
  border-color: #4db8ff;
  box-shadow: 0 0 0 2px rgba(77, 184, 255, 0.2);
}

/* 输入框前缀图标 */
.dark :deep(.ant-input-prefix) {
  color: var(--theme-text-secondary);
}

/* 主按钮 */
:deep(.ant-btn-primary) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  height: 44px;
  font-weight: 600;
  transition: all 0.3s ease;
}

:deep(.ant-btn-primary:hover) {
  background: linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%);
}

/* 暗黑模式主按钮 */
.dark :deep(.ant-btn-primary) {
  background: linear-gradient(135deg, #4db8ff 0%, #1890ff 100%);
}

.dark :deep(.ant-btn-primary:hover) {
  background: linear-gradient(135deg, #73c7ff 0%, #40a9ff 100%);
}

/* 链接按钮 */
:deep(.ant-btn-link) {
  color: #667eea;
  transition: color 0.3s ease;
}

:deep(.ant-btn-link:hover) {
  color: #5a6fd8;
}

.dark :deep(.ant-btn-link) {
  color: #4db8ff;
}

.dark :deep(.ant-btn-link:hover) {
  color: #73c7ff;
}

/* 响应式设计 - 移动端优化 */
@media (max-width: 768px) {
  .login-controls {
    top: 15px;
    right: 15px;
  }

  .control-buttons {
    gap: 8px;
  }

  .login-controls :deep(.header-action-btn) {
    min-width: 32px !important;
    padding: 6px !important;
  }

  .login-controls :deep(.language-toggle-btn) {
    min-width: 32px !important;
  }

  .login-controls :deep(.language-label) {
    display: none !important;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 10px;
  }

  .login-controls {
    top: 10px;
    right: 10px;
  }

  .control-buttons {
    gap: 6px;
  }
}
</style>
