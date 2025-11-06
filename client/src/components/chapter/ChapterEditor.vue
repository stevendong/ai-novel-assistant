<template>
  <div :class="['chapter-editor-container', { 'fullscreen-mode': isFullscreen }]">
    <!-- 章节导航侧边栏 -->
    <ChapterNavigationSidebar
      v-if="!isFullscreen"
      ref="sidebarRef"
      :chapters="allChapters"
      :current-chapter-id="props.chapterId"
      :novel-id="chapter?.novelId"
      :loading="chaptersLoading"
      :has-more="hasMoreChapters"
      :total="totalChapters"
      :max-chapter-number="maxChapterNumber"
      @select="handleChapterSelect"
      @create="handleCreateChapter"
      @created="handleChapterCreated"
      @refresh="() => loadAllChapters(true)"
      @load-more="loadMoreChapters"
    />

    <!-- 主编辑区域 -->
    <div class="chapter-editor">
      <div v-if="!chapter || switching" class="loading-state">
        <a-spin size="large" :tip="switching ? t('chapterEditor.loading.switching') : t('chapterEditor.loading.loading')" />
      </div>

      <div v-else class="editor-content">
      <!-- 全屏工具栏 -->
      <div v-if="isFullscreen" class="fullscreen-toolbar">
        <div class="toolbar-left">
          <h3 class="toolbar-title">
            <FileTextOutlined />
            {{ t('chapterEditor.fullscreen.title', { number: chapter.chapterNumber, title: chapter.title }) }}
          </h3>
        </div>
        <div class="toolbar-center">
          <span class="word-count-display">
            <FileWordOutlined />
            {{ t('chapterEditor.fullscreen.wordCount', { count: wordCount.toLocaleString() }) }}
            <span v-if="chapter.targetWordCount">
              {{ t('chapterEditor.fullscreen.wordTarget', { target: chapter.targetWordCount.toLocaleString() }) }}
            </span>
            {{ t('chapterEditor.common.wordUnit') }}
          </span>
        </div>
        <div class="toolbar-right">
          <a-space :size="8">
            <a-tooltip :title="isMac ? '⌘+S' : 'Ctrl+S'">
              <a-button
                type="primary"
                size="small"
                @click="handleSave"
                :loading="saving"
              >
                <template #icon><SaveOutlined /></template>
                {{ saveButtonText }}
              </a-button>
            </a-tooltip>
            <a-tooltip :title="isMac ? '⌘+Shift+F / Esc' : 'Ctrl+Shift+F / Esc'">
              <a-button
                size="small"
                @click="exitFullscreen"
              >
                <template #icon><FullscreenExitOutlined /></template>
                {{ t('chapterEditor.fullscreen.exit') }}
              </a-button>
            </a-tooltip>
          </a-space>
        </div>
      </div>

      <!-- 顶部章节导航 -->
      <ChapterTopNavigation
        v-if="!isFullscreen"
        ref="topNavRef"
        :current-chapter="chapter"
        :all-chapters="allChapters"
        :loading="chaptersLoading"
        :has-more="hasMoreChapters"
        :total="totalChapters"
        @navigate="handleNavigate"
        @prev="handlePrevChapter"
        @next="handleNextChapter"
        @load-more="loadMoreChapters"
      />

      <!-- Header -->
      <div v-if="!isFullscreen" class="editor-header">
        <div class="header-wrapper">
          <div class="header-main">
            <div class="header-info">
              <div class="header-meta">
                <a-space :size="8">
                  <span class="meta-item">
                    <ClockCircleOutlined />
                    {{ t('chapterEditor.meta.updatedAt', { time: formatDate(chapter.updatedAt) }) }}
                  </span>
                  <a-divider type="vertical" />
                  <span class="meta-item">
                    <FileWordOutlined />
                    {{ t('chapterEditor.meta.wordCount', { count: wordCount.toLocaleString() }) }}
                  </span>
                  <a-divider type="vertical" v-if="chapter.targetWordCount" />
                  <span v-if="chapter.targetWordCount" class="meta-item">
                    {{ t('chapterEditor.meta.targetWordCount', { target: chapter.targetWordCount.toLocaleString() }) }}
                  </span>
                </a-space>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="header-actions">
            <a-space :size="8" wrap>
              <a-tag :color="getChapterStatusColor(chapter.status)">
                {{ getChapterStatusLabel(chapter.status) }}
              </a-tag>

              <a-tooltip :title="isMac ? '⌘+S' : 'Ctrl+S'">
                <a-button
                  type="primary"
                  @click="handleSave"
                  :loading="saving"
                >
                  <template #icon><SaveOutlined /></template>
                  {{ saveButtonText }}
                </a-button>
              </a-tooltip>

              <a-dropdown>
                <a-button>
                  <template #icon><MoreOutlined /></template>
                </a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item key="status" @click="showStatusModal = true">
                      <SwapOutlined />
                      {{ t('chapterEditor.actions.changeStatus') }}
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="delete" danger @click="handleDelete">
                      <DeleteOutlined />
                      {{ t('chapterEditor.actions.deleteChapter') }}
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
          </div>
        </div>
      </div>

      <!-- Content Tabs -->
      <a-card class="editor-card" v-if="!isFullscreen">
        <a-tabs v-model:activeKey="activeTab" type="card">
          <!-- 正文内容 Tab -->
          <a-tab-pane key="content" :tab="t('chapterEditor.tabs.content')">
            <div class="content-editor">
              <!-- 工具栏：AI生成器 + 全屏按钮 -->
              <div class="content-editor-toolbar">
                <div class="toolbar-left">
                  <ContentAIGenerator
                    v-if="chapter"
                    :novel-id="chapter.novelId"
                    :chapter-id="chapter.id"
                    :outline="formData.outline"
                    :existing-content="formData.content"
                    :target-word-count="formData.targetWordCount"
                    :characters="formData.characters.map(c => c.character)"
                    :settings="formData.settings.map(s => s.setting)"
                    @update:content="formData.content = $event"
                    @generated="handleContentGenerated"
                  />
                </div>
                <div class="toolbar-right">
                  <a-tooltip :title="isMac ? '⌘+Shift+F' : 'Ctrl+Shift+F'">
                    <a-button
                      type="text"
                      size="small"
                      @click="toggleFullscreen"
                      class="fullscreen-toggle-btn"
                    >
                      <template #icon><FullscreenOutlined /></template>
                      {{ t('common.fullscreenEdit') }}
                    </a-button>
                  </a-tooltip>
                </div>
              </div>

              <!-- 编辑器 -->
              <TiptapEditor
                v-if="chapter"
                v-model="formData.content"
                :novel-id="chapter.novelId"
                :chapter-id="chapter.id"
                :target-word-count="formData.targetWordCount"
                :enable-ai-suggestion="true"
                :placeholder="t('chapterEditor.editor.placeholder')"
                @update:word-count="handleWordCountUpdate"
              />
            </div>
          </a-tab-pane>

          <!-- 基本信息 Tab -->
          <a-tab-pane key="basic" :tab="t('chapterEditor.tabs.basic')">
            <div class="editor-form">
              <!-- 基本信息组件 -->
              <ChapterBasicInfo
                v-model="basicInfoData"
                :novel-id="chapter?.novelId"
                :chapter-id="chapter?.id"
                :characters="formData.characters.map(c => c.character)"
                :settings="formData.settings.map(s => s.setting)"
                @update:plot-points="formData.plotPoints = $event"
                @outline-generated="handleOutlineGenerated"
              />

              <a-divider />

              <!-- 剧情要点组件 -->
              <ChapterPlotPoints
                v-model="formData.plotPoints"
              />
            </div>
          </a-tab-pane>

          <!-- 角色关联 Tab -->
          <a-tab-pane key="characters" :tab="t('chapterEditor.tabs.characters')">
            <div class="relations-section">
              <ChapterCharacters
                v-model="formData.characters"
                :novel-id="chapter?.novelId || ''"
                :chapter-id="props.chapterId"
                @refresh="loadChapter"
              />
            </div>
          </a-tab-pane>

          <!-- 设定关联 Tab -->
          <a-tab-pane key="settings" :tab="t('chapterEditor.tabs.settings')">
            <div class="relations-section">
              <ChapterSettings
                v-model="formData.settings"
                :novel-id="chapter?.novelId || ''"
                :chapter-id="props.chapterId"
                @refresh="loadChapter"
              />
            </div>
          </a-tab-pane>

          <!-- 一致性检查 Tab -->
          <a-tab-pane key="consistency" :tab="t('chapterEditor.tabs.consistency')">
            <div class="consistency-section">
              <ChapterConsistency
                :model-value="chapter?.consistencyLog || []"
                :chapter-id="props.chapterId"
                @refresh="loadChapter"
              />
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-card>

      <!-- 全屏模式编辑器 -->
      <div v-if="isFullscreen" class="fullscreen-editor">
        <TiptapEditor
          v-if="chapter"
          v-model="formData.content"
          :novel-id="chapter.novelId"
          :chapter-id="chapter.id"
          :target-word-count="formData.targetWordCount"
          :enable-ai-suggestion="true"
          :placeholder="t('chapterEditor.editor.placeholder')"
          @update:word-count="handleWordCountUpdate"
        />
      </div>
    </div>

    <!-- 更改状态 Modal -->
    <a-modal
      v-model:open="showStatusModal"
      :title="t('chapterEditor.modals.updateStatusTitle')"
      @ok="handleChangeStatus"
    >
      <a-form layout="vertical">
        <a-form-item :label="t('chapterEditor.modals.selectStatusLabel')">
          <a-select v-model:value="selectedStatus">
            <a-select-option
              v-for="status in chapterStatusOptions"
              :key="status.value"
              :value="status.value"
            >
              {{ status.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  FileTextOutlined,
  ClockCircleOutlined,
  FileWordOutlined,
  SaveOutlined,
  MoreOutlined,
  SwapOutlined,
  DeleteOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons-vue'
import type { Chapter, PlotPoint, ChapterCharacter, ChapterSetting } from '@/types'
import { chapterService } from '@/services/chapterService'
import { countValidWords } from '@/utils/textUtils'
import { ChapterStatus, getChapterStatusText, getChapterStatusColor, getAllChapterStatuses } from '@/constants/status'
import TiptapEditor from './TiptapEditor.vue'
import ContentAIGenerator from './ContentAIGenerator.vue'
import ChapterBasicInfo from './ChapterBasicInfo.vue'
import ChapterPlotPoints from './ChapterPlotPoints.vue'
import ChapterCharacters from './ChapterCharacters.vue'
import ChapterSettings from './ChapterSettings.vue'
import ChapterConsistency from './ChapterConsistency.vue'
import ChapterNavigationSidebar from './ChapterNavigationSidebar.vue'
import ChapterTopNavigation from './ChapterTopNavigation.vue'
import type { ChapterOutlineData } from '@/services/aiService'

interface Props {
  chapterId: string
}

const props = defineProps<Props>()
const emit = defineEmits(['saved', 'deleted', 'navigate'])

const router = useRouter()
const { t, locale } = useI18n()

// 状态
const chapter = ref<Chapter | null>(null)
const allChapters = ref<Chapter[]>([])
const chaptersLoading = ref(false)
const switching = ref(false)
const topNavRef = ref<InstanceType<typeof ChapterTopNavigation> | null>(null)
const sidebarRef = ref<InstanceType<typeof ChapterNavigationSidebar> | null>(null)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(20)
const totalChapters = ref(0)
const maxChapterNumber = ref(0)
const hasMoreChapters = computed(() => allChapters.value.length < totalChapters.value)

const getChapterStatusLabel = (status: string) => {
  const key = `chapter.status.${status}`
  const translated = t(key)
  return translated === key ? getChapterStatusText(status) : translated
}

const formData = ref({
  title: '',
  chapterNumber: 1,
  outline: '',
  content: '',
  plotPoints: [] as PlotPoint[],
  targetWordCount: undefined as number | undefined,
  characters: [] as ChapterCharacter[],
  settings: [] as ChapterSetting[]
})

const activeTab = ref('content')
const saving = ref(false)
const showStatusModal = ref(false)
const selectedStatus = ref<ChapterStatus | undefined>(undefined)

const chapterStatusOptions = computed(() =>
  getAllChapterStatuses().map(status => ({
    ...status,
    label: getChapterStatusLabel(status.value)
  }))
)

// 全屏相关
const isFullscreen = ref(false)

// 自动保存相关
const autoSaveEnabled = ref(true)
const autoSaveInterval = 30000 // 30秒
const lastSavedData = ref<string>('')
const saveButtonTextKey = ref('common.save')
const saveButtonText = computed(() => t(saveButtonTextKey.value))
const isMac = ref(false)
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

// 字数统计
const wordCount = ref(0)

const handleWordCountUpdate = (count: number) => {
  wordCount.value = count
}

// 基本信息计算属性(用于双向绑定)
const basicInfoData = computed({
  get: () => ({
    title: formData.value.title,
    chapterNumber: formData.value.chapterNumber,
    targetWordCount: formData.value.targetWordCount,
    outline: formData.value.outline
  }),
  set: (value) => {
    formData.value.title = value.title
    formData.value.chapterNumber = value.chapterNumber
    formData.value.targetWordCount = value.targetWordCount
    formData.value.outline = value.outline
  }
})

// 加载章节数据
const loadChapter = async () => {
  try {
    const data = await chapterService.getChapter(props.chapterId)
    chapter.value = data

    formData.value = {
      title: data.title,
      chapterNumber: data.chapterNumber,
      outline: data.outline || '',
      content: data.content || '',
      plotPoints: data.plotPoints || [],
      targetWordCount: data.targetWordCount || undefined,
      characters: data.characters || [],
      settings: data.settings || []
    }

    selectedStatus.value = data.status

    // 更新已保存数据快照
    lastSavedData.value = JSON.stringify(formData.value)
  } catch (error) {
    console.error('Failed to load chapter:', error)
    message.error(t('chapterEditor.messages.loadFailed'))
  }
}

// 加载章节（分页）
const loadAllChapters = async (reset = false) => {
  if (!chapter.value?.novelId) return

  // 如果重置，清空已加载数据
  if (reset) {
    currentPage.value = 1
    allChapters.value = []
  }

  chaptersLoading.value = true
  try {
    const result = await chapterService.getChaptersByNovelPaginated(
      chapter.value.novelId,
      {
        page: currentPage.value,
        pageSize: pageSize.value,
        sortBy: 'chapterNumber',
        sortOrder: 'asc'
      }
    )

    if (reset) {
      allChapters.value = result.chapters
    } else {
      // 追加新章节，去重
      const newChapters = result.chapters.filter(
        newChapter => !allChapters.value.some(existing => existing.id === newChapter.id)
      )
      allChapters.value = [...allChapters.value, ...newChapters]
    }

    totalChapters.value = result.total
    maxChapterNumber.value = result.maxChapterNumber || 0
    console.log(`[章节加载] 已加载 ${allChapters.value.length}/${result.total} 章节，最大章节号: ${maxChapterNumber.value}`)
  } catch (error) {
    console.error('Failed to load chapters:', error)
  } finally {
    chaptersLoading.value = false
  }
}

// 加载更多章节
const loadMoreChapters = async () => {
  if (chaptersLoading.value || !hasMoreChapters.value) return

  currentPage.value++
  await loadAllChapters(false)
}

// 章节选择处理
const handleChapterSelect = async (selectedChapter: Chapter) => {
  if (selectedChapter.id === props.chapterId) return

  // 检查是否有未保存的更改
  const currentData = JSON.stringify(formData.value)
  if (currentData !== lastSavedData.value) {
    Modal.confirm({
      title: t('chapterEditor.confirm.unsavedChangesTitle'),
      content: t('chapterEditor.confirm.unsavedChangesMessage'),
      okText: t('chapterEditor.confirm.saveAndSwitch'),
      cancelText: t('chapterEditor.confirm.discardChanges'),
      async onOk() {
        await handleSave()
        navigateToChapter(selectedChapter.id)
      },
      onCancel() {
        navigateToChapter(selectedChapter.id)
      }
    })
  } else {
    navigateToChapter(selectedChapter.id)
  }
}

// 导航到指定章节
const navigateToChapter = (chapterId: string) => {
  switching.value = true
  emit('navigate', chapterId)
  router.push({ name: 'chapter', params: { id: chapterId } })
}

// 快捷键导航处理
const handleNavigate = (chapterId: string) => {
  const selectedChapter = allChapters.value.find(c => c.id === chapterId)
  if (selectedChapter) {
    handleChapterSelect(selectedChapter)
  }
}

// 上一章
const handlePrevChapter = () => {
  console.log('切换到上一章')
}

// 下一章
const handleNextChapter = () => {
  console.log('切换到下一章')
}

// 创建新章节
const handleCreateChapter = () => {
  router.push({ name: 'chapters' })
}

// 章节创建成功处理
const handleChapterCreated = async (newChapter: Chapter) => {
  console.log('新章节创建成功:', newChapter)

  // 刷新章节列表
  await loadAllChapters()

  // 跳转到新创建的章节
  navigateToChapter(newChapter.id)
}

// 保存章节
const handleSave = async (isAutoSave = false) => {
  if (!formData.value.title.trim()) {
    if (!isAutoSave) {
      message.error(t('chapterEditor.messages.titleRequired'))
    }
    return
  }

  // 检查数据是否有变化
  const currentData = JSON.stringify(formData.value)
  if (currentData === lastSavedData.value) {
    if (!isAutoSave) {
      message.info(t('chapterEditor.messages.noChanges'))
    }
    return
  }

  saving.value = true
  saveButtonTextKey.value = 'chapterEditor.actions.saving'

  try {
    const updated = await chapterService.updateChapter(props.chapterId, {
      title: formData.value.title,
      outline: formData.value.outline,
      content: formData.value.content,
      plotPoints: formData.value.plotPoints,
      targetWordCount: formData.value.targetWordCount,
      status: chapter.value?.status
    })

    chapter.value = updated
    lastSavedData.value = currentData

    // 刷新章节列表以更新导航栏显示
    await loadAllChapters()

    if (isAutoSave) {
      saveButtonTextKey.value = 'chapterEditor.actions.autoSaved'
      setTimeout(() => {
        saveButtonTextKey.value = 'common.save'
      }, 2000)
    } else {
      message.success(t('common.saveSuccess'))
      saveButtonTextKey.value = 'common.save'
    }

    emit('saved', updated)
  } catch (error) {
    console.error('Failed to save chapter:', error)
    if (!isAutoSave) {
      message.error(t('common.saveFailure'))
    }
    saveButtonTextKey.value = 'common.save'
  } finally {
    saving.value = false
  }
}

// 删除章节
const handleDelete = () => {
  Modal.confirm({
    title: t('chapterEditor.confirm.deleteTitle'),
    content: t('chapterEditor.confirm.deleteMessage'),
    okText: t('common.confirm'),
    okType: 'danger',
    cancelText: t('common.cancel'),
    async onOk() {
      try {
        await chapterService.deleteChapter(props.chapterId)
        message.success(t('common.deleteSuccess'))
        emit('deleted')
        router.push({ name: 'chapters' })
      } catch (error) {
        console.error('Failed to delete chapter:', error)
        message.error(t('common.deleteFailure'))
      }
    }
  })
}

// 更改状态
const handleChangeStatus = async () => {
  if (!selectedStatus.value) return

  try {
    await chapterService.updateChapter(props.chapterId, {
      status: selectedStatus.value
    })
    if (chapter.value) {
      chapter.value.status = selectedStatus.value
    }

    // 刷新章节列表以更新导航栏显示的状态
    await loadAllChapters()

    message.success(t('chapterEditor.messages.statusUpdateSuccess'))
    showStatusModal.value = false
  } catch (error) {
    console.error('Failed to change status:', error)
    message.error(t('chapterEditor.messages.statusUpdateFailed'))
  }
}

// 初始加载时计算字数
watch(() => chapter.value, (newChapter) => {
  if (newChapter && newChapter.content) {
    wordCount.value = countValidWords(newChapter.content, {
      removeMarkdown: true,
      removeHtml: true,
      locale: locale.value
    })
  }
}, { immediate: true })

watch(locale, () => {
  const content = formData.value.content || chapter.value?.content || ''
  wordCount.value = content
    ? countValidWords(content, {
        removeMarkdown: true,
        removeHtml: true,
        locale: locale.value
      })
    : 0
})

// AI生成大纲完成回调
const handleOutlineGenerated = (data: ChapterOutlineData) => {
  console.log('大纲生成完成:', data)
  // 可以在这里执行额外的处理，比如记录日志、更新统计等
}

// AI生成正文内容完成回调
const handleContentGenerated = (content: string) => {
  console.log('正文生成完成，字数:', content.length)
  // 更新字数统计
  wordCount.value = countValidWords(content, {
    removeMarkdown: true,
    removeHtml: true,
    locale: locale.value
  })
  // 可以在这里执行额外的处理，比如自动保存草稿等
}

// 工具方法
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const localeCode = locale.value === 'zh' ? 'zh-CN' : 'en-US'
  return date.toLocaleString(localeCode)
}

// 自动保存逻辑
const startAutoSave = () => {
  if (!autoSaveEnabled.value) return

  // 清除之前的定时器
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }

  // 设置新的定时器
  autoSaveTimer = setTimeout(() => {
    handleSave(true)
  }, autoSaveInterval)
}

