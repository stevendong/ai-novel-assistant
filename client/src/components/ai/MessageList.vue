<template>
  <div
    ref="messagesContainer"
    class="messages-area"
    @scroll="handleScroll"
  >
    <div class="messages-wrapper">
      <!-- 欢迎消息 -->
      <div class="welcome-message" v-if="messages.length === 1">
        <div class="welcome-icon">
          <RobotOutlined />
        </div>
        <div class="welcome-content">
          <h3>AI创作助手</h3>
          <p>{{ modeDescription }}</p>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="message-list">
        <MessageItem
          v-for="message in messages"
          :key="message.id"
          :message="message"
          :is-deleting="deletingMessageId === message.id"
          @delete="handleDeleteMessage"
          @copy="copyMessage"
          @regenerate="regenerateMessage"
          @apply-suggestion="applySuggestion"
          @ask-followup="askFollowUp"
          @perform-action="performMessageAction"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { RobotOutlined } from '@ant-design/icons-vue'
import type { ChatMessage } from '@/stores/aiChat'
import MessageItem from './MessageItem.vue'
import { useMessageScroll } from '@/composables/useMessageScroll'

// Props
const props = defineProps<{
  messages: ChatMessage[]
  modeDescription: string
  deletingMessageId: string | null
}>()

// Emits
const emit = defineEmits<{
  'scroll': [event: Event]
  'delete-message': [messageId: string]
  'copy-message': [content: string]
  'regenerate-message': [message: ChatMessage]
  'apply-suggestion': [suggestion: string]
  'ask-followup': [question: string]
  'perform-action': [actionKey: string, message: ChatMessage]
  'scroll-button-change': [visible: boolean, unreadCount: number, progress: number]
}>()

// 使用消息滚动钩子
const {
  messagesContainer,
  showScrollButton,
  unreadCount,
  scrollProgress,
  handleScroll: handleScrollLogic,
  scrollToBottom,
  onNewMessage,
  checkScrollPosition
} = useMessageScroll()

// 处理滚动事件
const handleScroll = (event: Event) => {
  handleScrollLogic()
  emit('scroll', event)

  // 通知父组件按钮状态变化
  nextTick(() => {
    emit('scroll-button-change', showScrollButton.value, unreadCount.value, scrollProgress.value)
  })
}

// 处理消息操作
const handleDeleteMessage = (messageId: string) => {
  emit('delete-message', messageId)
}

const copyMessage = (content: string) => {
  emit('copy-message', content)
}

const regenerateMessage = (message: ChatMessage) => {
  emit('regenerate-message', message)
}

const applySuggestion = (suggestion: string) => {
  emit('apply-suggestion', suggestion)
}

const askFollowUp = (question: string) => {
  emit('ask-followup', question)
}

const performMessageAction = (actionKey: string, message: ChatMessage) => {
  emit('perform-action', actionKey, message)
}

// 监听消息数量变化
watch(() => props.messages.length, (newLength, oldLength) => {
  // 只有新增消息时才触发（防止删除消息时也滚动）
  if (newLength > oldLength) {
    nextTick(() => {
      // 处理新消息到达：自动滚动或增加未读计数
      onNewMessage()

      // 通知父组件按钮状态变化
      setTimeout(() => {
        emit('scroll-button-change', showScrollButton.value, unreadCount.value, scrollProgress.value)
      }, 450)
    })
  }
})

// 组件挂载后检查初始滚动状态
onMounted(() => {
  nextTick(() => {
    // 延迟检查，确保 DOM 已完全渲染
    setTimeout(() => {
      checkScrollPosition()
      emit('scroll-button-change', showScrollButton.value, unreadCount.value, scrollProgress.value)
    }, 100)
  })
})

// 暴露方法供父组件使用
defineExpose({
  scrollToBottom
})
</script>

<style scoped>
.messages-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);
  scroll-behavior: smooth;
  position: relative;
}

/* 暗色模式适配 */
.dark .messages-area {
  background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%);
}

.messages-wrapper {
  max-width: 900px;
  margin: 0 auto;
  padding-bottom: 20px;
}

.welcome-message {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
  animation: fadeInUp 0.3s ease;
}

/* 暗色模式适配 */
.dark .welcome-message {
  background: #1f1f1f;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.welcome-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  font-size: 24px;
  color: white;
}

.welcome-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

/* 暗色模式适配 */
.dark .welcome-content h3 {
  color: #e5e5e5;
}

.welcome-content p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

/* 暗色模式适配 */
.dark .welcome-content p {
  color: #a3a3a3;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
