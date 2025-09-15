const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * 更新工作流配置，将旧的 word_count_target 条件替换为 content_exists
 */
async function updateWorkflowConfigs() {
  console.log('🔄 开始更新工作流配置...')

  try {
    // 获取所有章节类型的工作流配置
    const chapterConfigs = await prisma.workflowConfig.findMany({
      where: {
        entityType: 'chapter'
      }
    })

    let updatedCount = 0

    for (const config of chapterConfigs) {
      try {
        const transitions = JSON.parse(config.transitions || '[]')
        let hasChanges = false

        // 检查并更新每个转换规则
        const updatedTransitions = transitions.map(transition => {
          if (transition.from === 'writing' && transition.to === 'reviewing') {
            // 检查是否使用了旧的 word_count_target 条件
            const hasWordCountTarget = transition.conditions?.some(
              condition => condition.type === 'word_count_target'
            )

            if (hasWordCountTarget) {
              console.log(`📝 更新配置 ${config.id}: writing -> reviewing`)
              hasChanges = true

              // 替换为新的条件
              return {
                ...transition,
                conditions: [{ type: 'content_exists' }]
              }
            }
          }
          return transition
        })

        // 如果有变化，更新数据库
        if (hasChanges) {
          await prisma.workflowConfig.update({
            where: { id: config.id },
            data: {
              transitions: JSON.stringify(updatedTransitions)
            }
          })
          updatedCount++
          console.log(`✅ 已更新工作流配置: ${config.id}`)
        }

      } catch (parseError) {
        console.warn(`⚠️ 配置解析失败 ${config.id}:`, parseError.message)

        // 如果解析失败，重置为默认配置
        const defaultTransitions = [
          { from: 'planning', to: 'outlined', conditions: [{ type: 'outline_exists' }], autoTrigger: true },
          { from: 'outlined', to: 'writing', conditions: [{ type: 'content_started' }], autoTrigger: true },
          { from: 'writing', to: 'reviewing', conditions: [{ type: 'content_exists' }], autoTrigger: false },
          { from: 'reviewing', to: 'editing', conditions: [{ type: 'consistency_check_passed' }], autoTrigger: false },
          { from: 'editing', to: 'completed', conditions: [{ type: 'manual_trigger' }], autoTrigger: false }
        ]

        await prisma.workflowConfig.update({
          where: { id: config.id },
          data: {
            transitions: JSON.stringify(defaultTransitions)
          }
        })
        updatedCount++
        console.log(`🔧 已重置工作流配置: ${config.id}`)
      }
    }

    console.log(`\n🎉 工作流配置更新完成!`)
    console.log(`📊 总计处理: ${chapterConfigs.length} 个配置`)
    console.log(`🔄 更新数量: ${updatedCount} 个配置`)

    if (updatedCount === 0) {
      console.log('✨ 所有配置都已是最新版本')
    }

  } catch (error) {
    console.error('❌ 更新工作流配置失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 如果直接运行此文件
if (require.main === module) {
  updateWorkflowConfigs()
    .then(() => {
      console.log('✅ 脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { updateWorkflowConfigs }