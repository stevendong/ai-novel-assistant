<template>
  <FloatingContainer
      class="ai-assistant-panel"
      :is-floating="isFloating"
      :is-minimized="isMinimized"
      :is-maximized="isMaximized"
      :floating-position="floatingPosition"
      :floating-size="floatingSize"
      :is-dragging="isDragging"
      :is-resizing="isResizing"
      @drag-start="startDragOrRestore"
      @resize-start="handleResizeStart"
  >
    <!-- AI Status Bar -->
    <StatusBar
        :ai-status="aiStatus"
        :is-floating="isFloating"
        :is-minimized="isMinimized"
        :is-maximized="isMaximized"
        @toggle-floating="toggleFloatingMode"
        @minimize="minimizeWindow"
        @toggle-maximize="toggleMaximize"
        @close="closeFloatingMode"
        @start-drag="startDragOrRestore"
    />

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
        <!-- No Session State -->
        <WelcomeScreen
            v-if="!chatStore.hasActiveSession"
            :has-active-session="chatStore.hasActiveSession"
            :message-count="chatStore.currentMessages.length"
            :current-mode="currentMode"
            :mode-description="getModeDescription(currentMode)"
            @create-session="createNewSession"
        />

        <!-- Messages Area -->
        <MessageList
          v-else
          ref="messageListRef"
          :messages="messages"
          :mode-description="getModeDescription(currentMode)"
          :deleting-message-id="deletingMessageId"
          @scroll="handleScroll"
          @delete-message="handleDeleteMessage"
          @copy-message="copyMessage"
          @regenerate-message="regenerateMessage"
          @apply-suggestion="applySuggestion"
          @ask-followup="askFollowUp"
          @perform-action="performMessageAction"
          @scroll-button-change="handleScrollButtonChange"
        />

        <!-- Input Toolbar (only show when there's an active session) -->
        <ChatToolbar
          v-if="chatStore.hasActiveSession"
          :sessions="chatStore.sessions"
          :current-session-id="chatStore.currentSession?.id"
          @switch-session="switchToSession"
          @create-session="createNewSession"
          @delete-session="deleteSession"
          @clear-conversation="clearConversation"
        />

        <!-- Input Area (only show when there's an active session) -->
        <MessageInput
            v-if="chatStore.hasActiveSession"
            ref="messageInputRef"
            v-model="inputMessage"
            :placeholder="getInputPlaceholder(currentMode)"
            :disabled="aiStatus === 'offline'"
            :is-loading="isTyping"
            :max-length="2000"
            :show-image-button="false"
            :show-voice-button="false"
            @send="handleSendMessage"
            @input="handleInput"
        />
      </div>

    </div>

    <!-- 新的滚动到底部按钮 -->
    <ScrollToBottomButton
        :visible="showScrollButton"
        :unread-count="unreadCount"
        :scroll-progress="scrollProgress"
        :show-progress="true"
        :auto-hide="false"
        @click="scrollToBottom"
        @visibility-change="handleScrollButtonVisibilityChange"
    />

  </FloatingContainer>
</template>

<script setup lang="ts">
import {ref, computed, onMounted, nextTick, watch} from 'vue'
import {Modal, message} from 'ant-design-vue'
import {
  BulbOutlined,
  FileTextOutlined,
  EditOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  GlobalOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons-vue'
import {useProjectStore} from '@/stores/project'
import {useAIChatStore} from '@/stores/aiChat'
import type {ChatMessage} from '@/stores/aiChat'
import {apiClient} from '@/utils/api'
import {useFloatingWindow} from '@/composables/useFloatingWindow'
import StatusBar from "@/components/ai/StatusBar.vue"
import WelcomeScreen from "@/components/ai/WelcomeScreen.vue"
import MessageInput from "@/components/ai/MessageInput.vue"
import ScrollToBottomButton from "@/components/ai/ScrollToBottomButton.vue"
import FloatingContainer from "@/components/ai/FloatingContainer.vue"
import MessageList from "@/components/ai/MessageList.vue"
import ChatToolbar from "@/components/ai/ChatToolbar.vue"
import OutlineGenerator from "@/components/ai/OutlineGenerator.vue"

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
const unreadCount = ref(0)
const scrollProgress = ref(0)
const messageListRef = ref<InstanceType<typeof MessageList>>()

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

// 使用浮动窗口钩子
const {
  floatingPosition,
  floatingSize,
  originalSize,
  originalPosition,
  isDragging,
  isResizing,
  startDrag,
  startResize,
  ensureWindowInBounds,
  saveFloatingState,
  loadFloatingState: loadFloatingWindowState
} = useFloatingWindow()

// 流式打字机完成回调
const onStreamComplete = (messageId: string) => {
  console.log('Stream typewriter completed for message:', messageId)
}

// 流式打字机内容更新回调
const onStreamContentUpdate = (content: string) => {
  // 流式内容更新时自动滚动
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollToBottom()
    }
  })
}

