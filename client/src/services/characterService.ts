import type { Character } from '@/types'
import { api, type ApiResponse } from '@/utils/api'
import { getCurrentLocale } from '@/i18n'

const API_BASE = '/api'

export interface CharacterCreateData {
  novelId: string
  name: string
  description?: string
  age?: string
  gender?: string
  identity?: string
  appearance?: string
  personality?: string
  values?: string
  fears?: string
  background?: string
  skills?: string
  relationships?: Record<string, any>
}

export interface CharacterUpdateData {
  name?: string
  description?: string
  age?: string
  gender?: string
  identity?: string
  appearance?: string
  personality?: string
  values?: string
  fears?: string
  background?: string
  skills?: string
  relationships?: Record<string, any>
  isLocked?: boolean
  avatar?: string
  avatarKey?: string
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

export interface CharacterGenerateRequest {
  novelId: string
  prompt: string
  baseInfo?: {
    name?: string
    description?: string
  }
}

export interface CharacterGenerateResponse {
  character: {
    name?: string
    age?: string
    gender?: string
    identity?: string
    description: string
    appearance: string
    personality: string
    values: string
    fears: string
    background: string
    skills: string
  }
  reasoning?: string
  fallback?: boolean
  message?: string
}

class CharacterService {
  // 获取小说的所有角色
  async getCharactersByNovel(novelId: string): Promise<Character[]> {
    const response = await api.get(`${API_BASE}/characters/novel/${novelId}`)
    const characters = response.data
    
    // 解析relationships字段
    return characters.map((character: any) => this.parseCharacterData(character))
  }

  // 获取单个角色详情
  async getCharacter(id: string): Promise<Character> {
    const response = await api.get(`${API_BASE}/characters/${id}`)
    const character = response.data
    return this.parseCharacterData(character)
  }

  // 创建新角色
  async createCharacter(data: CharacterCreateData): Promise<Character> {
    const response = await api.post(`${API_BASE}/characters`, {
      ...data,
      relationships: data.relationships || {}
    })

    const character = response.data
    return this.parseCharacterData(character)
  }

  // 更新角色
  async updateCharacter(id: string, data: CharacterUpdateData): Promise<Character> {
    const response = await api.put(`${API_BASE}/characters/${id}`, data)

    const character = response.data
    return this.parseCharacterData(character)
  }

  // 删除角色
  async deleteCharacter(id: string): Promise<void> {
    await api.delete(`${API_BASE}/characters/${id}`)
  }

  // AI完善角色
  async enhanceCharacter(id: string, request: CharacterEnhanceRequest): Promise<CharacterEnhanceResponse> {
    const response = await api.post(`${API_BASE}/characters/${id}/enhance`, {
      ...request,
      locale: getCurrentLocale()
    })

    return response.data
  }

  // AI发展角色弧线
  async developCharacter(id: string, request: CharacterDevelopRequest): Promise<CharacterDevelopResponse> {
    const response = await api.post(`${API_BASE}/characters/${id}/develop`, {
      ...request,
      locale: getCurrentLocale()
    })

    return response.data
  }

  // AI生成新角色
  async generateCharacter(request: CharacterGenerateRequest): Promise<CharacterGenerateResponse> {
    const response = await api.post(`${API_BASE}/characters/generate`, {
      ...request,
      locale: getCurrentLocale()
    })

    return response.data
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
