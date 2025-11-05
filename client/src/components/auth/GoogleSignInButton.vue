<template>
  <a-button
    type="default"
    size="large"
    block
    :loading="loading"
    :disabled="!googleReady"
    @click="handleGoogleLogin"
    class="social-signin-btn social-signin-btn--google"
  >
    <template #icon>
      <svg
        class="google-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 18 18"
        aria-hidden="true"
      >
        <path
          d="M17.64 9.2045c0-.6395-.0573-1.2527-.1636-1.8409H9v3.4818h4.8409c-.2091 1.1277-.8455 2.0841-1.7954 2.7268v2.2681h2.9086c1.7027-1.5681 2.6864-3.8772 2.6864-6.6368Z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.43 0 4.4673-.8068 5.9563-2.1591l-2.9086-2.2681c-.8068.5414-1.8377.8623-3.0477.8623-2.3455 0-4.3322-1.5841-5.0391-3.7136H.956299v2.3319C2.4377 15.8123 5.48182 18 9 18Z"
          fill="#34A853"
        />
        <path
          d="M3.96091 10.7214c-.18273-.5414-.28636-1.1186-.28636-1.7214 0-.6027.10363-1.18.28636-1.7214V4.94682H.956364C.347727 6.15682 0 7.54 0 9c0 1.46.347727 2.8432.956364 4.0532l3.004546-2.3318Z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.57955c1.3214 0 2.5064.45454 3.4377 1.34545l2.5786-2.57863C13.4645.902727 11.4273 0 9 0 5.48182 0 2.43773 2.18727.956364 5.05364L3.96091 7.38545C4.66773 5.25591 6.65455 3.57955 9 3.57955Z"
          fill="#EA4335"
        />
      </svg>
    </template>
    {{ t('auth.social.google') }}
  </a-button>
</template>

<script setup lang="ts">
import { onMounted, computed, onBeforeUnmount, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'

const authStore = useAuthStore()
const router = useRouter()
const { t } = useI18n()

const googleClientId = computed(() => import.meta.env.VITE_GOOGLE_CLIENT_ID)
const loading = ref(false)
const googleReady = ref(false)

const loadGoogleScript = () => {
  if (document.getElementById('google-identity-script')) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = 'google-identity-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

const handleGoogleCredential = async (response: any) => {
  try {
    const result = await authStore.loginWithGoogle(response.credential)

    if (result.success) {
      message.success(t('auth.social.messages.googleSuccess'))
      router.push('/')
    } else if (result.code === 'INVITE_REQUIRED') {
      message.warning(t('auth.social.messages.inviteRequired'))
    }
  } catch (error: any) {
    console.error('Google login failed:', error)
    message.error(error.message || t('auth.social.messages.googleFailure'))
  } finally {
    loading.value = false
  }
}

const initializeGoogle = () => {
  const google = (window as any).google

  if (!google) {
    return
  }

  google.accounts.id.initialize({
    client_id: googleClientId.value,
    callback: handleGoogleCredential,
    ux_mode: 'popup',
  })

  googleReady.value = true
}

const handleGoogleLogin = () => {
  if (!googleReady.value || !(window as any).google?.accounts?.id) {
    message.error(t('auth.social.errors.googleInit'))
    return
  }

  loading.value = true

  ;(window as any).google.accounts.id.prompt((notification: any) => {
    if (notification.isNotDisplayed()) {
      loading.value = false
      message.error(t('auth.social.errors.googleInit'))
    }

    if (notification.isSkippedMoment()) {
      loading.value = false
    }
  })
}

onMounted(async () => {
  try {
    await loadGoogleScript()

    if ((window as any).google) {
      initializeGoogle()
    } else {
      message.error(t('auth.social.errors.googleInit'))
    }
  } catch (error) {
    console.error('Failed to load Google Sign-In:', error)
    message.error(t('auth.social.errors.googleInit'))
  }
})

onBeforeUnmount(() => {
  if ((window as any).google?.accounts?.id) {
    ;(window as any).google.accounts.id.cancel()
  }
})
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
  color: #1f2937;
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

.social-signin-btn:disabled {
  border-color: rgba(148, 163, 184, 0.35);
  color: rgba(15, 23, 42, 0.45);
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

.google-icon {
  display: block;
}

:deep(.ant-btn-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark :deep(.ant-btn-icon svg) {
  color: #f8fafc;
}
</style>
