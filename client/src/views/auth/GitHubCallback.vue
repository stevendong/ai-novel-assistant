<template>
  <div class="callback-page">
    <div class="callback-container">
      <a-spin size="large" />
      <p class="callback-message">{{ statusMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message as antMessage } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { t } = useI18n()
const statusMessage = ref(t('auth.social.status.githubProcessing'))

onMounted(async () => {
  try {
    const code = route.query.code as string
    const state = route.query.state as string
    const error = route.query.error as string

    if (error) {
      if (error === 'access_denied') {
        antMessage.warning(t('auth.social.messages.githubCancelled'))
      } else {
        antMessage.error(t('auth.social.errors.githubAuthorize', { error }))
      }
      router.push('/login')
      return
    }

    if (!code) {
      antMessage.error(t('auth.social.errors.githubMissingCode'))
      router.push('/login')
      return
    }

    const savedState = sessionStorage.getItem('github_oauth_state')
    if (state !== savedState) {
      antMessage.error(t('auth.social.errors.stateMismatch'))
      router.push('/login')
      return
    }

    sessionStorage.removeItem('github_oauth_state')

    statusMessage.value = t('auth.social.status.githubFetching')
    const result = await authStore.loginWithGitHub(code, undefined, state)

    if (result.success) {
      antMessage.success(t('auth.social.messages.githubSuccess'))
      const redirectTarget = (route.query.redirect as string) || '/'
      const inviteVerified = result.data?.user?.inviteVerified ?? authStore.user.value?.inviteVerified
      router.push(inviteVerified ? redirectTarget : '/invite-verification')
    } else {
      if (result.code === 'INVITE_REQUIRED') {
        antMessage.warning(t('auth.social.messages.inviteRequired'))
        router.push({
          path: '/invite-verification'
        })
      } else {
        antMessage.error(result.error || t('auth.social.messages.githubFailure'))
        router.push('/login')
      }
    }
  } catch (error: any) {
    console.error('GitHub callback error:', error)
    antMessage.error(t('auth.social.errors.githubProcess'))
    router.push('/login')
  }
})
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.dark .callback-page {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.callback-container {
  text-align: center;
  background: white;
  padding: 48px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.dark .callback-container {
  background: var(--theme-bg-container);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.callback-message {
  margin-top: 24px;
  font-size: 16px;
  color: #666;
}

.dark .callback-message {
  color: var(--theme-text-secondary);
}
</style>