// 打字机速度变化回调
const onTypingSpeedChange = (speed: number) => {
  console.log('SyncTypewriter speed changed:', speed, 'ms')
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
      {key: 'help', label: '帮助', icon: BulbOutlined},
      {key: 'examples', label: '示例', icon: FileTextOutlined},
      {key: 'brainstorm', label: '头脑风暴', icon: BulbOutlined},
      {key: 'inspiration', label: '创作灵感', icon: EditOutlined}
    ]
  },
  enhance: {
    description: '完善你的角色、设定和情节内容',
    placeholder: '描述你想要完善的内容...',
    actions: [
      {key: 'enhance-character', label: '完善角色', icon: TeamOutlined},
      {key: 'enhance-setting', label: '扩展设定', icon: GlobalOutlined},
      {key: 'generate-outline', label: '生成大纲', icon: FileTextOutlined},
      {key: 'suggest-plot', label: '情节建议', icon: BulbOutlined}
    ]
  },
  check: {
    description: '检查内容的一致性和逻辑性',
    placeholder: '输入需要检查的内容...',
    actions: [
      {key: 'check-consistency', label: '一致性检查', icon: CheckCircleOutlined},
      {key: 'check-character', label: '角色检查', icon: TeamOutlined},
      {key: 'check-timeline', label: '时间线检查', icon: ExclamationCircleOutlined},
      {key: 'check-logic', label: '逻辑检查', icon: BulbOutlined}
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
}, {immediate: true})


// Methods
const getModeDescription = (mode: string) => {
  return modeConfigs[mode as keyof typeof modeConfigs]?.description || ''
}

const getInputPlaceholder = (mode: string) => {
  return modeConfigs[mode as keyof typeof modeConfigs]?.placeholder || '输入消息...'
}


// 处理滚动事件（从MessageList传递过来）
const handleScroll = (event: Event) => {
  // 可以在这里添加额外的滚动处理逻辑
}

// 滚动到底部
const scrollToBottom = (smooth = true) => {
  if (messageListRef.value) {
    messageListRef.value.scrollToBottom(smooth)
  }
}

// 处理滚动按钮变化（从MessageList传递过来）
const handleScrollButtonChange = (visible: boolean, unread: number, progress: number) => {
  showScrollButton.value = visible
  unreadCount.value = unread
  scrollProgress.value = progress
}

