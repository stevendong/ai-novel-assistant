<template>
  <div
    class="ai-assistant-panel"
    :class="{
      'floating': isFloating,
      'dragging': isDragging,
      'resizing': isResizing,
      'minimized': isFloating && isMinimized
    }"
    :style="isFloating ? {
      position: 'fixed',
      left: floatingPosition.x + 'px',
      top: floatingPosition.y + 'px',
      width: isMinimized ? 'auto' : floatingSize.width + 'px',
      height: isMinimized ? 'auto' : floatingSize.height + 'px',
      zIndex: 1000,
      borderRadius: '12px',
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
      overflow: 'hidden'
    } : {}"
  >
    <!-- AI Status Bar -->
    <div
      class="status-bar"
      :class="{ 'draggable-header': isFloating }"
      @mousedown="isFloating ? startDragOrRestore($event) : null"
    >
      <div class="status-info">
        <a-badge :status="aiStatus === 'online' ? 'success' : 'error'" />
        <span class="status-text">AI创作助手</span>
        <span v-if="isFloating" class="floating-indicator">
          {{ isMinimized ? '已最小化' : '浮动模式' }}
        </span>
      </div>
      <div class="status-actions">
        <!-- 控制按钮区域 -->
        <div class="control-section">
          <!-- 浮动模式切换按钮 -->
          <div class="float-mode-toggle">
            <a-tooltip
              :title="isFloating ? '切换到固定模式' : '切换到浮动模式'"
              placement="bottom"
            >
              <div
                class="float-toggle-container"
                :class="{ 'floating-active': isFloating }"
                @click="toggleFloatingMode"
              >
                <div class="toggle-icon-wrapper">
                  <transition name="icon-flip" mode="out-in">
                    <component
                      :is="isFloating ? PushpinFilled : DragOutlined"
                      :key="isFloating ? 'pin' : 'drag'"
                      class="toggle-icon"
                    />
                  </transition>
                </div>
                <div class="toggle-indicator">
                  <div class="indicator-dot" :class="{ 'active': isFloating }"></div>
                </div>
              </div>
            </a-tooltip>
          </div>

          <!-- 浮动模式窗口控制按钮 -->
          <div v-if="isFloating" class="floating-controls">
            <a-tooltip title="最小化">
              <div class="control-btn minimize-btn" @click="minimizeWindow">
                <div class="minimize-icon"></div>
              </div>
            </a-tooltip>

            <a-tooltip title="最大化/还原">
              <div
                class="control-btn maximize-btn"
                @click="toggleMaximize"
              >
                <component :is="isMaximized ? CompressOutlined : ExpandOutlined" />
              </div>
            </a-tooltip>

            <a-tooltip title="关闭AI助手">
              <div class="control-btn close-btn" @click="closeFloatingMode">
                <component :is="CloseOutlined" />
              </div>
            </a-tooltip>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Container -->
    <div v-if="!isMinimized" class="content-container">

      <!-- Outline Generation Mode -->
      <div v-if="currentMode === 'outline'" class="outline-mode">
        <outline-generator
          :novel-id="currentProject?.id"
          @outline-applied="handleOutlineApplied"
          @close="currentMode = 'chat'"
        />
      </div>

      <!-- Chat Container (for other modes) -->
      <div v-else class="chat-container">
        <!-- Messages Area -->
      <div
        ref="messagesContainer"
        class="messages-area"
        @scroll="handleScroll"
      >
        <div class="messages-wrapper">
          <!-- Welcome Message -->
          <div class="welcome-message" v-if="messages.length === 1">
            <div class="welcome-icon">
              <RobotOutlined />
            </div>
            <div class="welcome-content">
              <h3>AI创作助手</h3>
              <p>{{ getModeDescription(currentMode) }}</p>
            </div>
          </div>

          <!-- Message List -->
          <div class="message-list">
            <div
              v-for="message in messages"
              :key="message.id"
              class="message-item"
              :class="{ 'user-message': message.role === 'user', 'assistant-message': message.role === 'assistant' }"
            >
              <!-- User Message -->
              <div v-if="message.role === 'user'" class="user-message-bubble">
                <div class="message-content">
                  <div class="message-text">{{ message.content }}</div>
                  <div class="message-meta user-message-meta">
                    <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                    <div class="message-operations user-operations">
                      <!-- 删除按钮 -->
                      <a-tooltip title="删除消息">
                        <a-button
                          type="text"
                          size="small"
                          class="operation-btn delete-btn"
                          @click="handleDeleteMessage(message.id)"
                          :loading="deletingMessageId === message.id"
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

              <!-- Assistant Message -->
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
                      <span class="streaming-text">正在接收...</span>
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
                      @complete="onStreamComplete(message.id)"
                      @content-update="onStreamContentUpdate"
                      @typing-speed-change="onTypingSpeedChange"
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
                    <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                    <div class="message-operations">
                      <!-- 复制按钮 -->
                      <a-tooltip title="复制消息">
                        <a-button
                          type="text"
                          size="small"
                          class="operation-btn"
                          @click="copyMessage(message.content)"
                        >
                          <CopyOutlined />
                        </a-button>
                      </a-tooltip>

                      <!-- 重新生成按钮（仅AI消息） -->
                      <a-tooltip title="重新生成" v-if="message.role === 'assistant'">
                        <a-button
                          type="text"
                          size="small"
                          class="operation-btn"
                          @click="regenerateMessage(message)"
                        >
                          <ReloadOutlined />
                        </a-button>
                      </a-tooltip>

                      <!-- 删除按钮 -->
                      <a-tooltip title="删除消息">
                        <a-button
                          type="text"
                          size="small"
                          class="operation-btn delete-btn"
                          @click="handleDeleteMessage(message.id)"
                          :loading="deletingMessageId === message.id"
                          danger
                        >
                          <DeleteOutlined />
                        </a-button>
                      </a-tooltip>
                    </div>

                    <!-- 原有的操作按钮 -->
                    <div class="message-actions" v-if="message.actions">
                      <a-button
                        v-for="action in message.actions"
                        :key="action.key"
                        type="text"
                        size="small"
                        class="action-btn-small"
                        @click="performMessageAction(action.key, message)"
                      >
                        {{ action.label }}
                      </a-button>
                    </div>

                    <!-- 建议和跟进问题 -->
                    <div class="message-suggestions" v-if="message.metadata?.suggestions?.length">
                      <div class="suggestion-label">💡 建议：</div>
                      <div class="suggestion-list">
                        <a-tag
                          v-for="(suggestion, index) in message.metadata.suggestions.slice(0, 3)"
                          :key="index"
                          color="blue"
                          class="suggestion-tag"
                          @click="applySuggestion(suggestion)"
                        >
                          {{ suggestion }}
                        </a-tag>
                      </div>
                    </div>

                    <div class="message-followups" v-if="message.metadata?.followUps?.length">
                      <div class="followup-label">🤔 相关问题：</div>
                      <div class="followup-list">
                        <a-button
                          v-for="(followUp, index) in message.metadata.followUps.slice(0, 2)"
                          :key="index"
                          type="text"
                          size="small"
                          class="followup-btn"
                          @click="askFollowUp(followUp)"
                        >
                          {{ followUp }}
                        </a-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Scroll to Bottom Button -->
        </div>
      </div>

      <!-- Input Toolbar -->
      <div class="input-toolbar">
        <div class="toolbar-left">
          <!-- 历史消息按钮 -->
          <div class="toolbar-button history-tool-button">
            <a-dropdown :trigger="['click']" placement="topLeft">
              <div class="button-wrapper">
                <HistoryOutlined class="button-icon" />
                <span class="button-label">历史消息</span>
                <span class="session-count">{{ chatStore.sessions.length }}</span>
              </div>
              <template #overlay>
                <div class="history-dropdown">
                  <div class="dropdown-header">
                    <span class="header-title">会话历史</span>
                    <a-button type="text" size="small" @click="createNewSession" class="new-session-btn">
                      <PlusOutlined />
                      新建
                    </a-button>
                  </div>
                  <a-list
                    size="small"
                    :data-source="chatStore.sessions"
                    class="session-list"
                    :locale="{ emptyText: '暂无历史会话' }"
                  >
                    <template #renderItem="{ item: session }">
                      <a-list-item class="session-item-new">
                        <a-button
                          type="text"
                          block
                          class="session-button"
                          :class="{ active: session.id === chatStore.currentSessionId }"
                          @click="switchToSession(session.id)"
                        >
                          <div class="session-content">
                            <div class="session-info">
                              <span class="session-title-new">{{ session.title || '新对话' }}</span>
                              <span class="session-time">{{ formatTime(session.updatedAt) }}</span>
                            </div>
                            <div class="session-meta-new">
                              <a-tag size="small" :color="getModeColor(session.mode)" class="mode-tag">
                                {{ getModeLabel(session.mode) }}
                              </a-tag>
                              <span class="message-count">{{ session.messages.length }}条</span>
                            </div>
                          </div>
                        </a-button>
                        <a-button
                          type="text"
                          size="small"
                          danger
                          class="delete-session-btn"
                          @click="deleteSession(session.id)"
                        >
                          <DeleteOutlined />
                        </a-button>
                      </a-list-item>
                    </template>
                  </a-list>
                </div>
              </template>
            </a-dropdown>
          </div>
        </div>

        <div class="toolbar-right">

          <!-- 滑动到底部按钮 -->
          <div class="toolbar-button scroll-tool-button" v-show="showScrollButton">
            <a-tooltip title="滑动到底部" placement="top">
              <div class="button-wrapper" @click="scrollToBottom">
                <DownOutlined class="button-icon" />
                <span class="button-label">到底部</span>
              </div>
            </a-tooltip>
          </div>
          <!-- 设置按钮 -->
          <div class="toolbar-button settings-tool-button">
            <a-dropdown :trigger="['click']" placement="topRight">
              <div class="button-wrapper">
                <SettingOutlined class="button-icon" />
                <span class="button-label">设置</span>
              </div>
              <template #overlay>
                <a-menu class="settings-dropdown">
                  <a-menu-item key="model" class="settings-menu-item">
                    <RobotOutlined />
                    <span>切换模型</span>
                  </a-menu-item>
                  <a-menu-item key="preferences" class="settings-menu-item">
                    <SettingOutlined />
                    <span>AI偏好设置</span>
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item
                    key="clear"
                    @click="clearConversation"
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

      <!-- Input Area -->
      <div class="input-area">
        <div class="input-container">
          <div class="input-wrapper">
            <a-textarea
              ref="inputRef"
              v-model:value="inputMessage"
              :placeholder="getInputPlaceholder(currentMode)"
              :disabled="aiStatus === 'offline'"
              :auto-size="{ minRows: 1, maxRows: 4 }"
              class="message-input"
              @keydown="handleKeyDown"
              @input="handleInput"
            />
            <div class="input-actions">
              <a-tooltip v-if="false" title="发送图片">
                <a-button type="text" size="small" class="input-action-btn">
                  <PictureOutlined />
                </a-button>
              </a-tooltip>
              <a-tooltip v-if="false" title="语音输入">
                <a-button type="text" size="small" class="input-action-btn">
                  <AudioOutlined />
                </a-button>
              </a-tooltip>
              <a-button
                type="primary"
                size="small"
                class="send-btn"
                :disabled="!inputMessage.trim() || aiStatus === 'offline'"
                :loading="isTyping"
                @click="sendMessage"
              >
                <SendOutlined />
              </a-button>
            </div>
          </div>
          <div class="input-hint">
            <span class="hint-text">{{ getInputHint() }}</span>
            <span class="char-count">{{ inputMessage.length }}/2000</span>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- 浮动模式调整大小手柄 -->
  <div
    v-if="isFloating && !isMinimized"
    class="resize-handle"
    @mousedown="startResize($event)"
  >
    <div class="resize-icon">⋰</div>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { Modal } from 'ant-design-vue'
