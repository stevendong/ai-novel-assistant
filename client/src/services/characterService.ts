import type { Character } from '@/types'

const API_BASE = '/api'

export interface CharacterCreateData {
  novelId: string
  name: string
  description?: string
  appearance?: string
  personality?: string
  background?: string
  relationships?: Record<string, any>
}

export interface CharacterUpdateData {
  name?: string
  description?: string
  appearance?: string
  personality?: string
  background?: string
  relationships?: Record<string, any>
  isLocked?: boolean
}

export interface CharacterEnhanceRequest {
  enhanceAspects?: string[]
  context?: string
  constraints?: Record<string, any>
}

export interface CharacterEnhanceResponse {
  suggestions: {
    personality?: string
    background?: string
    appearance?: string
  }
  questions: string[]
}

export interface CharacterDevelopRequest {
  developmentStage?: string
  targetTrait?: string
}

export interface CharacterDevelopResponse {
  arc: {
    beginning: string
    development: string
    climax: string
    resolution: string
  }
  keyMoments: Array<{
    chapter: number
    event: string
    impact: string
  }>
}

class CharacterService {
  // 获取小说的所有角色
  async getCharactersByNovel(novelId: string): Promise<Character[]> {
    const response = await fetch(`${API_BASE}/characters/novel/${novelId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch characters')
    }
    const characters = await response.json()
    
    // 解析relationships字段
    return characters.map((character: any) => this.parseCharacterData(character))
  }

  // 获取单个角色详情
  async getCharacter(id: string): Promise<Character> {
    const response = await fetch(`${API_BASE}/characters/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch character')
    }
    const character = await response.json()
    return this.parseCharacterData(character)
  }

  // 创建新角色
  async createCharacter(data: CharacterCreateData): Promise<Character> {
    const response = await fetch(`${API_BASE}/characters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        relationships: data.relationships || {}
      }),
    })
    
    if (!response.ok) {
      throw new Error('Failed to create character')
    }
    
    const character = await response.json()
    return this.parseCharacterData(character)
  }

  // 更新角色
  async updateCharacter(id: string, data: CharacterUpdateData): Promise<Character> {
    const response = await fetch(`${API_BASE}/characters/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      throw new Error('Failed to update character')
    }
    
    const character = await response.json()
    return this.parseCharacterData(character)
  }

  // 删除角色
  async deleteCharacter(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/characters/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      throw new Error('Failed to delete character')
    }
  }

  // AI完善角色
  async enhanceCharacter(id: string, request: CharacterEnhanceRequest): Promise<CharacterEnhanceResponse> {
    const response = await fetch(`${API_BASE}/characters/${id}/enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    
    if (!response.ok) {
      throw new Error('Failed to enhance character')
    }
    
    return await response.json()
  }

  // AI发展角色弧线
  async developCharacter(id: string, request: CharacterDevelopRequest): Promise<CharacterDevelopResponse> {
    const response = await fetch(`${API_BASE}/characters/${id}/develop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    
    if (!response.ok) {
      throw new Error('Failed to develop character')
    }
    
    return await response.json()
  }

  // 解析角色数据（处理relationships字段）
  private parseCharacterData(character: any): Character {
    return {
      ...character,
      relationships: character.relationships || {},
      chapterRefs: character.chapterRefs || [],
    }
  }
}

export const characterService = new CharacterService()