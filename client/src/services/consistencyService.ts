import type { ConsistencyCheck } from '@/types'
import { api, type ApiResponse } from '@/utils/api'

interface ConsistencyStats {
  totalIssues: number
  highSeverity: number
  mediumSeverity: number
  lowSeverity: number
  resolvedIssues: number
  unresolvedIssues: number
  typeDistribution: {
    character: number
    setting: number
    timeline: number
    logic: number
  }
}

interface ConsistencyOverview {
  stats: ConsistencyStats
  chapterIssues: Array<{
    chapterId: string
    chapterNumber: number
    title: string
    issueCount: number
    highestSeverity: 'low' | 'medium' | 'high'
  }>
}

interface CheckResult {
  success: boolean
  issuesFound: number
  issues: ConsistencyCheck[]
}

interface BatchCheckResult {
  success: boolean
  checkedChapters: number
  totalIssuesFound: number
  results: Array<{
    chapterId: string
    issuesFound: number
    issues: ConsistencyCheck[]
  }>
}

interface IssueContext {
  relatedCharacters: any[]
  relatedSettings: any[]
  relatedChapters: any[]
}

export class ConsistencyService {
  private baseURL = '/api/consistency'

  // 获取章节的一致性检查结果
  async getChapterIssues(
    chapterId: string,
    filters?: {
      type?: 'character' | 'setting' | 'timeline' | 'logic'
      severity?: 'low' | 'medium' | 'high'
      resolved?: boolean
    }
  ): Promise<ConsistencyCheck[]> {
    const params = new URLSearchParams()
    if (filters?.type) params.append('type', filters.type)
    if (filters?.severity) params.append('severity', filters.severity)
    if (filters?.resolved !== undefined) params.append('resolved', filters.resolved.toString())

    const response = await api.get(
      `${this.baseURL}/chapters/${chapterId}?${params.toString()}`
    )

    return response.data
  }

  // 获取小说的一致性检查概览
  async getNovelOverview(novelId: string): Promise<ConsistencyOverview> {
    const response = await api.get(`${this.baseURL}/novels/${novelId}/overview`)

    return response.data
  }

  // 执行单个章节的一致性检查
  async checkChapter(
    chapterId: string,
    types: Array<'character' | 'setting' | 'timeline' | 'logic'> = [
      'character', 'setting', 'timeline', 'logic'
    ]
  ): Promise<CheckResult> {
    const response = await api.post(`${this.baseURL}/chapters/${chapterId}/check`, { types })

    return response.data
  }

  // 批量检查多个章节
  async batchCheck(
    novelId: string,
    options?: {
      chapterIds?: string[]
      types?: Array<'character' | 'setting' | 'timeline' | 'logic'>
    }
  ): Promise<BatchCheckResult> {
    const response = await api.post(`${this.baseURL}/novels/${novelId}/batch-check`, {
      chapterIds: options?.chapterIds,
      types: options?.types || ['character', 'setting', 'timeline', 'logic']
    })

    return response.data
  }

  // 标记问题为已解决
  async resolveIssue(issueId: string, resolved: boolean = true): Promise<ConsistencyCheck> {
    const response = await api.patch(`${this.baseURL}/issues/${issueId}/resolve`, { resolved })

    return response.data
  }

  // 批量标记问题为已解决
  async batchResolveIssues(issueIds: string[], resolved: boolean = true): Promise<{ success: boolean; updatedCount: number }> {
    const response = await api.patch(`${this.baseURL}/issues/batch-resolve`, { issueIds, resolved })

    return response.data
  }

  // 删除一致性检查问题
  async deleteIssue(issueId: string): Promise<void> {
    await api.delete(`${this.baseURL}/issues/${issueId}`)
  }

  // 获取问题详情和相关上下文
  async getIssueDetails(issueId: string): Promise<{ issue: ConsistencyCheck; context: IssueContext }> {
    const response = await api.get(`${this.baseURL}/issues/${issueId}/details`)

    return response.data
  }

  // 获取严重程度对应的颜色
  getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
    const colors = {
      high: '#ff4d4f',    // 红色
      medium: '#fa8c16',  // 橙色
      low: '#fadb14'      // 黄色
    }
    return colors[severity]
  }

  // 获取严重程度对应的图标
  getSeverityIcon(severity: 'low' | 'medium' | 'high'): string {
    const icons = {
      high: '🔴',
      medium: '🟠', 
      low: '🟡'
    }
    return icons[severity]
  }

  // 获取类型对应的图标
  getTypeIcon(type: 'character' | 'setting' | 'timeline' | 'logic'): string {
    const icons = {
      character: '👤',
      setting: '🌍',
      timeline: '⏰',
      logic: '🧠'
    }
    return icons[type]
  }

  // 获取类型对应的标签
  getTypeLabel(type: 'character' | 'setting' | 'timeline' | 'logic'): string {
    const labels = {
      character: '角色一致性',
      setting: '设定一致性',
      timeline: '时间线一致性',
      logic: '逻辑一致性'
    }
    return labels[type]
  }

  // 获取严重程度标签
  getSeverityLabel(severity: 'low' | 'medium' | 'high'): string {
    const labels = {
      high: '严重',
      medium: '中等',
      low: '轻微'
    }
    return labels[severity]
  }

  // 计算一致性健康度评分
  calculateHealthScore(issues: ConsistencyCheck[]): number {
    let score = 100
    const unresolvedIssues = issues.filter(issue => !issue.resolved)
    
    unresolvedIssues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 20
          break
        case 'medium':
          score -= 10
          break
        case 'low':
          score -= 5
          break
      }
    })
    
    return Math.max(0, score)
  }

  // 获取健康度等级
  getHealthGrade(score: number): { grade: string; color: string } {
    if (score >= 90) return { grade: 'A+', color: '#52c41a' }
    if (score >= 80) return { grade: 'A', color: '#73d13d' }
    if (score >= 70) return { grade: 'B', color: '#fadb14' }
    if (score >= 60) return { grade: 'C', color: '#fa8c16' }
    return { grade: 'D', color: '#ff4d4f' }
  }

  // 获取问题摘要文本
  getIssueSummary(issues: ConsistencyCheck[]): string {
    const unresolvedIssues = issues.filter(issue => !issue.resolved)
    if (unresolvedIssues.length === 0) return '无问题'
    
    const counts = {
      high: unresolvedIssues.filter(i => i.severity === 'high').length,
      medium: unresolvedIssues.filter(i => i.severity === 'medium').length,
      low: unresolvedIssues.filter(i => i.severity === 'low').length
    }
    
    const parts = []
    if (counts.high > 0) parts.push(`${counts.high}个严重`)
    if (counts.medium > 0) parts.push(`${counts.medium}个中等`)
    if (counts.low > 0) parts.push(`${counts.low}个轻微`)
    
    return parts.join('，') + '问题'
  }
}

export const consistencyService = new ConsistencyService()