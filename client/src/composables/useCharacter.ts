import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import type { Character } from '@/types'
import { 
  characterService, 
  type CharacterCreateData, 
  type CharacterUpdateData,
  type CharacterEnhanceRequest,
  type CharacterEnhanceResponse,
  type CharacterDevelopRequest,
  type CharacterDevelopResponse
} from '@/services/characterService'
import { useProjectStore } from '@/stores/project'

export function useCharacter() {
  const projectStore = useProjectStore()
  
  const characters = ref<Character[]>([])
  const currentCharacter = ref<Character | null>(null)
  const loading = ref(false)
  const enhancing = ref(false)
  const developing = ref(false)
  
  // 计算属性
  const characterCount = computed(() => characters.value.length)
  const hasCharacters = computed(() => characters.value.length > 0)
  
  // 加载小说的所有角色
  const loadCharacters = async (novelId?: string) => {
    const targetNovelId = novelId || projectStore.currentProject?.id
    if (!targetNovelId) {
      characters.value = []
      return
    }
    
    try {
      loading.value = true
      const result = await characterService.getCharactersByNovel(targetNovelId)
      characters.value = result
    } catch (error) {
      console.error('Failed to load characters:', error)
      message.error('加载角色列表失败')
      characters.value = []
    } finally {
      loading.value = false
    }
  }
  
  // 获取单个角色详情
  const getCharacter = async (id: string): Promise<Character | null> => {
    try {
      const character = await characterService.getCharacter(id)
      currentCharacter.value = character
      return character
    } catch (error) {
      console.error('Failed to get character:', error)
      message.error('获取角色详情失败')
      return null
    }
  }
  
  // 创建新角色
  const createCharacter = async (data: Omit<CharacterCreateData, 'novelId'>): Promise<Character | null> => {
    const currentProject = projectStore.currentProject
    if (!currentProject) {
      message.error('请先选择项目')
      return null
    }
    
    try {
      loading.value = true
      const newCharacter = await characterService.createCharacter({
        ...data,
        novelId: currentProject.id
      })
      
      // 添加到角色列表
      characters.value.push(newCharacter)
      
      message.success('角色创建成功')
      return newCharacter
    } catch (error) {
      console.error('Failed to create character:', error)
      message.error('创建角色失败')
      return null
    } finally {
      loading.value = false
    }
  }
  
  // 更新角色信息
  const updateCharacter = async (id: string, data: CharacterUpdateData): Promise<Character | null> => {
    try {
      loading.value = true
      const updatedCharacter = await characterService.updateCharacter(id, data)
      
      // 更新角色列表中的数据
      const index = characters.value.findIndex(c => c.id === id)
      if (index !== -1) {
        characters.value[index] = updatedCharacter
      }
      
      // 更新当前角色
      if (currentCharacter.value?.id === id) {
        currentCharacter.value = updatedCharacter
      }
      
      message.success('角色更新成功')
      return updatedCharacter
    } catch (error) {
      console.error('Failed to update character:', error)
      message.error('更新角色失败')
      return null
    } finally {
      loading.value = false
    }
  }
  
  // 删除角色
  const deleteCharacter = async (id: string): Promise<boolean> => {
    try {
      loading.value = true
      await characterService.deleteCharacter(id)
      
      // 从角色列表中移除
      characters.value = characters.value.filter(c => c.id !== id)
      
      // 清除当前角色
      if (currentCharacter.value?.id === id) {
        currentCharacter.value = null
      }
      
      message.success('角色删除成功')
      return true
    } catch (error) {
      console.error('Failed to delete character:', error)
      message.error('删除角色失败')
      return false
    } finally {
      loading.value = false
    }
  }
  
  // AI完善角色
  const enhanceCharacter = async (
    id: string, 
    request: CharacterEnhanceRequest
  ): Promise<CharacterEnhanceResponse | null> => {
    try {
      enhancing.value = true
      const result = await characterService.enhanceCharacter(id, request)
      message.success('AI完善建议生成成功')
      return result
    } catch (error) {
      console.error('Failed to enhance character:', error)
      message.error('AI完善角色失败')
      return null
    } finally {
      enhancing.value = false
    }
  }
  
  // AI发展角色弧线
  const developCharacter = async (
    id: string, 
    request: CharacterDevelopRequest
  ): Promise<CharacterDevelopResponse | null> => {
    try {
      developing.value = true
      const result = await characterService.developCharacter(id, request)
      message.success('AI角色弧线生成成功')
      return result
    } catch (error) {
      console.error('Failed to develop character:', error)
      message.error('AI发展角色弧线失败')
      return null
    } finally {
      developing.value = false
    }
  }
  
  // 根据名称查找角色
  const findCharacterByName = (name: string): Character | undefined => {
    return characters.value.find(c => c.name === name)
  }
  
  // 根据ID查找角色
  const findCharacterById = (id: string): Character | undefined => {
    return characters.value.find(c => c.id === id)
  }
  
  // 搜索角色
  const searchCharacters = (keyword: string): Character[] => {
    if (!keyword.trim()) {
      return characters.value
    }
    
    const lowerKeyword = keyword.toLowerCase()
    return characters.value.filter(character => 
      character.name.toLowerCase().includes(lowerKeyword) ||
      character.description?.toLowerCase().includes(lowerKeyword) ||
      character.personality?.toLowerCase().includes(lowerKeyword)
    )
  }
  
  // 过滤锁定状态的角色
  const filterCharactersByLocked = (isLocked: boolean): Character[] => {
    return characters.value.filter(c => c.isLocked === isLocked)
  }
  
  return {
    // 状态
    characters,
    currentCharacter,
    loading,
    enhancing,
    developing,
    
    // 计算属性
    characterCount,
    hasCharacters,
    
    // 方法
    loadCharacters,
    getCharacter,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    enhanceCharacter,
    developCharacter,
    findCharacterByName,
    findCharacterById,
    searchCharacters,
    filterCharactersByLocked
  }
}