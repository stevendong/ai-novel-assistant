# 前端服务层实现 - AI模型管理和统计服务

## 📋 服务层架构

### 1. API服务基础类

创建 `src/services/base/apiClient.ts`:

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { message } from 'ant-design-vue'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamp?: string
}

class ApiClient {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // 请求拦截器 - 添加认证token
    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('sessionToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器 - 统一错误处理
    this.instance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const { data } = response

        // 处理业务层面的错误
        if (!data.success && data.error) {
          this.handleBusinessError(data.error)
          return Promise.reject(new Error(data.error.message))
        }

        return response
      },
      (error) => {
        this.handleHttpError(error)
        return Promise.reject(error)
      }
    )
  }

  private handleBusinessError(error: any) {
    const errorMessages: Record<string, string> = {
      'BUDGET_EXCEEDED': '预算已超出限制，请调整预算设置',
      'MODEL_UNAVAILABLE': '所选模型当前不可用，请选择其他模型',
      'INVALID_MODEL_ID': '无效的模型ID',
      'RATE_LIMIT_EXCEEDED': '请求过于频繁，请稍后再试',
      'TOKEN_LIMIT_EXCEEDED': '消息长度超出模型限制'
    }

    const userMessage = errorMessages[error.code] || error.message || '操作失败'
    message.error(userMessage)
  }

  private handleHttpError(error: any) {
    if (error.response?.status === 401) {
      // 认证失败，跳转到登录页
      localStorage.removeItem('sessionToken')
      window.location.href = '/login'
      return
    }

    if (error.response?.status === 402) {
      // 预算超出
      message.error('预算已超出限制')
      return
    }

    if (error.response?.status >= 500) {
      message.error('服务器错误，请稍后重试')
      return
    }

    message.error('网络错误，请检查网络连接')
  }

  // 通用HTTP方法
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.get<ApiResponse<T>>(url, config)
    return response.data
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post<ApiResponse<T>>(url, data, config)
    return response.data
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config)
    return response.data
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config)
    return response.data
  }

  // 文件下载
  async downloadFile(url: string, filename?: string): Promise<Blob> {
    const response = await this.instance.get(url, {
      responseType: 'blob'
    })

    // 如果提供了文件名，自动下载
    if (filename) {
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
    }

    return response.data
  }
}

export const apiClient = new ApiClient()
```

### 2. AI模型管理服务

创建 `src/services/aiModelService.ts`:

```typescript
import { apiClient, type ApiResponse } from './base/apiClient'

// 类型定义
export interface AIModel {
  id: string
  name: string
  provider: string
  displayName: string
  description: string
  maxTokens: number
  costPer1kTokensInput: number
  costPer1kTokensOutput: number
  recommendedFor: string[]
  isActive: boolean
  priority: number
  isRecommended?: boolean
  estimatedCost?: number
  averageRating?: number
  usageCount?: number
}

export interface ModelRecommendation {
  recommended: AIModel & {
    reason: string
    confidence: number
    estimatedCost: number
    estimatedResponseTime: number
    pros: string[]
    cons: string[]
  }
  alternatives: Array<AIModel & {
    reason: string
    confidence: number
    estimatedCost: number
  }>
  selectionFactors: {
    taskTypeMatch: number
    userPreference: number
    costEfficiency: number
    performance: number
  }
}

export interface UserAIPreference {
  defaultModelId?: string
  autoSelectModel: boolean
  budgetLimitMonthly: number
  budgetLimitDaily?: number
  warningThreshold: number
  taskModelMapping: Record<string, string>
  preferences: Record<string, any>
  notificationSettings: {
    budgetWarnings: boolean
    dailyUsageSummary: boolean
    modelRecommendations: boolean
  }
}

export interface GetModelsParams {
  taskType?: string
  includeInactive?: boolean
}

