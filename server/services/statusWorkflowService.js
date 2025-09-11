const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

class StatusWorkflowService {
  constructor() {
    this.novelStatuses = ['concept', 'draft', 'planning', 'writing', 'editing', 'completed', 'published']
    this.chapterStatuses = ['planning', 'outlined', 'writing', 'reviewing', 'editing', 'completed']
    
    this.defaultTransitions = {
      novel: [
        { from: 'concept', to: 'draft', conditions: [{ type: 'basic_info_complete' }], autoTrigger: true },
        { from: 'draft', to: 'planning', conditions: [{ type: 'characters_created' }], autoTrigger: false },
        { from: 'planning', to: 'writing', conditions: [{ type: 'has_chapters' }], autoTrigger: true },
        { from: 'writing', to: 'editing', conditions: [{ type: 'all_chapters_completed' }], autoTrigger: true },
        { from: 'editing', to: 'completed', conditions: [{ type: 'manual_trigger' }], autoTrigger: false },
        { from: 'completed', to: 'published', conditions: [{ type: 'manual_trigger' }], autoTrigger: false }
      ],
      chapter: [
        { from: 'planning', to: 'outlined', conditions: [{ type: 'outline_exists' }], autoTrigger: true },
        { from: 'outlined', to: 'writing', conditions: [{ type: 'content_started' }], autoTrigger: true },
        { from: 'writing', to: 'reviewing', conditions: [{ type: 'word_count_target', value: 0.8 }], autoTrigger: false },
        { from: 'reviewing', to: 'editing', conditions: [{ type: 'consistency_check_passed' }], autoTrigger: false },
        { from: 'editing', to: 'completed', conditions: [{ type: 'manual_trigger' }], autoTrigger: false }
      ]
    }
  }

