import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  actions?: Array<{ key: string; label: string }>
  metadata?: {
    type?: string
    suggestions?: string[]
    questions?: string[]
    followUps?: string[]
  }
}

export interface ConversationSession {
  id: string
  novelId: string | null
  mode: 'chat' | 'enhance' | 'check'
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export const useAIChatStore = defineStore('aiChat', () => {
  // State
  const currentSession = ref<ConversationSession | null>(null)
  const sessions = ref<ConversationSession[]>([])
  const isTyping = ref(false)
  const aiStatus = ref<'online' | 'offline'>('online')
  const settings = ref({
    provider: 'openai',
    model: 'deepseek-v3.1',
    autoSave: true,
    maxHistoryLength: 50
  })

  // Getters
  const currentMessages = computed(() => currentSession.value?.messages || [])
  const hasActiveSession = computed(() => currentSession.value !== null)
  const sessionCount = computed(() => sessions.value.length)

  // Actions
  const createNewSession = (novelId: string | null = null, mode: 'chat' | 'enhance' | 'check' = 'chat') => {
    const session: ConversationSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      novelId,
      mode,
      title: generateSessionTitle(mode),
      messages: [{
        id: '1',
        role: 'assistant',
        content: getWelcomeMessage(mode),
        timestamp: new Date(),
        actions: [
          { key: 'help', label: '查看帮助' },
          { key: 'examples', label: '查看示例' }
        ]
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    currentSession.value = session
    sessions.value.unshift(session)
    return session
  }

  const switchSession = (sessionId: string) => {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      currentSession.value = session
      return true
    }
    return false
  }

  const updateSessionMode = (mode: 'chat' | 'enhance' | 'check') => {
    if (currentSession.value) {
      currentSession.value.mode = mode
      currentSession.value.updatedAt = new Date()

      // Add mode switch message
      addMessage('assistant', getModeDescription(mode))

      if (settings.value.autoSave) {
        saveSession()
      }
    }
  }

  const addMessage = (role: 'user' | 'assistant', content: string, actions?: Array<{ key: string; label: string }>, metadata?: any) => {
    if (!currentSession.value) {
      createNewSession()
    }

    const message: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      actions,
      metadata
    }

    currentSession.value!.messages.push(message)
    currentSession.value!.updatedAt = new Date()

    // Update session title if this is the first user message
    if (role === 'user' && currentSession.value!.messages.filter(m => m.role === 'user').length === 1) {
      currentSession.value!.title = content.substring(0, 30) + (content.length > 30 ? '...' : '')
    }

    // Maintain history length limit
    if (currentSession.value!.messages.length > settings.value.maxHistoryLength) {
      currentSession.value!.messages = [
        currentSession.value!.messages[0], // Keep welcome message
        ...currentSession.value!.messages.slice(-(settings.value.maxHistoryLength - 1))
      ]
    }

    if (settings.value.autoSave) {
      saveSession()
    }

    return message
  }

  const sendMessage = async (userMessage: string, novelId?: string) => {
    if (!userMessage.trim()) return null

    // Add user message
    addMessage('user', userMessage)
    isTyping.value = true

    try {
      const response = await callAIAPI(userMessage, novelId || currentSession.value?.novelId)

      isTyping.value = false

      // Add AI response
      const aiMessage = addMessage('assistant', response.content, response.actions, {
        type: response.type,
        suggestions: response.suggestions,
        questions: response.questions,
        followUps: response.followUps
      })

      return aiMessage
    } catch (error) {
      isTyping.value = false
      console.error('AI API Error:', error)

      // Add fallback message
      const fallbackMessage = addMessage('assistant', '抱歉，AI服务暂时不可用。请稍后再试。')
      return fallbackMessage
    }
  }

  const callAIAPI = async (userMessage: string, novelId?: string | null) => {
    const requestPayload = {
      novelId,
      message: userMessage,
      type: getMessageType(userMessage, currentSession.value?.mode || 'chat'),
      provider: settings.value.provider,
      model: settings.value.model,
      context: {
        mode: currentSession.value?.mode || 'chat',
        conversationHistory: getConversationHistory(),
        sessionId: currentSession.value?.id
      }
    }

    const response = await axios.post(`${API_BASE_URL}/api/ai/chat`, requestPayload)

    return {
      content: response.data.message || response.data.content,
      type: response.data.metadata?.type || 'general',
      actions: getResponseActions(userMessage),
      suggestions: response.data.suggestions || [],
      questions: response.data.questions || [],
      followUps: response.data.followUps || []
    }
  }

  const getConversationHistory = () => {
    if (!currentSession.value) return []

    // Return last 10 messages for context
    return currentSession.value.messages
      .slice(-10)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
  }

  const getMessageType = (message: string, mode: string) => {
    const lowerMessage = message.toLowerCase()

    if (mode === 'enhance') {
      return 'enhancement'
    } else if (mode === 'check') {
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

  const getResponseActions = (userMessage: string) => {
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

  const clearCurrentSession = () => {
    if (currentSession.value) {
      currentSession.value.messages = [currentSession.value.messages[0]] // Keep welcome message
      currentSession.value.updatedAt = new Date()
      if (settings.value.autoSave) {
        saveSession()
      }
    }
  }

  const deleteSession = (sessionId: string) => {
    const index = sessions.value.findIndex(s => s.id === sessionId)
    if (index !== -1) {
      sessions.value.splice(index, 1)

      // If we deleted the current session, create a new one or switch to another
      if (currentSession.value?.id === sessionId) {
        if (sessions.value.length > 0) {
          currentSession.value = sessions.value[0]
        } else {
          createNewSession()
        }
      }

      saveAllSessions()
    }
  }

  const saveSession = () => {
    if (currentSession.value && settings.value.autoSave) {
      try {
        const sessionData = JSON.stringify(currentSession.value)
        localStorage.setItem(`ai_session_${currentSession.value.id}`, sessionData)
      } catch (error) {
        console.warn('Failed to save session:', error)
      }
    }
  }

  const saveAllSessions = () => {
    try {
      const sessionList = sessions.value.map(s => s.id)
      localStorage.setItem('ai_session_list', JSON.stringify(sessionList))

      sessions.value.forEach(session => {
        const sessionData = JSON.stringify(session)
        localStorage.setItem(`ai_session_${session.id}`, sessionData)
      })
    } catch (error) {
      console.warn('Failed to save sessions:', error)
    }
  }

  const loadSessions = () => {
    try {
      const sessionListStr = localStorage.getItem('ai_session_list')
      if (sessionListStr) {
        const sessionList = JSON.parse(sessionListStr)
        const loadedSessions: ConversationSession[] = []

        for (const sessionId of sessionList) {
          const sessionData = localStorage.getItem(`ai_session_${sessionId}`)
          if (sessionData) {
            const session = JSON.parse(sessionData)
            // Convert date strings back to Date objects
            session.createdAt = new Date(session.createdAt)
            session.updatedAt = new Date(session.updatedAt)
            session.messages.forEach((msg: ChatMessage) => {
              msg.timestamp = new Date(msg.timestamp)
            })
            loadedSessions.push(session)
          }
        }

        sessions.value = loadedSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

        if (sessions.value.length > 0) {
          currentSession.value = sessions.value[0]
        }
      }
    } catch (error) {
      console.warn('Failed to load sessions:', error)
    }

    // Create initial session if none exist
    if (sessions.value.length === 0) {
      createNewSession()
    }
  }

  const updateSettings = (newSettings: Partial<typeof settings.value>) => {
    settings.value = { ...settings.value, ...newSettings }

    // Save settings to localStorage
    try {
      localStorage.setItem('ai_chat_settings', JSON.stringify(settings.value))
    } catch (error) {
      console.warn('Failed to save settings:', error)
    }
  }

  const loadSettings = () => {
    try {
      const settingsStr = localStorage.getItem('ai_chat_settings')
      if (settingsStr) {
        const savedSettings = JSON.parse(settingsStr)
        settings.value = { ...settings.value, ...savedSettings }
      }
    } catch (error) {
      console.warn('Failed to load settings:', error)
    }
  }

  // Helper functions
  const generateSessionTitle = (mode: string) => {
    const titles = {
      chat: '智能对话',
      enhance: '内容完善',
      check: '质量检查'
    }
    return `${titles[mode]} - ${new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
  }

  const getWelcomeMessage = (mode: string) => {
    const messages = {
      chat: '你好！我是你的AI创作助手。我可以帮你完善角色设定、扩展世界观、生成章节大纲，还能进行一致性检查。有什么我可以帮助你的吗？',
      enhance: '欢迎来到内容完善模式！我专注于帮你完善角色设定、扩展世界观设定，以及优化情节内容。请告诉我你想要完善什么内容。',
      check: '欢迎来到质量检查模式！我专注于检查内容的一致性、逻辑性和连贯性。请提供需要检查的内容或告诉我要检查什么。'
    }
    return messages[mode] || messages.chat
  }

  const getModeDescription = (mode: string) => {
    const descriptions = {
      chat: '切换到对话模式。你可以与我自由对话，寻求创作建议。',
      enhance: '切换到完善模式。我将帮你完善角色、设定和情节。',
      check: '切换到检查模式。我将检查作品的一致性和逻辑性。'
    }
    return descriptions[mode] || descriptions.chat
  }

  // Initialize
  loadSettings()
  loadSessions()

  return {
    // State
    currentSession,
    sessions,
    isTyping,
    aiStatus,
    settings,

    // Getters
    currentMessages,
    hasActiveSession,
    sessionCount,

    // Actions
    createNewSession,
    switchSession,
    updateSessionMode,
    addMessage,
    sendMessage,
    clearCurrentSession,
    deleteSession,
    updateSettings,
    saveSession,
    saveAllSessions,
    loadSessions,
    loadSettings
  }
})
