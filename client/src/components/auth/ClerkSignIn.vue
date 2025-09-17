<template>
  <div class="clerk-signin-wrapper">
    <div class="clerk-signin-container">
      <div class="clerk-signin-header">
        <h2>登录 AI 小说助手</h2>
        <p>使用您的账户登录，开始创作之旅</p>
      </div>

      <div class="clerk-signin-content">
        <SignIn
          :routing="'hash'"
          :afterSignInUrl="afterSignInUrl"
          :signUpUrl="signUpUrl"
        />
      </div>

      <div class="clerk-signin-footer">
        <p>
          还没有账户？
          <a @click="goToSignUp" class="signup-link">立即注册</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SignIn } from '@clerk/vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 配置
const afterSignInUrl = ref('/')
const signUpUrl = ref('/signup')

// 方法
const goToSignUp = () => {
  router.push('/signup')
}
</script>

<style scoped>
.clerk-signin-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.clerk-signin-container {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.clerk-signin-header {
  text-align: center;
  margin-bottom: 2rem;
}

.clerk-signin-header h2 {
  color: #1a1a1a;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.clerk-signin-header p {
  color: #666;
  margin: 0;
}

.clerk-signin-content {
  margin-bottom: 1.5rem;
}

.clerk-signin-footer {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.clerk-signin-footer p {
  margin: 0;
  color: #666;
}

.signup-link {
  color: #667eea;
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
}

.signup-link:hover {
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
