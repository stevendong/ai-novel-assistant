<template>
  <div class="h-full flex flex-col">
    <!-- Panel Header -->
    <div class="bg-white border-b border-gray-200 p-4">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-lg font-semibold text-gray-800 flex items-center">
          <RobotOutlined class="mr-2 text-blue-600" />
          AI 助手
        </h2>
        <div class="flex items-center space-x-2">
          <a-badge :status="aiStatus === 'online' ? 'success' : 'error'" />
          <span class="text-xs text-gray-500">{{ aiStatus === 'online' ? '在线' : '离线' }}</span>
        </div>
      </div>
      
      <div class="flex space-x-1">
        <a-button 
          v-for="mode in aiModes"
          :key="mode.key"
          size="small"
          :type="currentMode === mode.key ? 'primary' : 'default'"
          @click="switchMode(mode.key)"
        >
          {{ mode.label }}
        </a-button>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-gray-50 border-b border-gray-200 p-3">
      <div class="grid grid-cols-2 gap-2">
        <a-button 
          v-for="action in currentModeActions" 
          :key="action.key"
          size="small"
          block
          @click="performQuickAction(action.key)"
          :loading="action.key === loadingAction"
        >
          <component :is="action.icon" class="mr-1" />
          {{ action.label }}
        </a-button>
      </div>
    </div>

    <!-- Chat Interface -->
    <div class="flex-1 flex flex-col">
      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div
          v-for="message in messages"
          :key="message.id"
          :class="[
            'flex',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          ]"
        >
          <div
            :class="[
              'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white border border-gray-200 text-gray-800'
            ]"
          >
            <div class="text-sm leading-relaxed">{{ message.content }}</div>
            <div 
              :class="[
                'text-xs mt-1',
                message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
              ]"
            >
              {{ formatTime(message.timestamp) }}
            </div>
            
            <!-- Action buttons for AI responses -->
            <div v-if="message.role === 'assistant' && message.actions" class="mt-2 space-x-1">
              <a-button
                v-for="action in message.actions"
                :key="action.key"
                size="small"
                type="text"
                @click="performMessageAction(action.key, message)"
                :class="message.role === 'user' ? 'text-white' : 'text-blue-600'"
              >
                {{ action.label }}
              </a-button>
            </div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="isTyping" class="flex justify-start">
          <div class="bg-white border border-gray-200 px-4 py-2 rounded-lg">
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style="animation-delay: 0.2s;"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style="animation-delay: 0.4s;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="bg-white border-t border-gray-200 p-4">
        <div class="flex items-end space-x-2">
          <div class="flex-1">
            <a-textarea
              v-model:value="inputMessage"
              :rows="2"
              placeholder="向 AI 助手提问或请求帮助..."
              :disabled="aiStatus === 'offline'"
              @keydown.ctrl.enter="sendMessage"
            />
            <div class="text-xs text-gray-400 mt-1">
              Ctrl + Enter 发送
            </div>
          </div>
          <a-button 
            type="primary" 
            @click="sendMessage"
            :disabled="!inputMessage.trim() || aiStatus === 'offline'"
            :loading="isTyping"
          >
            <SendOutlined />
          </a-button>
        </div>
      </div>
    </div>

    <!-- Suggestions Panel -->
    <div class="bg-gray-50 border-t border-gray-200 p-4">
      <h3 class="text-sm font-medium text-gray-700 mb-3">智能建议</h3>
      <div class="space-y-3">
        <div
          v-for="suggestion in currentSuggestions"
          :key="suggestion.id"
          class="p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors"
          @click="applySuggestion(suggestion)"
        >
          <div class="flex items-start space-x-2">
            <component :is="suggestion.icon" class="text-blue-600 mt-0.5" />
            <div class="flex-1">
              <h4 class="text-sm font-medium text-gray-800">{{ suggestion.title }}</h4>
              <p class="text-xs text-gray-600 mt-1">{{ suggestion.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  RobotOutlined,
  SendOutlined,
  BulbOutlined,
  EditOutlined,
  CheckCircleOutlined,
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

const aiStatus = ref<'online' | 'offline'>('online')
const currentMode = ref('chat')
const inputMessage = ref('')
const isTyping = ref(false)
const loadingAction = ref<string | null>(null)

const aiModes = [
  { key: 'chat', label: '对话' },
  { key: 'enhance', label: '完善' },
  { key: 'check', label: '检查' }
]

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

const currentModeActions = computed(() => {
  const actions = {
    chat: [
      { key: 'help', label: '帮助', icon: BulbOutlined },
      { key: 'examples', label: '示例', icon: FileTextOutlined },
      { key: 'clear', label: '清空', icon: EditOutlined },
      { key: 'export', label: '导出', icon: SendOutlined }
    ],
    enhance: [
      { key: 'enhance-character', label: '完善角色', icon: TeamOutlined },
      { key: 'enhance-setting', label: '扩展设定', icon: GlobalOutlined },
      { key: 'generate-outline', label: '生成大纲', icon: FileTextOutlined },
      { key: 'suggest-plot', label: '情节建议', icon: BulbOutlined }
    ],
    check: [
      { key: 'check-consistency', label: '一致性检查', icon: CheckCircleOutlined },
      { key: 'check-character', label: '角色检查', icon: TeamOutlined },
      { key: 'check-timeline', label: '时间线检查', icon: ExclamationCircleOutlined },
      { key: 'check-logic', label: '逻辑检查', icon: BulbOutlined }
    ]
  }
  return actions[currentMode.value as keyof typeof actions] || actions.chat
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
  },
  {
    id: '3',
    title: '一致性问题',
    description: '发现角色年龄设定前后不一致',
    icon: ExclamationCircleOutlined,
    type: 'consistency',
    action: 'check'
  }
])

const switchMode = (mode: string) => {
  currentMode.value = mode
  
  // Add mode switch message
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
        addMessage('assistant', '我可以帮助你：\n1. 完善角色设定和背景\n2. 扩展世界观和设定\n3. 生成章节大纲\n4. 检查内容一致性\n5. 提供创作建议\n\n你可以直接向我提问，比如"帮我完善主角的性格"或"检查这个章节的逻辑"。')
        break
      case 'examples':
        addMessage('assistant', '以下是一些使用示例：\n\n"请帮我分析李明这个角色的性格特点"\n"这个魔法体系还需要补充什么设定？"\n"检查第三章是否有时间线问题"\n"给我一些关于紧张氛围营造的建议"')
        break
      case 'enhance-character':
        addMessage('assistant', '我来分析当前选中的角色。请告诉我你希望重点完善哪个方面：\n1. 性格特征\n2. 外貌描述\n3. 背景故事\n4. 人际关系\n5. 角色发展弧线')
        break
      case 'enhance-setting':
        addMessage('assistant', '我来帮你扩展世界设定。当前设定看起来不错，建议补充：\n- 历史背景的更多细节\n- 社会制度和文化特色\n- 地理环境的具体描述\n- 重要场所的详细设定')
        break
      case 'check-consistency':
        isTyping.value = true
        setTimeout(() => {
          isTyping.value = false
          addMessage('assistant', '一致性检查完成！发现以下问题：\n\n✅ 角色性格：总体一致\n⚠️ 时间线：第2章与第5章之间有3天时间差异\n❌ 世界设定：魔法规则在第4章有矛盾\n✅ 情节逻辑：连贯性良好\n\n建议优先修复时间线和魔法规则问题。', [
            { key: 'fix-timeline', label: '修复时间线' },
            { key: 'fix-magic', label: '修复魔法规则' }
          ])
        }, 2000)
        break
      case 'clear':
        messages.value = messages.value.filter(m => m.id === '1') // Keep welcome message
        break
    }
  } finally {
    loadingAction.value = null
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim()) return
  
  const userMessage = inputMessage.value
  addMessage('user', userMessage)
  inputMessage.value = ''
  
  // Simulate AI thinking
  isTyping.value = true
  
  setTimeout(() => {
    isTyping.value = false
    
    // Simple response logic - in real app, this would call AI service
    let response = generateAIResponse(userMessage)
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
  
  // Scroll to bottom
  setTimeout(() => {
    const messagesContainer = document.querySelector('.overflow-y-auto')
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight
    }
  }, 100)
}