// 监听数据变化，触发自动保存
watch(
  () => formData.value,
  () => {
    if (autoSaveEnabled.value && lastSavedData.value) {
      startAutoSave()
    }
  },
  { deep: true }
)

// 全屏切换
const toggleFullscreen = () => {
  console.log('[全屏] 切换全屏模式，当前状态:', isFullscreen.value, '→', !isFullscreen.value)
  isFullscreen.value = !isFullscreen.value

  // 全屏时自动切换到正文内容 tab
  if (isFullscreen.value) {
    activeTab.value = 'content'
    console.log('[全屏] 已切换到正文内容 tab')
  }
}

// 退出全屏
const exitFullscreen = () => {
  isFullscreen.value = false
}

// 键盘快捷键
const handleKeyDown = (e: KeyboardEvent) => {
  // Ctrl+S (Windows/Linux) 或 Cmd+S (Mac) - 保存
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    handleSave(false)
    return
  }

  // Ctrl+N (Windows/Linux) 或 Cmd+N (Mac) - 新增章节
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
    e.preventDefault()
    console.log('[快捷键] 触发新增章节')
    // 如果在全屏模式，先退出全屏
    if (isFullscreen.value) {
      exitFullscreen()
      // 等待侧边栏渲染后再打开对话框
      setTimeout(() => {
        sidebarRef.value?.showAddChapterModal()
      }, 100)
    } else {
      // 非全屏模式直接调用
      sidebarRef.value?.showAddChapterModal()
    }
    return
  }

  // Ctrl+Shift+F (Windows/Linux) 或 Cmd+Shift+F (Mac) - 全屏切换
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    console.log('[全屏快捷键] 触发全屏切换')
    toggleFullscreen()
    return
  }

  // Esc - 退出全屏
  if (e.key === 'Escape' && isFullscreen.value) {
    e.preventDefault()
    console.log('[全屏快捷键] 退出全屏')
    exitFullscreen()
    return
  }

  // Ctrl+PageUp/PageDown 或 Cmd+Left/Right - 章节导航
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'PageUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      topNavRef.value?.handlePrev()
    } else if (e.key === 'PageDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      topNavRef.value?.handleNext()
    }
  }
}

