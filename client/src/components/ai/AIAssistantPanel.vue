<template>
  <div
    class="ai-assistant-panel"
    :class="{
      'floating': isFloating,
      'dragging': isDragging,
      'resizing': isResizing
    }"
    :style="isFloating ? {
      position: 'fixed',
      left: floatingPosition.x + 'px',
      top: floatingPosition.y + 'px',
      width: floatingSize.width + 'px',
      height: floatingSize.height + 'px',
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
      @mousedown="isFloating ? startDrag($event) : null"
    >
      <div class="status-info">
        <a-badge :status="aiStatus === 'online' ? 'success' : 'error'" />
        <span class="status-text">AI创作助手</span>
        <span v-if="isFloating" class="floating-indicator">浮动模式</span>
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
                      :is="isFloating ? 'PushpinFilled' : 'DragOutlined'"
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
                <component :is="isMaximized ? 'CompressOutlined' : 'ExpandOutlined'" />
              </div>
            </a-tooltip>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Container -->
    <div class="content-container">

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
    v-if="isFloating"
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
  MessageOutlined,
  EditOutlined,
  CheckCircleOutlined,
  BulbOutlined,
  SettingOutlined,
  DeleteOutlined,
  DownOutlined,
  PictureOutlined,
  AudioOutlined,
  ReloadOutlined,
  RightOutlined,
  FileTextOutlined,
  TeamOutlined,
  GlobalOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  HistoryOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  WechatOutlined,
  SearchOutlined,
  DragOutlined,
  PushpinOutlined,
  PushpinFilled,
  ExpandOutlined,
  CompressOutlined
} from '@ant-design/icons-vue'
import { useProjectStore } from '@/stores/project'
import { useAIChatStore } from '@/stores/aiChat'
import type { ChatMessage } from '@/stores/aiChat'
import { apiClient } from '@/utils/api'
import SyncTypewriter from "@/components/common/SyncTypewriter.vue";
import MarkdownRenderer from "@/components/common/MarkdownRenderer.vue";

// Stores
const projectStore = useProjectStore()
const chatStore = useAIChatStore()

// Define emits
const emit = defineEmits<{
  'floating-mode-change': [isFloating: boolean]
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

// 最小化窗口
const minimizeWindow = () => {
  isMinimized.value = !isMinimized.value
  console.log('窗口最小化:', isMinimized.value)
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
    localStorage.setItem('ai_panel_position', JSON.stringify(floatingPosition.value))
    localStorage.setItem('ai_panel_size', JSON.stringify(floatingSize.value))
    localStorage.setItem('ai_panel_original_size', JSON.stringify(originalSize.value))
    localStorage.setItem('ai_panel_original_position', JSON.stringify(originalPosition.value))
  } catch (error) {
    console.warn('Failed to save floating state:', error)
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

  // 磁性吸附到边缘
  const snapThreshold = 20
  const maxX = window.innerWidth - floatingSize.value.width
  const maxY = window.innerHeight - floatingSize.value.height

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

<style scoped>
.ai-assistant-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg-container);
  overflow: hidden;
}

/* Status Bar */
.status-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--theme-border);
  background: var(--theme-bg-elevated);
  transition: all 0.3s ease;
}

/* 浮动模式下的拖拽头部 */
.status-bar.draggable-header {
  cursor: move;
  user-select: none;
  background: linear-gradient(135deg,
    var(--theme-bg-elevated) 0%,
    rgba(24, 144, 255, 0.05) 100%);
  border-bottom: 1px solid rgba(24, 144, 255, 0.1);
}

.status-bar.draggable-header:hover {
  background: linear-gradient(135deg,
    var(--theme-bg-elevated) 0%,
    rgba(24, 144, 255, 0.08) 100%);
  border-bottom-color: rgba(24, 144, 255, 0.2);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 12px;
  color: var(--theme-text-secondary);
  font-weight: 500;
}

