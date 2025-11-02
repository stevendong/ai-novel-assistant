const express = require('express')
const { batchChapterService } = require('../services/batchChapterService')
const { requireAuth } = require('../middleware/auth')
const prisma = require('../utils/prismaClient')
const router = express.Router()

// 添加Prisma到请求对象
router.use((req, res, next) => {
  req.prisma = prisma
  next()
})

// 所有批量章节路由都需要认证
router.use(requireAuth)

/**
 * 分析小说上下文
 * GET /api/chapters/batch/:novelId/analyze
 */
router.get('/:novelId/analyze', async (req, res) => {
  try {
    const { novelId } = req.params
    const userId = req.user.id

    const analysis = await batchChapterService.analyzeNovelContext(novelId, userId)

    res.json({
      success: true,
      data: analysis,
      message: '小说上下文分析完成'
    })
  } catch (error) {
    console.error('上下文分析失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 创建批量生成任务
 * POST /api/chapters/batch/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user.id
    const {
      novelId,
      batchName,
      mode, // continue, insert, branch, expand
      totalChapters,
      startPosition,
      parameters
    } = req.body

    // 验证必需参数
    if (!novelId || !batchName || !mode || !totalChapters) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数'
      })
    }

    if (totalChapters < 1 || totalChapters > 20) {
      return res.status(400).json({
        success: false,
        error: '章节数量必须在1-20之间'
      })
    }

    // 创建批量生成任务
    const batchId = await batchChapterService.createBatchGeneration({
      novelId,
      userId,
      batchName,
      mode,
      totalChapters,
      startPosition,
      parameters: parameters || {}
    })

    // 异步执行生成任务
    batchChapterService.executeBatchGeneration(batchId).catch(error => {
      console.error('批量生成执行失败:', error)
    })

    res.json({
      success: true,
      data: { batchId },
      message: '批量生成任务已创建，正在后台处理'
    })
  } catch (error) {
    console.error('创建批量生成任务失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 获取批次列表
 * GET /api/chapters/batch/list?novelId=xxx
 */
router.get('/list', async (req, res) => {
  try {
    const userId = req.user.id
    const { novelId } = req.query

    const batches = await batchChapterService.getBatchList(userId, novelId)

    res.json({
      success: true,
      data: batches,
      message: '获取批次列表成功'
    })
  } catch (error) {
    console.error('获取批次列表失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 获取批次详情
 * GET /api/chapters/batch/:batchId
 */
router.get('/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params
    const userId = req.user.id

    const batch = await batchChapterService.getBatchDetails(batchId, userId)

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: '批次不存在或无权限'
      })
    }

    res.json({
      success: true,
      data: batch,
      message: '获取批次详情成功'
    })
  } catch (error) {
    console.error('获取批次详情失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 预览生成结果
 * GET /api/chapters/batch/:batchId/preview
 */
router.get('/:batchId/preview', async (req, res) => {
  try {
    const { batchId } = req.params
    const userId = req.user.id

    const batch = await batchChapterService.getBatchDetails(batchId, userId)

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: '批次不存在或无权限'
      })
    }

    // 返回生成的章节预览
    const preview = {
      batchInfo: {
        id: batch.id,
        name: batch.batchName,
        mode: batch.mode,
        status: batch.status,
        progress: batch.progress,
        totalChapters: batch.totalChapters,
        completedChapters: batch.completedChapters
      },
      chapters: batch.generatedChapters.map(chapter => ({
        id: chapter.id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        outline: chapter.outline,
        plotPoints: JSON.parse(chapter.plotPoints || '[]'),
        characters: JSON.parse(chapter.characters || '[]'),
        settings: JSON.parse(chapter.settings || '[]'),
        estimatedWords: chapter.estimatedWords,
        priority: chapter.priority,
        aiConfidence: chapter.aiConfidence,
        status: chapter.status,
        notes: chapter.notes
      }))
    }

    res.json({
      success: true,
      data: preview,
      message: '获取预览成功'
    })
  } catch (error) {
    console.error('获取预览失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 应用生成的章节
 * POST /api/chapters/batch/:batchId/apply
 */
router.post('/:batchId/apply', async (req, res) => {
  try {
    const { batchId } = req.params
    const { selectedChapterIds } = req.body
    const userId = req.user.id

    if (!selectedChapterIds || !Array.isArray(selectedChapterIds)) {
      return res.status(400).json({
        success: false,
        error: '请选择要应用的章节'
      })
    }

    const createdChapters = await batchChapterService.applyGeneratedChapters(
      batchId,
      selectedChapterIds
    )

    res.json({
      success: true,
      data: {
        createdChapters: createdChapters.length,
        chapters: createdChapters.map(ch => ({
          id: ch.id,
          chapterNumber: ch.chapterNumber,
          title: ch.title
        }))
      },
      message: `成功应用${createdChapters.length}个章节`
    })
  } catch (error) {
    console.error('应用章节失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 更新生成章节
 * PUT /api/chapters/batch/generated/:chapterId
 */
router.put('/generated/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params
    const { title, outline, notes, status } = req.body
    const userId = req.user.id

    // 验证权限
    const generatedChapter = await req.prisma.generatedChapter.findFirst({
      where: {
        id: chapterId,
        batch: { userId }
      }
    })

    if (!generatedChapter) {
      return res.status(404).json({
        success: false,
        error: '生成章节不存在或无权限'
      })
    }

    // 更新章节
    const updatedChapter = await req.prisma.generatedChapter.update({
      where: { id: chapterId },
      data: {
        title: title || generatedChapter.title,
        outline: outline || generatedChapter.outline,
        notes: notes !== undefined ? notes : generatedChapter.notes,
        status: status || generatedChapter.status
      }
    })

    res.json({
      success: true,
      data: updatedChapter,
      message: '章节更新成功'
    })
  } catch (error) {
    console.error('更新生成章节失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 重新生成单个章节
 * POST /api/chapters/batch/generated/:chapterId/regenerate
 */
router.post('/generated/:chapterId/regenerate', async (req, res) => {
  try {
    const { chapterId } = req.params
    const { customPrompt } = req.body
    const userId = req.user.id

    // 这里可以实现单章节重新生成逻辑
    // 目前返回一个简单的响应
    res.json({
      success: true,
      message: '章节重新生成功能开发中'
    })
  } catch (error) {
    console.error('重新生成章节失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 删除批次
 * DELETE /api/chapters/batch/:batchId
 */
router.delete('/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params
    const userId = req.user.id

    await batchChapterService.deleteBatch(batchId, userId)

    res.json({
      success: true,
      message: '批次删除成功'
    })
  } catch (error) {
    console.error('删除批次失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 获取生成进度
 * GET /api/chapters/batch/:batchId/progress
 */
router.get('/:batchId/progress', async (req, res) => {
  try {
    const { batchId } = req.params
    const userId = req.user.id

    const batch = await req.prisma.batchChapterGeneration.findFirst({
      where: { id: batchId, userId },
      select: {
        id: true,
        batchName: true,
        status: true,
        progress: true,
        totalChapters: true,
        completedChapters: true,
        errorMessage: true,
        updatedAt: true
      }
    })

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: '批次不存在或无权限'
      })
    }

    res.json({
      success: true,
      data: batch,
      message: '获取进度成功'
    })
  } catch (error) {
    console.error('获取进度失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 获取批量生成统计
 * GET /api/chapters/batch/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id

    const stats = await req.prisma.batchChapterGeneration.aggregate({
      where: { userId },
      _count: {
        id: true
      },
      _sum: {
        totalChapters: true,
        completedChapters: true
      }
    })

    const statusCounts = await req.prisma.batchChapterGeneration.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        id: true
      }
    })

    res.json({
      success: true,
      data: {
        totalBatches: stats._count.id || 0,
        totalPlannedChapters: stats._sum.totalChapters || 0,
        totalCompletedChapters: stats._sum.completedChapters || 0,
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.id
          return acc
        }, {})
      },
      message: '获取统计成功'
    })
  } catch (error) {
    console.error('获取统计失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

module.exports = router