import {
  RobotOutlined,
  UserOutlined,
  SendOutlined,
  EditOutlined,
  CheckCircleOutlined,
  BulbOutlined,
  SettingOutlined,
  DeleteOutlined,
  DownOutlined,
  PictureOutlined,
  AudioOutlined,
  ReloadOutlined,
  FileTextOutlined,
  TeamOutlined,
  GlobalOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  HistoryOutlined,
  PlusOutlined,
  DragOutlined,
  PushpinFilled,
  ExpandOutlined,
  CompressOutlined,
  CloseOutlined
} from '@ant-design/icons-vue'
import { useProjectStore } from '@/stores/project'
import { useAIChatStore } from '@/stores/aiChat'
import type { ChatMessage } from '@/stores/aiChat'
import { apiClient } from '@/utils/api'
import SyncTypewriter from "@/components/common/SyncTypewriter.vue";
import MarkdownRenderer from "@/components/common/MarkdownRenderer.vue";
import OutlineGenerator from "@/components/ai/OutlineGenerator.vue";

// Stores
const projectStore = useProjectStore()
const chatStore = useAIChatStore()

// Define emits
const emit = defineEmits<{
  'floating-mode-change': [isFloating: boolean]
  'close-panel': []
}>()


// Reactive state
const currentMode = ref<'chat' | 'enhance' | 'check' | 'outline'>('chat')
const inputMessage = ref('')
const showScrollButton = ref(false)
const messagesContainer = ref<HTMLElement>()
const inputRef = ref()