/* 状态栏操作按钮区域 - 新布局设计 */
.status-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* 控制按钮区域 */
.control-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 按钮图标 */
.button-icon {
  font-size: 14px;
  transition: transform 0.2s ease;
}

.action-button:hover .button-icon {
  transform: scale(1.1);
}

/* 历史记录按钮动画效果 */
.history-button:hover .button-icon {
  transform: scale(1.1) rotate(5deg);
}

/* 设置按钮动画效果 */
.settings-button:hover .button-icon {
  transform: scale(1.1) rotate(90deg);
}

@keyframes badge-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .status-actions {
    gap: 8px;
  }

  .button-icon {
    font-size: 12px;
  }
}

/* 全新的浮动模式切换组件样式 */
.float-mode-toggle {
  display: flex;
  align-items: center;
  margin-right: 8px;
}

.float-toggle-container {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg,
    rgba(24, 144, 255, 0.05) 0%,
    rgba(24, 144, 255, 0.1) 100%);
  border: 1px solid rgba(24, 144, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.float-toggle-container::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,
    rgba(24, 144, 255, 0.1) 0%,
    rgba(24, 144, 255, 0.2) 100%);
  opacity: 0;
  transition: all 0.3s ease;
  z-index: -1;
}

.float-toggle-container:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
  border-color: rgba(24, 144, 255, 0.3);
}

.float-toggle-container:hover::before {
  opacity: 1;
}

.float-toggle-container.floating-active {
  background: linear-gradient(135deg,
    rgba(138, 43, 226, 0.1) 0%,
    rgba(106, 13, 173, 0.15) 100%);
  border-color: rgba(138, 43, 226, 0.2);
  box-shadow: 0 2px 8px rgba(138, 43, 226, 0.15);
}

.float-toggle-container.floating-active::before {
  background: linear-gradient(135deg,
    rgba(138, 43, 226, 0.15) 0%,
    rgba(106, 13, 173, 0.25) 100%);
  opacity: 0.7;
}

.float-toggle-container.floating-active:hover {
  border-color: rgba(138, 43, 226, 0.4);
  box-shadow: 0 4px 12px rgba(138, 43, 226, 0.25);
}

.toggle-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  position: relative;
}

.toggle-icon {
  font-size: 14px;
  color: #1890ff;
  transition: all 0.3s ease;
}

.floating-active .toggle-icon {
  color: #8a2be2;
}

.toggle-indicator {
  display: flex;
  align-items: center;
}

.indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d9d9d9;
  transition: all 0.3s ease;
  position: relative;
}

.indicator-dot.active {
  background: #8a2be2;
  box-shadow: 0 0 8px rgba(138, 43, 226, 0.4);
}

.indicator-dot.active::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: rgba(138, 43, 226, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.session-time {
  opacity: 0.7;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--theme-text);
  font-size: 14px;
}

.session-list-item :deep(.ant-list-item-meta) {
  align-items: center;
}

.session-list-item :deep(.ant-list-item-meta-avatar) {
  margin-right: 12px;
}

.session-time {
  color: var(--theme-text-secondary);
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.new-session-btn {
  height: 32px;
  border-radius: 6px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.new-session-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(24, 144, 255, 0.2);
}

.action-btn span {
  font-size: 12px;
}

/* Content Container */
.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
}

/* Chat Container */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* Messages Area */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  position: relative;
  scroll-behavior: smooth;
}

.messages-area::-webkit-scrollbar {
  width: 6px;
}

.messages-area::-webkit-scrollbar-track {
  background: var(--theme-bg-elevated);
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb {
  background: var(--theme-border);
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: var(--theme-text-secondary);
}

.messages-wrapper {
  position: relative;
  min-height: 100%;
}

/* Welcome Message */
.welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 16px;
  margin-bottom: 24px;
}

.welcome-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1890ff, #722ed1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.welcome-icon :deep(.anticon) {
  font-size: 28px;
  color: #fff;
}

