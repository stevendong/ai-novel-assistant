<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h2>{{ isLogin ? '登录' : '注册' }}</h2>
          <p>{{ isLogin ? '欢迎回到AI小说助手' : '创建您的AI小说助手账户' }}</p>
        </div>

        <a-form
          :form="form"
          @submit="handleSubmit"
          layout="vertical"
          class="login-form"
        >
          <a-form-item
            v-if="!isLogin"
            label="用户名"
            :rules="[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度为3-20个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
            ]"
          >
            <a-input
              v-model:value="formData.username"
              placeholder="请输入用户名"
              size="large"
              :disabled="authStore.isLoading"
            >
              <template #prefix>
                <UserOutlined />
              </template>
            </a-input>
          </a-form-item>

          <a-form-item
            label="邮箱"
            :rules="[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]"
          >
            <a-input
              v-model:value="formData.identifier"
              placeholder="请输入邮箱地址"
              size="large"
              :disabled="authStore.isLoading"
            >
              <template #prefix>
                <MailOutlined />
              </template>
            </a-input>
          </a-form-item>

          <a-form-item
            label="密码"
            :rules="[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]"
          >
            <a-input-password
              v-model:value="formData.password"
              placeholder="请输入密码"
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
            label="确认密码"
            :rules="[
              { required: true, message: '请确认密码' },
              { validator: validatePasswordConfirm }
            ]"
          >
            <a-input-password
              v-model:value="formData.confirmPassword"
              placeholder="请再次输入密码"
              size="large"
              :disabled="authStore.isLoading"
            >
              <template #prefix>
                <LockOutlined />
              </template>
            </a-input-password>
          </a-form-item>

          <a-form-item v-if="!isLogin" label="昵称（可选）">
            <a-input
              v-model:value="formData.nickname"
              placeholder="请输入昵称"
              size="large"
              :disabled="authStore.isLoading"
            >
              <template #prefix>
                <UserOutlined />
              </template>
            </a-input>
          </a-form-item>

          <a-form-item>
            <a-button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="authStore.isLoading"
            >
              {{ isLogin ? '登录' : '注册' }}
            </a-button>
          </a-form-item>

          <div class="login-footer">
            <a-button
              type="link"
              @click="toggleMode"
              :disabled="authStore.isLoading"
            >
              {{ isLogin ? '还没有账户？立即注册' : '已有账户？立即登录' }}
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
import { Form, message } from 'ant-design-vue'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isLogin = ref(true)
const form = Form.useForm()

const formData = reactive({
  username: '',
  identifier: '',  // email or username for login
  password: '',
  confirmPassword: '',
  nickname: ''
})

const validatePasswordConfirm = (rule, value) => {
  if (value && value !== formData.password) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

const toggleMode = () => {
  isLogin.value = !isLogin.value

  Object.keys(formData).forEach(key => {
    formData[key] = ''
  })

  form.resetFields()
}

const handleSubmit = async (e) => {
  e.preventDefault()

  try {
    await form.validate()

    if (isLogin.value) {
      const result = await authStore.login({
        identifier: formData.identifier,
        password: formData.password
      })

      if (result.success) {
        const redirect = router.currentRoute.value.query.redirect || '/'
        router.push(redirect)
      }
    } else {
      if (formData.password !== formData.confirmPassword) {
        message.error('两次输入的密码不一致')
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
    console.error('Form validation failed:', error)
  }
}

onMounted(() => {
  authStore.init()

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
  align-items: center;
  justify-content: center;
  padding: 20px;
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
}

.login-header p {
  margin: 8px 0 0 0;
  color: #718096;
  font-size: 14px;
}

.login-form {
  width: 100%;
}

.login-footer {
  text-align: center;
  margin-top: 16px;
}

:deep(.ant-form-item-label) {
  padding: 0;
}

:deep(.ant-form-item) {
  margin-bottom: 20px;
}

:deep(.ant-input-affix-wrapper) {
  border-radius: 8px;
}

:deep(.ant-input) {
  border-radius: 8px;
}

:deep(.ant-btn-primary) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  height: 44px;
  font-weight: 600;
}

:deep(.ant-btn-primary:hover) {
  background: linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%);
}

:deep(.ant-btn-link) {
  color: #667eea;
}

:deep(.ant-btn-link:hover) {
  color: #5a6fd8;
}
</style>