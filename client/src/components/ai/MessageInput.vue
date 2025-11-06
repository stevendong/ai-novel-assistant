<template>
  <div class="message-input-component">
    <div class="input-container">
      <div class="input-wrapper">
        <a-textarea
            ref="inputRef"
            v-model:value="inputText"
            :placeholder="inputPlaceholder"
            :disabled="disabled"
            :auto-size="{ minRows: 1, maxRows: 4 }"
            class="message-input"
            @keydown="handleKeyDown"
            @input="handleInputChange"
        />
        <div class="input-actions">
          <a-tooltip v-if="showImageButton" :title="t('aiChat.messageInput.actions.image')">
            <a-button type="text" size="small" class="input-action-btn" @click="handleImageUpload">
              <PictureOutlined />
            </a-button>
          </a-tooltip>
          <a-tooltip v-if="showVoiceButton" :title="t('aiChat.messageInput.actions.voice')">
            <a-button type="text" size="small" class="input-action-btn" @click="handleVoiceInput">
              <AudioOutlined />
            </a-button>
          </a-tooltip>
          <a-button
              type="primary"
              size="small"
              class="send-btn"
              :disabled="!canSend"
              :loading="isLoading"
              @click="handleSend"
          >
            <SendOutlined />
          </a-button>
        </div>
      </div>
      <div class="input-hint">
        <span class="hint-text">{{ hintText }}</span>
        <span class="char-count">{{ inputText.length }}/{{ maxLength }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { SendOutlined, PictureOutlined, AudioOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'

interface Props {
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  maxLength?: number
  showImageButton?: boolean
  showVoiceButton?: boolean
  modelValue?: string
}

interface Emits {
  (e: 'send', message: string): void
  (e: 'input', text: string): void
  (e: 'update:modelValue', value: string): void
  (e: 'image-upload'): void
  (e: 'voice-input'): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  disabled: false,
  isLoading: false,
  maxLength: 2000,
  showImageButton: false,
  showVoiceButton: false,
  modelValue: ''
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

// Refs
const inputRef = ref()
const inputText = ref(props.modelValue)

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  inputText.value = newValue
})

// 监听内部值变化，向外通知
watch(inputText, (newValue) => {
  emit('update:modelValue', newValue)
  emit('input', newValue)
})

// 计算属性
const inputPlaceholder = computed(() => props.placeholder || t('aiChat.messageInput.placeholder'))

const canSend = computed(() => {
  return !props.disabled &&
         inputText.value.trim().length > 0 &&
         inputText.value.length <= props.maxLength
})

const hintText = computed(() => {
  if (inputText.value.length > props.maxLength * 0.9) {
    return t('aiChat.messageInput.hint.nearLimit')
  }
  return t('aiChat.messageInput.hint.shortcuts')
})

// 方法
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    if (e.ctrlKey) {
      e.preventDefault()
      handleSend()
    } else if (e.shiftKey) {
      // Allow line break
      return
    } else {
      e.preventDefault()
      handleSend()
    }
  }
}

const handleInputChange = () => {
  // 可以在这里添加其他输入处理逻辑
}

const handleSend = () => {
  if (canSend.value) {
    const message = inputText.value.trim()
    emit('send', message)
    inputText.value = ''

    // 重新聚焦输入框
    nextTick(() => {
      if (inputRef.value) {
        inputRef.value.focus()
      }
    })
  }
}

const handleImageUpload = () => {
  emit('image-upload')
}

const handleVoiceInput = () => {
  emit('voice-input')
}

// 对外暴露的方法
const focus = () => {
  if (inputRef.value) {
    inputRef.value.focus()
  }
}

const clear = () => {
  inputText.value = ''
}

const insertText = (text: string) => {
  inputText.value += text
}

defineExpose({
  focus,
  clear,
  insertText
})
</script>

<style scoped>
.message-input-component {
  flex-shrink: 0;
  background: var(--theme-bg-elevated);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-top: none;
  border-radius: 0 0 12px 12px;
  backdrop-filter: blur(10px);
}

.input-container {
  padding: 16px;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background: var(--theme-bg-container);
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  padding: 12px;
  transition: all 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.message-input {
  flex: 1;
  border: none;
  background: transparent;
  resize: none;
  font-size: 14px;
  line-height: 1.6;
  color: var(--theme-text);
  min-height: 20px;
}

.message-input:focus {
  box-shadow: none;
  outline: none;
}

.message-input::placeholder {
  color: var(--theme-text-secondary);
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-action-btn {
  padding: 4px;
  border: none;
  background: transparent;
  color: var(--theme-text-secondary);
  transition: all 0.2s ease;
}

.input-action-btn:hover {
  color: var(--theme-text-secondary);
  background-color: var(--theme-bg-elevated);
}

.send-btn {
  padding: 4px 8px;
  height: 28px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.hint-text {
  flex: 1;
}

.char-count {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  opacity: 0.7;
}

/* 字数警告样式 */
.char-count {
  color: var(--theme-text-secondary);
}

.message-input-component .char-count {
  color: #ff4d4f;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .input-container {
    padding: 12px;
  }

  .input-wrapper {
    padding: 8px;
    gap: 8px;
  }

  .message-input {
    font-size: 16px; /* 防止移动端缩放 */
  }
}

/* 暗色模式适配 */
.dark .message-input-component {
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .input-wrapper {
  border-color: rgba(255, 255, 255, 0.15);
}

.dark .input-wrapper:focus-within {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.3);
}
</style>
