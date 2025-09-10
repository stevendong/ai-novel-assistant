import type { NovelStatistics } from '@/types'

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

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching statistics:', error)
      throw error
    }
  },

  // 获取统计汇总数据
  async getStatisticsSummary(novelId: string, days = 30): Promise<StatisticsSummary> {
    try {
      const response = await fetch(`${API_BASE}/statistics/novel/${novelId}/summary?days=${days}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch statistics summary: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching statistics summary:', error)
      throw error
    }
  },

  // 获取单条统计记录
  async getStatistic(id: string): Promise<StatisticRecord> {
    try {
      const response = await fetch(`${API_BASE}/statistics/${id}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch statistic: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching statistic:', error)
      throw error
    }
  },

  // 创建或更新统计数据
  async createOrUpdateStatistic(data: CreateStatisticData): Promise<StatisticRecord> {
    try {
      const response = await fetch(`${API_BASE}/statistics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create/update statistic: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error creating/updating statistic:', error)
      throw error
    }
  },

  // 更新统计数据
  async updateStatistic(id: string, data: UpdateStatisticData): Promise<StatisticRecord> {
    try {
      const response = await fetch(`${API_BASE}/statistics/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update statistic: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error updating statistic:', error)
      throw error
    }
  },

  // 删除统计数据
  async deleteStatistic(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/statistics/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete statistic: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting statistic:', error)
      throw error
    }
  },

  // 批量创建统计数据
  async createBatchStatistics(statistics: CreateStatisticData[]): Promise<{ message: string, count: number }> {
    try {
      const response = await fetch(`${API_BASE}/statistics/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ statistics })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create batch statistics: ${response.statusText}`)
      }
      
      return await response.json()
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