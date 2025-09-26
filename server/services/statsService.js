const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

class StatsService {
  // 获取今日写作统计
  async getTodayStats(novelId) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
      const stats = await prisma.NovelStatistics.findFirst({
        where: {
          novelId,
          date: today
        }
      })

      return {
        wordCount: stats?.wordCount || 0,
        timeSpent: stats?.timeSpent || 0
      }
    } catch (error) {
      console.error('Error getting today stats:', error)
      return { wordCount: 0, timeSpent: 0 }
    }
  }

  // 获取项目总体统计
  async getProjectStats(novelId) {
    try {
      const novel = await prisma.novel.findUnique({
        where: { id: novelId },
        include: {
          chapters: {
            select: {
              status: true,
              wordCount: true
            }
          },
          characters: {
            select: { id: true }
          },
          settings: {
            select: { id: true }
          }
        }
      })

      if (!novel) {
        throw new Error('Novel not found')
      }

      const totalWords = novel.chapters.reduce((sum, chapter) => sum + (chapter.wordCount || 0), 0)
      const chapterStats = novel.chapters.reduce((stats, chapter) => {
        stats.total++
        switch (chapter.status) {
          case 'completed':
            stats.completed++
            break
          case 'writing':
          case 'reviewing':
          case 'editing':
            stats.writing++
            break
          case 'planning':
          case 'outlined':
            stats.planning++
            break
        }
        return stats
      }, { total: 0, completed: 0, writing: 0, planning: 0 })

      return {
        novel: {
          id: novel.id,
          title: novel.title,
          status: novel.status,
          wordCount: totalWords,
          targetWordCount: novel.targetWordCount
        },
        chapters: chapterStats,
        counts: {
          characters: novel.characters.length,
          settings: novel.settings.length
        }
      }
    } catch (error) {
      console.error('Error getting project stats:', error)
      throw error
    }
  }

  // 获取写作目标完成情况
  async getWritingGoals(novelId) {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    try {
      // 获取目标设置
      const [dailyGoal, weeklyGoal, monthlyGoal] = await Promise.all([
        prisma.writingGoal.findFirst({
          where: {
            novelId,
            type: 'daily',
            period: today.toISOString().slice(0, 10)
          }
        }),
        prisma.writingGoal.findFirst({
          where: {
            novelId,
            type: 'weekly',
            period: `${startOfWeek.getFullYear()}-W${Math.ceil((startOfWeek.getDate()) / 7)}`
          }
        }),
        prisma.writingGoal.findFirst({
          where: {
            novelId,
            type: 'monthly',
            period: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`
          }
        })
      ])

      // 计算实际完成量
      const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
        // 今日统计
        prisma.NovelStatistics.findFirst({
          where: {
            novelId,
            date: today
          }
        }),
        // 本周统计
        prisma.NovelStatistics.aggregate({
          where: {
            novelId,
            date: {
              gte: startOfWeek
            }
          },
          _sum: {
            wordCount: true,
            timeSpent: true
          }
        }),
        // 本月统计
        prisma.NovelStatistics.aggregate({
          where: {
            novelId,
            date: {
              gte: startOfMonth
            }
          },
          _sum: {
            wordCount: true,
            timeSpent: true
          }
        })
      ])

      return {
        daily: {
          target: dailyGoal?.target || 0,
          achieved: dailyStats?.wordCount || 0,
          progress: dailyGoal?.target ? Math.round(((dailyStats?.wordCount || 0) / dailyGoal.target) * 100) : 0
        },
        weekly: {
          target: weeklyGoal?.target || 0,
          achieved: weeklyStats._sum.wordCount || 0,
          progress: weeklyGoal?.target ? Math.round(((weeklyStats._sum.wordCount || 0) / weeklyGoal.target) * 100) : 0
        },
        monthly: {
          target: monthlyGoal?.target || 0,
          achieved: monthlyStats._sum.wordCount || 0,
          progress: monthlyGoal?.target ? Math.round(((monthlyStats._sum.wordCount || 0) / monthlyGoal.target) * 100) : 0
        }
      }
    } catch (error) {
      console.error('Error getting writing goals:', error)
      throw error
    }
  }

  // 记录写作活动
  async recordWritingActivity(novelId, wordCount, timeSpent = 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
      const existing = await prisma.NovelStatistics.findUnique({
        where: {
          novelId_date: {
            novelId,
            date: today
          }
        }
      })

      if (existing) {
        // 更新现有记录
        await prisma.NovelStatistics.update({
          where: {
            id: existing.id
          },
          data: {
            wordCount: existing.wordCount + wordCount,
            timeSpent: existing.timeSpent + timeSpent
          }
        })
      } else {
        // 创建新记录
        await prisma.NovelStatistics.create({
          data: {
            novelId,
            date: today,
            wordCount,
            timeSpent
          }
        })
      }

      return { success: true }
    } catch (error) {
      console.error('Error recording writing activity:', error)
      throw error
    }
  }

  // 获取最近的写作活动
  async getRecentActivity(novelId, days = 7) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    try {
      const activities = await prisma.NovelStatistics.findMany({
        where: {
          novelId,
          date: {
            gte: startDate
          }
        },
        orderBy: {
          date: 'desc'
        }
      })

      return activities.map(activity => ({
        date: activity.date,
        wordCount: activity.wordCount,
        timeSpent: activity.timeSpent
      }))
    } catch (error) {
      console.error('Error getting recent activity:', error)
      throw error
    }
  }

  // 获取系统健康状态
  async getSystemHealth() {
    try {
      const startTime = Date.now()

      // 测试数据库连接
      await prisma.$queryRaw`SELECT 1`

      const dbLatency = Date.now() - startTime

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          latency: dbLatency
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
    } catch (error) {
      console.error('Error getting system health:', error)
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    }
  }

  // 获取AI服务状态
  async getAIStatus() {
    try {
      const aiService = require('./aiService')

      // 获取当前默认提供商
      const defaultProvider = aiService.getDefaultProvider()

      if (!defaultProvider) {
        return {
          connected: false,
          model: null,
          error: 'No AI provider configured'
        }
      }

      // 检查提供商是否有有效的客户端或API密钥
      const hasValidConfig = defaultProvider.client ||
        (defaultProvider.config && defaultProvider.config.apiKey)

      if (!hasValidConfig) {
        return {
          connected: false,
          model: defaultProvider.models?.chat || null,
          error: 'API key not configured'
        }
      }

      // 返回当前配置的提供商信息
      return {
        connected: true,
        model: defaultProvider.models?.chat || 'unknown',
        provider: Object.keys(aiService.providers).find(key =>
          aiService.providers.get(key) === defaultProvider
        ),
        usage: {
          requests: 0, // 可以从缓存或数据库获取
          tokens: 0
        }
      }
    } catch (error) {
      console.error('Error getting AI status:', error)
      return {
        connected: false,
        model: null,
        error: error.message
      }
    }
  }
}

module.exports = new StatsService()