<template>
  <div
    class="message-item"
    :class="{
      'user-message': message.role === 'user',
      'assistant-message': message.role === 'assistant'
    }"
  >
    <!-- 用户消息 -->
    <div v-if="message.role === 'user'" class="user-message-bubble">
      <div class="message-content">
        <div class="message-text">{{ message.content }}</div>
        <div class="message-meta user-message-meta">
          <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          <div class="message-operations user-operations">
            <!-- 删除按钮 -->
            <a-tooltip :title="t('aiChat.messageItem.tooltips.delete')">
              <a-button
                type="text"
                size="small"
                class="operation-btn delete-btn"
                @click="handleDelete"
                :loading="isDeleting"
                danger
              >
                <DeleteOutlined />
              </a-button>
            </a-tooltip>
          </div>
        </div>
      </div>
      <div class="message-avatar">
        <a-avatar size="small" class="user-avatar">
          <UserOutlined />
        </a-avatar>
      </div>
    </div>

    <!-- AI助手消息 -->
    <div v-else class="assistant-message-bubble">
      <div class="message-avatar">
        <a-avatar size="small" class="ai-avatar">
          <RobotOutlined />
        </a-avatar>
      </div>
      <div class="message-content">
          <div class="message-text">
            <!-- 流式传输指示器 -->
            <div v-if="message.metadata?.streaming" class="streaming-indicator">
              <div class="streaming-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="streaming-text">{{ t('aiChat.messageItem.streaming') }}</span>
            </div>

            <!-- 流式消息使用SyncTypewriter -->
            <SyncTypewriter
              v-if="message.metadata?.streaming"
            :content="message.content"
            :is-streaming="message.metadata?.streaming"
            :enable-highlight="true"
            :enable-tables="true"
            :enable-task-lists="true"
            :show-cursor="true"
            :sync-mode="'smooth'"
            :buffer-size="3"
            :min-display-interval="25"
            :max-display-interval="120"
            :adaptive-typing="true"
            @complete="handleStreamComplete"
            @content-update="handleStreamContentUpdate"
            @typing-speed-change="handleTypingSpeedChange"
          />
          <!-- 历史消息直接渲染 -->
          <MarkdownRenderer
            v-else
            :content="message.content"
            :enable-highlight="true"
            :enable-tables="true"
            :enable-task-lists="true"
            class="message-markdown"
          />
        </div>

        <div class="message-meta">
          <!-- 头部：时间和操作按钮 -->
          <div class="meta-header">
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            <div class="message-operations">
              <!-- 复制按钮 -->
              <a-tooltip :title="t('aiChat.messageItem.tooltips.copy')">
                <a-button
                    type="text"
                    size="small"
                    class="operation-btn"
                    @click="handleCopy"
                >
                  <CopyOutlined />
                </a-button>
              </a-tooltip>

              <!-- 重新生成按钮（仅AI消息） -->
              <a-tooltip :title="t('aiChat.messageItem.tooltips.regenerate')">
                <a-button
                    type="text"
                    size="small"
                    class="operation-btn"
                    @click="handleRegenerate"
                >
                  <ReloadOutlined />
                </a-button>
              </a-tooltip>

              <!-- 删除按钮 -->
              <a-tooltip :title="t('aiChat.messageItem.tooltips.delete')">
                <a-button
                    type="text"
                    size="small"
                    class="operation-btn delete-btn"
                    @click="handleDelete"
                    :loading="isDeleting"
                    danger
                >
                  <DeleteOutlined />
                </a-button>
              </a-tooltip>
            </div>
          </div>

          <!-- 操作按钮区域 -->
          <div class="message-actions" v-if="message.actions?.length">
            <a-button
                v-for="action in message.actions"
                :key="action.key"
                type="text"
                size="small"
                class="action-btn-small"
                @click="handleAction(action.key)"
            >
              {{ action.label }}
            </a-button>
          </div>

          <!-- 建议区域 -->
          <div class="message-suggestions" v-if="message.metadata?.suggestions?.length">
            <div class="suggestion-label">💡 {{ t('aiChat.messageItem.suggestions.label') }}</div>
            <div class="suggestion-list">
              <a-tag
                  v-for="(suggestion, index) in message.metadata.suggestions.slice(0, 3)"
                  :key="index"
                  color="blue"
                  class="suggestion-tag"
                  @click="handleSuggestion(suggestion)"
              >
                {{ suggestion }}
              </a-tag>
            </div>
          </div>

          <!-- 跟进问题区域 -->
          <div class="message-followups" v-if="message.metadata?.followUps?.length">
            <div class="followup-label">🤔 {{ t('aiChat.messageItem.followUps.label') }}</div>
            <div class="followup-list">
              <a-button
                  v-for="(followUp, index) in message.metadata.followUps.slice(0, 2)"
                  :key="index"
                  type="text"
                  size="small"
                  class="followup-btn"
                  @click="handleFollowUp(followUp)"
              >
                {{ followUp }}
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  UserOutlined,
  RobotOutlined,
  CopyOutlined,
  DeleteOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'