export interface RecommendModelParams {
  taskType: string
  contextLength?: number
  budgetConstraint?: number
  performancePriority?: 'cost' | 'quality' | 'speed'
  novelId?: string
  userHistory?: boolean
}

class AIModelService {
  // 获取可用模型列表
  async getAvailableModels(params?: GetModelsParams): Promise<ApiResponse<{
    models: AIModel[]
    userPreference: UserAIPreference & { budgetUsed: number; budgetUsageRate: number }
    recommendations: Array<{
      taskType: string
      modelId: string
      reason: string
      confidence: number
    }>
  }>> {
    const queryParams = new URLSearchParams()
    if (params?.taskType) queryParams.append('taskType', params.taskType)
    if (params?.includeInactive) queryParams.append('includeInactive', 'true')

    return await apiClient.get(`/api/ai/models?${queryParams.toString()}`)
  }

  // 智能模型推荐
  async recommendModel(params: RecommendModelParams): Promise<ApiResponse<ModelRecommendation>> {
    return await apiClient.post('/api/ai/models/recommend', params)
  }

  // 获取用户偏好设置
  async getUserPreference(): Promise<ApiResponse<UserAIPreference>> {
    return await apiClient.get('/api/ai/preferences')
  }

  // 更新用户偏好设置
  async updateUserPreference(preference: Partial<UserAIPreference>): Promise<ApiResponse<UserAIPreference>> {
    return await apiClient.put('/api/ai/preferences', preference)
  }

  // 测试模型连接
  async testModel(modelId: string): Promise<ApiResponse<{
    success: boolean
    provider: string
    model: string
    response: string
    usage: any
  }>> {
    return await apiClient.post('/api/ai/providers/test', {
      provider: 'auto', // 由后端根据modelId自动确定
      modelId
    })
  }

  // 获取模型详细信息
  async getModelDetails(modelId: string): Promise<ApiResponse<AIModel & {
    overallRating: {
      averageRating: number
      ratingCount: number
      distribution: Record<string, number>
    }
    taskTypeRatings: Record<string, { rating: number; count: number }>
    performanceMetrics: {
      averageResponseTime: number
      successRate: number
      costEfficiency: number
    }
  }>> {
    return await apiClient.get(`/api/ai/models/${modelId}/evaluation`)
  }

  // 提交模型评价
  async rateModel(modelId: string, rating: {
    taskType: string
    rating: number
    usageRecordId?: string
    feedback: {
      quality: number
      speed: number
      costValue: number
      accuracy: number
    }
    comments?: string
  }): Promise<ApiResponse<{
    message: string
    ratingId: string
    modelStats: {
      averageRating: number
      ratingCount: number
      yourRatings: number
    }
  }>> {
    return await apiClient.post(`/api/ai/models/${modelId}/rating`, rating)
  }
}

export const aiModelService = new AIModelService()
```

### 3. AI使用统计服务

创建 `src/services/aiUsageService.ts`:

```typescript
import { apiClient, type ApiResponse } from './base/apiClient'

// 类型定义
export interface UsageOverview {
  totalRequests: number
  totalTokens: number
  totalCost: number
  averageRequestCost: number
  averageResponseTime: number
}

export interface BudgetInfo {
  monthlyLimit: number
  currentUsage: number
  usageRate: number
  remainingBudget: number
  status: 'normal' | 'warning' | 'exceeded'
  daysRemaining: number
  projectedMonthlyUsage: number
  onTrackForBudget: boolean
}

export interface ModelUsage {
  modelId: string
  modelName: string
  displayName: string
  requestCount: number
  tokenCount: number
  cost: number
  usagePercentage: number
  averageRating: number
}

export interface TaskTypeUsage {
  requests: number
  cost: number
  percentage: number
}

export interface DailyUsage {
  date: string
  requests: number
  tokens: number
  cost: number
}

