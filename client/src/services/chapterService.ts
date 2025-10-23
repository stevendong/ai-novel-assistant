import type { Chapter, PlotPoint, Illustration, ChapterCharacter, ChapterSetting } from '@/types'
import { ChapterStatus } from '@/constants/status'
import { api, type ApiResponse } from '@/utils/api'

const API_BASE = '/api'

export interface ChapterCreateData {
  novelId: string
  title: string
  chapterNumber: number
  outline?: string
  plotPoints?: PlotPoint[]
}

export interface ChapterUpdateData {
  title?: string
  outline?: string
  content?: string
  plotPoints?: PlotPoint[]
  illustrations?: Illustration[]
  status?: ChapterStatus
  targetWordCount?: number
}

export interface AIOutlineRequest {
  plotPoints?: PlotPoint[]
  targetEmotion?: string
  constraints?: {
    maxWordCount?: number
    requiredElements?: string[]
    forbidden?: string[]
  }
}

export interface AIOutlineResponse {
  structure: {
    opening: string
    development: string
    climax: string
    resolution: string
  }
  scenes: Array<{
    type: string
    location: string
    characters: string[]
    keyEvents: string[]
    wordCount: number
  }>
  suggestions: {
    pacing?: string
    dialogue?: string
    description?: string
  }
}

export interface ChapterListQuery {
  page?: number
  pageSize?: number
  status?: string
  search?: string
  sortBy?: 'chapterNumber' | 'title' | 'updatedAt' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface ChapterListResponse {
  chapters: Chapter[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  maxChapterNumber: number
}

class ChapterService {
  // 获取小说的所有章节
  async getChaptersByNovel(novelId: string): Promise<Chapter[]> {
    const response = await api.get(`${API_BASE}/chapters/novel/${novelId}`)
    const chapters = response.data
    
    // 解析JSON字符串字段
    return chapters.map((chapter: any) => this.parseChapterData(chapter))
  }

  // 分页查询小说章节
  async getChaptersByNovelPaginated(novelId: string, query: ChapterListQuery = {}): Promise<ChapterListResponse> {
    const params = new URLSearchParams()
    
    // 设置默认值
    const {
      page = 1,
      pageSize = 10,
      status,
      search,
      sortBy = 'chapterNumber',
      sortOrder = 'asc'
    } = query
    
    params.append('page', page.toString())
    params.append('pageSize', pageSize.toString())
    params.append('sortBy', sortBy)
    params.append('sortOrder', sortOrder)
    
    if (status) {
      params.append('status', status)
    }
    
    if (search) {
      params.append('search', search)
    }
    const response = await api.get(`${API_BASE}/chapters/novel/${novelId}/paginated?${params}`)
    const result = response.data
    
    return {
      ...result,
      chapters: result.chapters.map((chapter: any) => this.parseChapterData(chapter))
    }
  }

  // 获取单个章节详情
  async getChapter(id: string): Promise<Chapter> {
    const response = await api.get(`${API_BASE}/chapters/${id}`)
    const chapter = response.data
    return this.parseChapterData(chapter)
  }

  // 创建新章节
  async createChapter(data: ChapterCreateData): Promise<Chapter> {
    const response = await api.post(`${API_BASE}/chapters`, {
      ...data,
      plotPoints: data.plotPoints ? JSON.stringify(data.plotPoints) : null
    })

    const chapter = response.data
    return this.parseChapterData(chapter)
  }

  // 更新章节
  async updateChapter(id: string, data: ChapterUpdateData): Promise<Chapter> {
    const payload = {
      ...data,
      plotPoints: data.plotPoints ? JSON.stringify(data.plotPoints) : undefined,
      illustrations: data.illustrations ? JSON.stringify(data.illustrations) : undefined,
    }
    
    const response = await api.put(`${API_BASE}/chapters/${id}`, payload)

    const chapter = response.data
    return this.parseChapterData(chapter)
  }

  // 删除章节
  async deleteChapter(id: string): Promise<void> {
    await api.delete(`${API_BASE}/chapters/${id}`)
  }

  // AI生成章节大纲
  async generateOutline(chapterId: string, request: AIOutlineRequest): Promise<AIOutlineResponse> {
    const response = await api.post(`${API_BASE}/chapters/${chapterId}/generate-outline`, request)

    return response.data
  }

  // 添加角色到章节
  async addCharacterToChapter(chapterId: string, characterId: string, role: string = 'mentioned'): Promise<ChapterCharacter> {
    const response = await api.post(`${API_BASE}/chapters/${chapterId}/characters`, { characterId, role })

    return response.data
  }

  // 更新章节角色关系
  async updateCharacterRole(chapterId: string, characterId: string, role: string): Promise<ChapterCharacter> {
    const response = await api.put(`${API_BASE}/chapters/${chapterId}/characters/${characterId}`, { role })

    return response.data
  }

  // 从章节中移除角色
  async removeCharacterFromChapter(chapterId: string, characterId: string): Promise<void> {
    await api.delete(`${API_BASE}/chapters/${chapterId}/characters/${characterId}`)
  }

  // 添加设定到章节
  async addSettingToChapter(chapterId: string, settingId: string, usage: string = ''): Promise<ChapterSetting> {
    const response = await api.post(`${API_BASE}/chapters/${chapterId}/settings`, { settingId, usage })

    return response.data
  }

  // 更新章节设定使用说明
  async updateSettingUsage(chapterId: string, settingId: string, usage: string): Promise<ChapterSetting> {
    const response = await api.put(`${API_BASE}/chapters/${chapterId}/settings/${settingId}`, { usage })

    return response.data
  }

  // 从章节中移除设定
  async removeSettingFromChapter(chapterId: string, settingId: string): Promise<void> {
    await api.delete(`${API_BASE}/chapters/${chapterId}/settings/${settingId}`)
  }

  // 解析章节数据（处理JSON字符串字段）
  private parseChapterData(chapter: any): Chapter {
    return {
      ...chapter,
      plotPoints: chapter.plotPoints ? this.safeJSONParse(chapter.plotPoints, []) : [],
      illustrations: chapter.illustrations ? this.safeJSONParse(chapter.illustrations, []) : [],
      characters: chapter.characters || [],
      settings: chapter.settings || [],
      consistencyLog: chapter.consistencyLog || [],
    }
  }

  // 安全的JSON解析
  private safeJSONParse(str: string, fallback: any = null) {
    try {
      return JSON.parse(str)
    } catch (error) {
      console.warn('Failed to parse JSON:', str, error)
      return fallback
    }
  }
}

export const chapterService = new ChapterService()
