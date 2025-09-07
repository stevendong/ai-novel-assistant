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

export interface Chapter {
  id: string
  novelId: string
  chapterNumber: number
  title: string
  outline: string
  content: string
  plotPoints: Record<string, any>
  illustrations: Record<string, any>
  status: 'planning' | 'writing' | 'reviewing' | 'completed'
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