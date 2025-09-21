const express = require('express')
const router = express.Router()
const statsService = require('../services/statsService')
const { requireAuth } = require('../middleware/auth')

// 获取今日写作统计
router.get('/novels/:novelId/today-stats', requireAuth, async (req, res) => {
  try {
    const { novelId } = req.params
    const stats = await statsService.getTodayStats(novelId)
    res.json(stats)
  } catch (error) {
    console.error('Error getting today stats:', error)
    res.status(500).json({ error: 'Failed to get today stats' })
  }
})

// 获取项目统计
router.get('/novels/:novelId/stats', requireAuth, async (req, res) => {
  try {
    const { novelId } = req.params
    const stats = await statsService.getProjectStats(novelId)
    res.json(stats)
  } catch (error) {
    console.error('Error getting project stats:', error)
    res.status(500).json({ error: 'Failed to get project stats' })
  }
})

// 获取写作目标
router.get('/novels/:novelId/goals', requireAuth, async (req, res) => {
  try {
    const { novelId } = req.params
    const goals = await statsService.getWritingGoals(novelId)
    res.json(goals)
  } catch (error) {
    console.error('Error getting writing goals:', error)
    res.status(500).json({ error: 'Failed to get writing goals' })
  }
})

// 记录写作活动
router.post('/novels/:novelId/activity', requireAuth, async (req, res) => {
  try {
    const { novelId } = req.params
    const { wordCount, timeSpent } = req.body

    if (typeof wordCount !== 'number' || wordCount < 0) {
      return res.status(400).json({ error: 'Invalid word count' })
    }

    const result = await statsService.recordWritingActivity(novelId, wordCount, timeSpent || 0)
    res.json(result)
  } catch (error) {
    console.error('Error recording writing activity:', error)
    res.status(500).json({ error: 'Failed to record writing activity' })
  }
})

// 获取最近活动
router.get('/novels/:novelId/recent-activity', requireAuth, async (req, res) => {
  try {
    const { novelId } = req.params
    const { days = 7 } = req.query

    const activities = await statsService.getRecentActivity(novelId, parseInt(days))
    res.json(activities)
  } catch (error) {
    console.error('Error getting recent activity:', error)
    res.status(500).json({ error: 'Failed to get recent activity' })
  }
})

// 系统健康检查
router.get('/health', async (req, res) => {
  try {
    const health = await statsService.getSystemHealth()
    res.json(health)
  } catch (error) {
    console.error('Error getting system health:', error)
    res.status(500).json({ error: 'Failed to get system health' })
  }
})

// AI服务状态
router.get('/ai/status', async (req, res) => {
  try {
    const status = await statsService.getAIStatus()
    res.json(status)
  } catch (error) {
    console.error('Error getting AI status:', error)
    res.status(500).json({ error: 'Failed to get AI status' })
  }
})

module.exports = router