export interface UsageRecord {
  id: string
  createdAt: string
  taskType: string
  modelUsed: {
    id: string
    name: string
    displayName: string
  }
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    estimatedCost: number
  }
  performance: {
    duration: number
    success: boolean
  }
  context: {
    novelTitle?: string
    conversationTitle?: string
  }
}

export interface GetUsageOverviewParams {
  period?: 'day' | 'week' | 'month' | 'year'
  novelId?: string
  startDate?: string
  endDate?: string
}

export interface GetUsageRecordsParams {
  page?: number
  limit?: number
  modelId?: string
  taskType?: string
  novelId?: string
  startDate?: string
  endDate?: string
  success?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CostAnalysis {
  costTrend: Array<{
    date: string
    dailyCost: number
    cumulativeCost: number
    requestCount: number
  }>
  modelEfficiency: Array<{
    modelId: string
    modelName: string
    averageCostPerRequest: number
    averageResponseTime: number
    successRate: number
    userSatisfaction: number
    costEfficiencyScore: number
    recommendedUseCases: string[]
  }>
  comparison: {
    currentPeriod: {
      totalCost: number
      requestCount: number
      averageCostPerRequest: number
    }
    previousPeriod: {
      totalCost: number
      requestCount: number
      averageCostPerRequest: number
    }
    growth: {
      costGrowth: number
      requestGrowth: number
      efficiencyChange: number
    }
  }
  projections: {
    monthlyProjection: number
    budgetAdherence: 'on_track' | 'over_budget' | 'under_budget'
    recommendedBudgetAdjustment?: number
  }
  recommendations: Array<{
    type: string
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    potentialSaving: number
    implementationDifficulty: 'easy' | 'medium' | 'hard'
  }>
  insights: {
    mostCostlyTaskType: string
    mostEfficientModel: string
    peakUsageHours: string[]
    unusedBudgetPercentage: number
  }
}

class AIUsageService {
  // 获取使用统计概览
  async getUsageOverview(params?: GetUsageOverviewParams): Promise<ApiResponse<{
    overview: UsageOverview
    budget: BudgetInfo
    topModels: ModelUsage[]
    taskTypeBreakdown: Record<string, TaskTypeUsage>
    dailyUsage: DailyUsage[]
  }>> {
    const queryParams = new URLSearchParams()
    if (params?.period) queryParams.append('period', params.period)
    if (params?.novelId) queryParams.append('novelId', params.novelId)
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)

    return await apiClient.get(`/api/ai/usage/overview?${queryParams.toString()}`)
  }

  // 获取详细使用记录
  async getUsageRecords(params?: GetUsageRecordsParams): Promise<ApiResponse<{
    records: UsageRecord[]
    pagination: {
      currentPage: number
      totalPages: number
      totalRecords: number
      hasMore: boolean
    }
    filters: {
      appliedFilters: Record<string, any>
      availableFilters: {
        models: Array<{ id: string; displayName: string }>
        taskTypes: string[]
        novels: Array<{ id: string; title: string }>
      }
    }
    summary: {
      filteredRecords: number
      totalCost: number
      averageCost: number
    }
  }>> {
    const queryParams = new URLSearchParams()
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString())
      }
    })

    return await apiClient.get(`/api/ai/usage/records?${queryParams.toString()}`)
  }

  // 获取成本分析报告
  async getCostAnalysis(params?: {
    period?: 'month' | 'quarter' | 'year'
    compareWithPrevious?: boolean
    includeProjections?: boolean
  }): Promise<ApiResponse<CostAnalysis>> {
    const queryParams = new URLSearchParams()
    if (params?.period) queryParams.append('period', params.period)
    if (params?.compareWithPrevious) queryParams.append('compareWithPrevious', 'true')
    if (params?.includeProjections) queryParams.append('includeProjections', 'true')

    return await apiClient.get(`/api/ai/usage/cost-analysis?${queryParams.toString()}`)
  }

  // 导出使用报告
  async exportRecords(params?: {
    format?: 'csv' | 'json' | 'pdf'
    period?: string
    includeDetails?: boolean
    novelId?: string
    modelId?: string
    taskType?: string
  }): Promise<Blob> {
    const queryParams = new URLSearchParams()
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString())
      }
    })

    return await apiClient.downloadFile(`/api/ai/reports/export?${queryParams.toString()}`)
  }

  // 获取预算状态
  async getBudgetStatus(): Promise<ApiResponse<{
    monthlyBudget: BudgetInfo & {
      dailyAverageUsage: number
    }
    dailyBudget?: {
      limit: number
      used: number
      remaining: number
      usageRate: number
      status: 'normal' | 'warning' | 'exceeded'
    }
    alerts: Array<{
      type: string
      severity: 'info' | 'warning' | 'error'
      message: string
      threshold: number
      currentRate: number
      createdAt: string
      acknowledged: boolean
    }>
    recommendations: Array<{
      type: string
      title: string
      description: string
      potentialSaving: number
    }>
  }>> {
    return await apiClient.get('/api/ai/budget/status')
  }

  // 确认预算警告
  async acknowledgeBudgetAlert(alertId: string): Promise<ApiResponse<{
    message: string
    acknowledgedAt: string
  }>> {
    return await apiClient.post(`/api/ai/budget/alerts/${alertId}/acknowledge`)
  }
}

