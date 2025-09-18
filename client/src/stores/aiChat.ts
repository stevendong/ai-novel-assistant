import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/api'
import { aiService } from '@/services/aiService'
import type { StreamChunk } from '@/services/aiService'

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
    streaming?: boolean
    error?: boolean
    messageType?: string
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
  const createNewSession = async (novelId: string | null = null, mode: 'chat' | 'enhance' | 'check' = 'chat') => {
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

    // Save to database if autoSave is enabled
    if (settings.value.autoSave) {
      try {
        await createSessionInDatabase(session)
      } catch (error) {
        console.warn('Failed to save new session to database:', error)
      }
    }

    return session
  }

  const switchSession = async (sessionId: string) => {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      currentSession.value = session
      // Load messages if not already loaded
      if (session.messages.length === 0) {
        session.messages = await loadSessionMessages(sessionId)
      }
      return true
    }
    return false
  }

  const updateSessionMode = async (mode: 'chat' | 'enhance' | 'check') => {
    if (currentSession.value) {
      currentSession.value.mode = mode
      currentSession.value.updatedAt = new Date()

      // Add mode switch message
      await addMessage('assistant', getModeDescription(mode))

      if (settings.value.autoSave) {
        await saveSession()
      }
    }
  }

  const addMessage = async (role: 'user' | 'assistant', content: string, actions?: Array<{ key: string; label: string }>, metadata?: any) => {
    if (!currentSession.value) {
      await createNewSession()
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
      await saveSession()
    }

    return message
  }

  const sendMessage = async (userMessage: string, novelId?: string, useStream: boolean = true) => {
    if (!userMessage.trim()) return null

    // Add user message
    await addMessage('user', userMessage)
    isTyping.value = true

    try {
      if (useStream) {
        return await sendMessageStream(userMessage, novelId || currentSession.value?.novelId)
      } else {
        const response = await callAIAPI(userMessage, novelId || currentSession.value?.novelId)

        isTyping.value = false

        // Add AI response
        return await addMessage('assistant', response.content, response.actions, {
          type: response.type,
          suggestions: response.suggestions,
          questions: response.questions,
          followUps: response.followUps
        })
      }
    } catch (error) {
      isTyping.value = false
      console.error('AI API Error:', error)

      // Add fallback message
      return await addMessage('assistant', '抱歉，AI服务暂时不可用。请稍后再试。')
    }
  }

  const sendMessageStream = async (userMessage: string, novelId?: string | null) => {
    if (!currentSession.value) {
      await createNewSession()
    }

    // Create empty assistant message that will be populated by streaming
    const assistantMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      metadata: {
        streaming: true,
        type: getMessageType(userMessage, currentSession.value?.mode || 'chat')
      }
    }

    currentSession.value!.messages.push(assistantMessage)
    currentSession.value!.updatedAt = new Date()

    let accumulatedContent = ''
    let hasError = false

    const handleStream = (chunk: StreamChunk) => {
      switch (chunk.type) {
        case 'connected':
          console.log('Stream connected')
          break

        case 'chunk':
          if (chunk.content) {
            accumulatedContent += chunk.content
            // Update the assistant message content in real-time
            if (assistantMessage) {
              assistantMessage.content = accumulatedContent
              // Trigger reactivity update if needed
              currentSession.value!.updatedAt = new Date()
            }
          }
          break

        case 'finish':
        case 'done':
          isTyping.value = false
          if (assistantMessage && assistantMessage.metadata) {
            assistantMessage.metadata.streaming = false
            // Add final message actions and metadata
            assistantMessage.actions = getResponseActions(userMessage)
          }
          break

        case 'error':
          isTyping.value = false
          hasError = true
          if (assistantMessage) {
            assistantMessage.content = chunk.message || '抱歉，流式传输过程中出现错误。'
            if (assistantMessage.metadata) {
              assistantMessage.metadata.streaming = false
              assistantMessage.metadata.error = true
            }
          }
          break
      }
    }

    try {
      await aiService.chatStream(
        novelId || currentSession.value?.novelId || '',
        userMessage,
        handleStream,
        {
          mode: currentSession.value?.mode || 'chat',
          conversationHistory: getConversationHistory(),
          sessionId: currentSession.value?.id
        },
        {
          type: getMessageType(userMessage, currentSession.value?.mode || 'chat'),
          provider: settings.value.provider,
          model: settings.value.model
        }
      )

      // Save session if auto-save is enabled and no error occurred
      if (settings.value.autoSave && !hasError) {
        await saveSession()
      }

      return assistantMessage
    } catch (error) {
      isTyping.value = false
      console.error('Streaming error:', error)

      if (assistantMessage) {
        assistantMessage.content = '抱歉，流式传输失败。请稍后再试。'
        if (assistantMessage.metadata) {
          assistantMessage.metadata.streaming = false
          assistantMessage.metadata.error = true
        }
      }

      return assistantMessage
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

    const response = await apiClient.post(`/api/ai/chat`, requestPayload)

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

  const clearCurrentSession = async () => {
    if (currentSession.value) {
      currentSession.value.messages = [currentSession.value.messages[0]] // Keep welcome message
      currentSession.value.updatedAt = new Date()
      if (settings.value.autoSave) {
        await saveSession()
      }
    }
  }

  const deleteSession = async (sessionId: string) => {
    const index = sessions.value.findIndex(s => s.id === sessionId)
    if (index !== -1) {
      sessions.value.splice(index, 1)

      // Delete from database
      try {
        await deleteSessionFromDatabase(sessionId)
      } catch (error) {
        console.warn('Failed to delete session from database:', error)
      }

      // If we deleted the current session, create a new one or switch to another
      if (currentSession.value?.id === sessionId) {
        if (sessions.value.length > 0) {
          currentSession.value = sessions.value[0]
          // Load messages for the new current session
          if (currentSession.value.messages.length === 0) {
            currentSession.value.messages = await loadSessionMessages(currentSession.value.id)
          }
        } else {
          await createNewSession()
        }
      }
    }
  }

  const saveSession = async () => {
    if (currentSession.value && settings.value.autoSave) {
      try {
        // Save to database instead of localStorage
        await saveSessionToDatabase(currentSession.value)
      } catch (error) {
        console.warn('Failed to save session:', error)
      }
    }
  }

  const saveAllSessions = async () => {
    try {
      // Save all sessions to database
      await Promise.all(sessions.value.map(session => saveSessionToDatabase(session)))
    } catch (error) {
      console.warn('Failed to save sessions:', error)
    }
  }

  const loadSessions = async () => {
    try {
      // Load sessions from database
      const loadedSessions = await loadSessionsFromDatabase()
      sessions.value = loadedSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

      if (sessions.value.length > 0) {
        currentSession.value = sessions.value[0]
        // Load messages for the current session
        if (currentSession.value.messages.length === 0) {
          currentSession.value.messages = await loadSessionMessages(currentSession.value.id)
        }
      }
    } catch (error) {
      console.warn('Failed to load sessions:', error)
      // Don't create a new session automatically on load failure
      return
    }

    // Don't automatically create a session if none exist
    // Let the UI components decide when to create sessions
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
  const generateSessionTitle = (mode: 'chat' | 'enhance' | 'check') => {
    const titles: Record<'chat' | 'enhance' | 'check', string> = {
      chat: '智能对话',
      enhance: '内容完善',
      check: '质量检查'
    }
    return `${titles[mode]} - ${new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
  }

  const getWelcomeMessage = (mode: 'chat' | 'enhance' | 'check') => {
    const messages: Record<'chat' | 'enhance' | 'check', string> = {
      chat: '你好！我是你的AI创作助手。我可以帮你完善角色设定、扩展世界观、生成章节大纲，还能进行一致性检查。有什么我可以帮助你的吗？',
      enhance: '欢迎来到内容完善模式！我专注于帮你完善角色设定、扩展世界观设定，以及优化情节内容。请告诉我你想要完善什么内容。',
      check: '欢迎来到质量检查模式！我专注于检查内容的一致性、逻辑性和连贯性。请提供需要检查的内容或告诉我要检查什么。'
    }
    return messages[mode] || messages.chat
  }

  const getModeDescription = (mode: 'chat' | 'enhance' | 'check') => {
    const descriptions: Record<'chat' | 'enhance' | 'check', string> = {
      chat: '切换到对话模式。你可以与我自由对话，寻求创作建议。',
      enhance: '切换到完善模式。我将帮你完善角色、设定和情节。',
      check: '切换到检查模式。我将检查作品的一致性和逻辑性。'
    }
    return descriptions[mode] || descriptions.chat
  }

  // Database API functions
  const saveSessionToDatabase = async (session: ConversationSession) => {
    try {
      // Check if session exists in database
      const existingSession = await apiClient.get(`/api/conversations/${session.id}`)

      if (existingSession.data) {
        // Update existing session
        await apiClient.put(`/api/conversations/${session.id}`, {
          title: session.title,
          mode: session.mode,
          settings: session
        })

        // Add any new messages
        const existingMessages = existingSession.data.messages
        const newMessages = session.messages.filter(msg =>
          !existingMessages.some((existing: any) => existing.id === msg.id)
        )

        for (const message of newMessages) {
          const response = await apiClient.post(`/api/conversations/${session.id}/messages`, {
            role: message.role,
            content: message.content,
            messageType: message.metadata?.type,
            metadata: message.metadata,
            actions: message.actions
          })

          // Update local message with the server-returned ID
          if (response.data && response.data.id) {
            message.id = response.data.id
          }
        }
      } else {
        throw new Error('Session not found')
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Session doesn't exist, create it
        await createSessionInDatabase(session)
      } else {
        throw error
      }
    }
  }

  const createSessionInDatabase = async (session: ConversationSession) => {
    try {
      const response = await apiClient.post(`/api/conversations`, {
        novelId: session.novelId,
        mode: session.mode,
        title: session.title,
        settings: session
      })

      const createdSession = response.data

      // Add all messages except the welcome message (which is created automatically)
      const messagesToAdd = session.messages.filter(msg => msg.role !== 'assistant' || !msg.actions?.some(a => a.key === 'help'))

      for (const message of messagesToAdd) {
        const response = await apiClient.post(`/api/conversations/${createdSession.id}/messages`, {
          role: message.role,
          content: message.content,
          messageType: message.metadata?.type,
          metadata: message.metadata,
          actions: message.actions
        })

        // Update local message with the server-returned ID
        if (response.data && response.data.id) {
          message.id = response.data.id
        }
      }

      return createdSession
    } catch (error) {
      console.error('Failed to create session in database:', error)
      throw error
    }
  }

  const loadSessionsFromDatabase = async (): Promise<ConversationSession[]> => {
    try {
      const response = await apiClient.get(`/api/conversations`)
      const conversations = response.data.conversations

      return conversations.map((conv: any): ConversationSession => ({
        id: conv.id,
        novelId: conv.novelId,
        mode: conv.mode,
        title: conv.title,
        messages: [], // Messages will be loaded on demand
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt)
      }))
    } catch (error) {
      console.error('Failed to load sessions from database:', error)
      return []
    }
  }

  const loadSessionMessages = async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      const response = await apiClient.get(`/api/conversations/${sessionId}`)
      const conversation = response.data

      return conversation.messages.map((msg: any): ChatMessage => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        actions: msg.actions,
        metadata: msg.metadata
      }))
    } catch (error) {
      console.error('Failed to load session messages:', error)
      return []
    }
  }

  const deleteSessionFromDatabase = async (sessionId: string) => {
    try {
      await apiClient.delete(`/api/conversations/${sessionId}`)
    } catch (error) {
      console.error('Failed to delete session from database:', error)
      throw error
    }
  }

  // Initialize
  const initializeStore = async () => {
    loadSettings()
    await loadSessions()
  }

  // Call initialization
  initializeStore()

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