.welcome-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--theme-text);
}

.welcome-content p {
  margin: 0;
  font-size: 14px;
  color: var(--theme-text-secondary);
  line-height: 1.5;
}

/* Message List */
.message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  width: 100%;
}

/* User Message */
.user-message-bubble {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-left: auto;
  max-width: 80%;
}

.user-message .message-content {
  background: #1890ff;
  color: #fff;
  border-radius: 16px 16px 4px 16px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.user-avatar {
  background: #1890ff;
  flex-shrink: 0;
}

/* Assistant Message */
.assistant-message-bubble {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 80%;
}

.assistant-message .message-content {
  background: var(--theme-bg-elevated);
  color: var(--theme-text);
  border-radius: 16px 16px 16px 4px;
  padding: 12px 16px;
  border: 1px solid var(--theme-border);
}

.ai-avatar {
  background: linear-gradient(135deg, #1890ff, #722ed1);
  flex-shrink: 0;
}

.ai-avatar.typing {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Message Content */
.message-text {
  line-height: 1.6;
  word-break: break-word;
}

.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(code) {
  background: var(--theme-bg-elevated);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.9em;
}

.markdown-content :deep(ul) {
  margin: 8px 0;
  padding-left: 16px;
}

.markdown-content :deep(li) {
  margin: 4px 0;
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
}

/* 用户消息元数据样式 */
.user-message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.user-message-bubble:hover .user-message-meta {
  opacity: 1;
}

.user-operations {
  display: flex;
  gap: 4px;
}

.message-meta {
  margin-top: 8px;
}

.message-operations {
  display: flex;
  gap: 4px;
  margin: 4px 0;
}

.operation-btn {
  font-size: 12px;
  height: 24px;
  padding: 0 6px;
  border-radius: 4px;
  color: var(--theme-text-secondary);
}

.operation-btn:hover {
  color: var(--theme-text);
  background-color: var(--theme-bg-elevated);
}

.delete-btn {
  opacity: 0.6;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  opacity: 1;
  background-color: rgba(255, 77, 79, 0.1) !important;
  color: #ff4d4f !important;
}

.message-actions {
  display: flex;
  gap: 4px;
  margin: 4px 0;
}

.action-btn-small {
  font-size: 11px;
  height: 20px;
  padding: 0 6px;
  border-radius: 4px;
}

.message-suggestions {
  margin-top: 8px;
  padding: 8px;
  background: var(--theme-bg-elevated);
  border-radius: 6px;
  border: 1px solid var(--theme-border);
}

.suggestion-label {
  font-size: 11px;
  color: var(--theme-text-secondary);
  margin-bottom: 4px;
}

.suggestion-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.suggestion-tag {
  cursor: pointer;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.suggestion-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3);
}

.message-followups {
  margin-top: 6px;
  padding: 6px;
  background: rgba(24, 144, 255, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(24, 144, 255, 0.2);
}

.followup-label {
  font-size: 11px;
  color: var(--theme-text-secondary);
  margin-bottom: 4px;
}

.followup-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.followup-btn {
  font-size: 11px;
  height: auto;
  padding: 4px 8px;
  text-align: left;
  justify-content: flex-start;
  color: #1890ff;
  background: transparent;
  border-radius: 4px;
}

.followup-btn:hover {
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--theme-text-secondary);
  animation: typing 1.4s ease-in-out infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

/* Streaming Indicator */
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 6px 12px;
  background: rgba(24, 144, 255, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(24, 144, 255, 0.2);
}

.streaming-dots {
  display: flex;
  gap: 3px;
}

.streaming-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #1890ff;
  animation: streaming 1.2s ease-in-out infinite;
}

.streaming-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.streaming-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

.streaming-text {
  font-size: 11px;
  color: #1890ff;
  font-weight: 500;
}

/* Input Area */
.input-area {
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
  gap: 8px;
  background: var(--theme-bg-elevated);
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  padding: 8px 12px;
  transition: all 0.2s;
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
}

.message-input:focus {
  box-shadow: none;
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-action-btn {
  color: var(--theme-text-secondary);
  padding: 4px;
  border-radius: 4px;
}

.input-action-btn:hover {
  color: var(--theme-text-secondary);
  background-color: var(--theme-bg-elevated);
}

.send-btn {
  padding: 4px 8px;
  height: 28px;
  border-radius: 6px;
}

.input-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 11px;
  color: var(--theme-text-secondary);
}

.char-count {
  color: var(--theme-text-secondary);
}


/* Animations */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

@keyframes streaming {
  0%, 60%, 100% {
    transform: scale(1);
    opacity: 0.7;
  }
  30% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 480px) {
  .user-message-bubble,
  .assistant-message-bubble {
    max-width: 95%;
  }

  .input-container {
    padding: 12px;
  }

  .welcome-message {
    padding: 24px 12px;
  }
}

/* 浮动模式样式 */
.ai-assistant-panel.floating {
  border: 1px solid var(--theme-border);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
  backdrop-filter: blur(20px);
  position: relative;
}

.ai-assistant-panel.floating::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(24, 144, 255, 0.6) 25%,
    rgba(114, 46, 209, 0.6) 50%,
    rgba(24, 144, 255, 0.6) 75%,
    transparent 100%);
  border-radius: 12px 12px 0 0;
}

