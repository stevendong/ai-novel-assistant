const crypto = require('crypto')
const prisma = require('../utils/prismaClient')

class InviteService {
  // 生成邀请码
  generateInviteCode(codeType = 'user') {
    const prefixes = {
      system: 'SY',
      admin: 'AD',
      user: 'NV'
    }

    const prefix = prefixes[codeType] || 'NV'

    // 生成8位随机码（排除易混淆字符）
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    let randomCode = ''
    for (let i = 0; i < 8; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // 生成2位校验码
    const checksum = this.generateChecksum(prefix + randomCode)

    return `${prefix}-${randomCode}-${checksum}`
  }

  // 生成校验码
  generateChecksum(str) {
    const hash = crypto.createHash('md5').update(str + process.env.INVITE_CODE_SALT || 'default-salt').digest('hex')
    return hash.substring(0, 2).toUpperCase()
  }

  // 验证邀请码格式
  validateCodeFormat(code) {
    const pattern = /^(SY|AD|NV)-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}-[A-F0-9]{2}$/
    return pattern.test(code)
  }

  // 验证校验码
  validateChecksum(code) {
    const parts = code.split('-')
    if (parts.length !== 3) return false

    const expectedChecksum = this.generateChecksum(parts[0] + parts[1])
    return parts[2] === expectedChecksum
  }

  // 创建邀请码
  async createInviteCode(options = {}) {
    const {
      createdBy = null,
      maxUses = 1,
      expiresAt = null,
      description = null,
      codeType = 'user'
    } = options

    // 生成唯一邀请码
    let code
    let attempts = 0
    const maxAttempts = 10

    do {
      code = this.generateInviteCode(codeType)
      attempts++

      // 检查是否已存在
      const existing = await prisma.InviteCode.findUnique({
        where: { code }
      })

      if (!existing) break

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique invite code after multiple attempts')
      }
    } while (true)

