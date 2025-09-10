import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { statisticsService, type StatisticRecord, type CreateStatisticData, type UpdateStatisticData, type StatisticsSummary } from '@/services/statisticsService'
import { goalsService, type WritingGoal, type CreateGoalData } from '@/services/goalsService'

export function useStatistics() {
  const statistics = ref<StatisticRecord[]>([])
  const summary = ref<StatisticsSummary | null>(null)
  const goals = ref<WritingGoal[]>([])
  const loading = ref(false)

  // 加载小说统计数据
  const loadStatistics = async (novelId: string, startDate?: string, endDate?: string) => {
    try {
      loading.value = true
      const data = await statisticsService.getNovelStatistics(novelId, startDate, endDate)
      statistics.value = data
      return data
    } catch (error) {
      console.error('Failed to load statistics:', error)
      message.error('加载统计数据失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 加载统计汇总数据
  const loadSummary = async (novelId: string, days = 30) => {
    try {
      loading.value = true
      const data = await statisticsService.getStatisticsSummary(novelId, days)
      summary.value = data
      return data
    } catch (error) {
      console.error('Failed to load summary:', error)
      message.error('加载统计汇总失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 加载写作目标
  const loadGoals = async (novelId: string) => {
    try {
      loading.value = true
      const data = await goalsService.getActiveGoals(novelId)
      goals.value = data
      return data
    } catch (error) {
      console.error('Failed to load goals:', error)
      message.error('加载写作目标失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 创建或更新统计记录
  const createOrUpdateStatistic = async (data: CreateStatisticData) => {
    try {
      loading.value = true
      const statistic = await statisticsService.createOrUpdateStatistic(data)
      
      // 更新本地数据
      const existingIndex = statistics.value.findIndex(
        s => s.novelId === data.novelId && s.date === data.date
      )
      if (existingIndex >= 0) {
        statistics.value[existingIndex] = statistic
      } else {
        statistics.value.push(statistic)
      }
      
      message.success('统计数据保存成功')
      return statistic
    } catch (error) {
      console.error('Failed to create/update statistic:', error)
      message.error('保存统计数据失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 更新统计记录
  const updateStatistic = async (id: string, data: UpdateStatisticData) => {
    try {
      loading.value = true
      const statistic = await statisticsService.updateStatistic(id, data)
      
      // 更新本地数据
      const index = statistics.value.findIndex(s => s.id === id)
      if (index >= 0) {
        statistics.value[index] = statistic
      }
      
      message.success('统计数据更新成功')
      return statistic
    } catch (error) {
      console.error('Failed to update statistic:', error)
      message.error('更新统计数据失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 删除统计记录
  const deleteStatistic = async (id: string) => {
    try {
      loading.value = true
      await statisticsService.deleteStatistic(id)
      
      // 从本地数据中移除
      statistics.value = statistics.value.filter(s => s.id !== id)
      
      message.success('统计数据删除成功')
    } catch (error) {
      console.error('Failed to delete statistic:', error)
      message.error('删除统计数据失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 记录今日写作数据
  const recordTodayWriting = async (novelId: string, wordCount: number, timeSpent?: number) => {
    try {
      loading.value = true
      const statistic = await statisticsService.recordTodayWriting(novelId, wordCount, timeSpent)
      
      // 更新写作目标进度
      const today = new Date().toISOString().split('T')[0]
      await goalsService.updateNovelProgress(novelId, wordCount, today)
      
      // 重新加载目标数据
      await loadGoals(novelId)
      
      message.success(`已记录今日写作 ${wordCount} 字`)
      return statistic
    } catch (error) {
      console.error('Failed to record today writing:', error)
      message.error('记录写作数据失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 创建或更新写作目标
  const createOrUpdateGoal = async (data: CreateGoalData) => {
    try {
      loading.value = true
      const goal = await goalsService.createOrUpdateGoal(data)
      
      // 更新本地数据
      const existingIndex = goals.value.findIndex(
        g => g.novelId === data.novelId && g.type === data.type && g.period === data.period
      )
      if (existingIndex >= 0) {
        goals.value[existingIndex] = goal
      } else {
        goals.value.push(goal)
      }
      
      message.success('写作目标设置成功')
      return goal
    } catch (error) {
      console.error('Failed to create/update goal:', error)
      message.error('设置写作目标失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 设置默认目标
  const setDefaultGoals = async (novelId: string) => {
    try {
      loading.value = true
      const newGoals = await goalsService.setDefaultGoals(novelId)
      goals.value = newGoals
      message.success('默认写作目标设置成功')
      return newGoals
    } catch (error) {
      console.error('Failed to set default goals:', error)
      message.error('设置默认目标失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 计算属性
  const totalWords = computed(() => 
    statistics.value.reduce((sum, stat) => sum + stat.wordCount, 0)
  )

  const totalTime = computed(() => 
    statistics.value.reduce((sum, stat) => sum + stat.timeSpent, 0)
  )

  const writingDays = computed(() => 
    statistics.value.filter(stat => stat.wordCount > 0).length
  )

  const averageWordsPerDay = computed(() => 
    writingDays.value > 0 ? Math.round(totalWords.value / writingDays.value) : 0
  )

  // 今日目标完成情况
  const dailyGoalProgress = computed(() => {
    const dailyGoal = goals.value.find(g => g.type === 'daily')
    if (!dailyGoal) return null
    
    const progress = dailyGoal.target > 0 ? (dailyGoal.achieved / dailyGoal.target) * 100 : 0
    return {
      target: dailyGoal.target,
      achieved: dailyGoal.achieved,
      progress: Math.min(progress, 100),
      remaining: Math.max(dailyGoal.target - dailyGoal.achieved, 0)
    }
  })

  // 本周目标完成情况
  const weeklyGoalProgress = computed(() => {
    const weeklyGoal = goals.value.find(g => g.type === 'weekly')
    if (!weeklyGoal) return null
    
    const progress = weeklyGoal.target > 0 ? (weeklyGoal.achieved / weeklyGoal.target) * 100 : 0
    return {
      target: weeklyGoal.target,
      achieved: weeklyGoal.achieved,
      progress: Math.min(progress, 100),
      remaining: Math.max(weeklyGoal.target - weeklyGoal.achieved, 0)
    }
  })

  // 本月目标完成情况
  const monthlyGoalProgress = computed(() => {
    const monthlyGoal = goals.value.find(g => g.type === 'monthly')
    if (!monthlyGoal) return null
    
    const progress = monthlyGoal.target > 0 ? (monthlyGoal.achieved / monthlyGoal.target) * 100 : 0
    return {
      target: monthlyGoal.target,
      achieved: monthlyGoal.achieved,
      progress: Math.min(progress, 100),
      remaining: Math.max(monthlyGoal.target - monthlyGoal.achieved, 0)
    }
  })

  return {
    // 响应式数据
    statistics,
    summary,
    goals,
    loading,
    
    // 方法
    loadStatistics,
    loadSummary,
    loadGoals,
    createOrUpdateStatistic,
    updateStatistic,
    deleteStatistic,
    recordTodayWriting,
    createOrUpdateGoal,
    setDefaultGoals,
    
    // 计算属性
    totalWords,
    totalTime,
    writingDays,
    averageWordsPerDay,
    dailyGoalProgress,
    weeklyGoalProgress,
    monthlyGoalProgress
  }
}