.ai-assistant-panel.dragging {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25) !important;
  transform: scale(1.02);
  transition: all 0.1s ease;
}

.ai-assistant-panel.resizing {
  transition: none;
}

/* 调整大小手柄 */
.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: nw-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    rgba(24, 144, 255, 0.1) 0%,
    rgba(24, 144, 255, 0.2) 100%);
  border-top-left-radius: 8px;
  transition: all 0.3s ease;
  opacity: 0.6;
}

.resize-handle:hover {
  background: linear-gradient(135deg,
    rgba(24, 144, 255, 0.2) 0%,
    rgba(24, 144, 255, 0.3) 100%);
  opacity: 1;
  transform: scale(1.1);
}

.resize-icon {
  font-size: 12px;
  color: #1890ff;
  font-weight: bold;
  line-height: 1;
  transform: rotate(45deg);
  user-select: none;
}

/* 浮动模式下内容区域调整 */
.ai-assistant-panel.floating .content-container {
  height: calc(100% - 60px);
}

/* 暗黑模式适配 */
.dark .ai-assistant-panel.floating {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4) !important;
}

.dark .ai-assistant-panel.floating::before {
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(96, 165, 250, 0.6) 25%,
    rgba(168, 85, 247, 0.6) 50%,
    rgba(96, 165, 250, 0.6) 75%,
    transparent 100%);
}

.dark .ai-assistant-panel.dragging {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6) !important;
}

.dark .resize-handle {
  background: linear-gradient(135deg,
    rgba(96, 165, 250, 0.1) 0%,
    rgba(96, 165, 250, 0.2) 100%);
}

.dark .resize-handle:hover {
  background: linear-gradient(135deg,
    rgba(96, 165, 250, 0.2) 0%,
    rgba(96, 165, 250, 0.3) 100%);
}

.dark .resize-icon {
  color: #60a5fa;
}

.dark .status-bar.draggable-header {
  background: linear-gradient(135deg,
    var(--theme-bg-elevated) 0%,
    rgba(96, 165, 250, 0.05) 100%);
  border-bottom: 1px solid rgba(96, 165, 250, 0.1);
}

.dark .status-bar.draggable-header:hover {
  background: linear-gradient(135deg,
    var(--theme-bg-elevated) 0%,
    rgba(96, 165, 250, 0.08) 100%);
  border-bottom-color: rgba(96, 165, 250, 0.2);
}

