const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const inviteService = require('../services/inviteService')
const { requireAuth, optionalAuth } = require('../middleware/auth')
const logger = require('../utils/logger')

// 验证邀请码（公开接口，注册时使用）
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body
    const ipAddress = req.ip || req.connection.remoteAddress

    if (!code) {
      return res.status(400).json({
        error: 'MISSING_CODE',
        message: '请输入邀请码'
      })
    }

    const result = await inviteService.validateInviteCode(code, { ipAddress })

    if (result.valid) {
      res.json({
        valid: true,
        inviteCode: result.inviteCode
      })
    } else {
      res.status(400).json({
        valid: false,
        error: result.error,
        message: result.message
      })
    }
  } catch (error) {
    logger.error('邀请码验证失败:', error)
    res.status(500).json({
      error: 'VALIDATION_FAILED',
      message: '邀请码验证失败'
    })
  }
})

// 使用邀请码（注册时调用）
router.post('/use', requireAuth, async (req, res) => {
  try {
    const { code } = req.body
    const userId = req.user.userId
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get('User-Agent')

    if (!code) {
      return res.status(400).json({
        error: 'MISSING_CODE',
        message: '请输入邀请码'
      })
    }

    const result = await inviteService.useInviteCode(code, userId, {
      ipAddress,
      userAgent
    })

    if (result.success) {
      res.json({
        success: true,
        message: '邀请码使用成功',
        inviteCode: result.inviteCode
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      })
    }
  } catch (error) {
    logger.error('使用邀请码失败:', error)
    res.status(500).json({
      error: 'USAGE_FAILED',
      message: '使用邀请码失败'
    })
  }
})

// 创建邀请码（需要认证）
router.post('/create', requireAuth, async (req, res) => {
  try {
    const {
      maxUses = 1,
      expiresIn = null, // 过期时间（小时）
      description = null,
      codeType = 'user'
    } = req.body

    const userId = req.user.userId

    // 计算过期时间
    let expiresAt = null
    if (expiresIn && expiresIn > 0) {
      expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000)
    }

    // 检查用户权限（这里可以添加限制逻辑）
    // 例如：检查用户等级、已创建的邀请码数量等

    const inviteCode = await inviteService.createInviteCode({
      createdBy: userId,
      maxUses: Math.min(maxUses, 10), // 限制最大使用次数
      expiresAt,
      description,
      codeType: codeType === 'admin' ? 'user' : codeType // 普通用户不能创建管理员邀请码
    })

    res.json({
      success: true,
      inviteCode
    })
  } catch (error) {
    logger.error('创建邀请码失败:', error)
    res.status(500).json({
      error: 'CREATION_FAILED',
      message: '创建邀请码失败'
    })
  }
})

// 批量创建邀请码（管理员功能）
router.post('/batch-create', requireAuth, async (req, res) => {
  try {
    const { count = 1, ...options } = req.body
    const userId = req.user.userId

    // 这里应该检查管理员权限
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'FORBIDDEN', message: '权限不足' })
    // }

    if (count > 100) {
      return res.status(400).json({
        error: 'INVALID_COUNT',
        message: '批量创建数量不能超过100个'
      })
    }

    const codes = await inviteService.createBatchInviteCodes(count, {
      ...options,
      createdBy: userId
    })

    res.json({
      success: true,
      count: codes.length,
      codes
    })
  } catch (error) {
    logger.error('批量创建邀请码失败:', error)
    res.status(500).json({
      error: 'BATCH_CREATION_FAILED',
      message: '批量创建邀请码失败'
    })
  }
})

// 获取邀请码列表
router.get('/list', requireAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      isActive,
      codeType,
      search,
      myCodesOnly = false
    } = req.query

    const userId = req.user.userId
    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : null,
      codeType,
      search
    }

    // 如果是普通用户或者指定了只看自己的邀请码
    if (myCodesOnly === 'true') {
      options.createdBy = userId
    }

    const result = await inviteService.getInviteCodes(options)

    res.json(result)
  } catch (error) {
    logger.error('获取邀请码列表失败:', error)
    res.status(500).json({
      error: 'LIST_FAILED',
      message: '获取邀请码列表失败'
    })
  }
})

// 获取邀请统计
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { days = 30, myStatsOnly = false } = req.query
    const userId = req.user.userId

    const options = {
      days: parseInt(days)
    }

    // 如果是普通用户或者指定了只看自己的统计
    if (myStatsOnly === 'true') {
      options.createdBy = userId
    }

    const stats = await inviteService.getInviteStats(options)

    res.json(stats)
  } catch (error) {
    logger.error('获取邀请统计失败:', error)
    res.status(500).json({
      error: 'STATS_FAILED',
      message: '获取邀请统计失败'
    })
  }
})

// 禁用邀请码
router.post('/:codeId/deactivate', requireAuth, async (req, res) => {
  try {
    const { codeId } = req.params
    const userId = req.user.userId

    const result = await inviteService.deactivateInviteCode(codeId, userId)

    res.json({
      success: true,
      message: '邀请码已禁用',
      inviteCode: result
    })
  } catch (error) {
    logger.error('禁用邀请码失败:', error)
    if (error.message.includes('权限')) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: error.message
      })
    } else if (error.message.includes('不存在')) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: error.message
      })
    } else {
      res.status(500).json({
        error: 'DEACTIVATION_FAILED',
        message: '禁用邀请码失败'
      })
    }
  }
})

// 激活邀请码
router.post('/:codeId/activate', requireAuth, async (req, res) => {
  try {
    const { codeId } = req.params
    const userId = req.user.userId

    const result = await inviteService.activateInviteCode(codeId, userId)

    res.json({
      success: true,
      message: '邀请码已激活',
      inviteCode: result
    })
  } catch (error) {
    logger.error('激活邀请码失败:', error)
    if (error.message.includes('权限')) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: error.message
      })
    } else if (error.message.includes('不存在')) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: error.message
      })
    } else {
      res.status(500).json({
        error: 'ACTIVATION_FAILED',
        message: '激活邀请码失败'
      })
    }
  }
})

// 删除邀请码
router.delete('/:codeId', requireAuth, async (req, res) => {
  try {
    const { codeId } = req.params
    const userId = req.user.userId

    await inviteService.deleteInviteCode(codeId, userId)

    res.json({
      success: true,
      message: '邀请码已删除'
    })
  } catch (error) {
    logger.error('删除邀请码失败:', error)
    if (error.message.includes('权限')) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: error.message
      })
    } else if (error.message.includes('不存在')) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: error.message
      })
    } else if (error.message.includes('已被使用')) {
      res.status(400).json({
        error: 'CODE_USED',
        message: error.message
      })
    } else {
      res.status(500).json({
        error: 'DELETION_FAILED',
        message: '删除邀请码失败'
      })
    }
  }
})

// 获取我的邀请关系
router.get('/my-invites', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId

    // 获取我邀请的用户
    const invitees = await prisma.User.findMany({
      where: { invitedBy: userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        createdAt: true,
        inviteCodeUsed: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // 获取邀请我的用户
    const inviter = await prisma.User.findUnique({
      where: { id: userId },
      select: {
        inviter: {
          select: {
            id: true,
            username: true,
            nickname: true
          }
        },
        inviteCodeUsed: true
      }
    })

    res.json({
      invitees,
      inviter: inviter?.inviter || null,
      inviteCodeUsed: inviter?.inviteCodeUsed || null
    })
  } catch (error) {
    logger.error('获取邀请关系失败:', error)
    res.status(500).json({
      error: 'INVITES_FAILED',
      message: '获取邀请关系失败'
    })
  }
})

module.exports = router