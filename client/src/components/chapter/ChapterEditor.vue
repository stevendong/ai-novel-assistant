<template>
  <div class="h-full flex flex-col" v-if="chapter">
    <!-- Chapter Header -->
    <div class="bg-white border-b border-gray-200 p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <a-avatar :size="40" class="bg-blue-500">
            {{ chapter.chapterNumber }}
          </a-avatar>
          <div>
            <h1 class="text-xl font-bold text-gray-800">
              第{{ chapter.chapterNumber }}章：{{ chapter.title }}
            </h1>
            <div class="flex items-center space-x-4 text-sm text-gray-500">
              <span>状态：{{ statusText }}</span>
              <span>字数：{{ wordCount }}</span>
              <span>更新：{{ formatDate(chapter.updatedAt) }}</span>
              <span v-if="hasUnsavedChanges" class="text-orange-500">● 有未保存的更改</span>
            </div>
          </div>
        </div>
        
        <a-space>
          <a-button @click="requestAIOutline" :loading="loading">
            <template #icon>
              <RobotOutlined />
            </template>
            AI大纲
          </a-button>
          <a-button @click="runConsistencyCheck" :loading="loading">
            <template #icon>
              <CheckCircleOutlined />
            </template>
            一致性检查
          </a-button>
          <a-button 
            type="primary" 
            @click="saveChapter" 
            :loading="saving"
            :disabled="!hasUnsavedChanges"
          >
            <template #icon>
              <SaveOutlined />
            </template>
            保存
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="bg-white border-b border-gray-200">
      <a-tabs v-model:activeKey="activeTab" type="card" class="px-4">
        <a-tab-pane key="outline" tab="大纲">
          <template #tab>
            <span class="flex items-center">
              <FileTextOutlined class="mr-2" />
              大纲
            </span>
          </template>
        </a-tab-pane>
        <a-tab-pane key="content" tab="正文">
          <template #tab>
            <span class="flex items-center">
              <EditOutlined class="mr-2" />
              正文
            </span>
          </template>
        </a-tab-pane>
        <a-tab-pane key="characters" tab="角色">
          <template #tab>
            <span class="flex items-center">
              <TeamOutlined class="mr-2" />
              角色
            </span>
          </template>
        </a-tab-pane>
        <a-tab-pane key="settings" tab="设定">
          <template #tab>
            <span class="flex items-center">
              <GlobalOutlined class="mr-2" />
              设定
            </span>
          </template>
        </a-tab-pane>
        <a-tab-pane key="illustrations" tab="插图">
          <template #tab>
            <span class="flex items-center">
              <PictureOutlined class="mr-2" />
              插图
            </span>
          </template>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex">
      <!-- Editor Area (70%) -->
      <div class="flex-1 bg-white">
        <!-- Outline Tab -->
        <div v-if="activeTab === 'outline'" class="h-full flex">
          <!-- 编辑区 -->
          <div class="flex-1 p-6 overflow-y-auto border-r border-gray-200">
            <div class="mb-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-medium text-gray-800">章节大纲</h3>
                <div class="space-x-2">
                  <a-button size="small" @click="applyOutlineTemplate">
                    <template #icon>
                      <FileTextOutlined />
                    </template>
                    模板
                  </a-button>
                  <a-button size="small" :type="isOutlinePreviewMode ? 'primary' : 'default'" @click="toggleOutlinePreview">
                    <template #icon>
                      <EyeOutlined v-if="!isOutlinePreviewMode" />
                      <EditOutlined v-else />
                    </template>
                    {{ isOutlinePreviewMode ? '编辑' : '预览' }}
                  </a-button>
                </div>
              </div>
              <a-textarea
                v-model:value="outlineMarkdown"
                :rows="15"
                placeholder="在这里编写章节大纲...&#10;&#10;支持Markdown语法，例如：&#10;## 开场设定&#10;- 时间：深夜&#10;- 地点：废弃工厂&#10;- 主角：李明（紧张、好奇）&#10;&#10;## 关键情节&#10;1. 发现神秘线索&#10;2. 遭遇未知危险&#10;3. 勉强脱险，获得重要信息"
                class="font-mono"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-md font-medium text-gray-700">情节要点</h4>
                <a-button type="primary" size="small" @click="handleAddPlotPoint">
                  <PlusOutlined />
                  添加要点
                </a-button>
              </div>
              <div class="space-y-3">
                <div
                  v-for="(point, index) in chapter.plotPoints"
                  :key="index"
                  class="p-3 border border-gray-200 rounded-lg"
                >
                  <a-row :gutter="16" align="middle">
                    <a-col :span="4">
                      <a-select 
                        :value="point.type" 
                        @change="(value: string) => updatePlotPoint(index, { ...point, type: value as PlotPoint['type'] })"
                        placeholder="类型"
                      >
                        <a-select-option value="conflict">冲突</a-select-option>
                        <a-select-option value="discovery">发现</a-select-option>
                        <a-select-option value="emotion">情感</a-select-option>
                        <a-select-option value="action">行动</a-select-option>
                        <a-select-option value="dialogue">对话</a-select-option>
                      </a-select>
                    </a-col>
                    <a-col :span="18">
                      <a-input
                        :value="point.description"
                        @input="(e: Event) => updatePlotPoint(index, { ...point, description: (e.target as HTMLInputElement).value })"
                        placeholder="描述这个情节要点..."
                      />
                    </a-col>
                    <a-col :span="2">
                      <a-button type="text" danger @click="removePlotPoint(index)">
                        <DeleteOutlined />
                      </a-button>
                    </a-col>
                  </a-row>
                </div>
                <div v-if="chapter.plotPoints.length === 0" class="text-center py-8 text-gray-400">
                  <FileTextOutlined style="font-size: 48px; margin-bottom: 16px;" />
                  <p>暂无情节要点</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 预览区 -->
          <div class="flex-1 p-6 overflow-y-auto bg-gray-50" v-if="isOutlinePreviewMode">
            <div class="bg-white rounded-lg p-6 shadow-sm">
              <div class="markdown-novel" v-html="outlineRenderedHtml"></div>
            </div>
            
            <!-- 统计信息 -->
            <div class="mt-4 p-4 bg-white rounded-lg shadow-sm">
              <div class="text-sm text-gray-600 space-y-1">
                <div>字数统计: {{ outlineWordCount }}</div>
                <div>段落数: {{ outlineParagraphCount }}</div>
                <div v-if="outlineHeadings.length > 0">标题数: {{ outlineHeadings.length }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Content Tab -->
        <div v-else-if="activeTab === 'content'" class="h-full">
          <TiptapEditor
            v-model="contentText"
            :show-toolbar="true"
            :show-status-bar="true"
            :auto-save="true"
            placeholder="在这里开始你的小说创作...支持快捷键操作，专注于写作本身。"
            @change="handleContentChange"
          />
        </div>

        <!-- Characters Tab -->
        <div v-else-if="activeTab === 'characters'" class="h-full p-6 overflow-y-auto">
          <div class="max-w-4xl mx-auto">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-800">章节角色</h3>
              <a-button type="primary" @click="showAddCharacterModal = true">
                <PlusOutlined />
                添加角色
              </a-button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="chapterChar in chapter.characters"
                :key="chapterChar.characterId"
                class="p-4 border border-gray-200 rounded-lg"
              >
                <div class="flex items-start space-x-3">
                  <a-avatar :size="48">{{ chapterChar.character.name.charAt(0) }}</a-avatar>
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                      <h4 class="font-medium text-gray-800">{{ chapterChar.character.name }}</h4>
                      <a-tag :color="getRoleColor(chapterChar.role)">
                        {{ getRoleText(chapterChar.role) }}
                      </a-tag>
                    </div>
                    <p class="text-sm text-gray-500 mb-3">{{ chapterChar.character.description }}</p>
                    <a-select
                      :value="chapterChar.role"
                      @change="(value: string) => updateCharacterRole(chapterChar.characterId, value)"
                      size="small"
                      style="width: 100px"
                    >
                      <a-select-option value="main">主要</a-select-option>
                      <a-select-option value="supporting">配角</a-select-option>
                      <a-select-option value="mentioned">提及</a-select-option>
                    </a-select>
                  </div>
                  <a-button type="text" danger @click="removeCharacterFromChapter(chapterChar.characterId)">
                    <DeleteOutlined />
                  </a-button>
                </div>
              </div>
            </div>

            <div v-if="chapter.characters.length === 0" class="text-center py-8 text-gray-400">
              <TeamOutlined style="font-size: 48px; margin-bottom: 16px;" />
              <p>暂无章节角色</p>
              <a-button type="link" @click="showAddCharacterModal = true">
                添加第一个角色
              </a-button>
            </div>
          </div>
        </div>

        <!-- Settings Tab -->
        <div v-else-if="activeTab === 'settings'" class="h-full p-6 overflow-y-auto">
          <div class="max-w-4xl mx-auto">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-800">相关设定</h3>
              <a-button type="primary" @click="showAddSettingModal = true">
                <PlusOutlined />
                添加设定
              </a-button>
            </div>

            <div class="space-y-4">
              <div
                v-for="chapterSetting in chapter.settings"
                :key="chapterSetting.settingId"
                class="p-4 border border-gray-200 rounded-lg"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                      <a-tag :color="getSettingTypeColor(chapterSetting.setting.type)">
                        {{ getSettingTypeText(chapterSetting.setting.type) }}
                      </a-tag>
                      <h4 class="font-medium text-gray-800">{{ chapterSetting.setting.name }}</h4>
                    </div>
                    <p class="text-sm text-gray-500 mb-3">{{ chapterSetting.setting.description }}</p>
                    <div>
                      <h5 class="text-xs font-medium text-gray-600 mb-1">使用说明</h5>
                      <a-textarea
                        :value="chapterSetting.usage"
                        @input="(e: Event) => updateSettingUsage(chapterSetting.settingId, (e.target as HTMLTextAreaElement).value)"
                        :rows="2"
                        placeholder="说明如何在本章节中使用这个设定..."
                        size="small"
                      />
                    </div>
                  </div>
                  <a-button type="text" danger @click="removeSettingFromChapter(chapterSetting.settingId)">
                    <DeleteOutlined />
                  </a-button>
                </div>
              </div>
            </div>

            <div v-if="chapter.settings.length === 0" class="text-center py-8 text-gray-400">
              <GlobalOutlined style="font-size: 48px; margin-bottom: 16px;" />
              <p>暂无相关设定</p>
              <a-button type="link" @click="showAddSettingModal = true">
                添加第一个设定
              </a-button>
            </div>
          </div>
        </div>

        <!-- Illustrations Tab -->
        <div v-else-if="activeTab === 'illustrations'" class="h-full p-6 overflow-y-auto">
          <div class="max-w-4xl mx-auto">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-800">插图标记</h3>
              <a-button type="primary" @click="handleAddIllustration">
                <PlusOutlined />
                添加插图
              </a-button>
            </div>

            <div class="space-y-4">
              <div
                v-for="(illustration, index) in chapter.illustrations"
                :key="index"
                class="p-4 border border-gray-200 rounded-lg"
              >
                <a-row :gutter="16">
                  <a-col :span="6">
                    <a-form-item label="位置">
                      <a-select 
                        :value="illustration.position" 
                        @change="(value: string) => updateIllustration(index, { ...illustration, position: value as Illustration['position'] })"
                        placeholder="选择位置"
                      >
                        <a-select-option value="beginning">章节开头</a-select-option>
                        <a-select-option value="middle">章节中间</a-select-option>
                        <a-select-option value="end">章节结尾</a-select-option>
                        <a-select-option value="custom">自定义</a-select-option>
                      </a-select>
                    </a-form-item>
                  </a-col>
                  <a-col :span="16">
                    <a-form-item label="描述">
                      <a-textarea
                        :value="illustration.description"
                        @input="(e: Event) => updateIllustration(index, { ...illustration, description: (e.target as HTMLTextAreaElement).value })"
                        :rows="2"
                        placeholder="描述插图内容..."
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="2" class="flex items-end">
                    <a-button type="text" danger @click="removeIllustration(index)">
                      <DeleteOutlined />
                    </a-button>
                  </a-col>
                </a-row>
                <div v-if="illustration.position === 'custom'" class="mt-2">
                  <a-form-item label="段落位置">
                    <a-input-number
                      :value="illustration.customPosition"
                      @change="(value: number) => updateIllustration(index, { ...illustration, customPosition: value })"
                      placeholder="段落号"
                      :min="1"
                    />
                  </a-form-item>
                </div>
              </div>
              
              <div v-if="chapter.illustrations.length === 0" class="text-center py-8 text-gray-400">
                <PictureOutlined style="font-size: 48px; margin-bottom: 16px;" />
                <p>暂无插图标记</p>
                <a-button type="link" @click="handleAddIllustration">
                  添加第一个插图
                </a-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <a-modal v-model:open="showAddCharacterModal" title="添加角色到章节" @ok="addCharacterToChapter">
      <a-select
        v-model:value="selectedCharacterId"
        placeholder="选择角色"
        style="width: 100%"
        show-search
        :filter-option="filterCharacter"
      >
        <a-select-option
          v-for="character in availableCharacters"
          :key="character.id"
          :value="character.id"
        >
          {{ character.name }} - {{ character.description }}
        </a-select-option>
      </a-select>
    </a-modal>

    <a-modal v-model:open="showAddSettingModal" title="添加设定到章节" @ok="addSettingToChapter">
      <a-select
        v-model:value="selectedSettingId"
        placeholder="选择设定"
        style="width: 100%"
        show-search
        :filter-option="filterSetting"
      >
        <a-select-option
          v-for="setting in availableSettings"
          :key="setting.id"
          :value="setting.id"
        >
          {{ setting.name }} - {{ setting.description }}
        </a-select-option>
      </a-select>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  RobotOutlined,
  CheckCircleOutlined,
  SaveOutlined,
  FileTextOutlined,
  EditOutlined,
  TeamOutlined,
  GlobalOutlined,
  PictureOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons-vue'
import { useChapter } from '@/composables/useChapter'
import { useMarkdown } from '@/composables/useMarkdown'
import { chapterService } from '@/services/chapterService'
import TiptapEditor from './TiptapEditor.vue'
import type { Character, WorldSetting, PlotPoint, Illustration } from '@/types'
import '@/assets/markdown-novel.css'

interface Props {
  chapterId?: string
}

const props = defineProps<Props>()
const route = useRoute()

// 获取章节ID - 优先使用props，然后是路由参数
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
  addIllustration,
  removeIllustration,
  updateIllustration,
  generateOutline,
  checkConsistency,
  formatDate
} = useChapter()