/* 浮动模式指示器 */
.floating-indicator {
  font-size: 11px;
  color: #8a2be2;
  background: linear-gradient(135deg,
    rgba(138, 43, 226, 0.1) 0%,
    rgba(106, 13, 173, 0.15) 100%);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  font-weight: 500;
  animation: float-pulse 3s ease-in-out infinite;
}

@keyframes float-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
}

/* 浮动窗口控制按钮 */
.floating-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.control-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  border: 1px solid transparent;
}

.minimize-btn {
  background: linear-gradient(135deg,
    rgba(255, 193, 7, 0.1) 0%,
    rgba(255, 235, 59, 0.15) 100%);
  border-color: rgba(255, 193, 7, 0.2);
}

.minimize-btn:hover {
  background: linear-gradient(135deg,
    rgba(255, 193, 7, 0.2) 0%,
    rgba(255, 235, 59, 0.25) 100%);
  border-color: rgba(255, 193, 7, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
}

.minimize-icon {
  width: 8px;
  height: 2px;
  background: #ffc107;
  border-radius: 1px;
}

.maximize-btn {
  background: linear-gradient(135deg,
    rgba(76, 175, 80, 0.1) 0%,
    rgba(129, 199, 132, 0.15) 100%);
  border-color: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  font-size: 12px;
}

.maximize-btn:hover {
  background: linear-gradient(135deg,
    rgba(76, 175, 80, 0.2) 0%,
    rgba(129, 199, 132, 0.25) 100%);
  border-color: rgba(76, 175, 80, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.dark .float-toggle-btn:hover {
  color: #60a5fa;
  background-color: rgba(96, 165, 250, 0.1);
}

/* 新的输入工具栏样式 */
.input-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--theme-bg-elevated);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px 12px 0 0;
  backdrop-filter: blur(10px);
  margin-bottom: 1px;
  transition: all 0.3s ease;
}

.input-toolbar:hover {
  background: var(--theme-bg-elevated);
  border-color: rgba(24, 144, 255, 0.2);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 工具栏按钮样式 */
.toolbar-button {
  position: relative;
  cursor: pointer;
}

.button-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.button-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.6) 50%,
    transparent 100%);
  transition: left 0.5s ease;
}

.button-wrapper:hover::before {
  left: 100%;
}

.button-wrapper:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.button-icon {
  font-size: 16px;
  transition: all 0.3s ease;
}

.button-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--theme-text);
  white-space: nowrap;
}

/* 历史按钮特殊样式 */
.history-tool-button .button-wrapper {
  background: linear-gradient(135deg,
    rgba(24, 144, 255, 0.08) 0%,
    rgba(24, 144, 255, 0.15) 100%);
  border-color: rgba(24, 144, 255, 0.2);
  color: #1890ff;
}

.history-tool-button .button-wrapper:hover {
  background: linear-gradient(135deg,
    rgba(24, 144, 255, 0.15) 0%,
    rgba(24, 144, 255, 0.25) 100%);
  border-color: rgba(24, 144, 255, 0.4);
}

.history-tool-button .button-icon {
  color: #1890ff;
}

.session-count {
  background: #ff4d4f;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  box-shadow: 0 2px 4px rgba(255, 77, 79, 0.3);
  animation: pulse-count 2s infinite ease-in-out;
}

