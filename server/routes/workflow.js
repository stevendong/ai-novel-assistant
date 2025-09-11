const express = require('express')
const statusWorkflowService = require('../services/statusWorkflowService')

const router = express.Router()

// 获取可用的状态流转选项
router.get('/:entityType/:entityId/transitions', async (req, res) => {
  try {
    const { entityType, entityId } = req.params
    
    if (!['novel', 'chapter'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' })
    }

    const transitions = await statusWorkflowService.getAvailableTransitions(entityType, entityId)
    res.json(transitions)
  } catch (error) {
    console.error('Error getting transitions:', error)
    res.status(500).json({ error: 'Failed to get transitions' })
  }
})

// 执行状态流转
router.post('/:entityType/:entityId/transition', async (req, res) => {
  try {
    const { entityType, entityId } = req.params
    const { toStatus, reason } = req.body
    
    if (!['novel', 'chapter'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' })
    }

    if (!toStatus) {
      return res.status(400).json({ error: 'Target status is required' })
    }

    const result = await statusWorkflowService.transitionStatus(
      entityType, 
      entityId, 
      toStatus, 
      'user', 
      reason
    )
    
    res.json(result)
  } catch (error) {
    console.error('Error transitioning status:', error)
    res.status(400).json({ error: error.message })
  }
})

// 检查是否可以流转到指定状态
router.get('/:entityType/:entityId/can-transition/:toStatus', async (req, res) => {
  try {
    const { entityType, entityId, toStatus } = req.params
    
    if (!['novel', 'chapter'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' })
    }

    const result = await statusWorkflowService.canTransition(entityType, entityId, toStatus)
    res.json(result)
  } catch (error) {
    console.error('Error checking transition:', error)
    res.status(500).json({ error: 'Failed to check transition' })
  }
})

// 获取状态变更历史
router.get('/:entityType/:entityId/history', async (req, res) => {
  try {
    const { entityType, entityId } = req.params
    const { limit = 10 } = req.query
    
    if (!['novel', 'chapter'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' })
    }

    const history = await statusWorkflowService.getStatusHistory(
      entityType, 
      entityId, 
      parseInt(limit)
    )
    
    res.json(history)
  } catch (error) {
    console.error('Error getting status history:', error)
    res.status(500).json({ error: 'Failed to get status history' })
  }
})

// 获取工作流配置
router.get('/config/:novelId/:entityType', async (req, res) => {
  try {
    const { novelId, entityType } = req.params
    
    if (!['novel', 'chapter'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' })
    }

    const workflow = await statusWorkflowService.getWorkflow(novelId, entityType)
    res.json(workflow)
  } catch (error) {
    console.error('Error getting workflow config:', error)
    res.status(500).json({ error: 'Failed to get workflow config' })
  }
})

// 批量状态操作 - 推进所有符合条件的章节
router.post('/novels/:novelId/chapters/batch-advance', async (req, res) => {
  try {
    const { novelId } = req.params
    const { fromStatus, toStatus } = req.body

    if (!fromStatus || !toStatus) {
      return res.status(400).json({ error: 'Both fromStatus and toStatus are required' })
    }

    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    const chapters = await prisma.chapter.findMany({
      where: { novelId, status: fromStatus }
    })

    const results = []
    for (const chapter of chapters) {
      try {
        const result = await statusWorkflowService.transitionStatus(
          'chapter',
          chapter.id,
          toStatus,
          'user',
          'Batch operation'
        )
        results.push({ chapterId: chapter.id, success: true, result })
      } catch (error) {
        results.push({ 
          chapterId: chapter.id, 
          success: false, 
          error: error.message 
        })
      }
    }

    res.json({
      totalProcessed: chapters.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results
    })
  } catch (error) {
    console.error('Error in batch advance:', error)
    res.status(500).json({ error: 'Failed to perform batch advance' })
  }
})

// 自动推进 - 检查并推进所有可以自动流转的状态
router.post('/novels/:novelId/auto-advance', async (req, res) => {
  try {
    const { novelId } = req.params

    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    // 获取所有章节
    const chapters = await prisma.chapter.findMany({
      where: { novelId }
    })

    const results = []

    // 检查每个章节的可用流转
    for (const chapter of chapters) {
      const transitions = await statusWorkflowService.getAvailableTransitions('chapter', chapter.id)
      
      // 查找可以自动触发的流转
      for (const transition of transitions) {
        if (transition.autoTrigger && transition.canTransition) {
          try {
            const result = await statusWorkflowService.transitionStatus(
              'chapter',
              chapter.id,
              transition.to,
              'system',
              'Auto-advance'
            )
            results.push({ 
              chapterId: chapter.id, 
              transition: `${transition.from} → ${transition.to}`,
              success: true, 
              result 
            })
          } catch (error) {
            results.push({ 
              chapterId: chapter.id, 
              transition: `${transition.from} → ${transition.to}`,
              success: false, 
              error: error.message 
            })
          }
        }
      }
    }

    // 检查小说状态
    const novelTransitions = await statusWorkflowService.getAvailableTransitions('novel', novelId)
    for (const transition of novelTransitions) {
      if (transition.autoTrigger && transition.canTransition) {
        try {
          const result = await statusWorkflowService.transitionStatus(
            'novel',
            novelId,
            transition.to,
            'system',
            'Auto-advance'
          )
          results.push({ 
            novelId, 
            transition: `${transition.from} → ${transition.to}`,
            success: true, 
            result 
          })
        } catch (error) {
          results.push({ 
            novelId, 
            transition: `${transition.from} → ${transition.to}`,
            success: false, 
            error: error.message 
          })
        }
      }
    }

    res.json({
      totalTransitions: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results
    })
  } catch (error) {
    console.error('Error in auto advance:', error)
    res.status(500).json({ error: 'Failed to perform auto advance' })
  }
})

module.exports = router