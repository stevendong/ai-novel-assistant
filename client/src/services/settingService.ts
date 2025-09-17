import type { WorldSetting } from '@/types'
import { api, type ApiResponse } from '@/utils/api'

const API_BASE = '/api/settings'

export interface CreateSettingData {
  novelId: string
  type: 'worldview' | 'location' | 'rule' | 'culture'
  name: string
  description?: string
  details?: Record<string, any>
}

export interface UpdateSettingData {
  type?: 'worldview' | 'location' | 'rule' | 'culture'
  name?: string
  description?: string
  details?: Record<string, any>
  isLocked?: boolean
}

export const settingService = {
  async getByNovelId(novelId: string): Promise<WorldSetting[]> {
    try {
      const response = await api.get(`${API_BASE}/novel/${novelId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching settings:', error)
      throw error
    }
  },

  async getById(id: string): Promise<WorldSetting> {
    try {
      const response = await api.get(`${API_BASE}/${id}`)
      return response.data
    } catch (error) {
      console.error('Error fetching setting:', error)
      throw error
    }
  },

  async create(data: CreateSettingData): Promise<WorldSetting> {
    try {
      const response = await api.post(API_BASE, data)
      return response.data
    } catch (error) {
      console.error('Error creating setting:', error)
      throw error
    }
  },

  async update(id: string, data: UpdateSettingData): Promise<WorldSetting> {
    try {
      const response = await api.put(`${API_BASE}/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Error updating setting:', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await api.delete(`${API_BASE}/${id}`)
    } catch (error) {
      console.error('Error deleting setting:', error)
      throw error
    }
  },

  async enhance(id: string, expandAspects?: string[], plotRelevance?: string, expansionType?: string): Promise<any> {
    try {
      const response = await api.post(`${API_BASE}/${id}/enhance`, {
        expandAspects: expandAspects || [],
        plotRelevance,
        expansionType: expansionType || 'comprehensive'
      })

      return response.data
    } catch (error) {
      console.error('Error enhancing setting:', error)
      throw error
    }
  },

  async expand(id: string, focusAreas?: string[], detailLevel?: string): Promise<any> {
    try {
      const response = await api.post(`${API_BASE}/${id}/expand`, {
        focusAreas: focusAreas || [],
        detailLevel: detailLevel || 'standard'
      })

      return response.data
    } catch (error) {
      console.error('Error expanding setting:', error)
      throw error
    }
  },

  async getSuggestions(id: string, suggestionType?: string): Promise<any> {
    try {
      const response = await api.post(`${API_BASE}/${id}/suggestions`, { suggestionType: suggestionType || 'general' })

      return response.data
    } catch (error) {
      console.error('Error getting suggestions:', error)
      throw error
    }
  },

  async checkConsistency(id: string, scope?: string): Promise<any> {
    try {
      const response = await api.post(`${API_BASE}/${id}/consistency-check`, { scope: scope || 'setting' })

      return response.data
    } catch (error) {
      console.error('Error checking consistency:', error)
      throw error
    }
  },

  async applyEnhancement(id: string, enhancementData: {
    enhancedDescription?: string
    detailsFields?: Record<string, any>
    applyDescription?: boolean
    applyFields?: string[]
  }): Promise<any> {
    try {
      const response = await api.post(`${API_BASE}/${id}/apply-enhancement`, enhancementData)

      return response.data
    } catch (error) {
      console.error('Error applying enhancement:', error)
      throw error
    }
  },

  async batchGenerate(novelId: string, options: {
    settingTypes?: string[]
    generationMode?: string
    customPrompts?: Record<string, string>
    count?: Record<string, number>
  } = {}): Promise<any> {
    try {
      const response = await api.post(`${API_BASE}/batch-generate/${novelId}`, {
        settingTypes: options.settingTypes || ['worldview', 'location', 'rule', 'culture'],
        generationMode: options.generationMode || 'comprehensive',
        customPrompts: options.customPrompts || {},
        count: options.count || { worldview: 1, location: 2, rule: 1, culture: 1 }
      })

      return response.data
    } catch (error) {
      console.error('Error batch generating settings:', error)
      throw error
    }
  },

  async applyBatch(novelId: string, batchData: {
    generatedSettings: Record<string, any[]>
    selectedSettings: Array<{ type: string; index: number }>
  }): Promise<any> {
    try {
      const response = await api.post(`${API_BASE}/apply-batch/${novelId}`, batchData)

      return response.data
    } catch (error) {
      console.error('Error applying batch settings:', error)
      throw error
    }
  }
}