@keyframes pulse-count {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

/* 设置按钮特殊样式 */
.settings-tool-button .button-wrapper {
  background: linear-gradient(135deg,
    rgba(82, 196, 26, 0.08) 0%,
    rgba(82, 196, 26, 0.15) 100%);
  border-color: rgba(82, 196, 26, 0.2);
  color: #52c41a;
}

.settings-tool-button .button-wrapper:hover {
  background: linear-gradient(135deg,
    rgba(82, 196, 26, 0.15) 0%,
    rgba(82, 196, 26, 0.25) 100%);
  border-color: rgba(82, 196, 26, 0.4);
}

.settings-tool-button .button-icon {
  color: #52c41a;
}

.settings-tool-button .button-wrapper:hover .button-icon {
  transform: rotate(90deg) scale(1.1);
}

/* 滚动按钮特殊样式 */
.scroll-tool-button .button-wrapper {
  background: linear-gradient(135deg,
    rgba(255, 165, 0, 0.08) 0%,
    rgba(255, 165, 0, 0.15) 100%);
  border-color: rgba(255, 165, 0, 0.2);
  color: #fa8c16;
  animation: scroll-pulse 2s infinite ease-in-out;
}

.scroll-tool-button .button-wrapper:hover {
  background: linear-gradient(135deg,
    rgba(255, 165, 0, 0.15) 0%,
    rgba(255, 165, 0, 0.25) 100%);
  border-color: rgba(255, 165, 0, 0.4);
  transform: translateY(-2px);
}

.scroll-tool-button .button-icon {
  color: #fa8c16;
  transition: all 0.3s ease;
}

.scroll-tool-button .button-wrapper:hover .button-icon {
  transform: translateY(2px) scale(1.2);
  animation: bounce-down 0.6s ease infinite;
}

@keyframes scroll-pulse {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(250, 140, 22, 0.1);
  }
  50% {
    box-shadow: 0 4px 16px rgba(250, 140, 22, 0.2);
  }
}

@keyframes bounce-down {
  0%, 100% {
    transform: translateY(2px) scale(1.2);
  }
  50% {
    transform: translateY(4px) scale(1.2);
  }
}

/* 下拉菜单样式 */
.history-dropdown {
  min-width: 360px;
  max-width: 400px;
  background: var(--theme-bg-elevated);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg,
    rgba(24, 144, 255, 0.08) 0%,
    rgba(24, 144, 255, 0.12) 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
}

.new-session-btn {
  background: #1890ff;
  border-color: #1890ff;
  color: white;
  border-radius: 8px;
  font-weight: 500;
}

.new-session-btn:hover {
  background: #40a9ff;
  border-color: #40a9ff;
  transform: translateY(-1px);
}

.session-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;
}

.session-item-new {
  border-radius: 8px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
}

.session-item-new:hover {
  background: rgba(24, 144, 255, 0.04);
}

.session-button {
  width: 100%;
  height: auto;
  padding: 12px;
  text-align: left;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.session-button.active {
  background: rgba(24, 144, 255, 0.1);
  border-color: rgba(24, 144, 255, 0.3);
}

.session-button:hover {
  background: rgba(24, 144, 255, 0.08);
  border-color: rgba(24, 144, 255, 0.2);
}

.session-content {
  width: 100%;
}

.session-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.session-title-new {
  font-weight: 500;
  color: var(--theme-text);
  font-size: 14px;
}

.session-time {
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.session-meta-new {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-tag {
  border-radius: 6px;
  font-size: 11px;
}

.message-count {
  font-size: 12px;
  color: var(--theme-text-secondary);
}

.delete-session-btn {
  color: #ff4d4f;
  padding: 4px;
  border-radius: 6px;
}

.delete-session-btn:hover {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

/* 设置下拉菜单样式 */
.settings-dropdown {
  min-width: 200px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.settings-menu-item {
  padding: 12px 16px;
  transition: all 0.2s ease;
  border-radius: 0;
}

.settings-menu-item:hover {
  background: rgba(82, 196, 26, 0.08);
  color: #52c41a;
}

.danger-menu-item:hover {
  background: rgba(255, 77, 79, 0.08);
  color: #ff4d4f;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .input-toolbar {
    padding: 8px 12px;
  }

  .button-wrapper {
    padding: 6px 12px;
    gap: 6px;
  }

  .button-label {
    font-size: 13px;
  }

  .button-icon {
    font-size: 14px;
  }

  .history-dropdown {
    min-width: 280px;
  }
}
</style>
