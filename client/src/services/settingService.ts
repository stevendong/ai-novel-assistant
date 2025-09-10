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

  async enhance(id: string, expandAspects?: string[], plotRelevance?: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/${id}/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expandAspects, plotRelevance })
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

  async expand(id: string, focusAreas?: string[]): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/${id}/expand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ focusAreas })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to expand setting: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error expanding setting:', error)
      throw error
    }
  }
}