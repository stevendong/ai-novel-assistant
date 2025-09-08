<template>
  <div class="ai-assistant-panel">
    <!-- AI Status Bar -->
    <div class="status-bar">
      <div class="status-info">
        <a-badge :status="aiStatus === 'online' ? 'success' : 'error'" />
        <span class="status-text">AI创作助手</span>
      </div>
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
            <a-menu-item key="clear">
              <DeleteOutlined />
              <span>清空对话</span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
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

    <!-- Chat Container -->
    <div class="chat-container">
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
                  <div class="message-time">{{ formatTime(message.timestamp) }}</div>
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
                    <div class="markdown-content" v-html="formatMessage(message.content)"></div>
                  </div>
                  <div class="message-meta">
                    <span class="message-time">{{ formatTime(message.timestamp) }}</span>
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

    <!-- Suggestions Panel -->
    <div class="suggestions-panel" v-if="currentSuggestions.length > 0">
      <div class="suggestions-header">
        <span class="suggestions-title">
          <BulbOutlined />
          智能建议
        </span>
        <a-button type="text" size="small" @click="refreshSuggestions">
          <ReloadOutlined />
        </a-button>
      </div>
      <div class="suggestions-list">
        <div
          v-for="suggestion in currentSuggestions"
          :key="suggestion.id"
          class="suggestion-item"
          @click="applySuggestion(suggestion)"
        >
          <div class="suggestion-icon">
            <component :is="suggestion.icon" />
          </div>
          <div class="suggestion-content">
            <div class="suggestion-title">{{ suggestion.title }}</div>
            <div class="suggestion-desc">{{ suggestion.description }}</div>
          </div>
          <div class="suggestion-arrow">
            <RightOutlined />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
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
  ExclamationCircleOutlined
} from '@ant-design/icons-vue'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  actions?: Array<{ key: string; label: string }>
}

interface Suggestion {
  id: string
  title: string
  description: string
  icon: any
  type: string
  action: string
}

// Reactive state
const aiStatus = ref<'online' | 'offline'>('online')
const currentMode = ref('chat')
const inputMessage = ref('')
const isTyping = ref(false)
const loadingAction = ref<string | null>(null)
const showScrollButton = ref(false)
const messagesContainer = ref<HTMLElement>()
const inputRef = ref()

// Messages data
const messages = ref<Message[]>([
  {
    id: '1',
    role: 'assistant',
    content: '你好！我是你的AI创作助手。我可以帮你完善角色设定、扩展世界观、生成章节大纲，还能进行一致性检查。有什么我可以帮助你的吗？',
    timestamp: new Date(),
    actions: [
      { key: 'help', label: '查看帮助' },
      { key: 'examples', label: '查看示例' }
    ]
  }
])

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

const currentSuggestions = ref<Suggestion[]>([
  {
    id: '1',
    title: '角色性格完善',
    description: '主角李明的性格描述可以更加具体',
    icon: TeamOutlined,
    type: 'character',
    action: 'enhance'
  },
  {
    id: '2',
    title: '场景描述增强',
    description: '当前章节的场景描述偏简单，可以增加细节',
    icon: GlobalOutlined,
    type: 'setting',
    action: 'enhance'
  }
])

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

const switchMode = (mode: string) => {
  currentMode.value = mode
  
  const modeTexts = {
    chat: '切换到对话模式。你可以与我自由对话，寻求创作建议。',
    enhance: '切换到完善模式。我将帮你完善角色、设定和情节。',
    check: '切换到检查模式。我将检查作品的一致性和逻辑性。'
  }
  
  addMessage('assistant', modeTexts[mode as keyof typeof modeTexts] || '模式已切换')
}

