import { api, type ApiResponse } from '@/utils/api'
import i18n, { getCurrentLocale } from '@/i18n'

const API_BASE = '/api'

const translate = (key: string, params?: Record<string, unknown>) => {
  return i18n.global.t(key, params) as string
}

export interface AIResponse {
  content: string
  success?: boolean
  message?: string
  data?: string
}

export interface StreamChunk {
  type: 'connected' | 'chunk' | 'finish' | 'done' | 'error'
  content?: string
  reason?: string
  message?: string
}

export type StreamHandler = (chunk: StreamChunk) => void

export interface ChatStreamOptions {
  type?: string
  provider?: string
  model?: string
  signal?: AbortSignal
}

export interface OutlineGenerationParams {
  novelId: string
  type: 'full' | 'chapter' | 'arc'
  length: 'brief' | 'standard' | 'detailed'
  coreIdea: string
  description: string
  characters?: any[]
  settings?: any[]
  style?: string
  pacing?: string
  conflict?: string
  signal?: AbortSignal
}

export interface OutlineData {
  summary: string
  mainConflict: string
  mainPlot: string
  themes: string[]
  estimatedTotalWords: number
  chapters: ChapterData[]
}

// 单章节大纲生成参数
export interface ChapterOutlineParams {
  novelId: string
  chapterId: string
  chapterNumber: number
  chapterTitle: string
  existingOutline?: string
  characters?: any[]
  settings?: any[]
  targetWords?: number
  previousChapterSummary?: string
  nextChapterPlan?: string
  signal?: AbortSignal
}

// 内容段落结构
export interface ContentSection {
  title: string
  description: string
  estimatedWords: number
}

// 单章节大纲数据
export interface ChapterOutlineData {
  title: string
  summary: string
  contentStructure: ContentSection[]
  targetWords: number
  keyPoints: string[]
  emotionalTone: string
  plotPoints: PlotPointData[]
}

// 情节要点数据
export interface PlotPointData {
  type: 'conflict' | 'discovery' | 'emotion' | 'action' | 'dialogue'
  description: string
}

export interface ChapterData {
  title: string
  type: string
  summary: string
  plotPoints: PlotPoint[]
  characters: string[]
  settings: string[]
  conflicts: string[]
  estimatedWords: number
  keyEvents: string[]
  emotionalTone: string
  chapterGoals: string[]
}

export interface PlotPoint {
  type: string
  description: string
}

// AI建议生成参数
export interface SuggestionParams {
  novelId: string
  chapterId: string
  context: string
  cursorPosition: number
  count?: number
  maxLength?: number
  signal?: AbortSignal
}

// AI建议响应
export interface SuggestionResponse {
  suggestions: Array<{
    text: string
    confidence: number
    type: 'continuation' | 'completion' | 'alternative'
  }>
  metadata: {
    processingTime: number
    model: string
  }
}

class AIService {
  private readonly assistantToggleKeys = [
    'ai_assistant_enabled',
    'aiAssistantEnabled',
    'ai_helper_enabled'
  ]

  // 检查本地是否启用了AI助手
  isAssistantEnabled(): boolean {
    return this.computeAssistantEnabled()
  }

  private computeAssistantEnabled(): boolean {
    // 1. 优先读取浏览器存储配置
    if (typeof window !== 'undefined') {
      const storedFlag =
        this.readAssistantFlagFromStorage(window.localStorage) ??
        this.readAssistantFlagFromStorage(window.sessionStorage)

      if (storedFlag !== null) {
        return storedFlag
      }

      // 2. 读取全局配置（如果可用）
      const globalConfig = (window as any)?.__APP_CONFIG__?.features?.aiAssistant
      if (typeof globalConfig === 'boolean') {
        return globalConfig
      }
    }

    // 3. 读取环境变量
    const envFlag = this.normalizeBoolean((import.meta.env as Record<string, any>)?.VITE_AI_ASSISTANT_ENABLED)
    if (envFlag !== null) {
      return envFlag
    }

    // 默认启用
    return true
  }

  private readAssistantFlagFromStorage(storage?: Storage): boolean | null {
    if (!storage) return null

    try {
      for (const key of this.assistantToggleKeys) {
        const value = storage.getItem(key)
        const parsed = this.normalizeBoolean(value)
        if (parsed !== null) {
          return parsed
        }
      }
    } catch (error) {
      console.warn('Failed to read AI assistant flag from storage:', error)
    }

    return null
  }

