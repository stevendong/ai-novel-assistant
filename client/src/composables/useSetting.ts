import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import type { WorldSetting } from '@/types'
import { settingService, type CreateSettingData, type UpdateSettingData } from '@/services/settingService'

export function useSetting() {
  const settings = ref<WorldSetting[]>([])
  const loading = ref(false)
  const selectedSetting = ref<WorldSetting | null>(null)
  const editingSetting = ref<any>({})

  const getSettingsByType = (type: string) => {
    return computed(() => settings.value.filter(setting => setting.type === type))
  }

  const getSettingById = (id: string) => {
    return computed(() => settings.value.find(setting => setting.id === id))
  }

  const loadSettings = async (novelId: string) => {
    try {
      loading.value = true
      const result = await settingService.getByNovelId(novelId)
      settings.value = result
    } catch (error) {
      console.error('Load settings failed:', error)
      message.error('加载设定失败，请重试')
      throw error
    } finally {
      loading.value = false
    }
  }

  const loadSetting = async (id: string) => {
    try {
      loading.value = true
      const setting = await settingService.getById(id)
      const index = settings.value.findIndex(s => s.id === id)
      if (index !== -1) {
        settings.value[index] = setting
      } else {
        settings.value.push(setting)
      }
      return setting
    } catch (error) {
      console.error('Load setting failed:', error)
      message.error('加载设定失败，请重试')
      throw error
    } finally {
      loading.value = false
    }
  }

  const createSetting = async (data: CreateSettingData) => {
    try {
      loading.value = true
      const newSetting = await settingService.create(data)
      settings.value.push(newSetting)
      message.success('创建成功')
      return newSetting
    } catch (error) {
      console.error('Create setting failed:', error)
      message.error('创建失败，请重试')
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateSetting = async (id: string, data: UpdateSettingData) => {
    try {
      loading.value = true
      const updatedSetting = await settingService.update(id, data)
      const index = settings.value.findIndex(s => s.id === id)
      if (index !== -1) {
        settings.value[index] = { ...settings.value[index], ...updatedSetting }
      }
      message.success('保存成功')
      return updatedSetting
    } catch (error) {
      console.error('Update setting failed:', error)
      message.error('保存失败，请重试')
      throw error
    } finally {
      loading.value = false
    }
  }

  const deleteSetting = async (id: string) => {
    try {
      loading.value = true
      await settingService.delete(id)
      settings.value = settings.value.filter(s => s.id !== id)
      if (selectedSetting.value?.id === id) {
        selectedSetting.value = null
        editingSetting.value = {}
      }
      message.success('删除成功')
    } catch (error) {
      console.error('Delete setting failed:', error)
      message.error('删除失败，请重试')
      throw error
    } finally {
      loading.value = false
    }
  }

  const toggleLock = async (id: string) => {
    const setting = settings.value.find(s => s.id === id)
    if (!setting) return

    try {
      loading.value = true
      const updatedSetting = await settingService.update(id, {
        isLocked: !setting.isLocked
      })
      
      setting.isLocked = updatedSetting.isLocked
      if (selectedSetting.value?.id === id) {
        selectedSetting.value.isLocked = updatedSetting.isLocked
        editingSetting.value.isLocked = updatedSetting.isLocked
      }
      
      message.success(updatedSetting.isLocked ? '设定已锁定' : '设定已解锁')
      return updatedSetting
    } catch (error) {
      console.error('Toggle lock failed:', error)
      message.error('操作失败，请重试')
      throw error
    } finally {
      loading.value = false
    }
  }

  const enhanceSetting = async (id: string, expandAspects?: string[], plotRelevance?: string) => {
    try {
      loading.value = true
      const result = await settingService.enhance(id, expandAspects, plotRelevance)
      message.success('AI分析完成')
      return result
    } catch (error) {
      console.error('Enhance setting failed:', error)
      message.error('AI分析失败，请重试')
      throw error
    } finally {
      loading.value = false
    }
  }

  const expandSetting = async (id: string, focusAreas?: string[]) => {
    try {
      loading.value = true
      const result = await settingService.expand(id, focusAreas)
      message.success('AI扩展完成')
      return result
    } catch (error) {
      console.error('Expand setting failed:', error)
      message.error('AI扩展失败，请重试')
      throw error
    } finally {
      loading.value = false
    }
  }

  const selectSetting = (setting: WorldSetting) => {
    selectedSetting.value = setting
    editingSetting.value = {
      ...setting,
      details: setting.details ? { ...setting.details } : {},
      relations: [] // 这里可以加载关联信息
    }
  }

  const clearSelection = () => {
    selectedSetting.value = null
    editingSetting.value = {}
  }

  return {
    settings,
    loading,
    selectedSetting,
    editingSetting,
    
    getSettingsByType,
    getSettingById,
    loadSettings,
    loadSetting,
    createSetting,
    updateSetting,
    deleteSetting,
    toggleLock,
    enhanceSetting,
    expandSetting,
    selectSetting,
    clearSelection
  }
}