const typingMessageId = ref<string | null>(null)
const newlyCreatedMessageId = ref<string | null>(null)
const deletingMessageId = ref<string | null>(null)
const isInitializing = ref(false)
const hasInitialized = ref(false)
const isClearingConversation = ref(false)

// 浮动模式状态
const isFloating = ref(false)
const isMaximized = ref(false)
const isMinimized = ref(false)
const floatingPosition = ref({ x: 100, y: 100 })
const floatingSize = ref({ width: 400, height: 600 })
const originalSize = ref({ width: 400, height: 600 })
const originalPosition = ref({ x: 100, y: 100 })
const isDragging = ref(false)
const isResizing = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })

// 流式打字机完成回调
const onStreamComplete = (messageId: string) => {
  console.log('Stream typewriter completed for message:', messageId)
  // 可以在这里添加完成后的逻辑
}

// 流式打字机内容更新回调
const onStreamContentUpdate = (content: string) => {
  // 流式内容更新时自动滚动
  nextTick(() => {
    scrollToBottom()
  })
}

// 打字机速度变化回调
const onTypingSpeedChange = (speed: number) => {
  console.log('SyncTypewriter speed changed:', speed, 'ms')
  // 可以在这里根据速度变化调整其他UI行为
}

// Use store state
const aiStatus = computed(() => chatStore.aiStatus)
const isTyping = computed(() => chatStore.isTyping)
const messages = computed(() => chatStore.currentMessages)

