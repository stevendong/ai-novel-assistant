import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/api'
import { aiService } from '@/services/aiService'
import type { StreamChunk } from '@/services/aiService'
import i18n, { getCurrentLocale } from '@/i18n'

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
  messageCount: number
  createdAt: Date
  updatedAt: Date
  isCreating?: boolean  // 标记是否正在创建中，避免重复调用
}

export const useAIChatStore = defineStore('aiChat', () => {
  // State
  const currentSession = ref<ConversationSession | null>(null)
  const sessions = ref<ConversationSession[]>([])
  const isTyping = ref(false)
  const aiStatus = ref<'online' | 'offline'>('online')
  const settings = ref({
    provider: 'openai',
    model: 'gpt-3.5-turbo', // 与后端配置保持一致
    autoSave: true,
    maxHistoryLength: 50
  })

  const translate = (key: string, params?: Record<string, unknown>) => {
    return i18n.global.t(key, params) as string
  }

  const resolveLocaleTag = () => {
    const locale = i18n.global.locale.value || 'zh'
    if (locale.toLowerCase().startsWith('en')) {
      return 'en-US'
    }
    if (locale.toLowerCase().startsWith('zh')) {
      return 'zh-CN'
    }
    return locale
  }

  const getQuickActions = () => ([
    { key: 'help', label: translate('aiChat.quickActions.help') },
    { key: 'examples', label: translate('aiChat.quickActions.examples') }
  ])

  // 配置初始化状态
  const isConfigLoaded = ref(false)

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
        actions: getQuickActions(),
        metadata: { messageType: 'welcome' }  // 🔥 添加欢迎消息标记
      }],
      messageCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      isCreating: true  // 🔥 标记为创建中状态
    }

    currentSession.value = session
    sessions.value.unshift(session)

    // 推迟持久化到首次保存，避免刷新时重复创建空会话
    session.isCreating = false

    return session
  }

  const switchSession = async (sessionId: string) => {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      currentSession.value = session
      // Load messages if not already loaded
      if (session.messages.length === 0) {
        session.messages = await loadSessionMessages(sessionId)
        session.messageCount = session.messages.length
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
    currentSession.value!.messageCount = currentSession.value!.messages.length

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
      currentSession.value!.messageCount = currentSession.value!.messages.length
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

    if (!aiService.isAssistantEnabled()) {
      isTyping.value = false
      return await addMessage('assistant', translate('aiChat.errors.assistantDisabled'))
    }

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

      const errorCode = (error as any)?.code
      const fallbackMessage = errorCode === 'AI_ASSISTANT_DISABLED'
        ? translate('aiChat.errors.assistantDisabled')
        : translate('aiChat.errors.serviceUnavailable')

      // Add fallback message
      return await addMessage('assistant', fallbackMessage)
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
            if (assistantMessage && currentSession.value) {
              // 使用Vue响应式更新：创建新的消息对象以触发响应性
              const messageIndex = currentSession.value.messages.findIndex(m => m.id === assistantMessage.id)
              if (messageIndex !== -1) {
                // 创建新的消息对象来触发响应式更新
                currentSession.value.messages[messageIndex] = {
                  ...assistantMessage,
                  content: accumulatedContent,
                  timestamp: assistantMessage.timestamp
                }
                // 强制触发响应式更新
                currentSession.value.updatedAt = new Date()
              }
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
            assistantMessage.content = chunk.message || translate('aiChat.errors.streamingProcessError')
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
        assistantMessage.content = translate('aiChat.errors.streamingFailed')
        if (assistantMessage.metadata) {
          assistantMessage.metadata.streaming = false
          assistantMessage.metadata.error = true
        }
      }

      return assistantMessage
    }
  }

  const callAIAPI = async (userMessage: string, novelId?: string | null) => {
    if (!aiService.isAssistantEnabled()) {
      const error = new Error(translate('aiChat.errors.assistantDisabled'))
      ;(error as any).code = 'AI_ASSISTANT_DISABLED'
      throw error
    }

    const requestPayload = {
      novelId,
      message: userMessage,
      type: getMessageType(userMessage, currentSession.value?.mode || 'chat'),
      provider: settings.value.provider,
      model: settings.value.model,
      locale: getCurrentLocale(),
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
    }

    if (mode === 'check') {
      return 'consistency'
    }

    const mentionsOutline =
      lowerMessage.includes('outline') ||
      lowerMessage.includes('chapter') ||
      message.includes('大纲') ||
      message.includes('章节')

    if (mentionsOutline) {
      return 'outline'
    }

    const mentionsCharacter =
      lowerMessage.includes('character') ||
      lowerMessage.includes('persona') ||
      message.includes('角色') ||
      message.includes('人物')

    if (mentionsCharacter) {
      return 'character'
    }

    const mentionsWorldbuilding =
      lowerMessage.includes('worldbuilding') ||
      lowerMessage.includes('world-building') ||
      lowerMessage.includes('world') ||
      lowerMessage.includes('setting') ||
      lowerMessage.includes('lore') ||
      lowerMessage.includes('universe') ||
      message.includes('设定') ||
      message.includes('世界')

    if (mentionsWorldbuilding) {
      return 'worldbuilding'
    }

    return 'general'
  }

  const getResponseActions = (userMessage: string) => {
    const lowerMessage = userMessage.toLowerCase()
    const mentionsCharacter =
      lowerMessage.includes('character') ||
      lowerMessage.includes('persona') ||
      userMessage.includes('角色') ||
      userMessage.includes('人物')

    if (mentionsCharacter) {
      return [
        { key: 'analyze-character', label: translate('aiChat.responseActions.characterAnalyze') },
        { key: 'suggest-traits', label: translate('aiChat.responseActions.characterTraits') }
      ]
    }

    const mentionsSetting =
      lowerMessage.includes('setting') ||
      lowerMessage.includes('world') ||
      lowerMessage.includes('worldbuilding') ||
      lowerMessage.includes('lore') ||
      userMessage.includes('设定') ||
      userMessage.includes('世界')

    if (mentionsSetting) {
      return [
        { key: 'expand-setting', label: translate('aiChat.responseActions.settingExpand') },
        { key: 'check-logic', label: translate('aiChat.responseActions.settingLogic') }
      ]
    }

    return undefined
  }

  const clearCurrentSession = async () => {
    if (!currentSession.value) {
      return
    }

    try {
      // 如果会话还未同步到服务器，直接重置本地消息即可
      if (!currentSession.value.id || currentSession.value.id.startsWith('session_')) {
        currentSession.value.messages = []
      } else {
        // 调用服务器API删除所有消息（包括欢迎消息）
        await apiClient.delete(`/api/conversations/${currentSession.value.id}/messages`)

        // 清空当前会话的所有消息
        currentSession.value.messages = []
      }

      // 创建新的欢迎消息（本地即时展示，稍后自动保存会话时同步到服务器）
      const newWelcomeMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: getWelcomeMessage(currentSession.value.mode),
        timestamp: new Date(),
        metadata: { messageType: 'welcome' },
        actions: getQuickActions()
      }

      // 如果会话已同步，补写欢迎消息到服务器
      if (currentSession.value.id && !currentSession.value.id.startsWith('session_')) {
        const response = await apiClient.post(`/api/conversations/${currentSession.value.id}/messages`, {
          role: newWelcomeMessage.role,
          content: newWelcomeMessage.content,
          messageType: 'welcome',
          metadata: newWelcomeMessage.metadata,
          actions: newWelcomeMessage.actions
        })

        // 使用服务器返回的消息ID
        if (response.data) {
          newWelcomeMessage.id = response.data.id
        }
      }

      // 将新的欢迎消息添加到当前会话
      currentSession.value.messages = [newWelcomeMessage]
      currentSession.value.messageCount = currentSession.value.messages.length

      currentSession.value.updatedAt = new Date()

      if (settings.value.autoSave) {
        await saveSession()
      }
    } catch (error) {
      console.error('Failed to clear session:', error)
      throw error
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

      // If we deleted the current session, switch to another or clear current session
      if (currentSession.value?.id === sessionId) {
        if (sessions.value.length > 0) {
          currentSession.value = sessions.value[0]
          // Load messages for the new current session
          if (currentSession.value.messages.length === 0) {
            currentSession.value.messages = await loadSessionMessages(currentSession.value.id)
            currentSession.value.messageCount = currentSession.value.messages.length
          }
        } else {
          // 允许没有会话的状态，不自动创建新会话
          currentSession.value = null
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
          currentSession.value.messageCount = currentSession.value.messages.length
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
      chat: translate('aiChat.modeTitles.chat'),
      enhance: translate('aiChat.modeTitles.enhance'),
      check: translate('aiChat.modeTitles.check')
    }
    const localeTag = resolveLocaleTag()
    const timestamp = new Date().toLocaleString(localeTag, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    return `${titles[mode] || titles.chat} - ${timestamp}`
  }

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  const getWelcomeMessage = (mode: 'chat' | 'enhance' | 'check') => {
    const messages: Record<'chat' | 'enhance' | 'check', string> = {
      chat: translate('aiChat.welcome.chat'),
      enhance: translate('aiChat.welcome.enhance'),
      check: translate('aiChat.welcome.check')
    }
    return messages[mode] || messages.chat
  }

  const getModeDescription = (mode: 'chat' | 'enhance' | 'check') => {
    const descriptions: Record<'chat' | 'enhance' | 'check', string> = {
      chat: translate('aiChat.modeDescriptions.chat'),
      enhance: translate('aiChat.modeDescriptions.enhance'),
      check: translate('aiChat.modeDescriptions.check')
    }
    return descriptions[mode] || descriptions.chat
  }

  // Database API functions
  const saveSessionToDatabase = async (session: ConversationSession) => {
    // 🔥 避免在会话创建过程中重复调用
    if (session.isCreating) {
      console.log('Session is being created, skipping save...')
      return
    }

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
        const createdSession = await createSessionInDatabase(session)

        // 🔥 关键修复：创建会话后更新本地引用
        if (createdSession && createdSession.id && currentSession.value) {
          // 更新当前会话ID
          currentSession.value.id = createdSession.id

          // 更新sessions数组中的ID
          const sessionIndex = sessions.value.findIndex(s => s.id === session.id)
          if (sessionIndex !== -1) {
            sessions.value[sessionIndex].id = createdSession.id
          }
        }
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
      const messagesToAdd = session.messages.filter(msg => {
        // 🔥 修复过滤逻辑：排除欢迎消息
        if (msg.role === 'assistant' && msg.actions?.some(a => a.key === 'help')) {
          return false // 这是欢迎消息，不添加到数据库
        }
        return true // 其他消息正常添加
      })

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

      // 🔥 重要：更新本地会话ID为服务器返回的ID
      session.id = createdSession.id

      // 🔥 关键修复：用后端返回的欢迎消息ID更新前端欢迎消息
      if (createdSession.messages && createdSession.messages.length > 0) {
        const backendWelcomeMessage = createdSession.messages.find((msg: any) => msg.messageType === 'welcome')
        if (backendWelcomeMessage) {
          // 找到前端的欢迎消息并更新ID
          const frontendWelcomeMessage = session.messages.find(msg =>
            msg.role === 'assistant' && msg.actions?.some(a => a.key === 'help')
          )
          if (frontendWelcomeMessage) {
            frontendWelcomeMessage.id = backendWelcomeMessage.id
          }
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
        messageCount: conv.messageCount ?? 0,
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
    if (!sessionId || sessionId.startsWith('session_')) {
      return
    }

    try {
      await apiClient.delete(`/api/conversations/${sessionId}`)
    } catch (error) {
      console.error('Failed to delete session from database:', error)
      throw error
    }
  }

  // 从服务器加载AI配置
  const loadAIConfig = async () => {
    try {
      const configResponse = await apiClient.get('/api/ai/config')
      const preferencesResponse = await apiClient.get('/api/ai/preferences')

      const config = configResponse.data
      const preferences = preferencesResponse.data

      // 使用用户偏好设置，如果没有则使用系统默认配置
      settings.value = {
        provider: preferences.preferredProvider || config.defaultProvider || 'openai',
        model: preferences.preferredModel || config.defaultModel || 'gpt-3.5-turbo',
        autoSave: preferences.autoSave ?? true,
        maxHistoryLength: preferences.maxHistoryLength || 50
      }

      isConfigLoaded.value = true
      console.log('AI配置已加载:', settings.value)
    } catch (error) {
      console.warn('加载AI配置失败，使用默认配置:', error)
      isConfigLoaded.value = true
    }
  }

  // 保存AI偏好设置到服务器
  const saveAIPreferences = async () => {
    try {
      await apiClient.put('/api/ai/preferences', {
        preferredProvider: settings.value.provider,
        preferredModel: settings.value.model,
        autoSave: settings.value.autoSave,
        maxHistoryLength: settings.value.maxHistoryLength
      })
      console.log('AI偏好设置已保存')
    } catch (error) {
      console.error('保存AI偏好设置失败:', error)
    }
  }

  // 更新设置（增强版，同步到服务器）
  const updateSettingsEnhanced = async (newSettings: Partial<typeof settings.value>) => {
    const oldSettings = { ...settings.value }
    Object.assign(settings.value, newSettings)

    // 如果provider或model发生变化，同步到服务器
    if (newSettings.provider !== oldSettings.provider ||
        newSettings.model !== oldSettings.model ||
        newSettings.autoSave !== oldSettings.autoSave ||
        newSettings.maxHistoryLength !== oldSettings.maxHistoryLength) {
      await saveAIPreferences()
    }

    // 同时保存到本地存储（作为备份）
    if (typeof window !== 'undefined') {
      localStorage.setItem('aiChatSettings', JSON.stringify(settings.value))
    }
  }

  // Initialize
  const initializeStore = async () => {
    // 先尝试从服务器加载配置
    await loadAIConfig()

    // 然后加载本地设置作为补充
    loadSettings()

    // 最后加载会话数据
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
    isConfigLoaded,

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
    updateSettingsEnhanced,
    saveSession,
    saveAllSessions,
    loadSessions,
    loadSettings,
    loadAIConfig,
    saveAIPreferences
  }
})
