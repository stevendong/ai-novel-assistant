<template>
  <div class="notion-editor flex flex-col" :class="{ 'focus-mode-active': isFocusMode }" v-if="chapter">
    <!-- 主内容区 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 主编辑区 -->
      <EditorMainArea
        ref="editorArea"
        :chapter="chapter"
        :content="contentText"
        :word-count="contentWordCount"
        :target-word-count="targetWordCount"
        :has-unsaved-changes="hasUnsavedChanges"
        :is-focus-mode="isFocusMode"
        @update:content="handleContentChange"
        @update:title="handleTitleChange"
        @toggle-focus="toggleFocusMode"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { FullscreenExitOutlined } from '@ant-design/icons-vue'
import { useChapter } from '@/composables/useChapter'
import { useMarkdown } from '@/composables/useMarkdown'
import { chapterService } from '@/services/chapterService'
import { characterService } from '@/services/characterService'
import { settingService } from '@/services/settingService'
import { consistencyService } from '@/services/consistencyService'
import { countValidWords } from '@/utils/textUtils'
import { useProjectStore } from '@/stores/project'
import EditorTopBar from './notion/EditorTopBar.vue'
import EditorLeftSidebar from './notion/EditorLeftSidebar.vue'
import EditorMainArea from './notion/EditorMainArea.vue'
import EditorRightSidebar from './notion/EditorRightSidebar.vue'
import type { Character, WorldSetting, ConsistencyCheck } from '@/types'

interface Props {
  chapterId?: string
}

const props = defineProps<Props>()
const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

// 获取章节ID
const chapterId = computed(() => props.chapterId || route.params.id as string)

// 使用章节组合函数
const {
  chapter,
  loading,
  saving,
  error,
  hasUnsavedChanges,
  wordCount,
  statusText,
  loadChapter,
  saveChapter,
  updateChapter,
  addPlotPoint,
  removePlotPoint,
  updatePlotPoint,
  formatDate
} = useChapter()

// Markdown 大纲
const {
  markdownText: outlineMarkdown,
  setMarkdown: setOutlineMarkdown
} = useMarkdown()

// 编辑器状态
const contentText = ref('')
const editorArea = ref()

// 侧边栏状态
const leftSidebarVisible = ref(true)
const rightSidebarVisible = ref(true)
const rightActivePanel = ref<'info' | 'characters' | 'settings' | 'ai'>('info')
const isFocusMode = ref(false)

// 章节导航
const allChapters = ref<any[]>([])
const loadingChapters = ref(false)

// 可用数据
const availableCharacters = ref<Character[]>([])
const availableSettings = ref<WorldSetting[]>([])
const consistencyIssues = ref<ConsistencyCheck[]>([])

// 计算属性
const contentWordCount = computed(() => {
  if (!contentText.value) return 0
  return countValidWords(contentText.value, {
    removeMarkdown: true,
    removeHtml: true
  })
})

const targetWordCount = computed(() => {
  if (chapter.value?.targetWordCount) {
    return chapter.value.targetWordCount
  }
  const currentProject = projectStore.currentProject
  if (currentProject?.targetWordCount) {
    const estimatedChapters = Math.ceil(currentProject.targetWordCount / 2000)
    const averagePerChapter = Math.round(currentProject.targetWordCount / estimatedChapters)
    return Math.max(500, Math.min(8000, averagePerChapter))
  }
  return 2000
})

const currentChapterIndex = computed(() => {
  if (!chapter.value) return -1
  return allChapters.value.findIndex(c => c.id === chapter.value!.id)
})

const previousChapter = computed(() => {
  if (currentChapterIndex.value <= 0) return null
  return allChapters.value[currentChapterIndex.value - 1]
})

const nextChapter = computed(() => {
  if (currentChapterIndex.value === -1 || currentChapterIndex.value >= allChapters.value.length - 1) return null
  return allChapters.value[currentChapterIndex.value + 1]
})

// 加载数据
const loadAllChapters = async () => {
  if (!chapter.value) return
  try {
    loadingChapters.value = true
    const chapters = await chapterService.getChaptersByNovel(chapter.value.novelId)
    allChapters.value = chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)
  } catch (err) {
    console.error('Error loading chapters:', err)
  } finally {
    loadingChapters.value = false
  }
}