// Mode configurations
const modeConfigs = {
  chat: {
    description: '与AI自由对话，获取创作灵感和建议',
    placeholder: '向AI助手提问或请求帮助...',
    actions: [
      { key: 'help', label: '帮助', icon: BulbOutlined },
      { key: 'examples', label: '示例', icon: FileTextOutlined },
      { key: 'brainstorm', label: '头脑风暴', icon: BulbOutlined },
      { key: 'inspiration', label: '创作灵感', icon: EditOutlined }
    ]
  },
  enhance: {
    description: '完善你的角色、设定和情节内容',
    placeholder: '描述你想要完善的内容...',
    actions: [
      { key: 'enhance-character', label: '完善角色', icon: TeamOutlined },
      { key: 'enhance-setting', label: '扩展设定', icon: GlobalOutlined },
      { key: 'generate-outline', label: '生成大纲', icon: FileTextOutlined },
      { key: 'suggest-plot', label: '情节建议', icon: BulbOutlined }
    ]
  },
  check: {
    description: '检查内容的一致性和逻辑性',
    placeholder: '输入需要检查的内容...',
    actions: [
      { key: 'check-consistency', label: '一致性检查', icon: CheckCircleOutlined },
      { key: 'check-character', label: '角色检查', icon: TeamOutlined },
      { key: 'check-timeline', label: '时间线检查', icon: ExclamationCircleOutlined },
      { key: 'check-logic', label: '逻辑检查', icon: BulbOutlined }
    ]
  }
}

// Current project from store
const currentProject = computed(() => projectStore.currentProject)

// Initialize chat session when project changes
watch(currentProject, async (newProject) => {
  if (!newProject || isInitializing.value) {
    return
  }

  isInitializing.value = true

  try {
    console.log('Project changed, initializing session for:', newProject.title)

    // 等待sessions加载完成
    if (!hasInitialized.value) {
      await chatStore.loadSessions()
      hasInitialized.value = true
    }

    // 首先检查是否有该项目的现有会话
    const existingSession = chatStore.sessions.find(s => s.novelId === newProject.id && s.mode === currentMode.value)
    if (existingSession) {
      console.log('Found existing session for current mode:', existingSession.title)
      // 使用现有会话
      await chatStore.switchSession(existingSession.id)
    } else if (!chatStore.currentSession || chatStore.currentSession.novelId !== newProject.id) {
      // 检查是否有任何该项目的会话（不限于当前模式）
      const anyProjectSession = chatStore.sessions.find(s => s.novelId === newProject.id)
      if (anyProjectSession) {
        console.log('Found existing session for project:', anyProjectSession.title)
        // 使用该项目的任意一个现有会话
        await chatStore.switchSession(anyProjectSession.id)
      } else {
        console.log('No existing session found, creating new session')
        // 只有在该项目完全没有会话时才创建新会话
        await chatStore.createNewSession(newProject.id, currentMode.value as 'chat' | 'enhance' | 'check')
      }
    }

    // 清除新创建消息ID，避免历史消息使用打字机效果
    newlyCreatedMessageId.value = null
    typingMessageId.value = null
  } finally {
    isInitializing.value = false
  }
}, { immediate: true })


