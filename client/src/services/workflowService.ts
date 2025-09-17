import type { StatusTransition, StatusHistory, WorkflowConfig } from '@/types'
import { api, type ApiResponse } from '@/utils/api'

const API_BASE = '/api'

export interface TransitionResult {
  success: boolean
  fromStatus: string
  toStatus: string
}

export interface CanTransitionResult {
  canTransition: boolean
  reason?: string
}

export interface BatchAdvanceResult {
  totalProcessed: number
  successful: number
  failed: number
  details: Array<{
    chapterId: string
    success: boolean
    result?: TransitionResult
    error?: string
  }>
}

export interface AutoAdvanceResult {
  totalTransitions: number
  successful: number
  failed: number
  details: Array<{
    chapterId?: string
    novelId?: string
    transition: string
    success: boolean
    result?: TransitionResult
    error?: string
  }>
}

class WorkflowService {
  // 获取可用的状态流转选项
  async getAvailableTransitions(entityType: 'novel' | 'chapter', entityId: string): Promise<StatusTransition[]> {
    const response = await api.get(`${API_BASE}/workflow/${entityType}/${entityId}/transitions`)
    return response.data
  }

  // 执行状态流转
  async transitionStatus(
    entityType: 'novel' | 'chapter',
    entityId: string,
    toStatus: string,
    reason?: string,
    triggeredBy: 'user' | 'manual' = 'user'
  ): Promise<TransitionResult> {
    const response = await api.post(`${API_BASE}/workflow/${entityType}/${entityId}/transition`, { toStatus, reason, triggeredBy })

    return response.data
  }

  // 检查是否可以流转到指定状态
  async canTransition(
    entityType: 'novel' | 'chapter',
    entityId: string,
    toStatus: string
  ): Promise<CanTransitionResult> {
    const response = await api.get(`${API_BASE}/workflow/${entityType}/${entityId}/can-transition/${toStatus}`)
    return response.data
  }

  // 获取状态变更历史
  async getStatusHistory(
    entityType: 'novel' | 'chapter',
    entityId: string,
    limit: number = 10
  ): Promise<StatusHistory[]> {
    const response = await api.get(`${API_BASE}/workflow/${entityType}/${entityId}/history?limit=${limit}`)
    return response.data
  }

  // 获取工作流配置
  async getWorkflowConfig(novelId: string, entityType: 'novel' | 'chapter'): Promise<WorkflowConfig> {
    const response = await api.get(`${API_BASE}/workflow/config/${novelId}/${entityType}`)
    return response.data
  }

  // 批量推进状态
  async batchAdvanceStatus(
    novelId: string,
    fromStatus: string,
    toStatus: string
  ): Promise<BatchAdvanceResult> {
    const response = await api.post(`${API_BASE}/workflow/novels/${novelId}/chapters/batch-advance`, { fromStatus, toStatus })

    return response.data
  }

  // 自动推进所有可以自动流转的状态
  async autoAdvance(novelId: string): Promise<AutoAdvanceResult> {
    const response = await api.post(`${API_BASE}/workflow/novels/${novelId}/auto-advance`)

    return response.data
  }

  // 获取状态显示文本
  getStatusText(status: string, entityType: 'novel' | 'chapter'): string {
    if (entityType === 'novel') {
      const texts = {
        'concept': '概念阶段',
        'draft': '草稿阶段',
        'planning': '规划阶段',
        'writing': '写作阶段',
        'editing': '编辑阶段',
        'completed': '已完成',
        'published': '已发布'
      }
      return texts[status as keyof typeof texts] || status
    } else {
      const texts = {
        'planning': '规划中',
        'outlined': '大纲完成',
        'writing': '写作中',
        'reviewing': '审核中',
        'editing': '编辑中',
        'completed': '已完成'
      }
      return texts[status as keyof typeof texts] || status
    }
  }

  // 获取状态颜色
  getStatusColor(status: string, entityType: 'novel' | 'chapter'): string {
    if (entityType === 'novel') {
      const colors = {
        'concept': 'default',
        'draft': 'default',
        'planning': 'processing',
        'writing': 'processing',
        'editing': 'warning',
        'completed': 'success',
        'published': 'success'
      }
      return colors[status as keyof typeof colors] || 'default'
    } else {
      const colors = {
        'planning': 'default',
        'outlined': 'processing',
        'writing': 'processing',
        'reviewing': 'warning',
        'editing': 'warning',
        'completed': 'success'
      }
      return colors[status as keyof typeof colors] || 'default'
    }
  }

  // 获取状态对应的步骤索引（用于进度条显示）
  getStatusStep(status: string, entityType: 'novel' | 'chapter'): number {
    if (entityType === 'novel') {
      const steps = ['concept', 'draft', 'planning', 'writing', 'editing', 'completed', 'published']
      return steps.indexOf(status)
    } else {
      const steps = ['planning', 'outlined', 'writing', 'reviewing', 'editing', 'completed']
      return steps.indexOf(status)
    }
  }

  // 获取所有可用状态列表
  getAllStatuses(entityType: 'novel' | 'chapter'): Array<{ value: string; label: string }> {
    if (entityType === 'novel') {
      return [
        { value: 'concept', label: '概念阶段' },
        { value: 'draft', label: '草稿阶段' },
        { value: 'planning', label: '规划阶段' },
        { value: 'writing', label: '写作阶段' },
        { value: 'editing', label: '编辑阶段' },
        { value: 'completed', label: '已完成' },
        { value: 'published', label: '已发布' }
      ]
    } else {
      return [
        { value: 'planning', label: '规划中' },
        { value: 'outlined', label: '大纲完成' },
        { value: 'writing', label: '写作中' },
        { value: 'reviewing', label: '审核中' },
        { value: 'editing', label: '编辑中' },
        { value: 'completed', label: '已完成' }
      ]
    }
  }
}

export const workflowService = new WorkflowService()