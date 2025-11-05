<template>
  <a-button
    type="default"
    size="large"
    block
    :loading="loading"
    @click="handleGitHubLogin"
    class="social-signin-btn social-signin-btn--github"
  >
    <template #icon>
      <GithubOutlined />
    </template>
    {{ t('auth.social.github') }}
  </a-button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GithubOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { apiClient } from '@/utils/api'
import { useI18n } from 'vue-i18n'

const loading = ref(false)
const { t } = useI18n()

const handleGitHubLogin = async () => {
  try {
    loading.value = true

    const response = await apiClient.get<{ url: string; state: string }>(
      '/api/auth/social/github/url',
      { skipAuth: true }
    )

    sessionStorage.setItem('github_oauth_state', response.data.state)

    window.location.href = response.data.url
  } catch (error: any) {
    console.error('Failed to initiate GitHub login:', error)
    message.error(t('auth.social.errors.githubInit'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.social-signin-btn {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background-color: #ffffff;
  color: #24292e;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, background-color 0.2s ease;
  box-shadow: none;
}

.social-signin-btn:hover {
  border-color: rgba(99, 102, 241, 0.45);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.12);
  color: #1f2937;
}

.social-signin-btn:focus {
  border-color: rgba(79, 70, 229, 0.6);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
}

.dark .social-signin-btn {
  background-color: rgba(255, 255, 255, 0.08);
  border-color: rgba(148, 163, 184, 0.35);
  color: #f8fafc;
}

.dark .social-signin-btn:hover {
  border-color: rgba(129, 140, 248, 0.6);
  box-shadow: 0 6px 18px rgba(129, 140, 248, 0.2);
  color: #f9fafb;
}

:deep(.ant-btn-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.ant-btn-icon svg) {
  font-size: 18px;
}

.dark :deep(.ant-btn-icon svg) {
  color: #f8fafc;
}
</style>