// Methods
const getModeDescription = (mode: string) => {
  return modeConfigs[mode as keyof typeof modeConfigs]?.description || ''
}

const getInputPlaceholder = (mode: string) => {
  return modeConfigs[mode as keyof typeof modeConfigs]?.placeholder || '输入消息...'
}

const getInputHint = () => {
  if (inputMessage.value.length > 1800) return '字数即将达到上限'
  return 'Ctrl+Enter 发送，Shift+Enter 换行'
}

const handleScroll = () => {
  if (!messagesContainer.value) return

  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
  showScrollButton.value = !isNearBottom && scrollHeight > clientHeight
}

const scrollToBottom = (smooth = true) => {
  if (!messagesContainer.value) return

  messagesContainer.value.scrollTo({
    top: messagesContainer.value.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  })
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    if (e.ctrlKey) {
      e.preventDefault()
      sendMessage()
    } else if (e.shiftKey) {
      // Allow line break
      return
    } else {
      e.preventDefault()
      sendMessage()
    }
  }
}

const handleInput = () => {
  // Auto-resize and other input handling
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || inputMessage.value.length > 2000) return

  const userMessage = inputMessage.value
  inputMessage.value = ''

  // Send message through store with streaming enabled
  const response = await chatStore.sendMessage(userMessage, currentProject.value?.id, true)

  // 设置新创建的消息ID用于打字机效果
  if (response) {
    newlyCreatedMessageId.value = response.id
    // 流式消息的滚动现在由StreamTypewriter的content-update事件处理
  }

  // Auto scroll to bottom
  nextTick(() => {
    scrollToBottom()
  })
}

const addMessage = async (role: 'user' | 'assistant', content: string, actions?: Array<{ key: string; label: string }>) => {
  const message = await chatStore.addMessage(role, content, actions)

  // 如果是AI消息，设置新创建的消息ID用于打字机效果
  if (role === 'assistant' && message) {
    newlyCreatedMessageId.value = message.id
  }

  // Auto scroll to bottom
  nextTick(() => {
    scrollToBottom()
  })
}