const loadAvailableData = async () => {
  if (!chapter.value) return
  try {
    const [characters, settings] = await Promise.all([
      characterService.getCharactersByNovel(chapter.value.novelId),
      settingService.getByNovelId(chapter.value.novelId)
    ])
    availableCharacters.value = characters
    availableSettings.value = settings
  } catch (err) {
    console.error('Error loading available data:', err)
  }
}

const loadConsistencyIssues = async () => {
  if (!chapter.value) return
  try {
    consistencyIssues.value = await consistencyService.getChapterIssues(chapter.value.id)
  } catch (err) {
    console.error('Error loading consistency issues:', err)
  }
}

// 事件处理
const handleGoBack = () => {
  router.back()
}

const handleSaveChapter = async () => {
  try {
    const success = await saveChapter()
    if (success) {
      message.success('章节保存成功')
    }
  } catch (err) {
    console.error('Save chapter error:', err)
    message.error('章节保存失败')
  }
}

const handleContentChange = (value: string) => {
  contentText.value = value
  if (chapter.value) {
    updateChapter('content', value)
  }
}

const handleTitleChange = async (newTitle: string) => {
  if (chapter.value) {
    await updateChapter('title', newTitle)
  }
}

const handleUpdateTargetWords = async (value: number) => {
  if (chapter.value) {
    await updateChapter('targetWordCount', value)
    message.success('目标字数更新成功')
  }
}

const handleAddPlotPoint = () => {
  addPlotPoint({
    type: 'action',
    description: ''
  })
}

// 章节导航
const switchToChapter = async (chapterId: string) => {
  if (!chapterId || chapterId === chapter.value?.id) return

  if (hasUnsavedChanges.value) {
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '有未保存的更改',
        content: '当前章节有未保存的更改，是否先保存？',
        okText: '保存并切换',
        cancelText: '放弃更改',
        onOk: async () => {
          await handleSaveChapter()
          resolve(true)
        },
        onCancel: () => {
          resolve(true)
        }
      })
    })
    if (!confirmed) return
  }

  await loadChapter(chapterId)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const goToPreviousChapter = async () => {
  if (previousChapter.value) {
    await switchToChapter(previousChapter.value.id)
  }
}

const goToNextChapter = async () => {
  if (nextChapter.value) {
    await switchToChapter(nextChapter.value.id)
  }
}

// AI 功能
const requestAIOutline = async () => {
  // TODO: Implement AI outline generation
  message.info('AI 大纲生成功能开发中...')
}

const handleAIGenerate = (length: number) => {
  // TODO: Implement AI content generation
  message.info(`AI 续写 ${length} 字功能开发中...`)
}

const runConsistencyCheck = async () => {
  // TODO: Implement consistency check
  message.info('一致性检查功能开发中...')
}

const handleAIAction = (action: string) => {
  // TODO: Implement AI actions
  message.info(`${action} 功能开发中...`)
}

// 角色和设定管理
const handleAddCharacter = async (characterId: string) => {
  if (!chapter.value) return
  try {
    await chapterService.addCharacterToChapter(chapter.value.id, characterId, 'mentioned')
    await loadChapter(chapter.value.id)
    message.success('角色添加成功')
  } catch (err) {
    message.error('角色添加失败')
  }
}

const removeCharacterFromChapter = async (characterId: string) => {
  if (!chapter.value) return
  try {
    await chapterService.removeCharacterFromChapter(chapter.value.id, characterId)
    await loadChapter(chapter.value.id)
    message.success('角色移除成功')
  } catch (err) {
    message.error('角色移除失败')
  }
}

const updateCharacterRole = async (characterId: string, role: 'main' | 'supporting' | 'mentioned') => {
  if (!chapter.value) return
  try {
    await chapterService.updateCharacterRole(chapter.value.id, characterId, role)
    const chapterCharacter = chapter.value.characters.find(cc => cc.characterId === characterId)
    if (chapterCharacter) {
      chapterCharacter.role = role
    }
    message.success('角色关系更新成功')
  } catch (err) {
    message.error('角色关系更新失败')
  }
}

const handleAddSetting = async (settingId: string) => {
  if (!chapter.value) return
  try {
    await chapterService.addSettingToChapter(chapter.value.id, settingId, '')
    await loadChapter(chapter.value.id)
    message.success('设定添加成功')
  } catch (err) {
    message.error('设定添加失败')
  }
}

