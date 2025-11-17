<template>
  <div class="character-management h-full flex">
    <!-- Left: Character List -->
    <div class="w-80 flex-shrink-0">
      <CharacterList
        :characters="filteredCharacters"
        :selected-id="selectedCharacter?.id"
        @select="selectCharacter"
        @add="showAddCharacterModal = true"
        @search="handleSearch"
      />
    </div>

    <!-- Right: Character Details -->
    <div class="flex-1 flex">
      <div class="flex-1 overflow-hidden">
        <CharacterDetail
          :character="selectedCharacter"
          :enhancing="enhancing"
          :exporting="exporting"
          @save="saveCharacter"
          @change-avatar="openAvatarSelector"
          @start-chat="startCharacterChat"
          @enhance="requestAIEnhancement"
          @export="exportCharacterCard"
          @toggle-lock="toggleLock"
          @delete="confirmDeleteCharacter"
        />
      </div>

      <!-- AI Enhancement Panel -->
      <div v-if="showAISuggestionsPanel" class="w-96 flex-shrink-0">
        <AIEnhancementPanel
          :visible="showAISuggestionsPanel"
          :result="aiEnhancementResult"
          @close="showAISuggestionsPanel = false"
          @apply="applySuggestion"
          @apply-all="applyAllSuggestions"
        />
      </div>
    </div>

    <!-- Modals -->
    <CharacterFormModal
      v-model:visible="showAddCharacterModal"
      :creating="loading"
      :generating="generatingCharacter"
      :ai-result="aiGeneratedCharacter"
      @create="createNewCharacter"
      @generate="generateAICharacter"
      @clear-a-i="clearAIGeneration"
      @select-card="openCardSelector"
    />

    <CharacterImportProgress
      :visible="showImportProgressModal"
      :step="importStep"
      :status-text="importStatusText"
      :loading="importing"
      :error="importError"
      :preview-data="importPreviewData"
      :complete="importComplete"
      @close="closeImportProgress"
      @view="viewImportedCharacter"
    />

    <!-- File Selectors -->
    <FileSelectorModal
      v-model:visible="showCardSelectorModal"
      :accept="['image/png']"
      :category="'character'"
      :novel-id="novelId"
      @select="handleCardFileSelect"
    />

    <FileSelectorModal
      v-model:visible="showAvatarSelectorModal"
      :accept="['image/*']"
      category="character"
      :novel-id="novelId"
      @select="handleAvatarFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import type { Character } from '@/types'
import { useCharacter } from '@/composables/useCharacter'
import { useProjectStore } from '@/stores/project'
import { useAIChatStore } from '@/stores/aiChat'
import { apiClient } from '@/utils/api'
import CharacterList from './CharacterList.vue'
import CharacterDetail from './CharacterDetail.vue'
import CharacterFormModal from './CharacterFormModal.vue'
import CharacterImportProgress from './CharacterImportProgress.vue'
import AIEnhancementPanel from './AIEnhancementPanel.vue'
import FileSelectorModal from '@/components/file/FileSelectorModal.vue'

const { t } = useI18n()
const projectStore = useProjectStore()
const chatStore = useAIChatStore()

const emit = defineEmits(['open-ai-panel'])

const {
  characters,
  currentCharacter,
  loading,
  enhancing,
  loadCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter: deleteCharacterAPI,
  enhanceCharacter,
  generateCharacter,
  searchCharacters
} = useCharacter()

// State
const selectedCharacter = ref<Character | null>(null)
const searchQuery = ref('')
const showAddCharacterModal = ref(false)
const showAISuggestionsPanel = ref(false)
const aiEnhancementResult = ref<any>(null)
const generatingCharacter = ref(false)
const aiGeneratedCharacter = ref(null)
const exporting = ref(false)
const importing = ref(false)

// Card selection & import
const showCardSelectorModal = ref(false)
const showImportProgressModal = ref(false)
const importStep = ref(0)
const importStatusText = ref(t('character.prepareImport'))
const importPreviewData = ref<any>(null)
const importError = ref('')
const importComplete = ref(false)
const importedCharacterId = ref('')

