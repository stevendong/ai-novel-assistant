import { ref, computed } from 'vue'
import { chapterService } from '@/services/chapterService'
import type { Chapter, PlotPoint, Illustration } from '@/types'

export function useChapter(chapterId?: string) {
  const chapter = ref<Chapter | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const wordCount = computed(() => {
    if (!chapter.value?.content) return 0
    return chapter.value.content.replace(/\s/g, '').length
  })

  const hasUnsavedChanges = ref(false)
  
  // 状态文本映射
  const statusText = computed(() => {
    const texts = {
      'planning': '规划中',
      'writing': '写作中', 
      'reviewing': '审核中',
      'completed': '已完成'
    }
    return chapter.value ? texts[chapter.value.status] : ''
  })

  // 加载章节数据
  const loadChapter = async (id: string) => {
    loading.value = true
    error.value = null
    
    try {
      chapter.value = await chapterService.getChapter(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载章节失败'
    } finally {
      loading.value = false
    }
  }

  // 保存章节
  const saveChapter = async () => {
    if (!chapter.value) return

    saving.value = true
    error.value = null

    try {
      chapter.value = await chapterService.updateChapter(chapter.value.id, {
        title: chapter.value.title,
        outline: chapter.value.outline,
        content: chapter.value.content,
        plotPoints: chapter.value.plotPoints,
        illustrations: chapter.value.illustrations,
        status: chapter.value.status
      })
      hasUnsavedChanges.value = false
    } catch (err) {
      error.value = err instanceof Error ? err.message : '保存章节失败'
    } finally {
      saving.value = false
    }
  }

  // 更新章节字段
  const updateChapter = (field: keyof Chapter, value: any) => {
    if (!chapter.value) return
    
    ;(chapter.value as any)[field] = value
    hasUnsavedChanges.value = true
  }

  // 情节要点管理
  const addPlotPoint = (plotPoint: PlotPoint) => {
    if (!chapter.value) return
    chapter.value.plotPoints.push(plotPoint)
    hasUnsavedChanges.value = true
  }

  const removePlotPoint = (index: number) => {
    if (!chapter.value) return
    chapter.value.plotPoints.splice(index, 1)
    hasUnsavedChanges.value = true
  }

  const updatePlotPoint = (index: number, plotPoint: PlotPoint) => {
    if (!chapter.value) return
    chapter.value.plotPoints[index] = plotPoint
    hasUnsavedChanges.value = true
  }

  // 插图管理
  const addIllustration = (illustration: Illustration) => {
    if (!chapter.value) return
    chapter.value.illustrations.push(illustration)
    hasUnsavedChanges.value = true
  }

  const removeIllustration = (index: number) => {
    if (!chapter.value) return
    chapter.value.illustrations.splice(index, 1)
    hasUnsavedChanges.value = true
  }

  const updateIllustration = (index: number, illustration: Illustration) => {
    if (!chapter.value) return
    chapter.value.illustrations[index] = illustration
    hasUnsavedChanges.value = true
  }

  // AI协作功能
  const generateOutline = async (targetEmotion?: string, constraints?: any) => {
    if (!chapter.value) return

    loading.value = true
    error.value = null

    try {
      const outline = await chapterService.generateOutline(chapter.value.id, {
        plotPoints: chapter.value.plotPoints,
        targetEmotion,
        constraints
      })
      
      // 可以选择性地更新大纲
      return outline
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'AI大纲生成失败'
    } finally {
      loading.value = false
    }
  }

  // 一致性检查
  const checkConsistency = async () => {
    if (!chapter.value) return

    try {
      // 调用一致性检查服务
      const response = await fetch(`/api/consistency/chapters/${chapter.value.id}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          types: ['character', 'setting', 'timeline', 'logic']
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        return result.issues
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '一致性检查失败'
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  // 初始化
  if (chapterId) {
    loadChapter(chapterId)
  }

  return {
    // 数据
    chapter,
    loading,
    saving,
    error,
    hasUnsavedChanges,
    
    // 计算属性
    wordCount,
    statusText,
    
    // 方法
    loadChapter,
    saveChapter,
    updateChapter,
    
    // 情节要点
    addPlotPoint,
    removePlotPoint, 
    updatePlotPoint,
    
    // 插图
    addIllustration,
    removeIllustration,
    updateIllustration,
    
    // AI功能
    generateOutline,
    checkConsistency,
    
    // 工具方法
    formatDate
  }
}
