<template>
  <div class="h-full flex flex-col">
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
              <span>状态：{{ getStatusText(chapter.status) }}</span>
              <span>字数：{{ wordCount }}</span>
              <span>更新：{{ formatDate(chapter.updatedAt) }}</span>
            </div>
          </div>
        </div>
        
        <a-space>
          <a-button @click="requestAIOutline">
            <template #icon>
              <RobotOutlined />
            </template>
            AI大纲
          </a-button>
          <a-button @click="runConsistencyCheck">
            <template #icon>
              <CheckCircleOutlined />
            </template>
            一致性检查
          </a-button>
          <a-button type="primary" @click="saveChapter">
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
        <div v-if="activeTab === 'outline'" class="h-full p-6 overflow-y-auto">
          <div class="max-w-4xl mx-auto">
            <div class="mb-6">
              <h3 class="text-lg font-medium text-gray-800 mb-3">章节大纲</h3>
              <a-textarea
                v-model:value="editingChapter.outline"
                :rows="12"
                placeholder="在这里编写章节大纲...&#10;&#10;例如：&#10;## 开场设定&#10;- 时间：深夜&#10;- 地点：废弃工厂&#10;- 主角：李明（紧张、好奇）&#10;&#10;## 关键情节&#10;1. 发现神秘线索&#10;2. 遭遇未知危险&#10;3. 勉强脱险，获得重要信息"
                class="font-mono"
              />
            </div>

            <div class="mb-6">
              <h4 class="text-md font-medium text-gray-700 mb-3">情节要点</h4>
              <div class="space-y-3">
                <div
                  v-for="(point, index) in editingChapter.plotPoints"
                  :key="index"
                  class="p-3 border border-gray-200 rounded-lg"
                >
                  <a-row :gutter="16" align="middle">
                    <a-col :span="4">
                      <a-select v-model:value="point.type" placeholder="类型">
                        <a-select-option value="conflict">冲突</a-select-option>
                        <a-select-option value="discovery">发现</a-select-option>
                        <a-select-option value="emotion">情感</a-select-option>
                        <a-select-option value="action">行动</a-select-option>
                        <a-select-option value="dialogue">对话</a-select-option>
                      </a-select>
                    </a-col>
                    <a-col :span="18">
                      <a-input
                        v-model:value="point.description"
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
                <a-button type="dashed" block @click="addPlotPoint">
                  <PlusOutlined />
                  添加情节要点
                </a-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Content Tab -->
        <div v-else-if="activeTab === 'content'" class="h-full">
          <div class="h-full" ref="editorContainer">
            <!-- Monaco editor will be mounted here -->
          </div>
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
                v-for="character in chapterCharacters"
                :key="character.id"
                class="p-4 border border-gray-200 rounded-lg"
              >
                <div class="flex items-start space-x-3">
                  <a-avatar :size="48">{{ character.name.charAt(0) }}</a-avatar>
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-800">{{ character.name }}</h4>
                    <p class="text-sm text-gray-500 mt-1">{{ character.description }}</p>
                    <div class="mt-3">
                      <h5 class="text-xs font-medium text-gray-600 mb-1">本章节作用</h5>
                      <a-textarea
                        v-model:value="character.chapterRole"
                        :rows="2"
                        placeholder="描述角色在本章节中的作用..."
                        size="small"
                      />
                    </div>
                  </div>
                  <a-button type="text" danger @click="removeCharacterFromChapter(character.id)">
                    <DeleteOutlined />
                  </a-button>
                </div>
              </div>
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
                v-for="setting in chapterSettings"
                :key="setting.id"
                class="p-4 border border-gray-200 rounded-lg"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2">
                      <a-tag :color="getSettingTypeColor(setting.type)">
                        {{ getSettingTypeText(setting.type) }}
                      </a-tag>
                      <h4 class="font-medium text-gray-800">{{ setting.name }}</h4>
                    </div>
                    <p class="text-sm text-gray-500 mt-1">{{ setting.description }}</p>
                    <div class="mt-3">
                      <h5 class="text-xs font-medium text-gray-600 mb-1">使用说明</h5>
                      <a-textarea
                        v-model:value="setting.chapterUsage"
                        :rows="2"
                        placeholder="说明如何在本章节中使用这个设定..."
                        size="small"
                      />
                    </div>
                  </div>
                  <a-button type="text" danger @click="removeSettingFromChapter(setting.id)">
                    <DeleteOutlined />
                  </a-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Illustrations Tab -->
        <div v-else-if="activeTab === 'illustrations'" class="h-full p-6 overflow-y-auto">
          <div class="max-w-4xl mx-auto">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-800">插图标记</h3>
              <a-button type="primary" @click="addIllustration">
                <PlusOutlined />
                添加插图
              </a-button>
            </div>

            <div class="space-y-4">
              <div
                v-for="(illustration, index) in editingChapter.illustrations"
                :key="index"
                class="p-4 border border-gray-200 rounded-lg"
              >
                <a-row :gutter="16">
                  <a-col :span="6">
                    <a-form-item label="位置">
                      <a-select v-model:value="illustration.position" placeholder="选择位置">
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
                        v-model:value="illustration.description"
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
              </div>
              
              <div v-if="editingChapter.illustrations.length === 0" class="text-center py-8 text-gray-400">
                <PictureOutlined style="font-size: 48px; margin-bottom: 16px;" />
                <p>暂无插图标记</p>
                <a-button type="link" @click="addIllustration">
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as monaco from 'monaco-editor'
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
  DeleteOutlined
} from '@ant-design/icons-vue'
import type { Chapter, Character, WorldSetting } from '@/types'