export const aiUsageService = new AIUsageService()
```

### 4. 增强的AI对话服务

创建 `src/services/enhancedAiChatService.ts`:

```typescript
import { apiClient, type ApiResponse } from './base/apiClient'

// 类型定义
export interface AIRequestOptions {
  temperature?: number
  maxTokens?: number
  estimateCostOnly?: boolean
}

export interface AIContext {
  previousMessages?: number
  includeProjectContext?: boolean
}

export interface ModelSelectionInfo {
  id: string
  name: string
  displayName: string
  selectionReason: 'user_specified' | 'auto_recommended' | 'fallback'
  actualCost: number
}

export interface AIUsageInfo {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostInput: number
  estimatedCostOutput: number
  estimatedCostTotal: number
}

export interface AIPerformanceInfo {
  responseTime: number
  requestId: string
}

export interface BudgetInfo {
  monthlyUsed: number
  monthlyLimit: number
  remainingBudget: number
  usageRate: number
}

export interface EnhancedAIResponse {
  content: string
  messageId: string
  conversationId: string
  usage: AIUsageInfo
  modelUsed: ModelSelectionInfo
  performance: AIPerformanceInfo
  suggestions: string[]
  budgetInfo: BudgetInfo
}

export interface StreamChunk {
  type: 'connected' | 'model_selected' | 'chunk' | 'usage' | 'finish' | 'done' | 'error'
  content?: string
  model?: ModelSelectionInfo
  usage?: Partial<AIUsageInfo>
  finalUsage?: AIUsageInfo
  reason?: string
  message?: string
}

export type StreamHandler = (chunk: StreamChunk) => void

class EnhancedAIChatService {
  // 增强的AI对话
  async chat(params: {
    novelId?: string
    conversationId?: string
    message: string
    type: string
    modelId?: string
    autoSelectModel?: boolean
    context?: AIContext
    options?: AIRequestOptions
  }): Promise<ApiResponse<EnhancedAIResponse>> {
    return await apiClient.post('/api/ai/chat', params)
  }

