import type { Novel, NovelStatistics, ChapterProgress, WritingGoals, ProjectOverviewStats } from '@/types'
import { api, type ApiResponse } from '@/utils/api'

const API_BASE = '/api'

export interface NovelCreateData {
  title: string
  description?: string
  genre?: string
  rating?: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17'
  targetWordCount?: number
}

export interface NovelUpdateData {
  title?: string
  description?: string
  genre?: string
  rating?: string
  status?: 'draft' | 'writing' | 'completed'
  targetWordCount?: number
}

export interface NovelAnalysisRequest {
  summary: string
}

export interface NovelAnalysisResponse {
  suggestedCharacters: Array<{
    name: string
    description: string
  }>
  suggestedSettings: Array<{
    name: string
    type: string
    description: string
  }>
  suggestedChapters: Array<{
    title: string
    outline: string
  }>
  themes: string[]
  genre: string
}

class NovelService {
  // 获取所有小说项目
  async getNovels(): Promise<Novel[]> {
    try {
      const response = await api.get(`${API_BASE}/novels`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch novels:', error)
      throw new Error('Failed to fetch novels')
    }
  }

  // 获取项目概览统计数据
  async getProjectStats(): Promise<ProjectOverviewStats> {
    try {
      const response = await api.get(`${API_BASE}/novels?stats=true`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch project statistics:', error)
      throw new Error('Failed to fetch project statistics')
    }
  }

  // 获取单个小说详情
  async getNovel(id: string): Promise<Novel> {
    try {
      const response = await api.get(`${API_BASE}/novels/${id}`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch novel:', error)
      throw new Error('Failed to fetch novel')
    }
  }

  // 获取小说统计信息
  async getNovelStatistics(id: string): Promise<NovelStatistics> {
    try {
      const response = await api.get(`${API_BASE}/novels/${id}/statistics`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch novel statistics:', error)
      throw new Error('Failed to fetch novel statistics')
    }
  }

  // 获取章节进度详情
  async getChapterProgress(id: string): Promise<ChapterProgress[]> {
    try {
      const response = await api.get(`${API_BASE}/novels/${id}/progress`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch chapter progress:', error)
      throw new Error('Failed to fetch chapter progress')
    }
  }

  // 获取写作目标
  async getWritingGoals(id: string): Promise<WritingGoals> {
    try {
      const response = await api.get(`${API_BASE}/novels/${id}/goals`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch writing goals:', error)
      throw new Error('Failed to fetch writing goals')
    }
  }

  // 创建新小说
  async createNovel(data: NovelCreateData): Promise<Novel> {
    try {
      const response = await api.post(`${API_BASE}/novels`, data)
      return response.data
    } catch (error: any) {
      console.error('Failed to create novel:', error)
      throw new Error(error.response?.data?.error || 'Failed to create novel')
    }
  }

  // 更新小说信息
  async updateNovel(id: string, data: NovelUpdateData): Promise<Novel> {
    try {
      const response = await api.put(`${API_BASE}/novels/${id}`, data)
      return response.data
    } catch (error: any) {
      console.error('Failed to update novel:', error)
      throw new Error(error.response?.data?.error || 'Failed to update novel')
    }
  }

  // 删除小说
  async deleteNovel(id: string): Promise<void> {
    try {
      await api.delete(`${API_BASE}/novels/${id}`)
    } catch (error: any) {
      console.error('Failed to delete novel:', error)
      throw new Error(error.response?.data?.error || 'Failed to delete novel')
    }
  }

  // AI分析概要生成初始结构
  async analyzeSummary(id: string, request: NovelAnalysisRequest): Promise<NovelAnalysisResponse> {
    try {
      const response = await api.post(`${API_BASE}/novels/${id}/analyze-summary`, request)
      return response.data
    } catch (error: any) {
      console.error('Failed to analyze summary:', error)
      throw new Error(error.response?.data?.error || 'Failed to analyze summary')
    }
  }

  // 复制小说项目
  async duplicateNovel(sourceId: string, newTitle?: string): Promise<Novel> {
    // Note: This endpoint doesn't exist yet - placeholder for future implementation
    const novel = await this.getNovel(sourceId)
    const duplicateData = {
      title: newTitle || `${novel.title} (副本)`,
      description: novel.description,
      genre: novel.genre,
      rating: novel.rating,
      targetWordCount: novel.targetWordCount
    }
    
    return await this.createNovel(duplicateData)
  }

  // 导入小说项目
  async importNovel(file: File): Promise<Novel> {
    // Note: This endpoint doesn't exist yet - placeholder for future implementation
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post(`${API_BASE}/novels/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error: any) {
      console.error('Failed to import novel:', error)
      throw new Error(error.response?.data?.error || 'Failed to import novel')
    }
  }

  // 格式化日期
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // 获取项目颜色（用于头像等）
  getProjectColor(id: string): string {
    const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068']
    const hash = id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    return colors[Math.abs(hash) % colors.length]
  }

  // 获取状态颜色
  getStatusColor(status: string): string {
    const colors = {
      'draft': 'default',
      'writing': 'processing',
      'completed': 'success'
    }
    return colors[status as keyof typeof colors] || 'default'
  }

  // 获取状态文本
  getStatusText(status: string): string {
    const texts = {
      'draft': '草稿',
      'writing': '写作中',
      'completed': '已完成'
    }
    return texts[status as keyof typeof texts] || status
  }

  // 获取分级颜色
  getRatingColor(rating: string): string {
    const colors = {
      'G': 'green',
      'PG': 'blue',
      'PG-13': 'orange',
      'R': 'red',
      'NC-17': 'purple'
    }
    return colors[rating as keyof typeof colors] || 'default'
  }
}

export const novelService = new NovelService()