interface Props {
  chapter: Chapter
}

const props = defineProps<Props>()

const activeTab = ref('outline')
const editingChapter = ref<any>({})
const wordCount = ref(0)
const editorContainer = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null

const showAddCharacterModal = ref(false)
const showAddSettingModal = ref(false)
const selectedCharacterId = ref<string>()
const selectedSettingId = ref<string>()

// Mock data
const chapterCharacters = ref([
  {
    id: '1',
    name: '李明',
    description: '主角，私人侦探',
    chapterRole: '本章节的主要视角角色，负责推进剧情发展'
  }
])

const chapterSettings = ref([
  {
    id: '1',
    type: 'location',
    name: '废弃工厂',
    description: '位于城市郊区的废弃工厂',
    chapterUsage: '作为主要场景，营造紧张神秘的氛围'
  }
])

const availableCharacters = ref<Character[]>([
  { id: '2', novelId: '1', name: '王警官', description: '经验丰富的老警察', appearance: '', personality: '', background: '', relationships: {}, isLocked: false },
  { id: '3', novelId: '1', name: '小雨', description: '李明的助手', appearance: '', personality: '', background: '', relationships: {}, isLocked: false }
])

const availableSettings = ref<WorldSetting[]>([
  { id: '2', novelId: '1', type: 'location', name: '警察局', description: '市区警察局', details: {}, isLocked: false },
  { id: '3', novelId: '1', type: 'rule', name: '调查流程', description: '私人侦探的调查流程规范', details: {}, isLocked: false }
])

// Initialize editing data
watch(() => props.chapter, (newChapter) => {
  editingChapter.value = {
    ...newChapter,
    plotPoints: [
      { type: 'discovery', description: '发现神秘线索' },
      { type: 'conflict', description: '遭遇未知危险' },
      { type: 'action', description: '勉强脱险' }
    ],
    illustrations: [
      { position: 'beginning', description: '废弃工厂的外观，月光下显得阴森' },
      { position: 'middle', description: '主角发现线索的瞬间' }
    ]
  }
  updateWordCount()
}, { immediate: true })