const activeTab = ref('outline')

// Markdown 大纲功能
const {
  markdownText: outlineMarkdown,
  renderedHtml: outlineRenderedHtml,
  wordCount: outlineWordCount,
  paragraphCount: outlineParagraphCount,
  headings: outlineHeadings,
  setMarkdown: setOutlineMarkdown,
  applyTemplate
} = useMarkdown()

const isOutlinePreviewMode = ref(false)

// 正文编辑器内容
const contentText = ref('')

// 模态框状态
const showAddCharacterModal = ref(false)
const showAddSettingModal = ref(false)
const selectedCharacterId = ref<string>()
const selectedSettingId = ref<string>()

// 模拟数据 - 在实际应用中应该从API获取
const availableCharacters = ref<Character[]>([
  { id: '2', novelId: '1', name: '王警官', description: '经验丰富的老警察', appearance: '', personality: '', background: '', relationships: {}, isLocked: false },
  { id: '3', novelId: '1', name: '小雨', description: '李明的助手', appearance: '', personality: '', background: '', relationships: {}, isLocked: false }
])

const availableSettings = ref<WorldSetting[]>([
  { id: '2', novelId: '1', type: 'location', name: '警察局', description: '市区警察局', details: {}, isLocked: false },
  { id: '3', novelId: '1', type: 'rule', name: '调查流程', description: '私人侦探的调查流程规范', details: {}, isLocked: false }
])