// Avatar selection
const showAvatarSelectorModal = ref(false)

const novelId = computed(() => projectStore.currentProject?.id || '')

const filteredCharacters = computed(() => {
  if (!searchQuery.value) return characters.value
  return searchCharacters(searchQuery.value)
})

// Lifecycle
onMounted(() => {
  if (novelId.value) {
    loadCharacters()
  }
})

// Watch for project changes to reload characters
watch(novelId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    loadCharacters()
    selectedCharacter.value = null
  }
})

// Character Selection
const selectCharacter = async (character: Character) => {
  const full = await getCharacter(character.id)
  if (full) {
    selectedCharacter.value = full
  }
}

// Search
const handleSearch = (query: string) => {
  searchQuery.value = query
}

// Create Character
const createNewCharacter = async (data: any) => {
  const character = await createCharacter(data)
  if (character) {
    showAddCharacterModal.value = false
    await selectCharacter(character)
    clearAIGeneration()
  }
}

// AI Generation
const generateAICharacter = async (prompt: string) => {
  generatingCharacter.value = true
  try {
    const result = await generateCharacter({ prompt })
    if (result) {
      aiGeneratedCharacter.value = result.character
    }
  } finally {
    generatingCharacter.value = false
  }
}

const clearAIGeneration = () => {
  aiGeneratedCharacter.value = null
  generatingCharacter.value = false
}

// Save Character
const saveCharacter = async (data: Partial<Character>) => {
  if (!selectedCharacter.value) return

  const updated = await updateCharacter(selectedCharacter.value.id, data)
  if (updated) {
    selectedCharacter.value = updated
  }
}

// AI Enhancement
const requestAIEnhancement = async () => {
  if (!selectedCharacter.value) return

  const result = await enhanceCharacter(selectedCharacter.value.id, {})
  if (result) {
    aiEnhancementResult.value = result
    showAISuggestionsPanel.value = true
  }
}

const applySuggestion = async (field: string, value: string) => {
  if (!selectedCharacter.value) return

  const updated = await updateCharacter(selectedCharacter.value.id, {
    [field]: value
  })
  if (updated) {
    selectedCharacter.value = updated
    message.success(t('character.suggestionApplied'))
  }
}

const applyAllSuggestions = async (suggestions: Record<string, string>) => {
  if (!selectedCharacter.value) return

  const updated = await updateCharacter(selectedCharacter.value.id, suggestions)
  if (updated) {
    selectedCharacter.value = updated
    message.success(t('character.allSuggestionsApplied'))
    showAISuggestionsPanel.value = false
  }
}

// Avatar
const openAvatarSelector = () => {
  showAvatarSelectorModal.value = true
}

const handleAvatarFileSelect = async (file: any) => {
  if (!file || !file.fileUrl || !selectedCharacter.value) {
    message.warning(t('character.selectValidImage'))
    return
  }

  const updated = await updateCharacter(selectedCharacter.value.id, {
    avatar: file.fileUrl,
    avatarKey: file.fileKey || ''
  })

  if (updated) {
    selectedCharacter.value = updated
    const charIndex = characters.value.findIndex(c => c.id === selectedCharacter.value!.id)
    if (charIndex !== -1) {
      characters.value[charIndex].avatar = file.fileUrl
    }
    message.success(t('character.avatarUpdateSuccess'))
    showAvatarSelectorModal.value = false
  }
}

// Lock/Unlock
const toggleLock = async () => {
  if (!selectedCharacter.value) return

  const updated = await updateCharacter(selectedCharacter.value.id, {
    isLocked: !selectedCharacter.value.isLocked
  })

  if (updated) {
    selectedCharacter.value = updated
  }
}

// Delete
const confirmDeleteCharacter = () => {
  if (!selectedCharacter.value) return

  Modal.confirm({
    title: t('common.confirmDelete'),
    content: `${t('character.deleteConfirm')} "${selectedCharacter.value.name}" ${t('character.deleteConfirmSuffix')} ${t('common.irreversible')}`,
    okText: t('common.delete'),
    okType: 'danger',
    cancelText: t('common.cancel'),
    onOk: async () => {
      if (selectedCharacter.value) {
        const success = await deleteCharacterAPI(selectedCharacter.value.id)
        if (success) {
          selectedCharacter.value = null
        }
      }
    }
  })
}