// 检测操作系统
const detectOS = () => {
  isMac.value = navigator.platform.toUpperCase().indexOf('MAC') >= 0
}

// 生命周期
onMounted(async () => {
  await loadChapter()
  await loadAllChapters(true) // 重置并加载第一页
  detectOS()

  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown)
  console.log('[全屏] 已注册快捷键监听器, 检测到的系统:', isMac.value ? 'macOS' : 'Windows/Linux')
  console.log('[全屏] 全屏快捷键:', isMac.value ? 'Cmd+Shift+F' : 'Ctrl+Shift+F')

  // 重置切换状态
  switching.value = false
})

// 监听 chapterId 变化重新加载
watch(() => props.chapterId, async () => {
  switching.value = true
  await loadChapter()
  // 切换章节后也刷新章节列表，确保导航栏数据最新
  await loadAllChapters()
  switching.value = false
})

onBeforeUnmount(() => {
  // 清除定时器
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }

  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyDown)
})

// 暴露方法供外部调用
defineExpose({
  loadChapter,
  loadAllChapters,
  handleSave
})
</script>

<style scoped>
/* 容器布局 */
.chapter-editor-container {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.chapter-editor {
  flex: 1;
  height: 100%;
  overflow: hidden; /* 不在此层滚动，让内部组件自己处理 */
  background: var(--theme-bg-base);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.editor-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Header */
.editor-header {
  background: var(--theme-bg-container);
  border-bottom: 1px solid var(--theme-border);
  padding: 16px 24px;
  margin-bottom: 16px;
}

.header-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
}

.header-main {
  flex: 1;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--theme-text);
  margin: 0;
}