  // 流式AI对话
  async chatStream(
    params: {
      novelId?: string
      conversationId?: string
      message: string
      type: string
      modelId?: string
      autoSelectModel?: boolean
      context?: AIContext
      options?: AIRequestOptions
    },
    onStream: StreamHandler
  ): Promise<void> {
    try {
      const token = localStorage.getItem('sessionToken')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/ai/chat/stream`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(params)
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('sessionToken')
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

              if (data.type === 'done' || data.type === 'error') {
                return
              }
            } catch (error) {
              console.error('Failed to parse SSE data:', error)
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error)
      onStream({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown streaming error'
      })
    }
  }

  // 估算请求成本
  async estimateCost(params: {
    modelId: string
    message: string
    type: string
    contextLength?: number
  }): Promise<ApiResponse<{
    estimatedTokens: number
    estimatedCost: number
    breakdown: {
      inputTokens: number
      outputTokens: number
      inputCost: number
      outputCost: number
    }
  }>> {
    return await apiClient.post('/api/ai/estimate-cost', params)
  }

  // 获取对话历史
  async getConversationHistory(conversationId: string, options?: {
    limit?: number
    before?: string
    includeUsage?: boolean
  }): Promise<ApiResponse<{
    messages: Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      createdAt: string
      usage?: AIUsageInfo
      modelUsed?: ModelSelectionInfo
    }>
    totalCount: number
    hasMore: boolean
  }>> {
    const queryParams = new URLSearchParams()
    if (options?.limit) queryParams.append('limit', options.limit.toString())
    if (options?.before) queryParams.append('before', options.before)
    if (options?.includeUsage) queryParams.append('includeUsage', 'true')

    return await apiClient.get(`/api/ai/conversations/${conversationId}/messages?${queryParams.toString()}`)
  }
}

export const enhancedAIChatService = new EnhancedAIChatService()
```

### 5. 组合服务 - AI管理中心

创建 `src/services/aiManagementService.ts`:

```typescript
import { reactive, ref, computed } from 'vue'
import { aiModelService, type AIModel, type UserAIPreference } from './aiModelService'
import { aiUsageService, type UsageOverview, type BudgetInfo } from './aiUsageService'
import { enhancedAIChatService } from './enhancedAiChatService'

// 全局AI管理状态
class AIManagementService {
  // 响应式状态
  public state = reactive({
    // 模型相关
    availableModels: [] as AIModel[],
    selectedModel: null as AIModel | null,
    autoSelectModel: true,
    userPreference: null as UserAIPreference | null,

    // 统计相关
    usageOverview: null as UsageOverview | null,
    budgetInfo: null as BudgetInfo | null,

    // 加载状态
    loading: {
      models: false,
      usage: false,
      chat: false
    },

    // 缓存状态
    lastUpdated: {
      models: null as Date | null,
      usage: null as Date | null
    }
  })

  // 计算属性
  public readonly recommendedModels = computed(() =>
    this.state.availableModels.filter(model => model.isRecommended)
  )

  public readonly budgetStatus = computed(() => {
    if (!this.state.budgetInfo) return 'unknown'
    if (this.state.budgetInfo.usageRate >= 1.0) return 'exceeded'
    if (this.state.budgetInfo.usageRate >= 0.8) return 'warning'
    return 'normal'
  })

  public readonly isBudgetCritical = computed(() =>
    this.budgetStatus.value === 'exceeded' || this.budgetStatus.value === 'warning'
  )

  // 初始化
  async initialize(): Promise<void> {
    await Promise.all([
      this.loadModels(),
      this.loadUsageOverview()
    ])
  }

  // 加载可用模型
  async loadModels(taskType?: string, forceReload = false): Promise<void> {
    if (!forceReload && this.state.lastUpdated.models &&
        Date.now() - this.state.lastUpdated.models.getTime() < 5 * 60 * 1000) {
      return // 5分钟内不重复加载
    }

    this.state.loading.models = true
    try {
      const response = await aiModelService.getAvailableModels({ taskType })
      this.state.availableModels = response.data!.models
      this.state.userPreference = response.data!.userPreference
      this.state.autoSelectModel = response.data!.userPreference.autoSelectModel
      this.state.lastUpdated.models = new Date()

      // 设置默认选中的模型
      if (!this.state.selectedModel && this.recommendedModels.value.length > 0) {
        this.state.selectedModel = this.recommendedModels.value[0]
      }
    } catch (error) {
      console.error('加载模型列表失败:', error)
    } finally {
      this.state.loading.models = false
    }
  }

  // 加载使用概览
  async loadUsageOverview(forceReload = false): Promise<void> {
    if (!forceReload && this.state.lastUpdated.usage &&
        Date.now() - this.state.lastUpdated.usage.getTime() < 2 * 60 * 1000) {
      return // 2分钟内不重复加载
    }

    this.state.loading.usage = true
    try {
      const response = await aiUsageService.getUsageOverview({ period: 'month' })
      this.state.usageOverview = response.data!.overview
      this.state.budgetInfo = response.data!.budget
      this.state.lastUpdated.usage = new Date()
    } catch (error) {
      console.error('加载使用概览失败:', error)
    } finally {
      this.state.loading.usage = false
    }
  }

  // 智能推荐模型
  async recommendModel(taskType: string, contextLength?: number): Promise<AIModel | null> {
    try {
      const response = await aiModelService.recommendModel({
        taskType,
        contextLength,
        userHistory: true
      })

      const recommendedModelId = response.data!.recommended.modelId
      const model = this.state.availableModels.find(m => m.id === recommendedModelId)

      if (model && this.state.autoSelectModel) {
        this.state.selectedModel = model
      }

      return model || null
    } catch (error) {
      console.error('模型推荐失败:', error)
      return null
    }
  }

  // 选择模型
  selectModel(modelId: string): void {
    const model = this.state.availableModels.find(m => m.id === modelId)
    if (model) {
      this.state.selectedModel = model
    }
  }

  // 切换自动选择模式
  async toggleAutoSelect(enabled: boolean): Promise<void> {
    this.state.autoSelectModel = enabled

    try {
      await aiModelService.updateUserPreference({
        autoSelectModel: enabled
      })
    } catch (error) {
      console.error('更新偏好设置失败:', error)
      // 回滚状态
      this.state.autoSelectModel = !enabled
    }
  }

  // 更新预算设置
  async updateBudget(monthlyLimit: number): Promise<void> {
    try {
      await aiModelService.updateUserPreference({
        budgetLimitMonthly: monthlyLimit
      })

      // 刷新使用概览
      await this.loadUsageOverview(true)
    } catch (error) {
      console.error('更新预算设置失败:', error)
      throw error
    }
  }

  // 发送AI请求（带自动模型选择）
  async sendMessage(params: {
    message: string
    type: string
    novelId?: string
    conversationId?: string
    context?: any
    options?: any
  }): Promise<any> {
    // 如果启用自动选择且没有指定模型，进行推荐
    if (this.state.autoSelectModel && !params.options?.modelId) {
      await this.recommendModel(params.type, params.message.length)
    }

    const requestParams = {
      ...params,
      modelId: this.state.selectedModel?.id,
      autoSelectModel: this.state.autoSelectModel
    }

    this.state.loading.chat = true
    try {
      const response = await enhancedAIChatService.chat(requestParams)

      // 更新使用统计（异步）
      setTimeout(() => this.loadUsageOverview(true), 1000)

      return response
    } finally {
      this.state.loading.chat = false
    }
  }

  // 发送流式请求
  async sendMessageStream(
    params: {
      message: string
      type: string
      novelId?: string
      conversationId?: string
      context?: any
      options?: any
    },
    onStream: (chunk: any) => void
  ): Promise<void> {
    // 自动模型选择逻辑
    if (this.state.autoSelectModel && !params.options?.modelId) {
      await this.recommendModel(params.type, params.message.length)
    }

    const requestParams = {
      ...params,
      modelId: this.state.selectedModel?.id,
      autoSelectModel: this.state.autoSelectModel
    }

    this.state.loading.chat = true
    try {
      await enhancedAIChatService.chatStream(requestParams, (chunk) => {
        onStream(chunk)

        // 当流结束时更新统计
        if (chunk.type === 'done') {
          setTimeout(() => this.loadUsageOverview(true), 1000)
        }
      })
    } finally {
      this.state.loading.chat = false
    }
  }

  // 获取当前模型信息
  getCurrentModelInfo(): AIModel | null {
    return this.state.selectedModel
  }

  // 检查是否需要预算警告
  shouldShowBudgetWarning(): boolean {
    return this.isBudgetCritical.value
  }

  // 获取预算警告信息
  getBudgetWarningInfo(): { message: string; type: 'warning' | 'error' } | null {
    if (!this.state.budgetInfo) return null

    if (this.state.budgetInfo.usageRate >= 1.0) {
      return {
        type: 'error',
        message: `本月预算已超出 ${Math.round((this.state.budgetInfo.usageRate - 1) * 100)}%`
      }
    }

    if (this.state.budgetInfo.usageRate >= 0.8) {
      return {
        type: 'warning',
        message: `本月已使用 ${Math.round(this.state.budgetInfo.usageRate * 100)}% 的预算`
      }
    }

    return null
  }

  // 刷新所有数据
  async refresh(): Promise<void> {
    await Promise.all([
      this.loadModels(undefined, true),
      this.loadUsageOverview(true)
    ])
  }
}

// 导出单例实例
export const aiManagementService = new AIManagementService()

// 自动初始化（可选）
if (typeof window !== 'undefined') {
  // 在浏览器环境中自动初始化
  aiManagementService.initialize().catch(console.error)
}
```

## 🎯 使用示例

### 在组件中使用AI管理服务

```vue
<template>
  <div class="ai-management-example">
    <!-- 模型选择器 -->
    <ModelSelector
      v-model:selected-model="selectedModelId"
      v-model:auto-select="autoSelect"
      :task-type="currentTaskType"
    />

    <!-- 预算警告 -->
    <a-alert
      v-if="budgetWarning"
      :type="budgetWarning.type"
      :message="budgetWarning.message"
      show-icon
      closable
    />

    <!-- AI对话 -->
    <div class="chat-area">
      <!-- 消息列表 -->
      <div class="messages">
        <div v-for="msg in messages" :key="msg.id" class="message">
          {{ msg.content }}
        </div>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <a-input
          v-model:value="inputMessage"
          placeholder="输入消息..."
          @press-enter="sendMessage"
        />
        <a-button @click="sendMessage" :loading="aiManagement.state.loading.chat">
          发送
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { aiManagementService } from '@/services/aiManagementService'
import ModelSelector from '@/components/ai/ModelSelector.vue'

// 响应式数据
const selectedModelId = ref('')
const autoSelect = ref(true)
const currentTaskType = ref('chat')
const inputMessage = ref('')
const messages = ref([])

// 使用AI管理服务
const aiManagement = aiManagementService

// 计算属性
const budgetWarning = computed(() => aiManagement.getBudgetWarningInfo())

// 方法
const sendMessage = async () => {
  if (!inputMessage.value.trim()) return

  const userMessage = inputMessage.value
  inputMessage.value = ''

  // 添加用户消息
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: userMessage
  })

  try {
    // 发送AI请求
    const response = await aiManagement.sendMessage({
      message: userMessage,
      type: currentTaskType.value
    })

    // 添加AI回复
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: response.data.content
    })
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

// 生命周期
onMounted(async () => {
  await aiManagement.initialize()
  selectedModelId.value = aiManagement.state.selectedModel?.id || ''
})
</script>
```

这个完整的前端服务层提供了：

1. **统一的API客户端** - 处理认证、错误、拦截器
2. **专业的服务模块** - 模型管理、使用统计、增强对话
3. **全局状态管理** - 响应式的AI系统状态
4. **自动化功能** - 智能推荐、预算监控、缓存优化
5. **完整的TypeScript支持** - 类型安全和开发体验

通过这个服务层，前端组件可以轻松集成AI模型切换和统计功能，同时享受优秀的开发体验和用户体验。