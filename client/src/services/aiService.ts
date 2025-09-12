const API_BASE = '/api'

export interface AIResponse {
  content: string
  success?: boolean
  message?: string
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
}

export interface OutlineData {
  summary: string
  mainConflict: string
  mainPlot: string
  themes: string[]
  estimatedTotalWords: number
  chapters: ChapterData[]
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

class AIService {
  // 通用AI对话
  async chat(novelId: string, message: string, context = {}, options = {}): Promise<AIResponse> {
    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        novelId,
        message,
        context,
        type: (options as any).type || 'general',
        provider: (options as any).provider,
        model: (options as any).model
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  // AI大纲生成
  async generateOutline(params: OutlineGenerationParams): Promise<OutlineData> {
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
      conflict = 'medium'
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
      taskType: 'creative'
    })

    console.log('AI响应结构:', response)
    
    // 处理不同的响应格式
    let content = ''
    if (typeof response === 'string') {
      content = response
    } else if (response && typeof response === 'object') {
      // 尝试不同的可能属性名
      content = response.content || response.message || response.data || response.text || ''
      if (typeof content !== 'string') {
        content = JSON.stringify(response)
      }
    }

    return this.parseOutlineResponse(content, type, length)
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
    const response = await fetch(`${API_BASE}/ai/outline/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        novelId,
        outline: outlineData
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  // 保存大纲草稿
  async saveOutlineDraft(novelId: string, outlineData: OutlineData): Promise<any> {
    const response = await fetch(`${API_BASE}/ai/outline/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        novelId,
        outline: outlineData
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  // 创建可分享的大纲链接
  async createShareableOutline(outlineData: OutlineData): Promise<string> {
    const response = await fetch(`${API_BASE}/ai/outline/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        outline: outlineData
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.shareUrl
  }

  // 获取角色列表
  async getCharacters(novelId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/characters?novelId=${novelId}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.data || []
  }

  // 获取世界设定列表  
  async getWorldSettings(novelId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/settings?novelId=${novelId}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
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
}

export const aiService = new AIService()
export default aiService