const initMonacoEditor = async () => {
  if (!editorContainer.value) return

  // Configure Monaco editor
  monaco.languages.register({ id: 'novel' })
  
  editor = monaco.editor.create(editorContainer.value, {
    value: editingChapter.value.content || '在这里开始写作...',
    language: 'novel',
    theme: 'vs',
    fontSize: 16,
    lineHeight: 28,
    wordWrap: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    renderLineHighlight: 'none',
    fontFamily: '"Source Han Serif CN", "Noto Serif CJK SC", serif'
  })

  // Update content on change
  editor.onDidChangeModelContent(() => {
    editingChapter.value.content = editor?.getValue() || ''
    updateWordCount()
  })

  // Auto-save every 30 seconds
  setInterval(() => {
    saveChapter()
  }, 30000)
}

const updateWordCount = () => {
  const content = editingChapter.value.content || ''
  wordCount.value = content.replace(/\s/g, '').length
}

const getStatusText = (status: string) => {
  const texts = {
    'planning': '规划中',
    'writing': '写作中',
    'reviewing': '审核中',
    'completed': '已完成'
  }
  return texts[status as keyof typeof texts] || status
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

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

// Plot points management
const addPlotPoint = () => {
  if (!editingChapter.value.plotPoints) {
    editingChapter.value.plotPoints = []
  }
  editingChapter.value.plotPoints.push({
    type: 'action',
    description: ''
  })
}

const removePlotPoint = (index: number) => {
  editingChapter.value.plotPoints.splice(index, 1)
}

// Illustrations management
const addIllustration = () => {
  if (!editingChapter.value.illustrations) {
    editingChapter.value.illustrations = []
  }
  editingChapter.value.illustrations.push({
    position: 'middle',
    description: ''
  })
}

const removeIllustration = (index: number) => {
  editingChapter.value.illustrations.splice(index, 1)
}

// Character management
const addCharacterToChapter = () => {
  if (selectedCharacterId.value) {
    const character = availableCharacters.value.find(c => c.id === selectedCharacterId.value)
    if (character) {
      chapterCharacters.value.push({
        id: character.id,
        name: character.name,
        description: character.description,
        chapterRole: ''
      })
    }
  }
  showAddCharacterModal.value = false
  selectedCharacterId.value = undefined
}

const removeCharacterFromChapter = (characterId: string) => {
  const index = chapterCharacters.value.findIndex(c => c.id === characterId)
  if (index > -1) {
    chapterCharacters.value.splice(index, 1)
  }
}

const filterCharacter = (input: string, option: any) => {
  return option.children.toLowerCase().includes(input.toLowerCase())
}

// Setting management
const addSettingToChapter = () => {
  if (selectedSettingId.value) {
    const setting = availableSettings.value.find(s => s.id === selectedSettingId.value)
    if (setting) {
      chapterSettings.value.push({
        id: setting.id,
        type: setting.type,
        name: setting.name,
        description: setting.description,
        chapterUsage: ''
      })
    }
  }
  showAddSettingModal.value = false
  selectedSettingId.value = undefined
}

const removeSettingFromChapter = (settingId: string) => {
  const index = chapterSettings.value.findIndex(s => s.id === settingId)
  if (index > -1) {
    chapterSettings.value.splice(index, 1)
  }
}

const filterSetting = (input: string, option: any) => {
  return option.children.toLowerCase().includes(input.toLowerCase())
}

// Actions
const saveChapter = () => {
  console.log('Save chapter:', editingChapter.value)
}

const requestAIOutline = () => {
  console.log('Request AI outline for chapter:', editingChapter.value)
}

const runConsistencyCheck = () => {
  console.log('Run consistency check for chapter:', editingChapter.value)
}

// Lifecycle
onMounted(async () => {
  // Wait for the content tab to be potentially active
  await nextTick()
  if (activeTab.value === 'content') {
    initMonacoEditor()
  }
})

watch(activeTab, async (newTab) => {
  if (newTab === 'content') {
    await nextTick()
    if (!editor && editorContainer.value) {
      initMonacoEditor()
    }
  }
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
  }
})
</script>

<style scoped>
:deep(.ant-tabs-content-holder) {
  padding: 0;
}

:deep(.ant-tabs-tabpane) {
  height: 100%;
}
</style>