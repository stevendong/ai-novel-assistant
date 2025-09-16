import type { WorldSetting } from '@/types'

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
      const response = await fetch(`${API_BASE}/novel/${novelId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching settings:', error)
      throw error
    }
  },

  async getById(id: string): Promise<WorldSetting> {
    try {
      const response = await fetch(`${API_BASE}/${id}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch setting: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching setting:', error)
      throw error
    }
  },

  async create(data: CreateSettingData): Promise<WorldSetting> {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create setting: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error creating setting:', error)
      throw error
    }
  },

  async update(id: string, data: UpdateSettingData): Promise<WorldSetting> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update setting: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error updating setting:', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete setting: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting setting:', error)
      throw error
    }
  },

  async enhance(id: string, expandAspects?: string[], plotRelevance?: string, expansionType?: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/${id}/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expandAspects: expandAspects || [],
          plotRelevance,
          expansionType: expansionType || 'comprehensive'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to enhance setting: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error enhancing setting:', error)
      throw error
    }
  },

  async expand(id: string, focusAreas?: string[], detailLevel?: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/${id}/expand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          focusAreas: focusAreas || [],
          detailLevel: detailLevel || 'standard'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to expand setting: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error expanding setting:', error)
      throw error
    }
  },

  async getSuggestions(id: string, suggestionType?: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/${id}/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ suggestionType: suggestionType || 'general' })
      })

      if (!response.ok) {
        throw new Error(`Failed to get suggestions: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting suggestions:', error)
      throw error
    }
  },

  async checkConsistency(id: string, scope?: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/${id}/consistency-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scope: scope || 'setting' })
      })

      if (!response.ok) {
        throw new Error(`Failed to check consistency: ${response.statusText}`)
      }

      return await response.json()
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
      const response = await fetch(`${API_BASE}/${id}/apply-enhancement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(enhancementData)
      })

      if (!response.ok) {
        throw new Error(`Failed to apply enhancement: ${response.statusText}`)
      }

      return await response.json()
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
      const response = await fetch(`${API_BASE}/batch-generate/${novelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settingTypes: options.settingTypes || ['worldview', 'location', 'rule', 'culture'],
          generationMode: options.generationMode || 'comprehensive',
          customPrompts: options.customPrompts || {},
          count: options.count || { worldview: 1, location: 2, rule: 1, culture: 1 }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to batch generate settings: ${response.statusText}`)
      }

      return await response.json()
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
      const response = await fetch(`${API_BASE}/apply-batch/${novelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchData)
      })

      if (!response.ok) {
        throw new Error(`Failed to apply batch settings: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error applying batch settings:', error)
      throw error
    }
  }
}