const formatTime = (timestamp: Date) => {
  return timestamp.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 清空对话历史
const clearConversation = async () => {
  if (!chatStore.currentSession || isClearingConversation.value) {
    return
  }

  Modal.confirm({
    title: '确认清空对话',
    content: '此操作将删除当前对话中的所有消息记录（包括用户消息、AI回复和欢迎消息），且无法恢复。清空后将重新创建一个新的欢迎消息。是否继续？',
    okText: '确认清空',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        isClearingConversation.value = true
        await chatStore.clearCurrentSession()

        // 显示成功提示
        Modal.success({
          title: '清空成功',
          content: '对话历史已清空',
          okText: '知道了'
        })

        // 自动滚动到底部以显示欢迎消息
        nextTick(() => {
          scrollToBottom()
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

// 复制消息
const copyMessage = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    // 可以添加成功提示
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 重新生成消息
const regenerateMessage = async (message: ChatMessage) => {
  if (!chatStore.currentSession || message.role !== 'assistant') return

  // 找到该消息的前一条用户消息
  const messages = chatStore.currentMessages
  const messageIndex = messages.findIndex(m => m.id === message.id)
  if (messageIndex <= 0) return

  const userMessage = messages[messageIndex - 1]
  if (userMessage.role !== 'user') return

  // 重新发送用户消息
  await chatStore.sendMessage(userMessage.content, currentProject.value?.id)
}

// 应用建议
const applySuggestion = (suggestion: string) => {
  inputMessage.value = `请详细展开这个建议：${suggestion}`
  sendMessage()
}

// 询问跟进问题
const askFollowUp = (question: string) => {
  inputMessage.value = question
  sendMessage()
}

const performMessageAction = (actionKey: string, message: ChatMessage) => {
  const actionMessages = {
    'view-all-issues': '请显示所有的一致性问题详情',
    'fix-priority': '请为我优先修复最严重的一致性问题',
    'detailed-analysis': '请对我的小说进行更详细的分析',
    'analyze-character': '请深度分析我提到的角色',
    'suggest-traits': '请为这个角色提供更多性格特征建议',
    'expand-setting': '请详细扩展我提到的世界设定',
    'check-logic': '请检查这个设定的逻辑合理性'
  }

  const messageText = actionMessages[actionKey as keyof typeof actionMessages]
  if (messageText) {
    inputMessage.value = messageText
    sendMessage()
  } else {
    console.log('Perform action:', actionKey, 'for message:', message)
  }
}

// 切换到指定会话
const switchToSession = async (sessionId: string) => {
  await chatStore.switchSession(sessionId)

  // 清除新创建消息ID，避免历史消息使用打字机效果
  newlyCreatedMessageId.value = null
  typingMessageId.value = null

  // 自动滚动到底部
  nextTick(() => {
    scrollToBottom()
  })
}

// 创建新会话
const createNewSession = async () => {
  await chatStore.createNewSession(currentProject.value?.id, currentMode.value as 'chat' | 'enhance' | 'check')

  // 清除新创建消息ID，避免历史消息使用打字机效果
  newlyCreatedMessageId.value = null
  typingMessageId.value = null

  // 自动滚动到底部
  nextTick(() => {
    scrollToBottom()
  })
}

// 删除单条消息
const handleDeleteMessage = async (messageId: string) => {
  // 检查是否是欢迎消息
  const message = chatStore.currentSession?.messages.find(m => m.id === messageId)
  if (message?.metadata?.messageType === 'welcome' ||
      (message && message.actions && message.actions.some(a => a.key === 'help'))) {
    return
  }

  try {
    deletingMessageId.value = messageId

    // 调用API删除消息
    if (chatStore.currentSession) {
      await apiClient.delete(`/api/conversations/${chatStore.currentSession.id}/messages/${messageId}`)

      // 从本地删除消息
      const messageIndex = chatStore.currentSession.messages.findIndex(m => m.id === messageId)
      if (messageIndex !== -1) {
        chatStore.currentSession.messages.splice(messageIndex, 1)
      }
    }

    deletingMessageId.value = null
    console.log('Message deleted successfully')
  } catch (error) {
    deletingMessageId.value = null
    console.error('Failed to delete message:', error)
  }
}

// 获取模式标签
const getModeLabel = (mode: string) => {
  const labels: Record<string, string> = {
    chat: '对话',
    enhance: '完善',
    check: '检查'
  }
  return labels[mode] || mode
}

// 获取模式颜色
const getModeColor = (mode: string) => {
  const colors: Record<string, string> = {
    chat: '#1890ff',
    enhance: '#52c41a',
    check: '#faad14'
  }
  return colors[mode] || '#1890ff'
}

// 增强的浮动模式相关方法
const toggleFloatingMode = () => {
  // 重置所有状态
  isMaximized.value = false
  isMinimized.value = false

  isFloating.value = !isFloating.value

  if (isFloating.value) {
    // 进入浮动模式，确保窗口在可见区域
    ensureWindowInBounds()
  }

  // 保存浮动模式状态
  saveFloatingState()

  // 触发父组件更新布局
  emit('floating-mode-change', isFloating.value)

  console.log('浮动模式切换:', isFloating.value ? '启用' : '禁用')
}

// 最大化/还原窗口
const toggleMaximize = () => {
  if (!isMaximized.value) {
    // 保存当前尺寸和位置
    originalSize.value = { ...floatingSize.value }
    originalPosition.value = { ...floatingPosition.value }

    // 最大化到屏幕尺寸
    floatingSize.value = {
      width: window.innerWidth - 40,
      height: window.innerHeight - 40
    }
    floatingPosition.value = { x: 20, y: 20 }
    isMaximized.value = true
  } else {
    // 还原到原始尺寸
    floatingSize.value = { ...originalSize.value }
    floatingPosition.value = { ...originalPosition.value }
    isMaximized.value = false
  }

  saveFloatingState()
  console.log('窗口最大化:', isMaximized.value)
}

// 最小化窗口
const minimizeWindow = () => {
  isMinimized.value = !isMinimized.value

  // 保存状态
  saveFloatingState()

  console.log('窗口最小化:', isMinimized.value)
}

// 关闭AI助手模块
const closeFloatingMode = () => {
  // 重置所有浮动状态
  isFloating.value = false
  isMaximized.value = false
  isMinimized.value = false

  // 保存状态
  saveFloatingState()

  // 触发父组件关闭整个AI助手面板
  emit('close-panel')

  console.log('关闭AI助手模块')
}

// 确保窗口在可见区域内
const ensureWindowInBounds = () => {
  const maxX = window.innerWidth - floatingSize.value.width
  const maxY = window.innerHeight - floatingSize.value.height

  floatingPosition.value.x = Math.max(0, Math.min(maxX, floatingPosition.value.x))
  floatingPosition.value.y = Math.max(0, Math.min(maxY, floatingPosition.value.y))

  // 确保最小尺寸
  floatingSize.value.width = Math.max(320, floatingSize.value.width)
  floatingSize.value.height = Math.max(400, floatingSize.value.height)
}

// 保存浮动状态
const saveFloatingState = () => {
  try {
    localStorage.setItem('ai_panel_floating', JSON.stringify(isFloating.value))
    localStorage.setItem('ai_panel_maximized', JSON.stringify(isMaximized.value))
    localStorage.setItem('ai_panel_minimized', JSON.stringify(isMinimized.value))
    localStorage.setItem('ai_panel_position', JSON.stringify(floatingPosition.value))
    localStorage.setItem('ai_panel_size', JSON.stringify(floatingSize.value))
    localStorage.setItem('ai_panel_original_size', JSON.stringify(originalSize.value))
    localStorage.setItem('ai_panel_original_position', JSON.stringify(originalPosition.value))
  } catch (error) {
    console.warn('Failed to save floating state:', error)
  }
}

// 处理拖拽或恢复窗口
const startDragOrRestore = (e: MouseEvent) => {
  if (!isFloating.value || isMaximized.value) return

  // 防止在按钮上开始拖拽
  const target = e.target as HTMLElement
  if (target.closest('.float-toggle-container, .control-btn, .history-btn')) {
    return
  }

  // 如果是最小化状态，设置一个定时器来区分点击和拖拽
  if (isMinimized.value) {
    let dragTimer: number | null = null
    let hasDragged = false

    const startX = e.clientX
    const startY = e.clientY

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startX)
      const deltaY = Math.abs(moveEvent.clientY - startY)

      // 如果移动超过5像素，认为是拖拽
      if (deltaX > 5 || deltaY > 5) {
        hasDragged = true
        if (dragTimer) {
          clearTimeout(dragTimer)
          dragTimer = null
        }
        // 开始拖拽
        startDrag(e)
        // 移除临时监听器
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }

    const handleMouseUp = () => {
      // 移除临时监听器
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    // 添加临时监听器
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    e.preventDefault()
  } else {
    // 非最小化状态直接开始拖拽
    startDrag(e)
  }
}

// 改进的拖拽开始
const startDrag = (e: MouseEvent) => {
  if (!isFloating.value || isMaximized.value) return

  // 防止在按钮上开始拖拽
  const target = e.target as HTMLElement
  if (target.closest('.float-toggle-container, .control-btn, .history-btn')) {
    return
  }

  isDragging.value = true
  dragStart.value = {
    x: e.clientX - floatingPosition.value.x,
    y: e.clientY - floatingPosition.value.y
  }

  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'move'
  e.preventDefault()
}

// 改进的拖拽过程
const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return

  const newPosition = {
    x: e.clientX - dragStart.value.x,
    y: e.clientY - dragStart.value.y
  }

  // 获取当前窗口的实际尺寸（最小化时使用最小宽度）
  const currentWidth = isMinimized.value ? 280 : floatingSize.value.width
  const currentHeight = isMinimized.value ? 60 : floatingSize.value.height

  // 磁性吸附到边缘
  const snapThreshold = 20
  const maxX = window.innerWidth - currentWidth
  const maxY = window.innerHeight - currentHeight

  // 左边缘吸附
  if (newPosition.x < snapThreshold) {
    newPosition.x = 0
  }
  // 右边缘吸附
  else if (newPosition.x > maxX - snapThreshold) {
    newPosition.x = maxX
  }

  // 顶部边缘吸附
  if (newPosition.y < snapThreshold) {
    newPosition.y = 0
  }
  // 底部边缘吸附
  else if (newPosition.y > maxY - snapThreshold) {
    newPosition.y = maxY
  }

  // 确保不超出边界
  floatingPosition.value = {
    x: Math.max(0, Math.min(maxX, newPosition.x)),
    y: Math.max(0, Math.min(maxY, newPosition.y))
  }
}

// 改进的停止拖拽
const stopDrag = () => {
  if (!isDragging.value) return

  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''

  // 保存位置
  saveFloatingState()
}

// 改进的调整大小开始
const startResize = (e: MouseEvent) => {
  if (!isFloating.value || isMaximized.value) return

  isResizing.value = true
  resizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: floatingSize.value.width,
    height: floatingSize.value.height
  }

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'nw-resize'
  e.preventDefault()
  e.stopPropagation()
}

// 改进的调整大小过程
const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return

  const deltaX = e.clientX - resizeStart.value.x
  const deltaY = e.clientY - resizeStart.value.y

  const newWidth = Math.max(320, Math.min(1200, resizeStart.value.width + deltaX))
  const newHeight = Math.max(400, Math.min(900, resizeStart.value.height + deltaY))

  // 确保不超出视窗边界
  const maxWidth = window.innerWidth - floatingPosition.value.x - 20
  const maxHeight = window.innerHeight - floatingPosition.value.y - 20

  floatingSize.value = {
    width: Math.min(newWidth, maxWidth),
    height: Math.min(newHeight, maxHeight)
  }
}

// 改进的停止调整大小
const stopResize = () => {
  if (!isResizing.value) return

  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''

  // 保存大小
  saveFloatingState()
}

// 加载浮动模式状态
const loadFloatingState = () => {
  try {
    const floatingState = localStorage.getItem('ai_panel_floating')
    if (floatingState !== null) {
      isFloating.value = JSON.parse(floatingState)
    }

    const maximizedState = localStorage.getItem('ai_panel_maximized')
    if (maximizedState !== null) {
      isMaximized.value = JSON.parse(maximizedState)
    }

    const minimizedState = localStorage.getItem('ai_panel_minimized')
    if (minimizedState !== null) {
      isMinimized.value = JSON.parse(minimizedState)
    }

    const position = localStorage.getItem('ai_panel_position')
    if (position) {
      floatingPosition.value = JSON.parse(position)
    }

    const size = localStorage.getItem('ai_panel_size')
    if (size) {
      floatingSize.value = JSON.parse(size)
    }

    const originalSizeState = localStorage.getItem('ai_panel_original_size')
    if (originalSizeState) {
      originalSize.value = JSON.parse(originalSizeState)
    }

    const originalPositionState = localStorage.getItem('ai_panel_original_position')
    if (originalPositionState) {
      originalPosition.value = JSON.parse(originalPositionState)
    }

    // 确保窗口在可见区域内
    if (isFloating.value) {
      ensureWindowInBounds()
    }
  } catch (error) {
    console.warn('Failed to load floating state:', error)
  }
}

// Handle outline application
const handleOutlineApplied = async (result: any) => {
  console.log('Outline applied successfully:', result)
  await addMessage('assistant', `**大纲应用成功！**\n\n已成功创建 ${result.createdChapters} 个章节，预计总字数 ${result.estimatedWords} 字。\n\n你可以在章节列表中查看和编辑这些章节。`)

  // Switch back to chat mode after successful application
  setTimeout(() => {
    currentMode.value = 'chat'
  }, 2000)
}

// Initialize
onMounted(async () => {
  console.log('AIAssistantPanel mounted')

  // 加载浮动模式状态
  loadFloatingState()

  // 如果项目已经加载，watch会处理初始化
  // 如果项目还未加载，等待watch的immediate触发
  if (currentProject.value && !hasInitialized.value) {
    console.log('Project already loaded, wait for watch to handle initialization')
  } else if (!currentProject.value && !hasInitialized.value) {
    console.log('No project loaded yet, initializing sessions')
    // 项目还未加载，先加载sessions，避免重复
    await chatStore.loadSessions()
    hasInitialized.value = true

    // 如果有历史会话但没有活跃会话，使用第一个
    if (!chatStore.hasActiveSession && chatStore.sessions.length > 0) {
      await chatStore.switchSession(chatStore.sessions[0].id)
    }
  }

  // 清除新创建消息ID，确保初始加载的历史消息不使用打字机效果
  newlyCreatedMessageId.value = null
  typingMessageId.value = null

  // Auto-scroll to bottom on mount
  nextTick(() => {
    scrollToBottom(false)
  })
})
</script>
<style scoped src="./AIAssistantPanel.css"></style>