import type { ChatMessage } from '@/stores/aiChat'
import SyncTypewriter from "@/components/common/SyncTypewriter.vue"
import MarkdownRenderer from "@/components/common/MarkdownRenderer.vue"
import { useI18n } from 'vue-i18n'

// Props
const props = defineProps<{
  message: ChatMessage
  isDeleting: boolean
}>()

// Emits
const emit = defineEmits<{
  'delete': [messageId: string]
  'copy': [content: string]
  'regenerate': [message: ChatMessage]
  'apply-suggestion': [suggestion: string]
  'ask-followup': [question: string]
  'perform-action': [actionKey: string, message: ChatMessage]
  'stream-complete': [messageId: string]
  'stream-content-update': [content: string]
  'typing-speed-change': [speed: number]
}>()

const { t, locale } = useI18n()

// 格式化时间
const formatTime = (timestamp: Date) => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  return new Intl.DateTimeFormat(locale.value, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// 处理删除
const handleDelete = () => {
  // 检查是否是欢迎消息，欢迎消息不能删除
  if (props.message.metadata?.messageType === 'welcome' ||
      (props.message.actions && props.message.actions.some(a => a.key === 'help'))) {
    return
  }
  emit('delete', props.message.id)
}

// 处理复制
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content)
    emit('copy', props.message.content)
  } catch (error) {
    console.error('Failed to copy message:', error)
  }
}

// 处理重新生成
const handleRegenerate = () => {
  emit('regenerate', props.message)
}

// 处理建议
const handleSuggestion = (suggestion: string) => {
  emit('apply-suggestion', suggestion)
}

// 处理跟进问题
const handleFollowUp = (question: string) => {
  emit('ask-followup', question)
}

// 处理操作按钮
const handleAction = (actionKey: string) => {
  emit('perform-action', actionKey, props.message)
}

// 流式传输相关
const handleStreamComplete = () => {
  emit('stream-complete', props.message.id)
}

const handleStreamContentUpdate = (content: string) => {
  emit('stream-content-update', content)
}

const handleTypingSpeedChange = (speed: number) => {
  emit('typing-speed-change', speed)
}
</script>

<style scoped>
.message-item {
  animation: messageSlideIn 0.3s ease;
}

.user-message-bubble,
.assistant-message-bubble {
  display: flex;
  gap: 12px;
  max-width: 100%;
}

.user-message-bubble {
  justify-content: flex-end;
}

.assistant-message-bubble {
  justify-content: flex-start;
}

.message-avatar {
  flex-shrink: 0;
}