// 不再需要Monaco编辑器初始化

// 工具函数
const getSettingTypeText = (type: string) => {
  const texts = {
    'worldview': '世界观',
    'location': '地理位置', 
    'rule': '规则体系',
    'culture': '文化背景'
  }
  return texts[type as keyof typeof texts] || type
}

const getSettingTypeColor = (type: string) => {
  const colors = {
    'worldview': 'blue',
    'location': 'green',
    'rule': 'orange',
    'culture': 'purple'
  }
  return colors[type as keyof typeof colors] || 'default'
}

const getRoleText = (role: string) => {
  const texts = {
    'main': '主要',
    'supporting': '配角',
    'mentioned': '提及'
  }
  return texts[role as keyof typeof texts] || role
}

const getRoleColor = (role: string) => {
  const colors = {
    'main': 'red',
    'supporting': 'blue', 
    'mentioned': 'gray'
  }
  return colors[role as keyof typeof colors] || 'default'
}

// 事件处理函数
const handleAddPlotPoint = () => {
  addPlotPoint({
    type: 'action',
    description: ''
  })
}

const handleAddIllustration = () => {
  addIllustration({
    position: 'middle',
    description: ''
  })
}

// 角色管理
const addCharacterToChapter = async () => {
  if (!selectedCharacterId.value || !chapter.value) return

  try {
    // 调用API添加角色到章节
    await chapterService.addCharacterToChapter(chapter.value.id, selectedCharacterId.value, 'mentioned')
    
    // 重新加载章节数据
    await loadChapter(chapter.value.id)
    
    message.success('角色添加成功')
  } catch (err) {
    message.error('角色添加失败')
  } finally {
    showAddCharacterModal.value = false
    selectedCharacterId.value = undefined
  }
}