// 处理滚动按钮可见性变化
const handleScrollButtonVisibilityChange = (visible: boolean) => {
  showScrollButton.value = visible
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

// Handle message from MessageInput component
const handleSendMessage = (message: string) => {
  inputMessage.value = message
  sendMessage()
}

const addMessage = async (role: 'user' | 'assistant', content: string, actions?: Array<{
  key: string;
  label: string
}>) => {
  const message = await chatStore.addMessage(role, content, actions)

  // 如果是AI消息，设置新创建的消息ID用于打字机效果
  if (role === 'assistant' && message) {
    newlyCreatedMessageId.value = message.id
  }

  // 自动滚动到底部
  nextTick(() => {
    scrollToBottom()
  })
}

// 清空对话历史
const clearConversation = async () => {
  if (!chatStore.currentSession) return

  try {
    await chatStore.clearCurrentSession()
    
    // 自动滚动到底部以显示欢迎消息
    nextTick(() => {
      scrollToBottom()
    })
  } catch (error) {
    console.error('清空对话失败:', error)
  }
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

// 删除会话
const deleteSession = async (sessionId: string) => {
  if (!sessionId) return
  
  try {
    await chatStore.deleteSession(sessionId)
  } catch (error) {
    console.error('删除会话失败:', error)
  }
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


// 浮动模式相关方法
const toggleFloatingMode = () => {
  isMaximized.value = false
  isMinimized.value = false
  isFloating.value = !isFloating.value

  if (isFloating.value) {
    ensureWindowInBounds()
  }

  // 保存浮动模式状态
  try {
    localStorage.setItem('ai_panel_floating', JSON.stringify(isFloating.value))
    localStorage.setItem('ai_panel_maximized', JSON.stringify(isMaximized.value))
    localStorage.setItem('ai_panel_minimized', JSON.stringify(isMinimized.value))
  } catch (error) {
    console.warn('Failed to save floating state:', error)
  }

  emit('floating-mode-change', isFloating.value)
  console.log('浮动模式切换:', isFloating.value ? '启用' : '禁用')
}

// 最大化/还原窗口
const toggleMaximize = () => {
  if (!isMaximized.value) {
    originalSize.value = {...floatingSize.value}
    originalPosition.value = {...floatingPosition.value}

    floatingSize.value = {
      width: window.innerWidth - 40,
      height: window.innerHeight - 40
    }
    floatingPosition.value = {x: 20, y: 20}
    isMaximized.value = true
  } else {
    floatingSize.value = {...originalSize.value}
    floatingPosition.value = {...originalPosition.value}
    isMaximized.value = false
  }

  saveFloatingState()
  try {
    localStorage.setItem('ai_panel_maximized', JSON.stringify(isMaximized.value))
  } catch (error) {
    console.warn('Failed to save maximized state:', error)
  }
  console.log('窗口最大化:', isMaximized.value)
}

// 最小化窗口
const minimizeWindow = () => {
  isMinimized.value = !isMinimized.value

  try {
    localStorage.setItem('ai_panel_minimized', JSON.stringify(isMinimized.value))
  } catch (error) {
    console.warn('Failed to save minimized state:', error)
  }

  console.log('窗口最小化:', isMinimized.value)
}

// 关闭AI助手模块
const closeFloatingMode = () => {
  isFloating.value = false
  isMaximized.value = false
  isMinimized.value = false

  try {
    localStorage.setItem('ai_panel_floating', JSON.stringify(isFloating.value))
    localStorage.setItem('ai_panel_maximized', JSON.stringify(isMaximized.value))
    localStorage.setItem('ai_panel_minimized', JSON.stringify(isMinimized.value))
  } catch (error) {
    console.warn('Failed to save floating state:', error)
  }

  emit('close-panel')
  console.log('关闭AI助手模块')
}

// 处理拖拽或恢复窗口
const startDragOrRestore = (e: MouseEvent) => {
  if (!isFloating.value || isMaximized.value) return
  startDrag(e, isMinimized.value)
}

// 处理调整大小
const handleResizeStart = (e: MouseEvent) => {
  if (!isFloating.value || isMaximized.value) return
  startResize(e)
}

// 加载浮动模式状态
const loadFloatingState = () => {
  try {
    // 先加载位置和大小
    loadFloatingWindowState()

    // 再加载浮动模式开关状态
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
/* AI Assistant Panel */
.ai-assistant-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg-container);
  overflow: hidden;
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

/* Outline Mode */
.outline-mode {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  .content-container {
    padding: 0;
  }
}
</style>