  async calculateNovelStatus(novelId) {
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: {
        chapters: true,
        characters: true,
        settings: true
      }
    })

    if (!novel) throw new Error('Novel not found')

    const chapters = novel.chapters
    const totalChapters = chapters.length
    
    if (totalChapters === 0) {
      if (novel.characters.length > 0 || novel.settings.length > 0) {
        return 'planning'
      }
      return novel.title && novel.description ? 'draft' : 'concept'
    }

    const completedChapters = chapters.filter(ch => ch.status === 'completed').length
    const editingChapters = chapters.filter(ch => ch.status === 'editing').length
    const writingChapters = chapters.filter(ch => ['writing', 'reviewing'].includes(ch.status)).length

    if (completedChapters === totalChapters) {
      return 'editing'
    } else if (writingChapters > 0 || completedChapters > 0 || editingChapters > 0) {
      return 'writing'  
    } else {
      return 'planning'
    }
  }

  async canTransition(entityType, entityId, toStatus, triggeredBy = 'user') {
    try {
      let entity
      if (entityType === 'novel') {
        entity = await prisma.novel.findUnique({
          where: { id: entityId },
          include: { chapters: true, characters: true, settings: true }
        })
      } else if (entityType === 'chapter') {
        entity = await prisma.chapter.findUnique({
          where: { id: entityId },
          include: { novel: true }
        })
      }

      if (!entity) return { canTransition: false, reason: 'Entity not found' }

      const workflow = await this.getWorkflow(
        entityType === 'novel' ? entityId : entity.novelId, 
        entityType
      )
      
      const currentStatus = entity.status
      const transition = workflow.transitions.find(t => t.from === currentStatus && t.to === toStatus)
      
      if (!transition) {
        return { canTransition: false, reason: 'Invalid transition' }
      }

      for (const condition of transition.conditions) {
        const check = await this.checkCondition(condition, entity, entityType)
        if (!check.passed) {
          return { canTransition: false, reason: check.reason }
        }
      }

      return { canTransition: true }
    } catch (error) {
      console.error('Error checking transition:', error)
      return { canTransition: false, reason: error.message }
    }
  }

  async checkCondition(condition, entity, entityType) {
    switch (condition.type) {
      case 'basic_info_complete':
        return {
          passed: entity.title && entity.description,
          reason: '需要完善基本信息'
        }
      
      case 'characters_created':
        const charCount = entityType === 'novel' 
          ? entity.characters.length 
          : await prisma.character.count({ where: { novelId: entity.novelId } })
        return {
          passed: charCount > 0,
          reason: '需要创建角色'
        }
      
      case 'has_chapters':
        const chapterCount = entityType === 'novel'
          ? entity.chapters.length
          : await prisma.chapter.count({ where: { novelId: entity.novelId } })
        return {
          passed: chapterCount > 0,
          reason: '需要创建章节'
        }
      
      case 'all_chapters_completed':
        const chapters = entityType === 'novel'
          ? entity.chapters
          : await prisma.chapter.findMany({ where: { novelId: entity.novelId } })
        const completedCount = chapters.filter(ch => ch.status === 'completed').length
        return {
          passed: chapters.length > 0 && completedCount === chapters.length,
          reason: '需要完成所有章节'
        }
      
      case 'outline_exists':
        return {
          passed: entity.outline && entity.outline.trim().length > 0,
          reason: '需要完善章节大纲'
        }
      
      case 'content_started':
        return {
          passed: entity.content && entity.content.trim().length > 0,
          reason: '需要开始写作内容'
        }
      
      case 'word_count_target':
        const targetWordCount = entity.novel?.targetWordCount || 3000
        const currentWordCount = entity.wordCount || 0
        const threshold = condition.value || 0.8
        return {
          passed: currentWordCount >= (targetWordCount * threshold),
          reason: `字数需要达到目标的${Math.round(threshold * 100)}%`
        }
      
      case 'consistency_check_passed':
        const unresolvedIssues = await prisma.consistencyCheck.count({
          where: { chapterId: entity.id, resolved: false }
        })
        return {
          passed: unresolvedIssues === 0,
          reason: '需要解决一致性检查问题'
        }
      
      case 'manual_trigger':
        return { passed: true, reason: '' }
      
      default:
        return { passed: false, reason: `未知条件类型: ${condition.type}` }
    }
  }

  async transitionStatus(entityType, entityId, toStatus, triggeredBy = 'user', reason = '') {
    try {
      const canCheck = await this.canTransition(entityType, entityId, toStatus, triggeredBy)
      if (!canCheck.canTransition) {
        throw new Error(canCheck.reason)
      }

      let entity, fromStatus
      if (entityType === 'novel') {
        entity = await prisma.novel.findUnique({ where: { id: entityId } })
        fromStatus = entity.status
        
        await prisma.novel.update({
          where: { id: entityId },
          data: { status: toStatus, updatedAt: new Date() }
        })
      } else if (entityType === 'chapter') {
        entity = await prisma.chapter.findUnique({ where: { id: entityId } })
        fromStatus = entity.status
        
        await prisma.chapter.update({
          where: { id: entityId },
          data: { status: toStatus, updatedAt: new Date() }
        })

        await this.checkAndUpdateNovelStatus(entity.novelId)
      }

      await this.recordStatusChange(entityType, entityId, fromStatus, toStatus, triggeredBy, reason)

      return { success: true, fromStatus, toStatus }
    } catch (error) {
      console.error('Error transitioning status:', error)
      throw error
    }
  }

  async checkAndUpdateNovelStatus(novelId) {
    try {
      const calculatedStatus = await this.calculateNovelStatus(novelId)
      const current = await prisma.novel.findUnique({ where: { id: novelId } })
      
      if (current.status !== calculatedStatus) {
        const canCheck = await this.canTransition('novel', novelId, calculatedStatus, 'system')
        if (canCheck.canTransition) {
          await this.transitionStatus('novel', novelId, calculatedStatus, 'system', 'Auto-updated based on chapter progress')
        }
      }
    } catch (error) {
      console.error('Error auto-updating novel status:', error)
    }
  }

  async recordStatusChange(entityType, entityId, fromStatus, toStatus, triggeredBy, reason) {
    await prisma.statusHistory.create({
      data: {
        entityType,
        entityId,
        fromStatus,
        toStatus,
        triggeredBy,
        reason,
        metadata: JSON.stringify({
          timestamp: new Date().toISOString(),
          userAgent: 'system'
        })
      }
    })
  }

  async getWorkflow(novelId, entityType) {
    let config = await prisma.workflowConfig.findUnique({
      where: {
        novelId_entityType: {
          novelId,
          entityType
        }
      }
    })

    if (!config) {
      config = await this.createDefaultWorkflow(novelId, entityType)
    }

    return {
      id: config.id,
      transitions: JSON.parse(config.transitions),
      isActive: config.isActive
    }
  }

  async createDefaultWorkflow(novelId, entityType) {
    const transitions = this.defaultTransitions[entityType] || []
    
    return await prisma.workflowConfig.create({
      data: {
        novelId,
        entityType,
        transitions: JSON.stringify(transitions),
        isActive: true
      }
    })
  }

  async getStatusHistory(entityType, entityId, limit = 10) {
    return await prisma.statusHistory.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  async getAvailableTransitions(entityType, entityId) {
    try {
      let entity
      if (entityType === 'novel') {
        entity = await prisma.novel.findUnique({ where: { id: entityId } })
      } else if (entityType === 'chapter') {
        entity = await prisma.chapter.findUnique({ where: { id: entityId } })
      }

      if (!entity) return []

      const workflow = await this.getWorkflow(
        entityType === 'novel' ? entityId : entity.novelId,
        entityType
      )

      const currentStatus = entity.status
      const availableTransitions = []

      for (const transition of workflow.transitions) {
        if (transition.from === currentStatus) {
          const check = await this.canTransition(entityType, entityId, transition.to)
          availableTransitions.push({
            ...transition,
            canTransition: check.canTransition,
            reason: check.reason
          })
        }
      }

      return availableTransitions
    } catch (error) {
      console.error('Error getting available transitions:', error)
      return []
    }
  }
}

module.exports = new StatusWorkflowService()