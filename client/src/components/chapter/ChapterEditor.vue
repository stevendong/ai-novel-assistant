<template>
  <div class="chapter-editor">
    <div v-if="!chapter" class="loading-state">
      <a-spin size="large" tip="加载中..." />
    </div>

    <div v-else class="editor-content">
      <!-- Header -->
      <div class="editor-header">
        <div class="header-wrapper">
          <div class="header-main">
            <div class="header-info">
              <h1 class="header-title">
                <FileTextOutlined class="title-icon" />
                第{{ chapter.chapterNumber }}章：{{ chapter.title }}
              </h1>
              <div class="header-meta">
                <a-space :size="8">
                  <span class="meta-item">
                    <ClockCircleOutlined />
                    更新于 {{ formatDate(chapter.updatedAt) }}
                  </span>
                  <a-divider type="vertical" />
                  <span class="meta-item">
                    <FileWordOutlined />
                    {{ wordCount.toLocaleString() }} 字
                  </span>
                  <a-divider type="vertical" v-if="chapter.targetWordCount" />
                  <span v-if="chapter.targetWordCount" class="meta-item">
                    目标 {{ chapter.targetWordCount.toLocaleString() }} 字
                  </span>
                </a-space>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="header-actions">
            <a-space :size="8" wrap>
              <a-tag :color="getChapterStatusColor(chapter.status)">
                {{ getChapterStatusText(chapter.status) }}
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
                      更改状态
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="delete" danger @click="handleDelete">
                      <DeleteOutlined />
                      删除章节
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
          </div>
        </div>
      </div>

      <!-- Content Tabs -->
      <a-card class="editor-card">
        <a-tabs v-model:activeKey="activeTab" type="card">
          <!-- 基本信息 Tab -->
          <a-tab-pane key="basic" tab="基本信息">
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

          <!-- 正文内容 Tab -->
          <a-tab-pane key="content" tab="正文内容">
            <div class="content-editor">
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
              <TiptapEditor
                v-if="chapter"
                v-model="formData.content"
                :novel-id="chapter.novelId"
                :chapter-id="chapter.id"
                :target-word-count="formData.targetWordCount"
                :enable-ai-suggestion="true"
                placeholder="开始编写章节内容..."
                @update:word-count="handleWordCountUpdate"
              />
            </div>
          </a-tab-pane>

          <!-- 角色关联 Tab -->
          <a-tab-pane key="characters" tab="角色关联">
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
          <a-tab-pane key="settings" tab="设定关联">
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
          <a-tab-pane key="consistency" tab="一致性检查">
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
    </div>

    <!-- 更改状态 Modal -->
    <a-modal
      v-model:open="showStatusModal"
      title="更改章节状态"
      @ok="handleChangeStatus"
    >
      <a-form layout="vertical">
        <a-form-item label="选择状态">
          <a-select v-model:value="selectedStatus">
            <a-select-option
              v-for="status in getAllChapterStatuses()"
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
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
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
  PlusOutlined,
  CheckCircleOutlined
} from '@ant-design/icons-vue'
import type { Chapter, PlotPoint, Character, WorldSetting, ChapterCharacter, ChapterSetting } from '@/types'
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
import type { ChapterOutlineData } from '@/services/aiService'

interface Props {
  chapterId: string
}

const props = defineProps<Props>()
const emit = defineEmits(['saved', 'deleted'])

const router = useRouter()

// 状态
const chapter = ref<Chapter | null>(null)
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

const activeTab = ref('basic')
const saving = ref(false)
const showStatusModal = ref(false)
const selectedStatus = ref<ChapterStatus | undefined>(undefined)

// 自动保存相关
const autoSaveEnabled = ref(true)
const autoSaveInterval = 30000 // 30秒
const lastSavedData = ref<string>('')
const saveButtonText = ref('保存')
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
  } catch (error) {
    console.error('Failed to load chapter:', error)
    message.error('加载章节失败')
  }
}

// 保存章节
const handleSave = async (isAutoSave = false) => {
  if (!formData.value.title.trim()) {
    if (!isAutoSave) {
      message.error('请输入章节标题')
    }
    return
  }

  // 检查数据是否有变化
  const currentData = JSON.stringify(formData.value)
  if (currentData === lastSavedData.value) {
    if (!isAutoSave) {
      message.info('没有需要保存的更改')
    }
    return
  }

  saving.value = true
  saveButtonText.value = '保存中...'
  
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
    
    if (isAutoSave) {
      saveButtonText.value = '已自动保存'
      setTimeout(() => {
        saveButtonText.value = '保存'
      }, 2000)
    } else {
      message.success('保存成功')
      saveButtonText.value = '保存'
    }
    
    emit('saved', updated)
  } catch (error) {
    console.error('Failed to save chapter:', error)
    if (!isAutoSave) {
      message.error('保存失败')
    }
    saveButtonText.value = '保存'
  } finally {
    saving.value = false
  }
}

// 删除章节
const handleDelete = () => {
  Modal.confirm({
    title: '确定要删除这个章节吗？',
    content: '删除后无法恢复',
    okText: '确定',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await chapterService.deleteChapter(props.chapterId)
        message.success('删除成功')
        emit('deleted')
        router.push({ name: 'chapters' })
      } catch (error) {
        console.error('Failed to delete chapter:', error)
        message.error('删除失败')
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
    message.success('状态更新成功')
    showStatusModal.value = false
  } catch (error) {
    console.error('Failed to change status:', error)
    message.error('状态更新失败')
  }
}

// 初始加载时计算字数
watch(() => chapter.value, (newChapter) => {
  if (newChapter && newChapter.content) {
    wordCount.value = countValidWords(newChapter.content, {
      removeMarkdown: true,
      removeHtml: true
    })
  }
}, { immediate: true })

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
    removeHtml: true
  })
  // 可以在这里执行额外的处理，比如自动保存草稿等
}

// 工具方法
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
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

// 键盘快捷键保存
const handleKeyDown = (e: KeyboardEvent) => {
  // Ctrl+S (Windows/Linux) 或 Cmd+S (Mac)
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleSave(false)
  }
}

// 检测操作系统
const detectOS = () => {
  isMac.value = navigator.platform.toUpperCase().indexOf('MAC') >= 0
}

// 生命周期
onMounted(() => {
  loadChapter()
  detectOS()

  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown)

  // 初始化最后保存的数据
  setTimeout(() => {
    lastSavedData.value = JSON.stringify(formData.value)
  }, 1000)
})

onBeforeUnmount(() => {
  // 清除定时器
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  
  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.chapter-editor {
  height: 100%;
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
}

.editor-card :deep(.ant-card-body) {
  padding: 0;
}

.editor-form {
  padding: 24px;
}

/* Content Editor */
.content-editor {
  padding: 24px;
}

/* Relations Section */
.relations-section {
  padding: 24px;
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

  .editor-form,
  .content-editor,
  .relations-section,
  .consistency-section {
    padding: 16px;
  }
}
</style>