const removeCharacterFromChapter = (characterId: string) => {
  // 这里应该调用API删除角色关联
  // 暂时先在前端处理
  if (!chapter.value) return
  
  const index = chapter.value.characters.findIndex(c => c.characterId === characterId)
  if (index > -1) {
    chapter.value.characters.splice(index, 1)
    hasUnsavedChanges.value = true
  }
}

const updateCharacterRole = (characterId: string, role: string) => {
  if (!chapter.value) return
  
  const chapterChar = chapter.value.characters.find(c => c.characterId === characterId)
  if (chapterChar) {
    chapterChar.role = role as 'main' | 'supporting' | 'mentioned'
    hasUnsavedChanges.value = true
  }
}

// 设定管理
const addSettingToChapter = async () => {
  if (!selectedSettingId.value || !chapter.value) return

  try {
    await chapterService.addSettingToChapter(chapter.value.id, selectedSettingId.value, '')
    await loadChapter(chapter.value.id)
    message.success('设定添加成功')
  } catch (err) {
    message.error('设定添加失败')
  } finally {
    showAddSettingModal.value = false
    selectedSettingId.value = undefined
  }
}

const removeSettingFromChapter = (settingId: string) => {
  if (!chapter.value) return
  
  const index = chapter.value.settings.findIndex(s => s.settingId === settingId)
  if (index > -1) {
    chapter.value.settings.splice(index, 1)
    hasUnsavedChanges.value = true
  }
}

