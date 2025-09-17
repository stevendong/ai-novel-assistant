import { api, type ApiResponse } from '@/utils/api'

const API_BASE = '/api'

export interface WritingGoal {
  id: string
  novelId: string
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'total'
  target: number
  achieved: number
  period: string
  createdAt: string
  updatedAt: string
}

export interface CreateGoalData {
  novelId: string
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'total'
  target: number
  period: string
  achieved?: number
}

export interface UpdateGoalData {
  target?: number
  achieved?: number
}

export interface GoalProgress {
  achieved?: number
  increment?: number
}

export const goalsService = {
  // 获取小说的所有写作目标
  async getNovelGoals(novelId: string, type?: string, period?: string): Promise<WritingGoal[]> {
    try {
      let url = `${API_BASE}/goals/novel/${novelId}`
      const params = new URLSearchParams()
      if (type) params.append('type', type)
      if (period) params.append('period', period)
      if (params.toString()) url += `?${params.toString()}`

      const response = await api.get(url)
      return response.data
    } catch (error) {
      console.error('Error fetching goals:', error)
      throw error
    }
  },

  // 获取当前活跃的写作目标
  async getActiveGoals(novelId: string): Promise<WritingGoal[]> {
    try {
      const response = await api.get(`${API_BASE}/goals/novel/${novelId}/active`)
      return response.data
    } catch (error) {
      console.error('Error fetching active goals:', error)
      throw error
    }
  },

  // 获取单个写作目标
  async getGoal(id: string): Promise<WritingGoal> {
    try {
      const response = await api.get(`${API_BASE}/goals/${id}`)
      return response.data
    } catch (error) {
      console.error('Error fetching goal:', error)
      throw error
    }
  },

  // 创建或更新写作目标
  async createOrUpdateGoal(data: CreateGoalData): Promise<WritingGoal> {
    try {
      const response = await api.post(`${API_BASE}/goals`, data)
      return response.data
    } catch (error) {
      console.error('Error creating/updating goal:', error)
      throw error
    }
  },

  // 更新写作目标
  async updateGoal(id: string, data: UpdateGoalData): Promise<WritingGoal> {
    try {
      const response = await api.put(`${API_BASE}/goals/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Error updating goal:', error)
      throw error
    }
  },

  // 更新目标完成进度
  async updateGoalProgress(id: string, progress: GoalProgress): Promise<WritingGoal> {
    try {
      const response = await api.patch(`${API_BASE}/goals/${id}/progress`, progress)
      return response.data
    } catch (error) {
      console.error('Error updating goal progress:', error)
      throw error
    }
  },

  // 删除写作目标
  async deleteGoal(id: string): Promise<void> {
    try {
      await api.delete(`${API_BASE}/goals/${id}`)
    } catch (error) {
      console.error('Error deleting goal:', error)
      throw error
    }
  },

  // 批量更新目标进度
  async updateNovelProgress(novelId: string, wordCount: number, date: string): Promise<{ message: string, updatedGoals: number, wordCount: number }> {
    try {
      const response = await api.patch(`${API_BASE}/goals/novel/${novelId}/update-progress`, { wordCount, date })
      return response.data
    } catch (error) {
      console.error('Error updating novel progress:', error)
      throw error
    }
  },

  // 获取当前时间周期标识
  getCurrentPeriods(): { daily: string, weekly: string, monthly: string, yearly: string } {
    const now = new Date()
    const daily = now.toISOString().split('T')[0] // YYYY-MM-DD
    const weekly = `${now.getFullYear()}-W${getWeekNumber(now)}` // YYYY-WXX
    const monthly = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
    const yearly = now.getFullYear().toString() // YYYY

    return { daily, weekly, monthly, yearly }
  },

  // 设置默认目标
  async setDefaultGoals(novelId: string): Promise<WritingGoal[]> {
    const periods = this.getCurrentPeriods()
    const defaultGoals = [
      { novelId, type: 'daily' as const, target: 1000, period: periods.daily },
      { novelId, type: 'weekly' as const, target: 7000, period: periods.weekly },
      { novelId, type: 'monthly' as const, target: 30000, period: periods.monthly }
    ]

    const createdGoals = await Promise.all(
      defaultGoals.map(goal => this.createOrUpdateGoal(goal))
    )

    return createdGoals
  }
}

// 工具函数：获取周数
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}