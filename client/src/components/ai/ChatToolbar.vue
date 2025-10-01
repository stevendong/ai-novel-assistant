<template>
  <div class="input-toolbar">
    <div class="toolbar-left">
      <!-- 历史消息按钮 -->
      <div class="toolbar-button history-tool-button">
        <a-dropdown :trigger="['click']" placement="topLeft">
          <div class="button-wrapper">
            <HistoryOutlined class="button-icon" />
            <span class="button-label">历史消息</span>
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
      <!-- 设置按钮 -->
      <div class="toolbar-button settings-tool-button">
        <a-dropdown :trigger="['click']" placement="topRight">
          <div class="button-wrapper">
            <SettingOutlined class="button-icon" />
            <span class="button-label">设置</span>
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
                <span>{{ isClearingConversation ? '清空中...' : '清空当前对话' }}</span>
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
  DeleteOutlined 
} from '@ant-design/icons-vue'
import SessionDropdown from './SessionDropdown.vue'
import type { ConversationSession } from '@/stores/aiChat'

// Props
const props = defineProps<{
  sessions: ConversationSession[]
  currentSessionId?: string
}>()

// Emits
const emit = defineEmits<{
  'switch-session': [sessionId: string]
  'create-session': []
  'delete-session': [sessionId: string]
  'clear-conversation': []
}>()

// State
const isClearingConversation = ref(false)

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

// 处理清空对话
const handleClearConversation = () => {
  Modal.confirm({
    title: '确认清空对话',
    content: '此操作将删除当前对话中的所有消息记录（包括用户消息、AI回复和欢迎消息），且无法恢复。清空后将重新创建一个新的欢迎消息。是否继续？',
    okText: '确认清空',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        isClearingConversation.value = true
        emit('clear-conversation')
        
        // 显示成功提示
        Modal.success({
          title: '清空成功',
          content: '对话历史已清空',
          okText: '知道了'
        })
      } catch (error) {
        console.error('清空对话失败:', error)
        Modal.error({
          title: '清空失败',
          content: '清空对话时发生错误，请稍后重试',
          okText: '知道了'
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
