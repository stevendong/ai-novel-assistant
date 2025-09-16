export interface Novel {
  id: string
  title: string
  description: string
  genre: string
  rating: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17'
  status: 'draft' | 'writing' | 'completed'
  wordCount?: number
  targetWordCount?: number
  createdAt: string
  updatedAt: string
  _count?: {
    chapters: number
    characters: number
    settings: number
  }
  aiSettings?: AIConstraint
}

export interface Character {
  id: string
  novelId: string
  name: string
  description?: string
  appearance?: string
  personality?: string
  background?: string
  age?: string
  identity?: string
  values?: string
  fears?: string
  skills?: string
  relationships: Record<string, any>
  isLocked: boolean
  chapterRefs?: any[]
  _count?: {
    chapterRefs: number
  }
  createdAt?: string
  updatedAt?: string
}

export interface WorldSetting {
  id: string
  novelId: string
  type: 'worldview' | 'location' | 'rule' | 'culture'
  name: string
  description: string
  details: Record<string, any>
  isLocked: boolean
}

// 情节要点
export interface PlotPoint {
  type: 'conflict' | 'discovery' | 'emotion' | 'action' | 'dialogue'
  description: string
}

// 插图信息
export interface Illustration {
  position: 'beginning' | 'middle' | 'end' | 'custom'
  description: string
  customPosition?: number // 自定义位置（段落号）
}

// 章节角色关联
export interface ChapterCharacter {
  characterId: string
  character: Character
  role: 'main' | 'supporting' | 'mentioned'
}

// 章节设定关联
export interface ChapterSetting {
  settingId: string
  setting: WorldSetting
  usage: string
}

export interface Chapter {
  id: string
  novelId: string
  chapterNumber: number
  title: string
  outline: string
  content: string
  plotPoints: PlotPoint[]
  illustrations: Illustration[]
  status: 'planning' | 'writing' | 'reviewing' | 'completed'
  wordCount?: number
  targetWordCount?: number
  progress?: number
  characters: ChapterCharacter[]
  settings: ChapterSetting[]
  consistencyLog: ConsistencyCheck[]
  createdAt: string
  updatedAt: string
}

export interface AIConstraint {
  id: string
  novelId: string
  rating: string
  violence: number
  romance: number
  language: number
  customRules: Record<string, any>
}

export interface ConsistencyCheck {
  id: string
  chapterId: string
  type: 'character' | 'setting' | 'timeline' | 'logic'
  issue: string
  severity: 'low' | 'medium' | 'high'
  resolved: boolean
  createdAt: string
}

// 项目统计相关类型
export interface NovelStatistics {
  overview: {
    totalWords: number
    targetWordCount: number
    writingDays: number
    averageWordsPerDay: number
    overallProgress: number
    estimatedCompletionDate: string | null
  }
  chapters: {
    total: number
    completed: number
    writing: number
    planning: number
  }
  counts: {
    characters: number
    settings: number
  }
  recentActivity: {
    todayWords: number
    weekWords: number
    monthWords: number
  }
}

export interface ChapterProgress {
  id: string
  chapterNumber: number
  title: string
  status: 'planning' | 'writing' | 'reviewing' | 'completed'
  wordCount: number
  progress: number
  updatedAt: string
}

export interface WritingGoals {
  daily: {
    target: number
    achieved: number
    progress: number
  }
  weekly: {
    target: number
    achieved: number
    progress: number
  }
  monthly: {
    target: number
    achieved: number
    progress: number
  }
}

export interface ProjectOverviewStats {
  projects: {
    total: number
    draft: number
    writing: number
    completed: number
  }
  content: {
    totalWords: number
    totalChapters: number
  }
}

// 成就徽章
export interface Achievement {
  id: string
  icon: string
  title: string
  description: string
  earned: boolean
}

// 状态流转相关类型
export interface StatusTransition {
  from: string
  to: string
  conditions: TransitionCondition[]
  autoTrigger: boolean
  validation?: ValidationRule[]
  canTransition?: boolean
  reason?: string
}

export interface TransitionCondition {
  type: string
  value?: any
}

export interface ValidationRule {
  type: string
  value?: any
}

export interface StatusHistory {
  id: string
  entityType: 'novel' | 'chapter'
  entityId: string
  fromStatus?: string
  toStatus: string
  triggeredBy: 'user' | 'system'
  reason?: string
  metadata?: string
  createdAt: string
}

export interface WorkflowConfig {
  id: string
  novelId?: string
  entityType: 'novel' | 'chapter'
  transitions: StatusTransition[]
  isActive: boolean
}