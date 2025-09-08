export interface Novel {
  id: string
  title: string
  description: string
  genre: string
  rating: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17'
  status: 'draft' | 'writing' | 'completed'
  createdAt: string
  updatedAt: string
}

export interface Character {
  id: string
  novelId: string
  name: string
  description: string
  appearance: string
  personality: string
  background: string
  relationships: Record<string, any>
  isLocked: boolean
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