const removeSettingFromChapter = async (settingId: string) => {
  if (!chapter.value) return
  try {
    await chapterService.removeSettingFromChapter(chapter.value.id, settingId)
    await loadChapter(chapter.value.id)
    message.success('设定移除成功')
  } catch (err) {
    message.error('设定移除失败')
  }
}

const updateSettingUsage = async (settingId: string, usage: string) => {
  if (!chapter.value) return
  try {
    await chapterService.updateSettingUsage(chapter.value.id, settingId, usage)
    const chapterSetting = chapter.value.settings.find(cs => cs.settingId === settingId)
    if (chapterSetting) {
      chapterSetting.usage = usage
    }
  } catch (err) {
    message.error('设定用法更新失败')
  }
}

// 一致性问题
const toggleIssueResolved = async (issueId: string, resolved: boolean) => {
  try {
    await consistencyService.resolveIssue(issueId, resolved)
    await loadConsistencyIssues()
    message.success(resolved ? '问题已标记为已解决' : '问题已标记为未解决')
  } catch (err) {
    message.error('更新问题状态失败')
  }
}

// 专注模式
const toggleFocusMode = () => {
  isFocusMode.value = !isFocusMode.value
  if (isFocusMode.value) {
    leftSidebarVisible.value = false
    rightSidebarVisible.value = false
  } else {
    leftSidebarVisible.value = true
    rightSidebarVisible.value = true
  }
}

// 快捷键
const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl/Cmd + S 保存
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    if (hasUnsavedChanges.value && !saving.value) {
      handleSaveChapter()
    }
  }

  // Ctrl/Cmd + Enter 专注模式
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    toggleFocusMode()
  }

  // Ctrl/Cmd + \ 切换左侧栏
  if ((event.ctrlKey || event.metaKey) && event.key === '\\') {
    event.preventDefault()
    leftSidebarVisible.value = !leftSidebarVisible.value
  }

  // Ctrl/Cmd + ] 切换右侧栏
  if ((event.ctrlKey || event.metaKey) && event.key === ']') {
    event.preventDefault()
    rightSidebarVisible.value = !rightSidebarVisible.value
  }

  // Ctrl/Cmd + Left 上一章
  if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowLeft') {
    event.preventDefault()
    if (previousChapter.value) {
      goToPreviousChapter()
    }
  }

  // Ctrl/Cmd + Right 下一章
  if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowRight') {
    event.preventDefault()
    if (nextChapter.value) {
      goToNextChapter()
    }
  }

  // Esc 键退出专注模式
  if (event.key === 'Escape' && isFocusMode.value) {
    event.preventDefault()
    toggleFocusMode()
  }
}

// 监听
watch(outlineMarkdown, (newValue) => {
  if (chapter.value) {
    updateChapter('outline', newValue)
  }
})

watch(() => chapter.value?.outline, (newValue) => {
  if (newValue !== outlineMarkdown.value) {
    setOutlineMarkdown(newValue || '')
  }
}, { immediate: true })

watch(() => chapter.value?.content, (newValue) => {
  const currentContent = contentText.value || ''
  const newContent = newValue || ''
  if (newContent !== currentContent) {
    contentText.value = newContent
  }
}, { immediate: true })

watch(() => chapter.value?.id, async (newChapterId, oldChapterId) => {
  if (newChapterId && newChapterId !== oldChapterId) {
    await loadAvailableData()
    await loadConsistencyIssues()
    if (allChapters.value.length === 0) {
      await loadAllChapters()
    }
  }
})

watch(error, (newError) => {
  if (newError) {
    message.error(newError)
  }
})

// 生命周期
onMounted(async () => {
  if (chapterId.value) {
    await loadChapter(chapterId.value)
    await loadAvailableData()
    await loadAllChapters()
    await loadConsistencyIssues()
  }

  if (chapter.value?.outline) {
    setOutlineMarkdown(chapter.value.outline)
  }
  if (chapter.value?.content) {
    contentText.value = chapter.value.content
  }

  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.notion-editor {
  background-color: var(--theme-bg-container);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden;
}

/* 专注模式样式 */
.notion-editor.focus-mode-active {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background-color: var(--theme-bg-container);
}

/* 专注模式退出按钮 */
.focus-mode-exit {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.focus-mode-exit .ant-btn {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.focus-mode-exit .ant-btn:hover {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