const generateAIResponse = (userMessage: string): string => {
  const message = userMessage.toLowerCase()
  
  if (message.includes('角色') || message.includes('人物')) {
    return '我来分析你的角色设定。基于当前信息，我建议：\n\n1. 增加更多性格细节，比如习惯动作或口头禅\n2. 完善背景故事中的关键事件\n3. 明确与其他角色的关系动态\n4. 考虑角色在故事中的成长弧线\n\n需要我详细分析哪个角色？'
  }
  
  if (message.includes('设定') || message.includes('世界')) {
    return '你的世界设定很有趣！我建议进一步完善：\n\n• 时代背景：明确时间线和历史事件\n• 地理环境：详细描述重要地点\n• 社会制度：政治结构和文化特色\n• 特殊元素：魔法/科技的运作规则\n\n你希望重点扩展哪个方面？'
  }
  
  if (message.includes('大纲') || message.includes('情节')) {
    return '我来帮你规划情节结构。基于三幕剧结构：\n\n第一幕：建立世界观和角色\n- 介绍主角和环境\n- 引出主要冲突\n\n第二幕：发展冲突和挑战\n- 角色面临困难\n- 关系和设定深化\n\n第三幕：解决和结局\n- 冲突达到高潮\n- 角色完成成长\n\n需要我针对特定章节给出详细建议吗？'
  }
  
  if (message.includes('检查') || message.includes('一致性')) {
    return '正在进行一致性检查...\n\n发现的问题：\n• 角色年龄前后描述不一致\n• 地理位置存在逻辑错误\n• 时间线需要调整\n\n建议：\n1. 统一角色基本信息\n2. 核查地理关系\n3. 理清事件时间顺序\n\n需要我详细说明哪个问题？'
  }
  
  return '我理解你的需求。我可以从以下方面帮助你：\n• 角色塑造和发展\n• 世界观扩展\n• 情节规划\n• 一致性检查\n• 创作技巧建议\n\n请告诉我你希望重点关注哪个方面？'
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
  
  if (message.includes('检查')) {
    return [
      { key: 'detailed-report', label: '详细报告' },
      { key: 'auto-fix', label: '自动修复' }
    ]
  }
  
  return undefined
}