  private normalizeBoolean(value: unknown): boolean | null {
    if (value === null || value === undefined) return null
    const normalized = String(value).trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
    return null
  }

  private ensureAssistantEnabled(): void {
    if (!this.computeAssistantEnabled()) {
      throw this.createAssistantDisabledError()
    }
  }

  private createAssistantDisabledError(): Error {
    const error = new Error(translate('aiChat.errors.assistantDisabled'))
    ;(error as any).code = 'AI_ASSISTANT_DISABLED'
    return error
  }

  // 通用AI对话
  async chat(novelId: string, message: string, context = {}, options = {}): Promise<AIResponse> {
    this.ensureAssistantEnabled()

    const config: any = {}
    
    if ((options as any).signal) {
      config.signal = (options as any).signal
    }

    const response = await api.post(`${API_BASE}/ai/chat`, {
      novelId,
      message,
      context,
      type: (options as any).type || 'general',
      provider: (options as any).provider,
      model: (options as any).model,
      locale: getCurrentLocale()
    }, config)

    return response.data
  }

  // 流式AI对话
  async chatStream(
    novelId: string,
    message: string,
    onStream: StreamHandler,
    context: Record<string, any> = {},
    options: ChatStreamOptions = {}
  ): Promise<void> {
    if (!this.computeAssistantEnabled()) {
      onStream({
        type: 'error',
        message: translate('aiChat.errors.assistantDisabled')
      })
      return
    }

    try {
      // 获取认证token
      const token = localStorage.getItem('sessionToken')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/ai/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          novelId,
          message,
          context,
          type: options.type || 'general',
          provider: options.provider,
          model: options.model,
          locale: getCurrentLocale()
        }),
        signal: options.signal
      })

      if (!response.ok) {
        if (response.status === 401) {
          // 处理认证失败
          localStorage.removeItem('user')
          localStorage.removeItem('sessionToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Response body is empty')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.trim() === '') continue
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              onStream(data as StreamChunk)
              
              // 如果收到完成或错误信号，停止处理
              if (data.type === 'done' || data.type === 'error') {
                return
              }
            } catch (error) {
              console.error('Failed to parse SSE data:', error)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Stream error:', error)

      if (error?.name === 'AbortError') {
        onStream({
          type: 'error',
          reason: 'abort',
          message: translate('aiChat.errors.requestAborted')
        })
        return
      }

      onStream({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown streaming error'
      })
    }
  }

  // AI大纲生成
  async generateOutline(params: OutlineGenerationParams): Promise<OutlineData> {
    this.ensureAssistantEnabled()

    const {
      novelId,
      type,
      length,
      coreIdea,
      description,
      characters = [],
      settings = [],
      style = 'modern',
      pacing = 'medium',
      conflict = 'medium',
      signal
    } = params

    const prompt = this.buildOutlinePrompt({
      type,
      length,
      coreIdea,
      description,
      characters,
      settings,
      style,
      pacing,
      conflict
    })

    const response = await this.chat(novelId, prompt, {
      characters,
      settings,
      outlineGeneration: true
    }, {
      type: 'creative',
      taskType: 'creative',
      signal
    })

    console.log('AI响应结构:', response)
    
    // 处理不同的响应格式
    let content = ''
    if (typeof response === 'string') {
      content = response
    } else if (response && typeof response === 'object') {
      // 尝试不同的可能属性名
      content = response.content || response.message || response.data || (response as any).text || ''
      if (typeof content !== 'string') {
        content = JSON.stringify(response)
      }
    }

    return this.parseOutlineResponse(content, type, length)
  }

  // 生成单章节内容大纲
  async generateChapterOutline(params: ChapterOutlineParams): Promise<ChapterOutlineData> {
    this.ensureAssistantEnabled()

    const {
      novelId,
      chapterId,
      chapterNumber,
      chapterTitle,
      existingOutline = '',
      characters = [],
      settings = [],
      targetWords = 2000,
      previousChapterSummary = '',
      nextChapterPlan = '',
      signal
    } = params

    const prompt = this.buildChapterOutlinePrompt({
      chapterNumber,
      chapterTitle,
      existingOutline,
      characters,
      settings,
      targetWords,
      previousChapterSummary,
      nextChapterPlan
    })

    const response = await this.chat(novelId, prompt, {
      characters,
      settings,
      chapterOutlineGeneration: true
    }, {
      type: 'creative',
      taskType: 'creative',
      signal
    })

    console.log('章节大纲AI响应:', response)

    // 处理响应格式
    let content = ''
    if (typeof response === 'string') {
      content = response
    } else if (response && typeof response === 'object') {
      content = response.content || response.message || response.data || (response as any).text || ''
      if (typeof content !== 'string') {
        content = JSON.stringify(response)
      }
    }

    return this.parseChapterOutlineResponse(content, chapterNumber, chapterTitle, targetWords)
  }

  // 构建章节大纲生成提示词
  buildChapterOutlinePrompt(params: any): string {
    const {
      chapterNumber,
      chapterTitle,
      existingOutline,
      characters,
      settings,
      targetWords,
      previousChapterSummary,
      nextChapterPlan
    } = params

    let prompt = `请为第${chapterNumber}章"${chapterTitle}"生成一个详细的内容大纲。

**章节信息：**
- 章节：第${chapterNumber}章
- 标题：${chapterTitle}
- 目标字数：约${targetWords}字

**任务要求：**
请生成一个专注于本章节内容结构的大纲，包括：
1. 章节概述（100-200字）
2. 内容结构（分成4-6个主要段落，每段说明具体内容和预估字数）
3. 章节重点（3-5个关键情节或要点）
4. 情感基调描述
5. 情节要点（3-6个具体的情节要点，分类为：冲突、发现、情感、行动、对话）

**生成格式要求：**
请严格按照以下JSON格式返回：
{
  "title": "第${chapterNumber}章：${chapterTitle}",
  "summary": "章节概述内容",
  "contentStructure": [
    {
      "title": "开头部分",
      "description": "具体描述这一段的内容",
      "estimatedWords": 300
    },
    {
      "title": "发展部分",
      "description": "具体描述这一段的内容",
      "estimatedWords": 500
    }
  ],
  "targetWords": ${targetWords},
  "keyPoints": ["重点1", "重点2", "重点3"],
  "emotionalTone": "情感基调描述",
  "plotPoints": [
    {
      "type": "conflict",
      "description": "具体的冲突情节描述"
    },
    {
      "type": "discovery",
      "description": "具体的发现情节描述"
    }
  ]
}

**情节要点类型说明：**
- conflict: 冲突情节（人物间矛盾、内心挣扎、外部阻碍等）
- discovery: 发现情节（新信息、重要线索、真相揭示等）
- emotion: 情感情节（情感变化、关系发展、心理转折等）
- action: 行动情节（具体行为、事件发生、情况变化等）
- dialogue: 对话情节（重要对话、信息交换、关系确认等）`

    if (existingOutline) {
      prompt += `\n\n**现有大纲：**\n${existingOutline}`
    }

    if (previousChapterSummary) {
      prompt += `\n\n**上一章概要：**\n${previousChapterSummary}`
    }

    if (nextChapterPlan) {
      prompt += `\n\n**下一章计划：**\n${nextChapterPlan}`
    }

    if (characters.length > 0) {
      prompt += `\n\n**相关角色：**\n`
      characters.forEach((char: any) => {
        prompt += `- ${char.name}：${char.description || '暂无描述'}\n`
      })
    }

    if (settings.length > 0) {
      prompt += `\n\n**相关设定：**\n`
      settings.forEach((setting: any) => {
        prompt += `- ${setting.name}：${setting.description || '暂无描述'}\n`
      })
    }

    prompt += `\n\n请确保：
1. 内容结构合理，有明确的开头、发展、高潮、结尾
2. 每个段落的字数分配合理，总和接近目标字数
3. 情节紧凑，有足够的冲突和转折
4. 符合角色设定和世界观背景`

    return prompt
  }

  // 解析章节大纲响应
  parseChapterOutlineResponse(content: string, chapterNumber: number, chapterTitle: string, targetWords: number): ChapterOutlineData {
    try {
      // 尝试解析JSON格式
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          title: parsed.title || `第${chapterNumber}章：${chapterTitle}`,
          summary: parsed.summary || '暂无概述',
          contentStructure: parsed.contentStructure || [],
          targetWords: parsed.targetWords || targetWords,
          keyPoints: parsed.keyPoints || [],
          emotionalTone: parsed.emotionalTone || '平稳',
          plotPoints: parsed.plotPoints || []
        }
      }
    } catch (error) {
      console.log('JSON解析失败，使用文本解析')
    }

    // 文本格式解析备用方案
    const lines = content.split('\n').filter(line => line.trim())

    return {
      title: `第${chapterNumber}章：${chapterTitle}`,
      summary: this.extractSummaryFromText(content),
      contentStructure: this.extractContentStructureFromText(content, targetWords),
      targetWords,
      keyPoints: this.extractKeyPointsFromText(content),
      emotionalTone: this.extractEmotionalToneFromText(content),
      plotPoints: this.extractPlotPointsFromText(content)
    }
  }

  // 从文本中提取概述
  private extractSummaryFromText(content: string): string {
    const summaryMatch = content.match(/概述[：:]\s*(.+?)(?=\n\n|\n[#*-]|$)/s)
    return summaryMatch ? summaryMatch[1].trim() : '本章将推进主要情节发展。'
  }

  // 从文本中提取内容结构
  private extractContentStructureFromText(content: string, targetWords: number): ContentSection[] {
    const sections: ContentSection[] = []
    const sectionMatches = content.match(/\d+\.\s*\*\*(.+?)\*\*[：:]?\s*(.+?)(?=\n\d+\.|$)/gs)

    if (sectionMatches && sectionMatches.length > 0) {
      const wordsPerSection = Math.floor(targetWords / sectionMatches.length)
      sectionMatches.forEach((match, index) => {
        const titleMatch = match.match(/\*\*(.+?)\*\*/)
        const descMatch = match.match(/\*\*.*?\*\*[：:]?\s*(.+)/)

        sections.push({
          title: titleMatch ? titleMatch[1] : `第${index + 1}部分`,
          description: descMatch ? descMatch[1].trim() : '内容描述',
          estimatedWords: wordsPerSection
        })
      })
    } else {
      // 默认结构
      const defaultWords = Math.floor(targetWords / 4)
      sections.push(
        { title: '开头', description: '设置场景，引入情节', estimatedWords: defaultWords },
        { title: '发展', description: '推进故事，展开冲突', estimatedWords: defaultWords },
        { title: '高潮', description: '情节达到顶点', estimatedWords: defaultWords },
        { title: '结尾', description: '解决冲突，为下章铺垫', estimatedWords: defaultWords }
      )
    }

    return sections
  }

  // 从文本中提取关键要点
  private extractKeyPointsFromText(content: string): string[] {
    const pointsMatch = content.match(/[要重]点[：:]?\s*(.+?)(?=\n\n|\n[#*]|$)/s)
    if (pointsMatch) {
      return pointsMatch[1].split(/[,，\n]/).map(p => p.trim()).filter(p => p.length > 0)
    }
    return ['推进主线剧情', '角色关系发展', '设置悬念']
  }

  // 从文本中提取情感基调
  private extractEmotionalToneFromText(content: string): string {
    const toneMatch = content.match(/[情感][基]?调[：:]?\s*(.+?)(?=\n|$)/)
    return toneMatch ? toneMatch[1].trim() : '平稳推进'
  }

  // 从文本中提取情节要点
  private extractPlotPointsFromText(content: string): PlotPointData[] {
    const plotPoints: PlotPointData[] = []

    // 尝试匹配类似 "- conflict: 描述" 的格式
    const plotPointMatches = content.match(/[-*]\s*(conflict|discovery|emotion|action|dialogue)[：:]?\s*(.+?)(?=\n|$)/gi)

    if (plotPointMatches) {
      plotPointMatches.forEach(match => {
        const typeMatch = match.match(/(conflict|discovery|emotion|action|dialogue)/i)
        const descMatch = match.match(/[：:]\s*(.+)$/)

        if (typeMatch && descMatch) {
          plotPoints.push({
            type: typeMatch[1].toLowerCase() as PlotPointData['type'],
            description: descMatch[1].trim()
          })
        }
      })
    }

    // 如果没有找到，尝试从内容结构中推断
    if (plotPoints.length === 0) {
      const conflictKeywords = ['冲突', '矛盾', '对抗', '争执', '阻碍']
      const discoveryKeywords = ['发现', '揭示', '线索', '秘密', '真相']
      const emotionKeywords = ['情感', '心情', '感受', '关系', '爱情']
      const actionKeywords = ['行动', '动作', '事件', '发生', '进行']
      const dialogueKeywords = ['对话', '交谈', '讨论', '说话', '表达']

      const sections = content.split(/\n/).filter(line => line.trim())

      sections.forEach(section => {
        const lowerSection = section.toLowerCase()

        if (conflictKeywords.some(keyword => lowerSection.includes(keyword))) {
          plotPoints.push({ type: 'conflict', description: section.trim() })
        } else if (discoveryKeywords.some(keyword => lowerSection.includes(keyword))) {
          plotPoints.push({ type: 'discovery', description: section.trim() })
        } else if (emotionKeywords.some(keyword => lowerSection.includes(keyword))) {
          plotPoints.push({ type: 'emotion', description: section.trim() })
        } else if (actionKeywords.some(keyword => lowerSection.includes(keyword))) {
          plotPoints.push({ type: 'action', description: section.trim() })
        } else if (dialogueKeywords.some(keyword => lowerSection.includes(keyword))) {
          plotPoints.push({ type: 'dialogue', description: section.trim() })
        }
      })
    }

    // 如果还是没有，提供默认的情节要点
    if (plotPoints.length === 0) {
      plotPoints.push(
        { type: 'action', description: '章节开始，设置场景和人物状态' },
        { type: 'conflict', description: '引入主要矛盾或问题' },
        { type: 'discovery', description: '揭示重要信息或线索' },
        { type: 'emotion', description: '角色情感发展或变化' }
      )
    }

    return plotPoints.slice(0, 6) // 限制最多6个情节要点
  }

  // 构建大纲生成提示词
  buildOutlinePrompt(params: any): string {
    const {
      type,
      length,
      coreIdea,
      description,
      characters,
      settings,
      style,
      pacing,
      conflict
    } = params

    const chapterCounts = {
      brief: { min: 3, max: 5 },
      standard: { min: 8, max: 12 },
      detailed: { min: 15, max: 20 }
    }

    const targetChapters = chapterCounts[length as keyof typeof chapterCounts] || chapterCounts.standard

    let prompt = `请为我生成一个${this.getTypeText(type)}，要求如下：

**基本信息：**
- 类型：${this.getTypeText(type)}
- 长度：${this.getLengthText(length)} (${targetChapters.min}-${targetChapters.max}章)
- 创作风格：${this.getStyleText(style)}
- 节奏控制：${this.getPacingText(pacing)}
- 冲突强度：${this.getConflictText(conflict)}

**核心想法：**
${coreIdea}

**详细描述：**
${description}
`

    if (characters.length > 0) {
      prompt += `\n**可用角色：**\n`
      characters.forEach((char: any) => {
        prompt += `- ${char.name}：${char.description || '暂无描述'}\n`
        if (char.personality) prompt += `  性格：${char.personality}\n`
        if (char.background) prompt += `  背景：${char.background}\n`
      })
    }

    if (settings.length > 0) {
      prompt += `\n**世界设定：**\n`
      settings.forEach((setting: any) => {
        prompt += `- ${setting.name}(${setting.type})：${setting.description}\n`
      })
    }

    prompt += `\n**输出要求：**
请以JSON格式返回大纲，包含以下结构：
\`\`\`json
{
  "summary": "故事总体概述，200-300字",
  "mainConflict": "主要冲突描述",
  "mainPlot": "故事主线概括", 
  "themes": ["主题1", "主题2"],
  "estimatedTotalWords": 预估总字数,
  "chapters": [
    {
      "title": "章节标题",
      "type": "章节类型", // 开篇/发展/过渡/高潮/结局
      "summary": "章节概述，100-150字",
      "plotPoints": [
        {
          "type": "情节点类型", // 开场/发展/转折/高潮/结尾
          "description": "情节点描述"
        }
      ],
      "characters": ["涉及的角色名"],
      "settings": ["相关的世界设定"],
      "conflicts": ["本章节的冲突点"],
      "estimatedWords": 预估字数,
      "keyEvents": ["关键事件1", "关键事件2"],
      "emotionalTone": "情感基调", // 轻松/紧张/悲伤/激昂等
      "chapterGoals": ["本章目标1", "本章目标2"]
    }
  ]
}
\`\`\`

**注意事项：**
1. 确保章节数量在${targetChapters.min}-${targetChapters.max}章之间
2. 情节发展要有逻辑性和连贯性  
3. 每章的情节要点要具体且可执行
4. 字数分配要合理，单章一般2000-4000字
5. 角色出场和发展要符合人物设定
6. 确保JSON格式正确，可以被解析`

    return prompt
  }

  // 解析大纲生成响应
  parseOutlineResponse(content: string, type: string, length: string): OutlineData {
    try {
      // 检查content是否存在
      if (!content || typeof content !== 'string') {
        console.warn('AI响应内容为空或无效，使用默认大纲')
        return this.getDefaultOutline(type, length)
      }

      // 提取JSON部分
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        console.warn('响应中未找到有效的JSON格式，使用默认大纲')
        console.log('AI原始响应:', content)
        return this.getDefaultOutline(type, length)
      }

      const outlineData = JSON.parse(jsonMatch[1] || jsonMatch[0])

      // 数据验证和补全
      if (!outlineData.chapters || !Array.isArray(outlineData.chapters)) {
        throw new Error('大纲数据格式不正确')
      }

      // 补全缺失的字段
      outlineData.summary = outlineData.summary || '暂无概述'
      outlineData.mainConflict = outlineData.mainConflict || '暂无主要冲突'
      outlineData.mainPlot = outlineData.mainPlot || '暂无故事主线'
      outlineData.themes = outlineData.themes || []
      outlineData.estimatedTotalWords = outlineData.estimatedTotalWords || 
        outlineData.chapters.reduce((total: number, ch: any) => total + (ch.estimatedWords || 2500), 0)

      // 处理章节数据
      outlineData.chapters = outlineData.chapters.map((chapter: any, index: number) => ({
        title: chapter.title || `第${index + 1}章`,
        type: chapter.type || '发展',
        summary: chapter.summary || '暂无概述',
        plotPoints: this.validatePlotPoints(chapter.plotPoints),
        characters: Array.isArray(chapter.characters) ? chapter.characters : [],
        settings: Array.isArray(chapter.settings) ? chapter.settings : [],
        conflicts: Array.isArray(chapter.conflicts) ? chapter.conflicts : [],
        estimatedWords: chapter.estimatedWords || 2500,
        keyEvents: Array.isArray(chapter.keyEvents) ? chapter.keyEvents : [],
        emotionalTone: chapter.emotionalTone || '平缓',
        chapterGoals: Array.isArray(chapter.chapterGoals) ? chapter.chapterGoals : []
      }))

      return outlineData
    } catch (error) {
      console.error('解析大纲响应失败:', error)
      // 返回默认结构
      return this.getDefaultOutline(type, length)
    }
  }

  // 验证和补全情节点数据
  validatePlotPoints(plotPoints: any): PlotPoint[] {
    if (!Array.isArray(plotPoints)) return []
    
    return plotPoints.map((point: any) => ({
      type: point.type || '发展',
      description: point.description || '暂无描述'
    }))
  }

  // 获取默认大纲结构
  getDefaultOutline(type: string, length: string): OutlineData {
    const chapterCount = length === 'brief' ? 3 : length === 'detailed' ? 15 : 8
    const chapters: ChapterData[] = []

    for (let i = 0; i < chapterCount; i++) {
      chapters.push({
        title: `第${i + 1}章`,
        type: i === 0 ? '开篇' : i === chapterCount - 1 ? '结局' : '发展',
        summary: `第${i + 1}章的内容概述`,
        plotPoints: [
          { type: '开场', description: '章节开场' },
          { type: '发展', description: '情节发展' },
          { type: '结尾', description: '章节结尾' }
        ],
        characters: [],
        settings: [],
        conflicts: [],
        estimatedWords: 2500,
        keyEvents: [],
        emotionalTone: '平缓',
        chapterGoals: []
      })
    }

    return {
      summary: '暂无概述，请重新生成或手动编辑',
      mainConflict: '暂无主要冲突',
      mainPlot: '暂无故事主线',
      themes: [],
      estimatedTotalWords: chapterCount * 2500,
      chapters
    }
  }

  // 应用大纲到小说
  async applyOutline(novelId: string, outlineData: OutlineData): Promise<any> {
    this.ensureAssistantEnabled()

    const response = await api.post(`${API_BASE}/ai/outline/apply`, {
      novelId,
      outline: outlineData
    })

    return response.data
  }

  // 保存大纲草稿
  async saveOutlineDraft(novelId: string, outlineData: OutlineData): Promise<any> {
    this.ensureAssistantEnabled()

    const response = await api.post(`${API_BASE}/ai/outline/draft`, {
      novelId,
      outline: outlineData
    })

    return response.data
  }

  // 创建可分享的大纲链接
  async createShareableOutline(outlineData: OutlineData): Promise<string> {
    this.ensureAssistantEnabled()

    const response = await api.post(`${API_BASE}/ai/outline/share`, {
      outline: outlineData
    })

    const result = response.data
    return result.shareUrl
  }

  // 获取角色列表
  async getCharacters(novelId: string): Promise<any[]> {
    const response = await api.get(`${API_BASE}/characters?novelId=${novelId}`)

    const result = response.data
    return result.data || []
  }

  // 获取世界设定列表  
  async getWorldSettings(novelId: string): Promise<any[]> {
    const response = await api.get(`${API_BASE}/settings?novelId=${novelId}`)

    const result = response.data
    return result.data || []
  }

  // 辅助方法
  getTypeText(type: string): string {
    const texts: Record<string, string> = {
      full: '完整小说大纲',
      chapter: '单章节详细大纲',
      arc: '故事弧大纲'
    }
    return texts[type] || '小说大纲'
  }

  getLengthText(length: string): string {
    const texts: Record<string, string> = {
      brief: '简要版',
      standard: '标准版',
      detailed: '详细版'
    }
    return texts[length] || '标准版'
  }

  getStyleText(style: string): string {
    const texts: Record<string, string> = {
      traditional: '传统章回体',
      modern: '现代小说体',
      episodic: '分集剧情体',
      cinematic: '电影式叙述'
    }
    return texts[style] || '现代小说体'
  }

  getPacingText(pacing: string): string {
    const texts: Record<string, string> = {
      fast: '快节奏',
      medium: '中等节奏',
      slow: '慢节奏'
    }
    return texts[pacing] || '中等节奏'
  }

  getConflictText(conflict: string): string {
    const texts: Record<string, string> = {
      low: '低强度冲突',
      medium: '中强度冲突', 
      high: '高强度冲突'
    }
    return texts[conflict] || '中强度冲突'
  }

  // AI生成正文内容
  async generateContent(params: {
    novelId: string
    chapterId: string
    outline?: string
    existingContent?: string
    targetLength?: number
    style?: string
    characters?: any[]
    settings?: any[]
    signal?: AbortSignal
  }): Promise<AIResponse> {
    const {
      novelId,
      chapterId,
      outline,
      existingContent,
      targetLength = 2000,
      style = 'modern',
      characters = [],
      settings = [],
      signal
    } = params

    const prompt = this.buildContentPrompt({
      outline,
      existingContent,
      targetLength,
      style,
      characters,
      settings
    })

    const response = await this.chat(novelId, prompt, {
      chapterId,
      characters,
      settings,
      contentGeneration: true
    }, {
      type: 'creative',
      taskType: 'content_generation',
      signal
    })

    return response
  }

  async generateContentStream(
    params: {
      novelId: string
      chapterId: string
      outline?: string
      existingContent?: string
      targetLength?: number
      style?: string
      characters?: any[]
      settings?: any[]
      signal?: AbortSignal
    },
    onStream: StreamHandler
  ): Promise<void> {
    const {
      novelId,
      chapterId,
      outline,
      existingContent,
      targetLength = 2000,
      style = 'modern',
      characters = [],
      settings = [],
      signal
    } = params

    const prompt = this.buildContentPrompt({
      outline,
      existingContent,
      targetLength,
      style,
      characters,
      settings
    })

    return this.chatStream(
      novelId,
      prompt,
      onStream,
      {
        chapterId,
        characters,
        settings,
        contentGeneration: true
      },
      {
        type: 'creative',
        signal
      }
    )
  }

  // 构建正文生成提示词
  buildContentPrompt(params: {
    outline?: string
    existingContent?: string
    targetLength: number
    style: string
    characters: any[]
    settings: any[]
  }): string {
    const {
      outline,
      existingContent,
      targetLength,
      style,
      characters,
      settings
    } = params

    let prompt = `请为我创作小说正文内容，要求如下：

**创作要求：**
- 目标长度：约${targetLength}字
- 写作风格：${this.getStyleText(style)}
- 文字风格：生动自然，适合网络小说阅读
- 段落格式：每段开头空两格，适当使用对话和描写

**章节信息：**`

    if (outline) {
      prompt += `
**章节大纲：**
${outline}

请严格按照大纲内容进行创作，确保情节发展符合大纲设计。`
    }

    if (existingContent) {
      prompt += `
**现有内容：**
${existingContent.slice(0, 500)}...

请基于现有内容继续创作，保持文风和情节的连贯性。`
    }

    if (characters.length > 0) {
      prompt += `\n**相关角色：**\n`
      characters.forEach((char: any) => {
        prompt += `- ${char.name}：${char.description || '暂无描述'}\n`
        if (char.personality) prompt += `  性格：${char.personality}\n`
        if (char.background) prompt += `  背景：${char.background}\n`
      })
    }

    if (settings.length > 0) {
      prompt += `\n**世界设定：**\n`
      settings.forEach((setting: any) => {
        prompt += `- ${setting.name}(${setting.type})：${setting.description}\n`
      })
    }

    prompt += `\n**创作指导：**
1. 内容要生动有趣，情节紧凑
2. 人物对话要符合角色性格
3. 环境描写要有画面感
4. 适当运用修辞手法增强表现力
5. 段落之间要有逻辑关系
6. 如有对话，请使用标准的引号格式

**输出格式：**
请直接输出小说正文内容，不要添加任何说明性文字或格式标记。内容应该可以直接插入到小说编辑器中使用。`

    return prompt
  }

  /**
   * 生成智能续写建议
   */
  async generateSuggestions(params: SuggestionParams): Promise<SuggestionResponse> {
    const {
      novelId,
      chapterId,
      context,
      cursorPosition,
      count = 3,
      maxLength = 100,
      signal
    } = params

    const startTime = Date.now()

    try {
      const prompt = this.buildSuggestionPrompt(context, maxLength, count)

      const response = await this.chat(novelId, prompt, {
        chapterId,
        suggestionGeneration: true
      }, {
        type: 'creative',
        taskType: 'suggestion',
        signal
      })

      const parsed = this.parseSuggestionResponse(response, count)

      return {
        ...parsed,
        metadata: {
          ...parsed.metadata,
          processingTime: Date.now() - startTime
        }
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error)
      return {
        suggestions: [],
        metadata: {
          processingTime: Date.now() - startTime,
          model: 'error'
        }
      }
    }
  }

  /**
   * 构建建议生成提示词
   */
  private buildSuggestionPrompt(context: string, maxLength: number, count: number): string {
    return `你是一个智能写作助手。请基于以下文本内容，生成${count}个可能的续写建议。

**当前文本：**
${context}

**要求：**
1. 每个建议不超过${maxLength}字
2. 建议应该自然衔接上文
3. 保持文风一致
4. 提供不同风格的选项（如：情节推进、环境描写、对话等）
5. 返回JSON格式

**输出格式：**
\`\`\`json
{
  "suggestions": [
    {
      "text": "续写内容1",
      "type": "continuation",
      "confidence": 0.9
    },
    {
      "text": "续写内容2",
      "type": "dialogue",
      "confidence": 0.85
    },
    {
      "text": "续写内容3",
      "type": "description",
      "confidence": 0.8
    }
  ]
}
\`\`\`

请直接返回JSON，不要添加其他说明。`
  }

  /**
   * 解析建议响应
   */
  private parseSuggestionResponse(response: any, count: number): SuggestionResponse {
    try {
      let content = ''
      if (typeof response === 'string') {
        content = response
      } else if (response && typeof response === 'object') {
        content = response.content || response.message || response.data || ''
        if (typeof content !== 'string') {
          content = JSON.stringify(response)
        }
      }

      // 提取JSON
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       content.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])

        return {
          suggestions: (parsed.suggestions || []).slice(0, count).map((s: any) => ({
            text: s.text || '',
            confidence: s.confidence || 0.8,
            type: s.type || 'continuation'
          })),
          metadata: {
            processingTime: 0,
            model: 'default'
          }
        }
      }

      // 降级：如果无法解析JSON，尝试从文本中提取
      // 按行分割，每行作为一个建议
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('*'))
        .slice(0, count)

      if (lines.length > 0) {
        return {
          suggestions: lines.map(text => ({
            text,
            confidence: 0.7,
            type: 'continuation' as const
          })),
          metadata: {
            processingTime: 0,
            model: 'fallback'
          }
        }
      }

      // 如果还是无法提取，将整个响应作为单个建议
      return {
        suggestions: [{
          text: content.slice(0, maxLength).trim(),
          confidence: 0.6,
          type: 'continuation'
        }],
        metadata: {
          processingTime: 0,
          model: 'fallback'
        }
      }
    } catch (error) {
      console.error('Failed to parse suggestion response:', error)
      return {
        suggestions: [],
        metadata: {
          processingTime: 0,
          model: 'error'
        }
      }
    }
  }
}

export const aiService = new AIService()
export default aiService
