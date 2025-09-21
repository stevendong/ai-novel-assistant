const { PrismaClient } = require('@prisma/client')
const inviteService = require('../services/inviteService')

const prisma = new PrismaClient()

async function generateInitialInvites() {
  try {
    console.log('🎫 生成初始邀请码...')

    // 生成管理员邀请码
    const adminCodes = await inviteService.createBatchInviteCodes(3, {
      codeType: 'admin',
      maxUses: 10,
      description: '管理员初始邀请码',
      createdBy: null // 系统生成
    })

    // 生成普通邀请码
    const userCodes = await inviteService.createBatchInviteCodes(10, {
      codeType: 'user',
      maxUses: 1,
      description: '普通用户邀请码',
      createdBy: null // 系统生成
    })

    console.log('✅ 邀请码生成完成!')
    console.log('\n📋 管理员邀请码 (可用10次):')
    adminCodes.forEach(code => {
      console.log(`  ${code.code} - ${code.description}`)
    })

    console.log('\n📋 普通邀请码 (可用1次):')
    userCodes.forEach((code, index) => {
      if (index < 5) { // 只显示前5个
        console.log(`  ${code.code}`)
      }
    })
    if (userCodes.length > 5) {
      console.log(`  ... 还有 ${userCodes.length - 5} 个邀请码`)
    }

    console.log('\n💡 使用说明:')
    console.log('  - 管理员邀请码可以多次使用')
    console.log('  - 普通邀请码只能使用一次')
    console.log('  - 邀请码验证: POST /api/invites/validate')

  } catch (error) {
    console.error('❌ 生成邀请码失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  generateInitialInvites()
}

module.exports = { generateInitialInvites }