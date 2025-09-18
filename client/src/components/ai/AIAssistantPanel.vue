<template>
  <div class="ai-assistant-panel">
    <!-- AI Status Bar -->
    <div class="status-bar">
      <div class="status-info">
        <a-badge :status="aiStatus === 'online' ? 'success' : 'error'" />
        <span class="status-text">AI创作助手</span>
      </div>
      <div class="status-actions">
        <!-- 会话历史下拉 -->
        <a-dropdown :trigger="['click']" placement="bottomRight" v-if="chatStore.sessions.length > 0">
          <a-button type="text" size="small" class="history-btn">
            <HistoryOutlined />
            <span class="btn-text">历史会话</span>
          </a-button>
          <template #overlay>
            <div class="session-dropdown-container">
              <!-- 头部 -->
              <div class="session-dropdown-header">
                <div class="header-title">
                  <HistoryOutlined />
                  <span>历史会话</span>
                </div>
                <div class="header-count">{{ chatStore.sessions.length }} 个会话</div>
              </div>

              <!-- 会话列表 -->
              <div class="session-dropdown-content">
                <a-list
                  :data-source="chatStore.sessions"
                  :locale="{ emptyText: '暂无会话' }"
                  size="small"
                >
                  <template #renderItem="{ item: session }">
                    <a-list-item
                      class="session-list-item"
                      @click="handleSessionClick({ key: session.id })"
                    >
                      <template #actions>
                        <a-tooltip title="删除会话">
                          <a-button
                            type="text"
                            size="small"
                            class="session-action-btn"
                            @click.stop="handleDeleteSession(session.id)"
                            :loading="deletingSessionId === session.id"
                            danger
                          >
                            <DeleteOutlined />
                          </a-button>
                        </a-tooltip>
                      </template>

                      <a-list-item-meta>
                        <template #title>
                          <div class="session-item-title">
                            {{ session.title }}
                          </div>
                        </template>
                        <template #description>
                          <div class="session-item-meta">
                            <a-tag :color="getModeColor(session.mode)" size="small">
                              {{ getModeLabel(session.mode) }}
                            </a-tag>
                            <span class="session-time">
                              <ClockCircleOutlined />
                              {{ formatSessionTime(session.updatedAt) }}
                            </span>
                          </div>
                        </template>
                        <template #avatar>
                          <a-avatar size="small" :style="{ backgroundColor: getModeColor(session.mode) }">
                            <component :is="getModeIcon(session.mode)" />
                          </a-avatar>
                        </template>
                      </a-list-item-meta>
                    </a-list-item>
                  </template>
                </a-list>
              </div>

              <!-- 底部操作 -->
              <div class="session-dropdown-footer">
                <a-button
                  type="primary"
                  block
                  size="small"
                  @click="handleSessionClick({ key: 'new' })"
                  class="new-session-btn"
                >
                  <PlusOutlined />
                  新建对话
                </a-button>
              </div>
            </div>
          </template>
        </a-dropdown>
        
        <!-- 设置下拉 -->
        <a-dropdown :trigger="['click']" placement="bottomRight">
          <a-button type="text" size="small" class="settings-btn">
            <SettingOutlined />
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item key="model">
                <RobotOutlined />
                <span>切换模型</span>
              </a-menu-item>
              <a-menu-item key="settings">
                <SettingOutlined />
                <span>AI设置</span>
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="clear" @click="clearConversation">
                <DeleteOutlined />
                <span>清空对话</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <!-- Mode Tabs -->
    <div class="mode-tabs">
      <a-tabs
        v-model:activeKey="currentMode"
        size="small"
        @change="switchMode"
        class="custom-tabs"
      >
        <a-tab-pane key="chat" tab="智能对话">
          <template #tab>
            <MessageOutlined />
            <span class="tab-text">对话</span>
          </template>
        </a-tab-pane>
        <a-tab-pane key="enhance" tab="内容完善">
          <template #tab>
            <EditOutlined />
            <span class="tab-text">完善</span>
          </template>
        </a-tab-pane>
        <a-tab-pane key="check" tab="质量检查">
          <template #tab>
            <CheckCircleOutlined />
            <span class="tab-text">检查</span>
          </template>
        </a-tab-pane>
        <a-tab-pane v-if="false" key="outline" tab="大纲生成">
          <template #tab>
            <BulbOutlined />
            <span class="tab-text">大纲</span>
          </template>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions" v-if="currentModeActions.length > 0">
      <div class="actions-grid">
        <a-button
          v-for="action in currentModeActions"
          :key="action.key"
          size="small"
          class="action-btn"
          :loading="action.key === loadingAction"
          @click="performQuickAction(action.key)"
        >
          <component :is="action.icon" />
          <span>{{ action.label }}</span>
        </a-button>
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
                    <!-- 使用打字机效果或普通渲染 -->
                    <TypewriterText
                      v-if="shouldUseTypewriter(message)"
                      :content="message.content"
                      :speed="typewriterSettings.speed"
                      :show-cursor="typewriterSettings.showCursor"
                      :enable-highlight="true"
                      :enable-tables="true"
                      :enable-task-lists="true"
                      @complete="onTypewriterComplete(message.id)"
                      @typing="onTypewriterTyping"
                    />
                    <MarkdownRenderer
                      v-else
                      :content="message.content"
                      :enable-highlight="true"
                      :enable-tables="true"
                      :enable-task-lists="true"
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

            <!-- Typing Indicator -->
            <div v-if="isTyping" class="message-item assistant-message">
              <div class="assistant-message-bubble">
                <div class="message-avatar">
                  <a-avatar size="small" class="ai-avatar typing">
                    <RobotOutlined />
                  </a-avatar>
                </div>
                <div class="message-content">
                  <div class="typing-indicator">
                    <div class="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span class="typing-text">AI正在思考...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Scroll to Bottom Button -->
          <div
            v-show="showScrollButton"
            class="scroll-to-bottom"
            @click="() => scrollToBottom()"
          >
            <a-button type="primary" shape="circle" size="small">
              <DownOutlined />
            </a-button>
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
              <a-tooltip title="发送图片">
                <a-button type="text" size="small" class="input-action-btn">
                  <PictureOutlined />
                </a-button>
              </a-tooltip>
              <a-tooltip title="语音输入">
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
  SearchOutlined
} from '@ant-design/icons-vue'
import OutlineGenerator from './OutlineGenerator.vue'
import MarkdownRenderer from '@/components/common/MarkdownRenderer.vue'
import TypewriterText from '@/components/common/TypewriterText.vue'
import { useProjectStore } from '@/stores/project'
import { useAIChatStore } from '@/stores/aiChat'
import type { ChatMessage } from '@/stores/aiChat'
import { apiClient } from '@/utils/api'