const performMessageAction = (actionKey: string, message: Message) => {
  // Handle message-specific actions
  console.log('Perform action:', actionKey, 'for message:', message)
  
  switch (actionKey) {
    case 'help':
      performQuickAction('help')
      break
    case 'examples':
      performQuickAction('examples')
      break
    case 'analyze-character':
      addMessage('assistant', '深度角色分析：\n\n主角李明的特点：\n• 性格：谨慎而好奇，这种矛盾创造了有趣的冲突\n• 动机：寻求真相的渴望源于童年经历\n• 弱点：社交恐惧可能阻碍调查进展\n• 成长潜力：通过案件锻炼社交能力\n\n建议增加具体的习惯动作和思维模式描述。')
      break
    case 'expand-setting':
      addMessage('assistant', '设定扩展建议：\n\n当前"废弃工厂"可以补充：\n• 历史：为什么废弃？以前生产什么？\n• 地理：与城市的距离和交通\n• 氛围：光线、声音、气味的具体描述\n• 隐藏元素：可能存在的线索或危险\n\n这样的细节会让场景更加生动真实。')
      break
  }
}

const applySuggestion = (suggestion: Suggestion) => {
  addMessage('assistant', `正在应用建议：${suggestion.title}\n\n${suggestion.description}\n\n我来帮你具体处理这个问题...`)
  
  // Remove applied suggestion
  currentSuggestions.value = currentSuggestions.value.filter(s => s.id !== suggestion.id)
}

const formatTime = (timestamp: Date) => {
  return timestamp.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Initialize
onMounted(() => {
  // Simulate initial AI suggestions based on current content
  setTimeout(() => {
    // Add more suggestions based on context
  }, 2000)
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>