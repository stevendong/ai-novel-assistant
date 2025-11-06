<template>
  <div v-if="isEnabled" class="turnstile-widget">
    <div ref="turnstileContainer" class="cf-turnstile"></div>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  siteKey?: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [token: string]
  'verified': [token: string]
  'error': [error: string]
  'expired': []
}>()

const turnstileContainer = ref<HTMLDivElement | null>(null)
const widgetId = ref<string | null>(null)
const error = ref<string>('')
const isScriptLoaded = ref(false)

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

const siteKey = props.siteKey || import.meta.env.VITE_TURNSTILE_SITE_KEY
const isEnabled = ref(!!siteKey)

const loadTurnstileScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      isScriptLoaded.value = true
      resolve()
      return
    }

    if (document.querySelector(`script[src="${TURNSTILE_SCRIPT_URL}"]`)) {
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval)
          isScriptLoaded.value = true
          resolve()
        }
      }, 100)
      setTimeout(() => {
        clearInterval(checkInterval)
        if (!window.turnstile) {
          reject(new Error('Turnstile script loading timeout'))
        }
      }, 10000)
      return
    }

    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true
    script.defer = true

    script.onload = () => {
      isScriptLoaded.value = true
      resolve()
    }

    script.onerror = () => {
      reject(new Error('Failed to load Turnstile script'))
    }

    document.head.appendChild(script)
  })
}

const renderWidget = () => {
  if (!turnstileContainer.value || !window.turnstile || !isEnabled.value) return

  try {
    widgetId.value = window.turnstile.render(turnstileContainer.value, {
      sitekey: siteKey,
      theme: props.theme || 'auto',
      size: props.size || 'normal',
      callback: (token: string) => {
        error.value = ''
        emit('update:modelValue', token)
        emit('verified', token)
      },
      'error-callback': () => {
        error.value = 'Verification failed. Please try again.'
        emit('error', error.value)
      },
      'expired-callback': () => {
        emit('update:modelValue', '')
        emit('expired')
      }
    })
  } catch (err) {
    error.value = 'Failed to initialize verification widget'
    emit('error', error.value)
    console.error('Turnstile render error:', err)
  }
}

const reset = () => {
  if (widgetId.value !== null && window.turnstile) {
    window.turnstile.reset(widgetId.value)
    emit('update:modelValue', '')
  }
}

const remove = () => {
  if (widgetId.value !== null && window.turnstile) {
    window.turnstile.remove(widgetId.value)
    widgetId.value = null
  }
}

watch(() => props.theme, () => {
  if (widgetId.value !== null) {
    remove()
    setTimeout(renderWidget, 100)
  }
})

onMounted(async () => {
  if (!isEnabled.value) {
    return
  }

  try {
    await loadTurnstileScript()
    renderWidget()
  } catch (err) {
    error.value = 'Failed to load verification system'
    emit('error', error.value)
    console.error('Turnstile initialization error:', err)
  }
})

onBeforeUnmount(() => {
  remove()
})

defineExpose({
  reset,
  remove,
  isEnabled
})

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: any) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}
</script>

<style scoped>
.turnstile-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 16px 0;
}

.cf-turnstile {
  width: 100%;
  display: flex;
  justify-content: center;
}

.error-message {
  margin-top: 8px;
  color: #ff4d4f;
  font-size: 14px;
  text-align: center;
}
</style>