.title-icon {
  color: #1890ff;
  font-size: 18px;
}

.header-meta {
  color: var(--theme-text-secondary);
  font-size: 13px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* Editor Card */
.editor-card {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 避免溢出 */
}

.editor-card :deep(.ant-card-body) {
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-card :deep(.ant-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-card :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
}

.editor-card :deep(.ant-tabs-content) {
  height: 100%;
}

.editor-card :deep(.ant-tabs-tabpane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-form {
  padding: 24px;
  overflow-y: auto;
}

/* Content Editor */
.content-editor {
  padding: 0 24px 24px 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-editor :deep(.tiptap-editor) {
  flex: 1;
  min-height: 0;
}

/* Relations Section */
.relations-section {
  padding: 24px;
  overflow-y: auto;
}

.relations-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.relations-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.relations-list {
  background: transparent;
}

/* Consistency Section */
.consistency-section {
  padding: 24px;
  overflow-y: auto;
}

/* ============================================
   全屏模式样式
   ============================================ */

/* 全屏容器 */
.chapter-editor-container.fullscreen-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: var(--theme-bg-base);
}

.chapter-editor-container.fullscreen-mode .chapter-editor {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 全屏工具栏 */
.fullscreen-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--theme-bg-container);
  border-bottom: 1px solid var(--theme-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.fullscreen-toolbar .toolbar-left {
  flex: 1;
  min-width: 0;
}

.fullscreen-toolbar .toolbar-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--theme-text);
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s ease;
}

.fullscreen-toolbar .toolbar-title :deep(.anticon) {
  font-size: 18px;
  color: var(--theme-icon-text);
}

.fullscreen-toolbar .toolbar-center {
  flex: 0 0 auto;
  padding: 0 24px;
}

.fullscreen-toolbar .word-count-display {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--theme-text-secondary);
  white-space: nowrap;
  transition: color 0.3s ease;
}

.fullscreen-toolbar .word-count-display :deep(.anticon) {
  font-size: 16px;
}

.fullscreen-toolbar .toolbar-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

/* 全屏编辑器容器 */
.fullscreen-editor {
  flex: 1;
  height: 100%;
  overflow: hidden;
  padding: 24px;
  background: var(--theme-bg-base);
  transition: background-color 0.3s ease;
}

.fullscreen-editor :deep(.tiptap-editor) {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg-container);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.fullscreen-editor :deep(.editor-toolbar) {
  flex-shrink: 0;
  border-bottom: 1px solid var(--theme-border);
  background: var(--theme-bg-elevated);
}

.fullscreen-editor :deep(.ProseMirror) {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  padding: 32px !important;
  font-size: 16px !important;
  line-height: 1.8 !important;
}

/* 内容编辑器工具栏 */
.content-editor-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 0;
  padding-bottom: 0;
}