const performQuickAction = async (actionKey: string) => {
  loadingAction.value = actionKey
  
  try {
    switch (actionKey) {
      case 'help':
        addMessage('assistant', '我可以帮助你：\n• 完善角色设定和背景\n• 扩展世界观和设定\n• 生成章节大纲\n• 检查内容一致性\n• 提供创作建议\n\n你可以直接向我提问，比如"帮我完善主角的性格"或"检查这个章节的逻辑"。')
        break
      case 'examples':
        addMessage('assistant', '以下是一些使用示例：\n\n**角色完善**\n"请帮我分析李明这个角色的性格特点"\n\n**设定扩展**\n"这个魔法体系还需要补充什么设定？"\n\n**一致性检查**\n"检查第三章是否有时间线问题"\n\n**创作建议**\n"给我一些关于紧张氛围营造的建议"')
        break
      case 'enhance-character':
        addMessage('assistant', '我来分析当前选中的角色。请告诉我你希望重点完善哪个方面：\n• 性格特征和心理动机\n• 外貌描述和行为习惯\n• 背景故事和成长经历\n• 人际关系和社交模式\n• 角色发展弧线和成长轨迹')
        break
      case 'check-consistency':
        isTyping.value = true
        setTimeout(() => {
          isTyping.value = false
          addMessage('assistant', '**一致性检查完成！**\n\n✅ **角色性格**：总体一致\n⚠️ **时间线**：第2章与第5章之间有3天时间差异\n❌ **世界设定**：魔法规则在第4章有矛盾\n✅ **情节逻辑**：连贯性良好\n\n**建议**：优先修复时间线和魔法规则问题。', [
            { key: 'fix-timeline', label: '修复时间线' },
            { key: 'fix-magic', label: '修复魔法规则' }
          ])
        }, 2000)
        break
    }
  } finally {
    loadingAction.value = null
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || inputMessage.value.length > 2000) return
  
  const userMessage = inputMessage.value
  addMessage('user', userMessage)
  inputMessage.value = ''
  
  // Simulate AI thinking
  isTyping.value = true
  
  setTimeout(() => {
    isTyping.value = false
    const response = generateAIResponse(userMessage)
    addMessage('assistant', response, getResponseActions(userMessage))
  }, 1500 + Math.random() * 1000)
}

const addMessage = (role: 'user' | 'assistant', content: string, actions?: Array<{ key: string; label: string }>) => {
  messages.value.push({
    id: Date.now().toString(),
    role,
    content,
    timestamp: new Date(),
    actions
  })
  
  // Auto scroll to bottom
  nextTick(() => {
    scrollToBottom()
  })
}

const formatMessage = (content: string) => {
  // Simple markdown-like formatting
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
}

const formatTime = (timestamp: Date) => {
  return timestamp.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
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

const performMessageAction = (actionKey: string, message: Message) => {
  console.log('Perform action:', actionKey, 'for message:', message)
}

const applySuggestion = (suggestion: Suggestion) => {
  addMessage('assistant', `**应用建议：${suggestion.title}**\n\n${suggestion.description}\n\n我来帮你具体处理这个问题...`)
  
  // Remove applied suggestion
  currentSuggestions.value = currentSuggestions.value.filter(s => s.id !== suggestion.id)
}

const refreshSuggestions = () => {
  // Refresh suggestions logic
  console.log('Refreshing suggestions...')
}

// Watch for mode changes
watch(currentMode, () => {
  // Update suggestions based on mode
})

// Initialize
onMounted(() => {
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
  background: #fff;
}

/* Status Bar */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  font-weight: 500;
}

.settings-btn {
  color: rgba(0, 0, 0, 0.45);
  padding: 4px;
}

.settings-btn:hover {
  color: rgba(0, 0, 0, 0.65);
  background-color: rgba(0, 0, 0, 0.04);
}

/* Mode Tabs */
.mode-tabs {
  border-bottom: 1px solid #f0f0f0;
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
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
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

/* Chat Container */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Messages Area */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  position: relative;
}

.messages-area::-webkit-scrollbar {
  width: 6px;
}

.messages-area::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
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
  color: rgba(0, 0, 0, 0.85);
}

.welcome-content p {
  margin: 0;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
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
  background: #f5f5f5;
  color: rgba(0, 0, 0, 0.85);
  border-radius: 16px 16px 16px 4px;
  padding: 12px 16px;
  border: 1px solid #f0f0f0;
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
  background: rgba(0, 0, 0, 0.06);
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

.message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.message-actions {
  display: flex;
  gap: 4px;
}

.action-btn-small {
  font-size: 11px;
  height: 20px;
  padding: 0 6px;
  border-radius: 4px;
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
  background: rgba(0, 0, 0, 0.4);
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
  color: rgba(0, 0, 0, 0.45);
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
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

.input-container {
  padding: 16px;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
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
  color: rgba(0, 0, 0, 0.45);
  padding: 4px;
  border-radius: 4px;
}

.input-action-btn:hover {
  color: rgba(0, 0, 0, 0.65);
  background-color: rgba(0, 0, 0, 0.04);
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
  color: rgba(0, 0, 0, 0.45);
}

.char-count {
  color: rgba(0, 0, 0, 0.25);
}

/* Suggestions Panel */
.suggestions-panel {
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
  max-height: 200px;
  overflow-y: auto;
}

.suggestions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.suggestions-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.suggestions-list {
  padding: 8px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.suggestion-icon {
  color: #1890ff;
  font-size: 16px;
}

.suggestion-content {
  flex: 1;
}

.suggestion-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 2px;
}

.suggestion-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.4;
}

.suggestion-arrow {
  color: rgba(0, 0, 0, 0.25);
  font-size: 12px;
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