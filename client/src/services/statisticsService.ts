import type { NovelStatistics } from '@/types'
import { api, type ApiResponse } from '@/utils/api'

const API_BASE = '/api'

export interface StatisticRecord {
  id: string
  novelId: string
  date: string
  wordCount: number
  timeSpent: number
  createdAt: string
}

export interface CreateStatisticData {
  novelId: string
  date: string
  wordCount: number
  timeSpent?: number
}

export interface UpdateStatisticData {
  wordCount?: number
  timeSpent?: number
}

export interface StatisticsSummary {
  period: {
    days: number
    startDate: string
    endDate: string
  }
  totals: {
    words: number
    timeMinutes: number
    writingDays: number
    averageWordsPerDay: number
  }
  recent: {
    today: {
      words: number
      timeMinutes: number
    }
    thisWeek: {
      words: number
      timeMinutes: number
    }
    thisMonth: {
      words: number
      timeMinutes: number
    }
  }
  dailyData: StatisticRecord[]
}

export const statisticsService = {
  // 获取小说的写作统计
  async getNovelStatistics(novelId: string, startDate?: string, endDate?: string): Promise<StatisticRecord[]> {
    try {
      let url = `${API_BASE}/statistics/novel/${novelId}`
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (params.toString()) url += `?${params.toString()}`

      const response = await api.get(url)
      return response.data
    } catch (error) {
      console.error('Error fetching statistics:', error)
      throw error
    }
  },

  // 获取统计汇总数据
  async getStatisticsSummary(novelId: string, days = 30): Promise<StatisticsSummary> {
    try {
      const response = await api.get(`${API_BASE}/statistics/novel/${novelId}/summary?days=${days}`)
      return response.data
    } catch (error) {
      console.error('Error fetching statistics summary:', error)
      throw error
    }
  },

  // 获取单条统计记录
  async getStatistic(id: string): Promise<StatisticRecord> {
    try {
      const response = await api.get(`${API_BASE}/statistics/${id}`)
      return response.data
    } catch (error) {
      console.error('Error fetching statistic:', error)
      throw error
    }
  },

  // 创建或更新统计数据
  async createOrUpdateStatistic(data: CreateStatisticData): Promise<StatisticRecord> {
    try {
      const response = await api.post(`${API_BASE}/statistics`, data)
      return response.data
    } catch (error) {
      console.error('Error creating/updating statistic:', error)
      throw error
    }
  },

  // 更新统计数据
  async updateStatistic(id: string, data: UpdateStatisticData): Promise<StatisticRecord> {
    try {
      const response = await api.put(`${API_BASE}/statistics/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Error updating statistic:', error)
      throw error
    }
  },

  // 删除统计数据
  async deleteStatistic(id: string): Promise<void> {
    try {
      await api.delete(`${API_BASE}/statistics/${id}`)
    } catch (error) {
      console.error('Error deleting statistic:', error)
      throw error
    }
  },

  // 批量创建统计数据
  async createBatchStatistics(statistics: CreateStatisticData[]): Promise<{ message: string, count: number }> {
    try {
      const response = await api.post(`${API_BASE}/statistics/batch`, { statistics })
      return response.data
    } catch (error) {
      console.error('Error creating batch statistics:', error)
      throw error
    }
  },

  // 记录今日写作数据
  async recordTodayWriting(novelId: string, wordCount: number, timeSpent?: number): Promise<StatisticRecord> {
    const today = new Date().toISOString().split('T')[0]
    return this.createOrUpdateStatistic({
      novelId,
      date: today,
      wordCount,
      timeSpent
    })
  }
}