.user-avatar {
  background: linear-gradient(135deg, #2B32B2 0%, #2B32B2 100%);
}

.ai-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.message-content {
  background: white;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  max-width: 70%;
  word-break: break-word;
}

.user-message .message-content {
  background: linear-gradient(135deg, #2B32B2 0%, #2B32B2 100%);
  color: white;
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
}

.user-message .message-text {
  color: white;
}

.message-meta {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 元数据头部 */
.meta-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.user-message-meta {
  color: rgba(255, 255, 255, 0.8);
}

.user-message-meta .meta-header {
  flex-direction: row-reverse;
}

.message-time {
  font-size: 12px;
  color: #999;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.user-message .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.message-item:hover .message-time {
  opacity: 1;
}

.message-operations {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message-item:hover .message-operations {
  opacity: 1;
}

.operation-btn {
  padding: 0 4px;
  height: 24px;
  color: #999;
  transition: all 0.2s ease;
}

.operation-btn:hover {
  color: #1488CC;
  background: rgba(24, 144, 255, 0.1);
  transform: scale(1.1);
}

.user-operations .operation-btn {
  color: rgba(255, 255, 255, 0.8);
}

.user-operations .operation-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.2);
}

.delete-btn:hover {
  color: #ff4d4f !important;
  background: rgba(255, 77, 79, 0.1) !important;
}

/* 流式传输指示器 */
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  margin-bottom: 8px;
}

.streaming-dots {
  display: flex;
  gap: 4px;
}

.streaming-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1488CC;
  animation: streamingDot 1.4s infinite ease-in-out;
}

.streaming-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.streaming-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

.streaming-text {
  font-size: 12px;
  color: #999;
}

/* 建议和跟进问题 */
.message-suggestions,
.message-followups {
  padding: 12px;
  border-radius: 8px;
  background: rgba(24, 144, 255, 0.03);
  border: 1px solid rgba(24, 144, 255, 0.1);
  transition: all 0.2s ease;
}

.message-suggestions:hover,
.message-followups:hover {
  background: rgba(24, 144, 255, 0.05);
  border-color: rgba(24, 144, 255, 0.2);
}

.suggestion-label,
.followup-label {
  font-size: 12px;
  font-weight: 600;
  color: #1488CC;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.suggestion-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestion-tag {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
}

.suggestion-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.followup-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.followup-btn {
  text-align: left;
  padding: 6px 12px;
  font-size: 13px;
  color: #1488CC;
  border-radius: 6px;
  transition: all 0.2s ease;
  justify-content: flex-start;
}

.followup-btn:hover {
  background: rgba(24, 144, 255, 0.1);
  transform: translateX(4px);
}

/* 消息操作按钮 */
.message-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
}

.action-btn-small {
  font-size: 12px;
  padding: 4px 12px;
  height: 28px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.action-btn-small:hover {
  color: #1488CC;
  border-color: #1488CC;
  background: rgba(24, 144, 255, 0.05);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes streamingDot {
  0%, 60%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  30% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

/* 暗色模式适配 */
.dark .message-content {
  background: #1f1f1f;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.dark .message-text {
  color: #e5e5e5;
}

.dark .message-time {
  color: #888;
}

.dark .operation-btn {
  color: #888;
}

.dark .operation-btn:hover {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
}

.dark .delete-btn:hover {
  color: #ff6b6b !important;
  background: rgba(255, 107, 107, 0.1) !important;
}

/* 建议和跟进问题 - 暗色模式 */
.dark .message-suggestions,
.dark .message-followups {
  background: rgba(96, 165, 250, 0.05);
  border-color: rgba(96, 165, 250, 0.15);
}

.dark .message-suggestions:hover,
.dark .message-followups:hover {
  background: rgba(96, 165, 250, 0.08);
  border-color: rgba(96, 165, 250, 0.25);
}

.dark .suggestion-label,
.dark .followup-label {
  color: #60a5fa;
}

.dark .suggestion-tag {
  background: rgba(96, 165, 250, 0.15);
  border-color: rgba(96, 165, 250, 0.3);
  color: #60a5fa;
}

.dark .suggestion-tag:hover {
  background: rgba(96, 165, 250, 0.25);
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.3);
}

.dark .followup-btn {
  color: #60a5fa;
}

.dark .followup-btn:hover {
  background: rgba(96, 165, 250, 0.15);
}

/* 操作按钮 - 暗色模式 */
.dark .message-actions {
  background: rgba(255, 255, 255, 0.03);
}

.dark .action-btn-small {
  border-color: #444;
  color: #a3a3a3;
}

.dark .action-btn-small:hover {
  color: #60a5fa;
  border-color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .user-message-bubble,
  .assistant-message-bubble {
    max-width: 100%;
  }

  .message-content {
    max-width: 85%;
  }
}
</style>