const updateSettingUsage = (settingId: string, usage: string) => {
  if (!chapter.value) return
  
  const chapterSetting = chapter.value.settings.find(s => s.settingId === settingId)
  if (chapterSetting) {
    chapterSetting.usage = usage
    hasUnsavedChanges.value = true
  }
}

// AI功能
const requestAIOutline = async () => {
  if (!chapter.value) return

  try {
    const outline = await generateOutline()
    if (outline) {
      // 这里可以显示AI生成的大纲建议
      message.success('AI大纲生成完成')
      console.log('AI Outline:', outline)
    }
  } catch (err) {
    message.error('AI大纲生成失败')
  }
}

const runConsistencyCheck = async () => {
  if (!chapter.value) return

  try {
    const checks = await checkConsistency()
    if (checks) {
      message.success('一致性检查完成')
      console.log('Consistency Checks:', checks)
    }
  } catch (err) {
    message.error('一致性检查失败')
  }
}

// 过滤函数
const filterCharacter = (input: string, option: any) => {
  return option.children.toLowerCase().includes(input.toLowerCase())
}

const filterSetting = (input: string, option: any) => {
  return option.children.toLowerCase().includes(input.toLowerCase())
}

// Markdown 大纲相关功能
const toggleOutlinePreview = () => {
  isOutlinePreviewMode.value = !isOutlinePreviewMode.value
}

const applyOutlineTemplate = () => {
  applyTemplate('chapterOutline')
}

// 正文内容处理
const handleContentChange = (value: string) => {
  contentText.value = value
  if (chapter.value) {
    updateChapter('content', value)
  }
}

// 监听大纲内容变化，同步到章节数据
watch(outlineMarkdown, (newValue) => {
  if (chapter.value) {
    updateChapter('outline', newValue)
  }
})

// 监听章节大纲变化，同步到Markdown
watch(() => chapter.value?.outline, (newValue) => {
  if (newValue !== outlineMarkdown.value) {
    setOutlineMarkdown(newValue || '')
  }
}, { immediate: true })

// 监听章节正文变化，同步到编辑器
watch(() => chapter.value?.content, (newValue) => {
  if (newValue !== contentText.value) {
    contentText.value = newValue || ''
  }
}, { immediate: true })

// 生命周期
onMounted(async () => {
  // 加载章节数据
  if (chapterId.value) {
    await loadChapter(chapterId.value)
  }
  
  // 初始化Markdown内容
  if (chapter.value?.outline) {
    setOutlineMarkdown(chapter.value.outline)
  }
  if (chapter.value?.content) {
    contentText.value = chapter.value.content
  }
})

// 标签页切换处理（如果需要可以添加其他逻辑）

// 监听错误信息
watch(error, (newError) => {
  if (newError) {
    message.error(newError)
  }
})

// 组件卸载时的清理工作（如需要可以添加）
</script>

<style scoped>
:deep(.ant-tabs-content-holder) {
  padding: 0;
}

:deep(.ant-tabs-tabpane) {
  height: 100%;
}
</style>