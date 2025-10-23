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
            <a-form
              :model="formData"
              layout="vertical"
              class="editor-form"
            >
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="章节标题" required>
                    <a-input
                      v-model:value="formData.title"
                      placeholder="请输入章节标题"
                      :maxlength="100"
                      show-count
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="章节号">
                    <a-input-number
                      v-model:value="formData.chapterNumber"
                      :min="1"
                      disabled
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="目标字数">
                    <a-input-number
                      v-model:value="formData.targetWordCount"
                      :min="0"
                      placeholder="不限"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item label="章节大纲">
                <div class="outline-editor-wrapper">
                  <OutlineAIGenerator
                    v-if="chapter"
                    :novel-id="chapter.novelId"
                    :chapter-id="chapter.id"
                    :chapter-number="formData.chapterNumber"
                    :chapter-title="formData.title"
                    :existing-outline="formData.outline"
                    :characters="formData.characters.map(c => c.character)"
                    :settings="formData.settings.map(s => s.setting)"
                    :target-word-count="formData.targetWordCount"
                    @update:outline="formData.outline = $event"
                    @update:plot-points="formData.plotPoints = $event"
                    @generated="handleOutlineGenerated"
                  />
                  <a-textarea
                    v-model:value="formData.outline"
                    placeholder="请输入章节大纲，或点击AI生成按钮一键生成"
                    :rows="6"
                    :maxlength="2000"
                    show-count
                  />
                </div>
              </a-form-item>

              <!-- 剧情要点 -->
              <a-form-item label="剧情要点">
                <div class="plot-points-section">
                  <div
                    v-for="(point, index) in formData.plotPoints"
                    :key="index"
                    class="plot-point-item"
                  >
                    <a-space style="width: 100%" align="start">
                      <a-select
                        v-model:value="point.type"
                        style="width: 120px"
                      >
                        <a-select-option value="conflict">冲突</a-select-option>
                        <a-select-option value="discovery">发现</a-select-option>
                        <a-select-option value="emotion">情感</a-select-option>
                        <a-select-option value="action">动作</a-select-option>
                        <a-select-option value="dialogue">对话</a-select-option>
                      </a-select>
                      <a-input
                        v-model:value="point.description"
                        placeholder="描述这个情节要点"
                        style="flex: 1"
                      />
                      <a-button
                        type="text"
                        danger
                        @click="removePlotPoint(index)"
                      >
                        <template #icon><DeleteOutlined /></template>
                      </a-button>
                    </a-space>
                  </div>
                  <a-button
                    type="dashed"
                    block
                    @click="addPlotPoint"
                    class="add-plot-point-btn"
                  >
                    <template #icon><PlusOutlined /></template>
                    添加剧情要点
                  </a-button>
                </div>
              </a-form-item>
            </a-form>
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
              <div class="relations-header">
                <h3>相关角色</h3>
                <a-button
                  type="primary"
                  @click="showAddCharacterModal = true"
                >
                  <template #icon><PlusOutlined /></template>
                  添加角色
                </a-button>
              </div>

              <a-list
                v-if="formData.characters.length > 0"
                :data-source="formData.characters"
                class="relations-list"
              >
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-list-item-meta
                      :title="item.character.name"
                      :description="item.character.description"
                    >
                      <template #avatar>
                        <a-avatar :src="item.character.avatar">
                          {{ item.character.name?.charAt(0) }}
                        </a-avatar>
                      </template>
                    </a-list-item-meta>
                    <template #actions>
                      <a-select
                        v-model:value="item.role"
                        style="width: 100px"
                        @change="handleCharacterRoleChange(item)"
                      >
                        <a-select-option value="main">主要</a-select-option>
                        <a-select-option value="supporting">配角</a-select-option>
                        <a-select-option value="mentioned">提及</a-select-option>
                      </a-select>
                      <a-button
                        type="text"
                        danger
                        @click="removeCharacter(item.characterId)"
                      >
                        移除
                      </a-button>
                    </template>
                  </a-list-item>
                </template>
              </a-list>
              <a-empty v-else description="暂无关联角色" />
            </div>
          </a-tab-pane>

          <!-- 设定关联 Tab -->
          <a-tab-pane key="settings" tab="设定关联">
            <div class="relations-section">
              <div class="relations-header">
                <h3>相关设定</h3>
                <a-button
                  type="primary"
                  @click="showAddSettingModal = true"
                >
                  <template #icon><PlusOutlined /></template>
                  添加设定
                </a-button>
              </div>

              <a-list
                v-if="formData.settings.length > 0"
                :data-source="formData.settings"
                class="relations-list"
              >
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-list-item-meta
                      :title="item.setting.name"
                      :description="item.usage || item.setting.description"
                    >
                      <template #avatar>
                        <a-avatar :style="{ backgroundColor: getSettingTypeColor(item.setting.type) }">
                          {{ getSettingTypeIcon(item.setting.type) }}
                        </a-avatar>
                      </template>
                    </a-list-item-meta>
                    <template #actions>
                      <a-button
                        type="text"
                        danger
                        @click="removeSetting(item.settingId)"
                      >
                        移除
                      </a-button>
                    </template>
                  </a-list-item>
                </template>
              </a-list>
              <a-empty v-else description="暂无关联设定" />
            </div>
          </a-tab-pane>

          <!-- 一致性检查 Tab -->
          <a-tab-pane key="consistency" tab="一致性检查">
            <div class="consistency-section">
              <div class="consistency-header">
                <h3>一致性问题</h3>
                <a-button type="primary" @click="handleCheckConsistency">
                  <template #icon><CheckCircleOutlined /></template>
                  检查一致性
                </a-button>
              </div>

              <a-list
                v-if="chapter.consistencyLog && chapter.consistencyLog.length > 0"
                :data-source="chapter.consistencyLog"
                class="consistency-list"
              >
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-list-item-meta :description="item.issue">
                      <template #title>
                        <a-space>
                          <a-tag :color="getSeverityColor(item.severity)">
                            {{ getSeverityText(item.severity) }}
                          </a-tag>
                          <span>{{ getConsistencyTypeText(item.type) }}</span>
                        </a-space>
                      </template>
                    </a-list-item-meta>
                    <template #actions>
                      <a-button
                        type="text"
                        :disabled="item.resolved"
                        @click="markResolved(item.id)"
                      >
                        {{ item.resolved ? '已解决' : '标记解决' }}
                      </a-button>
                    </template>
                  </a-list-item>
                </template>
              </a-list>
              <a-empty v-else description="暂无一致性问题" />
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>

    <!-- 添加角色 Modal -->
    <a-modal
      v-model:open="showAddCharacterModal"
      title="添加角色"
      @ok="handleAddCharacter"
    >
      <a-form layout="vertical">
        <a-form-item label="选择角色">
          <a-select
            v-model:value="selectedCharacterId"
            placeholder="请选择角色"
            show-search
            option-filter-prop="label"
          >
            <a-select-option
              v-for="char in availableCharacters"
              :key="char.id"
              :value="char.id"
              :label="char.name"
            >
              {{ char.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="角色类型">
          <a-select v-model:value="selectedCharacterRole">
            <a-select-option value="main">主要</a-select-option>
            <a-select-option value="supporting">配角</a-select-option>
            <a-select-option value="mentioned">提及</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 添加设定 Modal -->
    <a-modal
      v-model:open="showAddSettingModal"
      title="添加设定"
      @ok="handleAddSetting"
    >
      <a-form layout="vertical">
        <a-form-item label="选择设定">
          <a-select
            v-model:value="selectedSettingId"
            placeholder="请选择设定"
            show-search
            option-filter-prop="label"
          >
            <a-select-option
              v-for="setting in availableSettings"
              :key="setting.id"
              :value="setting.id"
              :label="setting.name"
            >
              {{ setting.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="使用说明">
          <a-textarea
            v-model:value="selectedSettingUsage"
            placeholder="描述如何在本章节中使用这个设定（可选）"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>

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
import OutlineAIGenerator from './OutlineAIGenerator.vue'
import ContentAIGenerator from './ContentAIGenerator.vue'
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

// 角色相关
const showAddCharacterModal = ref(false)
const selectedCharacterId = ref<string>()
const selectedCharacterRole = ref('mentioned')
const availableCharacters = ref<Character[]>([])

// 设定相关
const showAddSettingModal = ref(false)
const selectedSettingId = ref<string>()
const selectedSettingUsage = ref('')
const availableSettings = ref<WorldSetting[]>([])

// 字数统计
const wordCount = ref(0)

const handleWordCountUpdate = (count: number) => {
  wordCount.value = count
}

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

// 加载可用角色和设定
const loadAvailableData = async () => {
  if (!chapter.value) return

  try {
    // TODO: 从 API 加载小说的所有角色和设定
    // 这里需要调用 characterService 和 settingService
  } catch (error) {
    console.error('Failed to load available data:', error)
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

// 剧情要点管理
const addPlotPoint = () => {
  formData.value.plotPoints.push({
    type: 'action',
    description: ''
  })
}

const removePlotPoint = (index: number) => {
  formData.value.plotPoints.splice(index, 1)
}

// 角色管理
const handleAddCharacter = async () => {
  if (!selectedCharacterId.value) {
    message.error('请选择角色')
    return
  }

  try {
    await chapterService.addCharacterToChapter(
      props.chapterId,
      selectedCharacterId.value,
      selectedCharacterRole.value
    )
    await loadChapter()
    message.success('添加成功')
    showAddCharacterModal.value = false
    selectedCharacterId.value = undefined
  } catch (error) {
    console.error('Failed to add character:', error)
    message.error('添加失败')
  }
}

const handleCharacterRoleChange = async (item: ChapterCharacter) => {
  try {
    await chapterService.updateCharacterRole(
      props.chapterId,
      item.characterId,
      item.role
    )
    message.success('更新成功')
  } catch (error) {
    console.error('Failed to update character role:', error)
    message.error('更新失败')
  }
}

const removeCharacter = async (characterId: string) => {
  try {
    await chapterService.removeCharacterFromChapter(props.chapterId, characterId)
    await loadChapter()
    message.success('移除成功')
  } catch (error) {
    console.error('Failed to remove character:', error)
    message.error('移除失败')
  }
}

// 设定管理
const handleAddSetting = async () => {
  if (!selectedSettingId.value) {
    message.error('请选择设定')
    return
  }

  try {
    await chapterService.addSettingToChapter(
      props.chapterId,
      selectedSettingId.value,
      selectedSettingUsage.value
    )
    await loadChapter()
    message.success('添加成功')
    showAddSettingModal.value = false
    selectedSettingId.value = undefined
    selectedSettingUsage.value = ''
  } catch (error) {
    console.error('Failed to add setting:', error)
    message.error('添加失败')
  }
}

const removeSetting = async (settingId: string) => {
  try {
    await chapterService.removeSettingFromChapter(props.chapterId, settingId)
    await loadChapter()
    message.success('移除成功')
  } catch (error) {
    console.error('Failed to remove setting:', error)
    message.error('移除失败')
  }
}

// 一致性检查
const handleCheckConsistency = () => {
  // TODO: 调用 AI 检查一致性
  message.info('一致性检查功能开发中...')
}

const markResolved = async (issueId: string) => {
  // TODO: 标记一致性问题为已解决
  message.success('已标记为解决')
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

const getSettingTypeColor = (type: string) => {
  const colors = {
    'worldview': '#1890ff',
    'location': '#52c41a',
    'rule': '#faad14',
    'culture': '#722ed1'
  }
  return colors[type as keyof typeof colors] || '#1890ff'
}

const getSettingTypeIcon = (type: string) => {
  const icons = {
    'worldview': '世',
    'location': '地',
    'rule': '规',
    'culture': '文'
  }
  return icons[type as keyof typeof icons] || '设'
}

const getSeverityColor = (severity: string) => {
  const colors = {
    'low': 'default',
    'medium': 'warning',
    'high': 'error'
  }
  return colors[severity as keyof typeof colors] || 'default'
}

const getSeverityText = (severity: string) => {
  const texts = {
    'low': '低',
    'medium': '中',
    'high': '高'
  }
  return texts[severity as keyof typeof texts] || severity
}

const getConsistencyTypeText = (type: string) => {
  const texts = {
    'character': '角色一致性',
    'setting': '设定一致性',
    'timeline': '时间线',
    'logic': '逻辑'
  }
  return texts[type as keyof typeof texts] || type
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
  loadAvailableData()
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

/* Plot Points */
.plot-points-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plot-point-item {
  width: 100%;
}

.add-plot-point-btn {
  margin-top: 8px;
}

/* Outline Editor */
.outline-editor-wrapper {
  position: relative;
}

.outline-editor-wrapper :deep(.outline-ai-generator) {
  margin-bottom: 8px;
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

.consistency-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.consistency-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.consistency-list {
  background: transparent;
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