// Stores
const projectStore = useProjectStore()
const chatStore = useAIChatStore()

// Use interface from store
// interface Message is now imported as ChatMessage


// Reactive state
const currentMode = ref<'chat' | 'enhance' | 'check' | 'outline'>('chat')
const inputMessage = ref('')
const loadingAction = ref<string | null>(null)
const showScrollButton = ref(false)
const messagesContainer = ref<HTMLElement>()
const inputRef = ref()

// 打字机效果设置
const typewriterSettings = ref({
  enabled: true,
  speed: 30,
  showCursor: true
})
const typingMessageId = ref<string | null>(null)
const newlyCreatedMessageId = ref<string | null>(null)
const deletingSessionId = ref<string | null>(null)
const deletingMessageId = ref<string | null>(null)

// 判断是否应该使用打字机效果
const shouldUseTypewriter = (message: ChatMessage) => {
  // 只对新创建的AI消息使用打字机效果，历史消息不使用
  return message.role === 'assistant' &&
         message.id === newlyCreatedMessageId.value &&
         typingMessageId.value !== message.id
}

// 打字机完成回调
const onTypewriterComplete = (messageId: string) => {
  typingMessageId.value = messageId
}

// 打字机输入中回调
const onTypewriterTyping = () => {
  // 可以在这里添加其他逻辑，如自动滚动等
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

// Computed properties
const currentModeActions = computed(() => {
  return modeConfigs[currentMode.value as keyof typeof modeConfigs]?.actions || []
})

// Current project from store
const currentProject = computed(() => projectStore.currentProject)

// Initialize chat session when project changes
watch(currentProject, async (newProject) => {
  if (newProject) {
    // 首先检查是否有该项目的现有会话
    const existingSession = chatStore.sessions.find(s => s.novelId === newProject.id && s.mode === currentMode.value)
    if (existingSession) {
      // 使用现有会话
      await chatStore.switchSession(existingSession.id)
    } else if (!chatStore.currentSession || chatStore.currentSession.novelId !== newProject.id) {
      // 只有在没有现有会话且当前会话不匹配时才创建新会话
      await chatStore.createNewSession(newProject.id, currentMode.value)
    }

    // 清除新创建消息ID，避免历史消息使用打字机效果
    newlyCreatedMessageId.value = null
    typingMessageId.value = null
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

const switchMode = async (mode: string) => {
  const typedMode = mode as 'chat' | 'enhance' | 'check' | 'outline'
  currentMode.value = typedMode
  if (typedMode !== 'outline') {
    await chatStore.updateSessionMode(typedMode as 'chat' | 'enhance' | 'check')
  }
}

const performQuickAction = async (actionKey: string) => {
  loadingAction.value = actionKey

  try {
    switch (actionKey) {
      case 'help':
        await addMessage('assistant', '我可以帮助你：\n• 完善角色设定和背景\n• 扩展世界观和设定\n• 生成章节大纲\n• 检查内容一致性\n• 提供创作建议\n\n你可以直接向我提问，比如"帮我完善主角的性格"或"检查这个章节的逻辑"。')
        break
      case 'examples':
        await addMessage('assistant', '以下是一些使用示例：\n\n**角色完善**\n"请帮我分析李明这个角色的性格特点"\n\n**设定扩展**\n"这个魔法体系还需要补充什么设定？"\n\n**一致性检查**\n"检查第三章是否有时间线问题"\n\n**创作建议**\n"给我一些关于紧张氛围营造的建议"')
        break
      case 'enhance-character':
        await addMessage('assistant', '我来分析当前选中的角色。请告诉我你希望重点完善哪个方面：\n• 性格特征和心理动机\n• 外貌描述和行为习惯\n• 背景故事和成长经历\n• 人际关系和社交模式\n• 角色发展弧线和成长轨迹')
        break
      case 'check-consistency':
        await performConsistencyCheck()
        break
    }
  } finally {
    loadingAction.value = null
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || inputMessage.value.length > 2000) return

  const userMessage = inputMessage.value
  inputMessage.value = ''

  // Send message through store
  const response = await chatStore.sendMessage(userMessage, currentProject.value?.id)

  // 设置新创建的消息ID用于打字机效果
  if (response) {
    newlyCreatedMessageId.value = response.id
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

// formatMessage函数已被MarkdownRenderer组件替代

const formatTime = (timestamp: Date) => {
  return timestamp.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Message type detection (moved to store, kept here for quick actions)
const getMessageType = (message: string) => {
  const lowerMessage = message.toLowerCase()

  if (currentMode.value === 'enhance') {
    return 'enhancement'
  } else if (currentMode.value === 'check') {
    return 'consistency'
  } else if (lowerMessage.includes('大纲') || lowerMessage.includes('章节')) {
    return 'outline'
  } else if (lowerMessage.includes('角色') || lowerMessage.includes('人物')) {
    return 'character'
  } else if (lowerMessage.includes('设定') || lowerMessage.includes('世界')) {
    return 'worldbuilding'
  } else {
    return 'general'
  }
}

const generateAIResponse = (userMessage: string): string => {
  const message = userMessage.toLowerCase()

  if (message.includes('角色') || message.includes('人物')) {
    return '**角色分析建议**\n\n基于你的描述，我建议从以下几个方面完善角色：\n\n• **性格深度**：增加更多性格细节，比如习惯动作或口头禅\n• **背景故事**：完善关键事件和成长经历\n• **关系网络**：明确与其他角色的关系动态\n• **成长弧线**：设计角色在故事中的变化轨迹\n\n需要我详细分析哪个角色？'
  }

  if (message.includes('设定') || message.includes('世界')) {
    return '**世界设定扩展**\n\n你的世界设定很有潜力！建议从这些方面深化：\n\n• **时代背景**：明确时间线和重要历史事件\n• **地理环境**：详细描述重要地点和地理关系\n• **社会制度**：政治结构、经济体系和文化特色\n• **特殊元素**：魔法/科技的运作规则和限制\n\n你希望重点扩展哪个方面？'
  }

  return '我理解你的需求。我可以从以下方面为你提供帮助：\n\n• **角色塑造**：性格、背景、关系网络\n• **世界观建设**：设定扩展、规则完善\n• **情节规划**：大纲设计、冲突设置\n• **质量检查**：一致性、逻辑性分析\n• **创作技巧**：写作方法和技巧建议\n\n请告诉我你希望重点关注哪个方面？'
}

const getResponseActions = (userMessage: string): Array<{ key: string; label: string }> | undefined => {
  const message = userMessage.toLowerCase()

  if (message.includes('角色')) {
    return [
      { key: 'analyze-character', label: '深度分析' },
      { key: 'suggest-traits', label: '性格建议' }
    ]
  }

  if (message.includes('设定')) {
    return [
      { key: 'expand-setting', label: '详细扩展' },
      { key: 'check-logic', label: '逻辑检查' }
    ]
  }

  return undefined
}

// 执行一致性检查
const performConsistencyCheck = async () => {
  if (!currentProject.value) {
    addMessage('assistant', '请先选择一个小说项目才能进行一致性检查。')
    return
  }

  try {
    const response = await apiClient.post(`/api/ai/consistency/check`, {
      novelId: currentProject.value.id,
      scope: 'full'
    })

    const result = response.data
    let message = '**一致性检查完成！**\n\n'

    if (result.totalIssues === 0) {
      message += '🎉 **恭喜！** 未发现明显的一致性问题。\n\n你的故事在角色、设定和情节方面都保持了良好的连贯性。'
    } else {
      message += `发现 ${result.totalIssues} 个需要注意的问题：\n\n`

      if (result.summary) {
        if (result.summary.high > 0) message += `🔴 **严重问题**: ${result.summary.high} 个\n`
        if (result.summary.medium > 0) message += `🟡 **中等问题**: ${result.summary.medium} 个\n`
        if (result.summary.low > 0) message += `🟢 **轻微问题**: ${result.summary.low} 个\n`
      }

      if (result.issues?.length > 0) {
        message += '\n**主要问题：**\n'
        result.issues.slice(0, 3).forEach((issue: any) => {
          const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢'
          message += `${icon} ${issue.issue}\n`
        })

        if (result.issues.length > 3) {
          message += `\n还有 ${result.issues.length - 3} 个其他问题...`
        }
      }
    }

    const actions = result.totalIssues > 0 ? [
      { key: 'view-all-issues', label: '查看所有问题' },
      { key: 'fix-priority', label: '优先修复' }
    ] : [
      { key: 'detailed-analysis', label: '详细分析' }
    ]

    await addMessage('assistant', message, actions)

  } catch (error) {
    console.error('一致性检查失败:', error)
    await addMessage('assistant', '抱歉，一致性检查服务暂时不可用。请稍后再试。')
  }
}

// 清空对话历史
const clearConversation = async () => {
  await chatStore.clearCurrentSession()
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

// 处理会话点击
const handleSessionClick = async ({ key }: { key: string }) => {
  if (key === 'new') {
    // 创建新会话
    await chatStore.createNewSession(currentProject.value?.id, currentMode.value)
  } else {
    // 切换到选中的会话
    await chatStore.switchSession(key)
  }

  // 清除新创建消息ID，避免历史消息使用打字机效果
  newlyCreatedMessageId.value = null
  typingMessageId.value = null

  // 自动滚动到底部
  nextTick(() => {
    scrollToBottom()
  })
}

// 删除会话
const handleDeleteSession = (sessionId: string) => {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这个会话吗？删除后可以在回收站中恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    maskClosable: false,
    keyboard: false,
    onOk: () => {
      return new Promise(async (resolve, reject) => {
        try {
          deletingSessionId.value = sessionId

          // 调用store的删除方法
          await chatStore.deleteSession(sessionId)

          deletingSessionId.value = null
          console.log('Session deleted successfully')
          resolve(true)
        } catch (error) {
          deletingSessionId.value = null
          console.error('Failed to delete session:', error)
          reject(error)
        }
      })
    },
    onCancel: () => {
      deletingSessionId.value = null
      console.log('Delete cancelled')
    }
  })
}

// 删除单条消息
const handleDeleteMessage = (messageId: string) => {
  // 检查是否是欢迎消息
  const message = chatStore.currentSession?.messages.find(m => m.id === messageId)
  if (message?.metadata?.messageType === 'welcome' ||
      (message && message.actions && message.actions.some(a => a.key === 'help'))) {
    Modal.warning({
      title: '无法删除',
      content: '欢迎消息不能被删除。',
      okText: '确定'
    })
    return
  }

  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这条消息吗？此操作不可撤销。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    maskClosable: false,
    keyboard: false,
    onOk: () => {
      return new Promise(async (resolve, reject) => {
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
          resolve(true)
        } catch (error) {
          deletingMessageId.value = null
          console.error('Failed to delete message:', error)
          reject(error)
        }
      })
    },
    onCancel: () => {
      deletingMessageId.value = null
      console.log('Delete cancelled')
    }
  })
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

// 获取模式图标
const getModeIcon = (mode: string) => {
  const icons: Record<string, any> = {
    chat: WechatOutlined,
    enhance: EditOutlined,
    check: SearchOutlined
  }
  return icons[mode] || WechatOutlined
}

// 格式化会话时间
const formatSessionTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
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

// Watch for mode changes
watch(currentMode, () => {
  // Update suggestions based on mode
})

// Initialize
onMounted(async () => {
  // 等待store初始化完成
  await chatStore.loadSessions()

  // 检查是否有活跃会话，如果没有且有历史会话，使用第一个历史会话
  if (!chatStore.hasActiveSession) {
    if (chatStore.sessions.length > 0) {
      // 使用最新的会话
      await chatStore.switchSession(chatStore.sessions[0].id)
    } else {
      // 只有在完全没有会话时才创建新会话
      await chatStore.createNewSession(currentProject.value?.id, currentMode.value)
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

.status-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-btn {
  color: var(--theme-text-secondary);
  padding: 4px 8px;
}

.history-btn:hover {
  color: var(--theme-text);
  background-color: var(--theme-bg-elevated);
}

.btn-text {
  margin-left: 4px;
  font-size: 12px;
}

.settings-btn {
  color: var(--theme-text-secondary);
  padding: 4px;
}

.settings-btn:hover {
  color: var(--theme-text-secondary);
  background-color: var(--theme-bg-elevated);
}

.session-item {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  max-width: 280px;
}

.session-title {
  font-size: 13px;
  color: var(--theme-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 11px;
  color: var(--theme-text-secondary);
}

.session-mode {
  padding: 0 4px;
  background: var(--theme-bg-elevated);
  border-radius: 2px;
}

.session-time {
  opacity: 0.7;
}

/* Ant Design风格的会话下拉容器 */
.session-dropdown-container {
  background: var(--theme-bg-container);
  border-radius: 8px;
  border: 1px solid var(--theme-border);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  padding: 0;
  min-width: 380px;
  max-width: 400px;
  max-height: 500px;
  overflow: hidden;
  font-size: 14px;
}

/* 头部样式 */
.session-dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--theme-border);
  background: var(--theme-bg-elevated);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--theme-text);
  font-size: 14px;
}

.header-count {
  color: var(--theme-text-secondary);
  font-size: 12px;
  background: var(--theme-bg-container);
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid var(--theme-border);
}

/* 内容区域 */
.session-dropdown-content {
  max-height: 360px;
  overflow-y: auto;
  padding: 4px;
}

/* 会话列表项样式 */
.session-list-item {
  border-radius: 6px;
  margin: 2px 0;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.session-list-item:hover {
  background-color: var(--theme-bg-elevated);
  border-color: var(--theme-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.session-list-item :deep(.ant-list-item-meta) {
  align-items: center;
}

.session-list-item :deep(.ant-list-item-meta-avatar) {
  margin-right: 12px;
}

.session-item-title {
  color: var(--theme-text);
  font-weight: 500;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.session-time {
  color: var(--theme-text-secondary);
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.session-action-btn {
  opacity: 0.7;
  transition: all 0.2s ease;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.session-list-item:hover .session-action-btn {
  opacity: 1;
}

.session-action-btn:hover {
  background-color: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

/* 底部操作区域 */
.session-dropdown-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--theme-border);
  background: var(--theme-bg-elevated);
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

/* 滚动条样式 */
.session-dropdown-content::-webkit-scrollbar {
  width: 4px;
}

.session-dropdown-content::-webkit-scrollbar-track {
  background: transparent;
}

.session-dropdown-content::-webkit-scrollbar-thumb {
  background: var(--theme-border);
  border-radius: 2px;
}

.session-dropdown-content::-webkit-scrollbar-thumb:hover {
  background: var(--theme-text-secondary);
}

/* Mode Tabs */
.mode-tabs {
  flex-shrink: 0;
  border-bottom: 1px solid var(--theme-border);
}

.custom-tabs {
  margin: 0;
}

.custom-tabs :deep(.ant-tabs-nav) {
  margin: 0;
  padding: 0 16px;
}

.custom-tabs :deep(.ant-tabs-tab) {
  padding: 12px 8px;
  font-size: 12px;
}

.tab-text {
  margin-left: 4px;
}

/* Quick Actions */
.quick-actions {
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--theme-border);
  background: var(--theme-bg-elevated);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 32px;
  font-size: 12px;
  border-radius: 6px;
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

/* Typing Indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.typing-dots {
  display: flex;
  gap: 4px;
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

.typing-text {
  font-size: 12px;
  color: var(--theme-text-secondary);
}

/* Scroll to Bottom */
.scroll-to-bottom {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 10;
}

/* Input Area */
.input-area {
  flex-shrink: 0;
  border-top: 1px solid var(--theme-border);
  background: var(--theme-bg-container);
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

/* Responsive */
@media (max-width: 480px) {
  .user-message-bubble,
  .assistant-message-bubble {
    max-width: 95%;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .input-container {
    padding: 12px;
  }

  .welcome-message {
    padding: 24px 12px;
  }
}
</style>
