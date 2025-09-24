import { apiClient } from '@/utils/api'

export class AIModelService {
  // 获取所有可用AI模型
  async getModels() {
    return apiClient.get('/api/ai/models')
  }

  // 根据任务类型推荐模型
  async recommendModel(taskType: string) {
    return apiClient.post('/api/ai/models/recommend', { taskType })
  }

  // 估算成本
  async estimateCost(modelId: string, inputTokens: number, outputTokens: number) {
    return apiClient.post(`/api/ai/models/${modelId}/estimate-cost`, {
      inputTokens,
      outputTokens
    })
  }

  // 验证模型可用性
  async validateModel(modelId: string) {
    return apiClient.get(`/api/ai/models/${modelId}/validate`)
  }

  // 获取用户AI偏好设置
  async getUserPreferences() {
    return apiClient.get('/api/ai/preferences')
  }

  // 更新用户AI偏好设置
  async updateUserPreferences(preferences: any) {
    return apiClient.put('/api/ai/preferences', preferences)
  }

  // 获取预算状态
  async getBudgetStatus(period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
    return apiClient.get(`/api/ai/budget/status?period=${period}`)
  }

  // 获取使用统计
  async getUsageStatistics(period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
    return apiClient.get(`/api/ai/usage/statistics?period=${period}`)
  }
}

export const aiModelService = new AIModelService()