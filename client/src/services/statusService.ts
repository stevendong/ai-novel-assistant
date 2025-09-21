import { apiClient } from '@/utils/api'

export interface TodayStats {
  wordCount: number
  timeSpent: number
}

export interface ProjectStats {
  novel: {
    id: string
    title: string
    status: string
    wordCount: number
    targetWordCount?: number
  }
  chapters: {
    total: number
    completed: number
    writing: number
    planning: number
  }
  counts: {
    characters: number
    settings: number
  }
}

export interface WritingGoals {
  daily: {
    target: number
    achieved: number
    progress: number
  }
  weekly: {
    target: number
    achieved: number
    progress: number
  }
  monthly: {
    target: number
    achieved: number
    progress: number
  }
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  database?: {
    status: string
    latency: number
  }
  uptime?: number
  memory?: any
  version?: string
  error?: string
}

export interface AIStatus {
  connected: boolean
  model?: string
  usage?: {
    requests: number
    tokens: number
  }
  error?: string
}

class StatusService {
  // 获取今日写作统计
  async getTodayStats(novelId: string): Promise<TodayStats> {
    const response = await apiClient.get(`/api/novels/${novelId}/today-stats`)
    return response.data
  }

  // 获取项目统计
  async getProjectStats(novelId: string): Promise<ProjectStats> {
    const response = await apiClient.get(`/api/novels/${novelId}/stats`)
    return response.data
  }

  // 获取写作目标
  async getWritingGoals(novelId: string): Promise<WritingGoals> {
    const response = await apiClient.get(`/api/novels/${novelId}/goals`)
    return response.data
  }

  // 记录写作活动
  async recordWritingActivity(novelId: string, wordCount: number, timeSpent?: number): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/api/novels/${novelId}/activity`, {
      wordCount,
      timeSpent
    })
    return response.data
  }

  // 获取最近活动
  async getRecentActivity(novelId: string, days: number = 7): Promise<any[]> {
    const response = await apiClient.get(`/api/novels/${novelId}/recent-activity?days=${days}`)
    return response.data
  }

  // 系统健康检查
  async getSystemHealth(): Promise<SystemHealth> {
    const response = await apiClient.get('/api/health')
    return response.data
  }

  // AI服务状态
  async getAIStatus(): Promise<AIStatus> {
    const response = await apiClient.get('/api/ai/status')
    return response.data
  }

  // 格式化数字显示
  formatNumber(num: number): string {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`
    }
    return num.toLocaleString()
  }

  // 格式化字数
  formatWordCount(count: number): string {
    return this.formatNumber(count)
  }

  // 格式化时间
  formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}分钟`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) {
      return `${hours}小时`
    }
    return `${hours}小时${remainingMinutes}分钟`
  }

  // 格式化日期时间
  formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) {
      return '刚刚'
    } else if (minutes < 60) {
      return `${minutes}分钟前`
    } else if (hours < 24) {
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return d.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  // 计算网络延迟等级
  getLatencyLevel(latency: number): 'good' | 'moderate' | 'poor' {
    if (latency < 200) return 'good'
    if (latency < 500) return 'moderate'
    return 'poor'
  }

  // 获取性能状态文本
  getPerformanceText(latency: number): string {
    const level = this.getLatencyLevel(latency)
    switch (level) {
      case 'good': return '良好'
      case 'moderate': return '一般'
      case 'poor': return '较慢'
    }
  }
}

export const statusService = new StatusService()