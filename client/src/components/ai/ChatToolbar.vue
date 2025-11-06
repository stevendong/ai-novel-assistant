<template>
  <div class="input-toolbar">
    <div class="toolbar-left">
      <!-- 历史消息按钮 -->
      <div class="toolbar-button history-tool-button">
        <a-dropdown :trigger="['click']" placement="topLeft">
          <div class="button-wrapper">
            <HistoryOutlined class="button-icon" />
            <span class="button-label">{{ t('aiChat.toolbar.history') }}</span>
            <span class="session-count">{{ sessions.length }}</span>
          </div>
          <template #overlay>
            <SessionDropdown
              :sessions="sessions"
              :current-session-id="currentSessionId"
              @switch-session="handleSwitchSession"
              @create-session="handleCreateSession"
              @delete-session="handleDeleteSession"
            />
          </template>
        </a-dropdown>
      </div>
    </div>

    <div class="toolbar-right">
      <!-- 滚动到底部按钮 -->
      <div
        v-if="showScrollButton"
        class="toolbar-button scroll-tool-button"
        @click="handleScrollToBottom"
      >
        <div class="button-wrapper">
          <VerticalAlignBottomOutlined class="button-icon" />
        </div>
      </div>

      <!-- 设置按钮 -->
      <div class="toolbar-button settings-tool-button">
        <a-dropdown :trigger="['click']" placement="topRight">
          <div class="button-wrapper">
            <SettingOutlined class="button-icon" />
            <span class="button-label">{{ t('common.settings') }}</span>
          </div>
          <template #overlay>
            <a-menu class="settings-dropdown">
              <a-menu-item
                key="clear"
                @click="handleClearConversation"
                :disabled="isClearingConversation"
                class="settings-menu-item danger-menu-item"
              >
                <DeleteOutlined />
                <span>{{ isClearingConversation ? t('aiChat.toolbar.clearing') : t('aiChat.toolbar.clearAction') }}</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Modal } from 'ant-design-vue'
import {
  HistoryOutlined,
  SettingOutlined,
  DeleteOutlined,
  VerticalAlignBottomOutlined
} from '@ant-design/icons-vue'
import SessionDropdown from './SessionDropdown.vue'
import type { ConversationSession } from '@/stores/aiChat'
import { useI18n } from 'vue-i18n'

// Props
const props = defineProps<{
  sessions: ConversationSession[]
  currentSessionId?: string
  showScrollButton?: boolean
}>()

// Emits
const emit = defineEmits<{
  'switch-session': [sessionId: string]
  'create-session': []
  'delete-session': [sessionId: string]
  'clear-conversation': []
  'scroll-to-bottom': []
}>()

// State
const isClearingConversation = ref(false)
const { t } = useI18n()

// 处理切换会话
const handleSwitchSession = (sessionId: string) => {
  emit('switch-session', sessionId)
}

// 处理创建会话
const handleCreateSession = () => {
  emit('create-session')
}

// 处理删除会话
const handleDeleteSession = (sessionId: string) => {
  emit('delete-session', sessionId)
}

// 处理滚动到底部
const handleScrollToBottom = () => {
  emit('scroll-to-bottom')
}

// 处理清空对话
const handleClearConversation = () => {
  Modal.confirm({
    title: t('aiChat.toolbar.confirmClear.title'),
    content: t('aiChat.toolbar.confirmClear.content'),
    okText: t('aiChat.toolbar.confirmClear.ok'),
    okType: 'danger',
    cancelText: t('common.cancel'),
    onOk: async () => {
      try {
        isClearingConversation.value = true
        emit('clear-conversation')

        // 显示成功提示
        Modal.success({
          title: t('aiChat.toolbar.clearSuccess.title'),
          content: t('aiChat.toolbar.clearSuccess.content'),
          okText: t('aiChat.toolbar.clearSuccess.ok')
        })
      } catch (error) {
        console.error('Failed to clear conversation:', error)
        Modal.error({
          title: t('aiChat.toolbar.clearFailure.title'),
          content: t('aiChat.toolbar.clearFailure.content'),
          okText: t('aiChat.toolbar.clearFailure.ok')
        })
      } finally {
        isClearingConversation.value = false
      }
    }
  })
}
</script>

<style scoped>
.input-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
}

.toolbar-button {
  position: relative;
}

.button-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.button-wrapper:hover {
  background: #e8e8e8;
  transform: translateY(-1px);
}

.button-icon {
  font-size: 16px;
  color: #666;
}

.button-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.session-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  margin-left: 4px;
}

/* 滚动到底部按钮样式 */
.scroll-tool-button .button-wrapper {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.scroll-tool-button .button-wrapper.has-unread {
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.1) 0%, rgba(255, 120, 117, 0.1) 100%);
  border: 1px solid rgba(255, 77, 79, 0.2);
}

.scroll-tool-button .button-wrapper.has-unread .button-icon,
.scroll-tool-button .button-wrapper.has-unread .button-label {
  color: #ff4d4f;
}

.scroll-tool-button .button-wrapper:hover {
  background: #d9d9d9;
}

.scroll-tool-button .button-wrapper.has-unread:hover {
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.15) 0%, rgba(255, 120, 117, 0.15) 100%);
  border-color: rgba(255, 77, 79, 0.3);
}

.unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  margin-left: 4px;
  animation: badge-pulse 2s ease infinite;
}

@keyframes badge-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 4px rgba(255, 77, 79, 0);
  }
}

/* 设置下拉菜单样式 */
.settings-dropdown {
  min-width: 160px;
  border-radius: 8px;
  overflow: hidden;
}

.settings-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}

.danger-menu-item {
  color: #ff4d4f;
}

.danger-menu-item:hover {
  background: #fff1f0;
}

/* 暗色模式适配 */
.dark .input-toolbar {
  background: #1a1a1a;
  border-top-color: #333;
  border-bottom-color: #333;
}

.dark .button-wrapper {
  background: #2a2a2a;
}

.dark .button-wrapper:hover {
  background: #3a3a3a;
}

.dark .button-icon,
.dark .button-label {
  color: #a3a3a3;
}

.dark .scroll-tool-button .button-wrapper.has-unread {
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.15) 0%, rgba(255, 120, 117, 0.15) 100%);
  border-color: rgba(255, 77, 79, 0.3);
}

.dark .scroll-tool-button .button-wrapper.has-unread:hover {
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.2) 0%, rgba(255, 120, 117, 0.2) 100%);
  border-color: rgba(255, 77, 79, 0.4);
}

.dark .scroll-tool-button .button-wrapper:hover {
  background: #3a3a3a;
}

.dark .danger-menu-item:hover {
  background: rgba(255, 77, 79, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .input-toolbar {
    padding: 8px 12px;
  }

  .button-wrapper {
    padding: 4px 8px;
    gap: 4px;
  }

  .button-label {
    font-size: 12px;
  }

  .button-icon {
    font-size: 14px;
  }
}
</style>