    // 创建邀请码记录
    const inviteCode = await prisma.InviteCode.create({
      data: {
        code,
        createdBy,
        maxUses,
        expiresAt,
        description,
        codeType
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            nickname: true
          }
        }
      }
    })

    return inviteCode
  }

  // 批量创建邀请码
  async createBatchInviteCodes(count, options = {}) {
    const codes = []

    for (let i = 0; i < count; i++) {
      try {
        const code = await this.createInviteCode({
          ...options,
          description: options.description || `批量生成 ${i + 1}/${count}`
        })
        codes.push(code)
      } catch (error) {
        console.error(`Failed to create invite code ${i + 1}:`, error)
        // 继续创建其他邀请码
      }
    }

    return codes
  }

  // 验证邀请码
  async validateInviteCode(code, options = {}) {
    const { userId = null, ipAddress = null } = options

    // 格式验证
    if (!this.validateCodeFormat(code)) {
      return { valid: false, error: 'INVALID_FORMAT', message: '邀请码格式不正确' }
    }

    // 校验码验证
    if (!this.validateChecksum(code)) {
      return { valid: false, error: 'INVALID_CHECKSUM', message: '邀请码校验失败' }
    }

    // 数据库查询
    const inviteCode = await prisma.InviteCode.findUnique({
      where: { code },
      include: {
        usages: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                nickname: true
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            nickname: true
          }
        }
      }
    })

    if (!inviteCode) {
      return { valid: false, error: 'NOT_FOUND', message: '邀请码不存在' }
    }

    // 检查是否激活
    if (!inviteCode.isActive) {
      return { valid: false, error: 'INACTIVE', message: '邀请码已被禁用' }
    }

    // 检查是否过期
    if (inviteCode.expiresAt && new Date() > inviteCode.expiresAt) {
      return { valid: false, error: 'EXPIRED', message: '邀请码已过期' }
    }

    // 检查使用次数
    if (inviteCode.usedCount >= inviteCode.maxUses) {
      return { valid: false, error: 'MAX_USES_REACHED', message: '邀请码使用次数已达上限' }
    }

    // 检查用户是否已使用过此邀请码
    if (userId) {
      const existingUsage = inviteCode.usages.find(usage => usage.userId === userId)
      if (existingUsage) {
        return { valid: false, error: 'ALREADY_USED', message: '您已经使用过此邀请码' }
      }
    }

    // IP频率限制检查（可选）
    if (ipAddress && userId) {
      const recentUsages = await prisma.InviteUsage.findMany({
        where: {
          ipAddress,
          usedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时内
          }
        }
      })

      if (recentUsages.length >= 30) {
        return { valid: false, error: 'IP_LIMIT_EXCEEDED', message: '该IP地址24小时内使用邀请码次数过多' }
      }
    }

    return {
      valid: true,
      inviteCode: {
        id: inviteCode.id,
        code: inviteCode.code,
        codeType: inviteCode.codeType,
        description: inviteCode.description,
        creator: inviteCode.creator,
        remainingUses: inviteCode.maxUses - inviteCode.usedCount,
        maxUses: inviteCode.maxUses,
        usedCount: inviteCode.usedCount,
        expiresAt: inviteCode.expiresAt
      }
    }
  }

  // 使用邀请码
  async useInviteCode(code, userId, options = {}) {
    const { ipAddress = null, userAgent = null } = options

    // 先验证邀请码
    const validation = await this.validateInviteCode(code, { userId, ipAddress })

    if (!validation.valid) {
      return { success: false, error: validation.error, message: validation.message }
    }

    try {
      // 在事务中处理使用邀请码
      const result = await prisma.$transaction(async (tx) => {
        // 记录使用
        const usage = await tx.InviteUsage.create({
          data: {
            codeId: validation.inviteCode.id,
            userId,
            ipAddress,
            userAgent
          }
        })

        // 更新使用计数
        await tx.InviteCode.update({
          where: { id: validation.inviteCode.id },
          data: {
            usedCount: { increment: 1 }
          }
        })

        return { usage, inviteCode: validation.inviteCode }
      })

      return {
        success: true,
        usage: result.usage,
        inviteCode: result.inviteCode
      }

    } catch (error) {
      console.error('Error using invite code:', error)
      return { success: false, error: 'USAGE_FAILED', message: '使用邀请码失败，请重试' }
    }
  }

  // 获取邀请码列表
  async getInviteCodes(options = {}) {
    const {
      createdBy = null,
      isActive = null,
      codeType = null,
      page = 1,
      limit = 20,
      search = null
    } = options

    const where = {}

    if (createdBy) where.createdBy = createdBy
    if (isActive !== null) where.isActive = isActive
    if (codeType) where.codeType = codeType
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { description: { contains: search } }
      ]
    }

    const [codes, total] = await Promise.all([
      prisma.InviteCode.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              nickname: true
            }
          },
          usages: {
            select: {
              id: true,
              userId: true,
              usedAt: true,
              user: {
                select: {
                  username: true,
                  nickname: true
                }
              }
            },
            orderBy: { usedAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.InviteCode.count({ where })
    ])

    return {
      codes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  // 获取邀请统计
  async getInviteStats(options = {}) {
    const { createdBy = null, days = 30 } = options

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const where = {
      createdAt: { gte: startDate }
    }

    if (createdBy) where.createdBy = createdBy

    const [total, active, used, expired] = await Promise.all([
      prisma.InviteCode.count({ where }),
      prisma.InviteCode.count({ where: { ...where, isActive: true } }),
      prisma.InviteCode.count({
        where: {
          ...where,
          usedCount: { gt: 0 }
        }
      }),
      prisma.InviteCode.count({
        where: {
          ...where,
          expiresAt: { lt: new Date() }
        }
      })
    ])

    // 每日使用统计（兼容 PostgreSQL / SQLite）
    const dailyUsageRaw = await prisma.$queryRaw`
      SELECT
        DATE("usedAt") as date,
        COUNT(*) as count
      FROM "InviteUsage"
      WHERE "usedAt" >= ${startDate}
      GROUP BY DATE("usedAt")
      ORDER BY date DESC
    `

    // 转换 BigInt 为 Number
    const dailyUsage = dailyUsageRaw.map(item => ({
      date: item.date,
      count: Number(item.count)
    }))

    return {
      total,
      active,
      used,
      expired,
      usageRate: total > 0 ? ((used / total) * 100).toFixed(2) : 0,
      dailyUsage
    }
  }

  // 禁用邀请码
  async deactivateInviteCode(codeId, currentUser) {
    const inviteCode = await prisma.InviteCode.findUnique({
      where: { id: codeId }
    })

    if (!inviteCode) {
      throw new Error('邀请码不存在')
    }

    const userId = currentUser?.id || currentUser?.userId
    const isAdmin = currentUser?.role === 'admin'
    const isCreator = inviteCode.createdBy && inviteCode.createdBy === userId
    const isSystemInvite = inviteCode.createdBy === null

    // 检查权限（创建者或管理员可以禁用）
    if (!isCreator && !isAdmin) {
      if (isSystemInvite && isAdmin) {
        // 管理员可以管理系统邀请码
      } else {
        throw new Error('没有权限禁用此邀请码')
      }
    }

    return await prisma.InviteCode.update({
      where: { id: codeId },
      data: { isActive: false }
    })
  }

  // 激活邀请码
  async activateInviteCode(codeId, currentUser) {
    const inviteCode = await prisma.InviteCode.findUnique({
      where: { id: codeId }
    })

    if (!inviteCode) {
      throw new Error('邀请码不存在')
    }

    const userId = currentUser?.id || currentUser?.userId
    const isAdmin = currentUser?.role === 'admin'
    const isCreator = inviteCode.createdBy && inviteCode.createdBy === userId
    const isSystemInvite = inviteCode.createdBy === null

    // 检查权限（创建者或管理员可以激活）
    if (!isCreator && !isAdmin) {
      if (isSystemInvite && isAdmin) {
        // allow
      } else {
        throw new Error('没有权限激活此邀请码')
      }
    }

    return await prisma.InviteCode.update({
      where: { id: codeId },
      data: { isActive: true }
    })
  }

  // 删除邀请码
  async deleteInviteCode(codeId, currentUser) {
    const inviteCode = await prisma.InviteCode.findUnique({
      where: { id: codeId },
      include: { usages: true }
    })

    if (!inviteCode) {
      throw new Error('邀请码不存在')
    }

    const userId = currentUser?.id || currentUser?.userId
    const isAdmin = currentUser?.role === 'admin'
    const isCreator = inviteCode.createdBy && inviteCode.createdBy === userId
    const isSystemInvite = inviteCode.createdBy === null

    // 检查权限
    if (!isCreator && !isAdmin) {
      if (isSystemInvite && isAdmin) {
        // allow
      } else {
        throw new Error('没有权限删除此邀请码')
      }
    }

    // 如果已被使用，不允许删除，只能禁用
    if (inviteCode.usages.length > 0) {
      throw new Error('邀请码已被使用，不能删除')
    }

    return await prisma.InviteCode.delete({
      where: { id: codeId }
    })
  }
}

module.exports = new InviteService()