// Export
const exportCharacterCard = async () => {
  if (!selectedCharacter.value) return

  exporting.value = true

  try {
    const response = await apiClient.getAxiosInstance().get(
      `/api/characters/${selectedCharacter.value.id}/export-card`,
      {
        responseType: 'blob'
      }
    )

    const blob = new Blob([response.data], { type: 'image/png' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedCharacter.value.name}_card.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    message.success(t('character.exportSuccess'))
  } catch (error) {
    console.error('导出失败:', error)
    message.error(t('character.exportFailure'))
  } finally {
    exporting.value = false
  }
}

// Import Card
const openCardSelector = () => {
  showAddCharacterModal.value = false
  showCardSelectorModal.value = true
}

const handleCardFileSelect = async (file: any) => {
  if (!file || !file.fileUrl) {
    message.warning(t('character.selectValidCard'))
    return
  }

  if (!projectStore.currentProject) {
    message.error(t('project.selectProjectFirst'))
    return
  }

  showCardSelectorModal.value = false
  showImportProgressModal.value = true
  importing.value = true
  importStep.value = 0
  importStatusText.value = t('character.readingFile')
  importPreviewData.value = null
  importError.value = ''
  importComplete.value = false
  importedCharacterId.value = ''

  try {
    await new Promise(resolve => setTimeout(resolve, 300))
    const response = await fetch(file.fileUrl)
    const blob = await response.blob()
    const cardFile = new File([blob], file.fileName || 'character_card.png', { type: 'image/png' })

    importStep.value = 1
    importStatusText.value = t('character.extractingData')
    await new Promise(resolve => setTimeout(resolve, 300))

    const formData = new FormData()
    formData.append('card', cardFile)
    formData.append('novelId', projectStore.currentProject.id)
    formData.append('existingFileUrl', file.fileUrl)
    formData.append('existingFileKey', file.fileKey || '')

    importStep.value = 2
    importStatusText.value = t('character.aiMapping')

    const importResponse = await apiClient.post(
      '/api/characters/import-card',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )

    const result = importResponse.data

    if (result.conflict) {
      importError.value = `${t('character.character')} "${result.existingCharacter.name}" ${t('character.alreadyExists')}`
      importing.value = false
      return
    }

    if (result.success) {
      importStep.value = 3
      importStatusText.value = t('character.importSuccess')
      importPreviewData.value = {
        ...result.character,
        avatar: file.fileUrl
      }
      importedCharacterId.value = result.character.id
      importComplete.value = true
      importing.value = false

      await loadCharacters()
    }
  } catch (error) {
    console.error('角色卡导入失败:', error)
    importError.value = t('character.importFailure')
    importing.value = false
  }
}

const closeImportProgress = () => {
  showImportProgressModal.value = false
  importStep.value = 0
  importStatusText.value = t('character.prepareImport')
  importPreviewData.value = null
  importError.value = ''
  importComplete.value = false
}

const viewImportedCharacter = async () => {
  if (importedCharacterId.value) {
    const character = characters.value.find(c => c.id === importedCharacterId.value)
    if (character) {
      await selectCharacter(character)
    }
  }
  closeImportProgress()
}

const startCharacterChat = async () => {
  if (!selectedCharacter.value) return

  await chatStore.createCharacterChatSession(
    selectedCharacter.value.id,
    selectedCharacter.value.name,
    selectedCharacter.value.novelId,
    selectedCharacter.value.avatar || undefined
  )

  localStorage.setItem('ai_panel_collapsed', 'false')
  window.dispatchEvent(new CustomEvent('open-ai-panel'))

  message.success(t('character.detail.chatWithCharacter'))
}
</script>

<style scoped>
.character-management {
  background: var(--theme-bg-container);
}
</style>
