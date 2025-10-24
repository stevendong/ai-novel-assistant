import { api } from '@/utils/api'

/**
 * 批量章节生成模式
 */
export type BatchGenerationMode = 'continue' | 'insert' | 'branch' | 'expand'

/**
 * 批次状态
 */
export type BatchStatus = 'pending' | 'analyzing' | 'generating' | 'completed' | 'failed'

/**
 * 生成章节状态
 */
export type GeneratedChapterStatus = 'draft' | 'approved' | 'rejected' | 'applied'

/**
 * 批量生成参数
 */
export interface BatchGenerationParams {
  novelId: string
  batchName: string
  mode: BatchGenerationMode
  totalChapters: number
  startPosition?: number
  parameters?: {
    targetWordsPerChapter?: number
    focusAreas?: string[]
    [key: string]: any
  }
}

/**
 * 小说上下文分析结果
 */
export interface NovelContextAnalysis {
  novel: {
    id: string
    title: string
    genre: string
    status: string
    wordCount: number
    chapterCount: number
  }
  analysis: {
    currentStage: string
    mainConflicts: string[]
    characterDevelopment: Record<string, string>
    worldElements: string[]
    writingStyle: {
      chapterStructure: string
      pacing: string
      tone: string
    }
    potentialDirections: string[]
    rawAnalysis?: string
  }
  characters: Array<{
    id: string
    name: string
    role: string
    description: string
  }>
  settings: Array<{
    id: string
    name: string
    type: string
    description: string
  }>
  recentChapters: Array<{
    number: number
    title: string
    outline: string
    wordCount: number
  }>
}

/**
 * 生成的章节数据
 */
export interface GeneratedChapter {
  id: string
  batchId: string
  chapterNumber: number
  title: string
  outline: string
  plotPoints: string[]
  characters: string[]
  settings: string[]
  estimatedWords: number
  priority: number
  dependencies: string[]
  aiConfidence: number
  status: GeneratedChapterStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

/**
 * 批次信息
 */
export interface BatchGeneration {
  id: string
  novelId: string
  userId: string
  batchName: string
  mode: BatchGenerationMode
  parameters: string
  status: BatchStatus
  progress: number
  totalChapters: number
  completedChapters: number
  startPosition?: number
  analysisResult?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
  novel?: {
    title: string
    id: string
  }
  generatedChapters?: GeneratedChapter[]
}

/**
 * 批次预览数据
 */
export interface BatchPreview {
  batchInfo: {
    id: string
    name: string
    mode: BatchGenerationMode
    status: BatchStatus
    progress: number
    totalChapters: number
    completedChapters: number
  }
  chapters: Array<{
    id: string
    chapterNumber: number
    title: string
    outline: string
    plotPoints: string[]
    characters: string[]
    settings: string[]
    estimatedWords: number
    priority: number
    aiConfidence: number
    status: GeneratedChapterStatus
    notes?: string
  }>
}

/**
 * 批量章节服务
 */
class BatchChapterService {
  /**
   * 分析小说上下文
   */
  async analyzeNovelContext(novelId: string): Promise<NovelContextAnalysis> {
    const response = await api.get(`/api/chapters/batch/${novelId}/analyze`)
    return response.data.data
  }

  /**
   * 创建批量生成任务
   */
  async createBatchGeneration(params: BatchGenerationParams): Promise<{ batchId: string }> {
    const response = await api.post('/api/chapters/batch/generate', params)
    return response.data.data
  }

  /**
   * 获取批次列表
   */
  async getBatchList(novelId?: string): Promise<BatchGeneration[]> {
    const params = novelId ? { novelId } : {}
    const response = await api.get('/api/chapters/batch/list', { params })
    return response.data.data
  }

  /**
   * 获取批次详情
   */
  async getBatchDetails(batchId: string): Promise<BatchGeneration> {
    const response = await api.get(`/api/chapters/batch/${batchId}`)
    return response.data.data
  }

  /**
   * 获取批次预览
   */
  async getBatchPreview(batchId: string): Promise<BatchPreview> {
    const response = await api.get(`/api/chapters/batch/${batchId}/preview`)
    return response.data.data
  }

  /**
   * 应用生成的章节
   */
  async applyGeneratedChapters(
    batchId: string,
    selectedChapterIds: string[]
  ): Promise<{
    createdChapters: number
    chapters: Array<{ id: string; chapterNumber: number; title: string }>
  }> {
    const response = await api.post(`/api/chapters/batch/${batchId}/apply`, {
      selectedChapterIds
    })
    return response.data.data
  }

  /**
   * 更新生成章节
   */
  async updateGeneratedChapter(
    chapterId: string,
    updates: {
      title?: string
      outline?: string
      notes?: string
      status?: GeneratedChapterStatus
    }
  ): Promise<GeneratedChapter> {
    const response = await api.put(`/api/chapters/batch/generated/${chapterId}`, updates)
    return response.data.data
  }

  /**
   * 重新生成单个章节
   */
  async regenerateChapter(chapterId: string, customPrompt?: string): Promise<void> {
    await api.post(`/api/chapters/batch/generated/${chapterId}/regenerate`, {
      customPrompt
    })
  }

  /**
   * 删除批次
   */
  async deleteBatch(batchId: string): Promise<void> {
    await api.delete(`/api/chapters/batch/${batchId}`)
  }

  /**
   * 获取生成进度
   */
  async getBatchProgress(batchId: string): Promise<{
    id: string
    batchName: string
    status: BatchStatus
    progress: number
    totalChapters: number
    completedChapters: number
    errorMessage?: string
    updatedAt: string
  }> {
    const response = await api.get(`/api/chapters/batch/${batchId}/progress`)
    return response.data.data
  }

  /**
   * 获取批量生成统计
   */
  async getBatchStats(): Promise<{
    totalBatches: number
    totalPlannedChapters: number
    totalCompletedChapters: number
    statusBreakdown: Record<BatchStatus, number>
  }> {
    const response = await api.get('/api/chapters/batch/stats')
    return response.data.data
  }

  /**
   * 轮询批次进度（用于实时更新）
   */
  async pollBatchProgress(
    batchId: string,
    onProgress: (progress: any) => void,
    interval = 2000,
    maxAttempts = 150 // 最多5分钟
  ): Promise<void> {
    let attempts = 0

    const poll = async () => {
      if (attempts >= maxAttempts) {
        console.warn('批次进度轮询超时')
        return
      }

      try {
        const progress = await this.getBatchProgress(batchId)
        onProgress(progress)

        attempts++

        // 如果任务完成或失败，停止轮询
        if (progress.status === 'completed' || progress.status === 'failed') {
          return
        }

        // 继续轮询
        setTimeout(poll, interval)
      } catch (error) {
        console.error('获取批次进度失败:', error)
        // 出错时继续轮询
        setTimeout(poll, interval)
      }
    }

    await poll()
  }
}

export const batchChapterService = new BatchChapterService()
