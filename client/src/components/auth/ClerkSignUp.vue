<template>
  <div class="clerk-signup-wrapper">
    <div class="clerk-signup-container">
      <div class="clerk-signup-header">
        <h2>注册 AI 小说助手</h2>
        <p>创建账户，开始您的创作之旅</p>
      </div>

      <div class="clerk-signup-content">
        <SignUp
          :routing="'hash'"
          :afterSignUpUrl="afterSignUpUrl"
          :signInUrl="signInUrl"
        />
      </div>

      <div class="clerk-signup-footer">
        <p>
          已有账户？
          <a @click="goToSignIn" class="signin-link">立即登录</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SignUp } from '@clerk/vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 配置
const afterSignUpUrl = ref('/')
const signInUrl = ref('/login')

// 方法
const goToSignIn = () => {
  router.push('/login')
}
</script>

<style scoped>
.clerk-signup-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.clerk-signup-container {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.clerk-signup-header {
  text-align: center;
  margin-bottom: 2rem;
}

.clerk-signup-header h2 {
  color: #1a1a1a;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.clerk-signup-header p {
  color: #666;
  margin: 0;
}

.clerk-signup-content {
  margin-bottom: 1.5rem;
}

.clerk-signup-footer {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.clerk-signup-footer p {
  margin: 0;
  color: #666;
}

.signin-link {
  color: #667eea;
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
}

.signin-link:hover {
  text-decoration: underline;
}

/* 自定义 Clerk 组件样式 */
:deep(.cl-rootBox) {
  width: 100%;
}

:deep(.cl-card) {
  box-shadow: none;
  border: none;
}

:deep(.cl-headerTitle) {
  display: none;
}

:deep(.cl-headerSubtitle) {
  display: none;
}

:deep(.cl-socialButtonsBlockButton) {
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

:deep(.cl-formFieldInput) {
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

:deep(.cl-formButtonPrimary) {
  background: #667eea;
  border-radius: 8px;
}

:deep(.cl-formButtonPrimary:hover) {
  background: #5a67d8;
}
</style>