.content-editor-toolbar .toolbar-left {
  flex: 1;
  min-width: 0;
}

.content-editor-toolbar .toolbar-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding-top: 4px;
}

.fullscreen-toggle-btn {
  color: var(--theme-text-secondary);
  transition: all 0.3s ease;
  height: 32px;
  padding: 4px 15px;
}

.fullscreen-toggle-btn:hover {
  color: var(--theme-icon-text);
  background: var(--theme-icon-bg);
  transform: scale(1.05);
}

/* 全屏动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.chapter-editor-container.fullscreen-mode {
  animation: fadeIn 0.3s ease;
}

/* Responsive */
@media (max-width: 768px) {
  .editor-header {
    padding: 12px 16px;
  }

  .header-wrapper {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .editor-form {
    padding: 16px;
  }

  .content-editor {
    padding: 0 16px 16px 16px;
  }

  .relations-section,
  .consistency-section {
    padding: 16px;
  }

  /* 移动端工具栏垂直布局 */
  .content-editor-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .content-editor-toolbar .toolbar-right {
    padding-top: 0;
    justify-content: flex-end;
  }

  /* 全屏工具栏移动端优化 */
  .fullscreen-toolbar {
    padding: 8px 12px;
  }

  .fullscreen-toolbar .toolbar-center {
    padding: 0 12px;
  }

  .fullscreen-toolbar .toolbar-title {
    font-size: 14px;
  }

  .fullscreen-toolbar .word-count-display {
    font-size: 12px;
  }
}
</style>
