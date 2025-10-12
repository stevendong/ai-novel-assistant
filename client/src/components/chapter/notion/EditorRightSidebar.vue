<template>
  <div
    v-if="visible"
    class="editor-right-sidebar theme-bg-container border-l theme-border flex flex-col"
    :style="{ width: sidebarWidth + 'px' }"
  >
    <!-- 侧边栏头部 -->
    <div class="px-4 py-3 border-b theme-border flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <a-avatar size="small" class="bg-green-500">
          <InfoCircleOutlined />
        </a-avatar>
        <div>
          <h3 class="text-sm font-medium theme-text-primary leading-none">章节信息</h3>
          <span class="text-xs theme-text-secondary">角色与设定</span>
        </div>
      </div>
      <a-button type="text" size="small" @click="$emit('update:visible', false)" class="h-8 w-8">
        <MenuFoldOutlined />
      </a-button>
    </div>

    <!-- 面板切换标签 -->
    <div class="px-4 py-2 border-b theme-border">
      <a-segmented
        v-model:value="localActivePanel"
        :options="panels"
        block
        size="small"
        class="h-8"
      />
    </div>

    <!-- 可滚动内容区 -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- 信息面板 -->
      <div v-if="localActivePanel === 'info'" class="space-y-4">
        <a-card size="small" :bordered="false" class="shadow-sm">
          <template #title>
            <div class="flex items-center space-x-2">
              <BarChartOutlined class="text-blue-500" />
              <span class="text-sm font-medium">写作统计</span>
            </div>
          </template>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <EditOutlined class="text-blue-500" />
                <span class="text-sm theme-text-primary">当前字数</span>
              </div>
              <span class="text-lg font-bold text-blue-600">{{ chapter?.content ? countWords(chapter.content) : 0 }}</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-sm theme-text-primary">目标字数</span>
              </div>
              <span class="text-lg font-bold text-orange-600">{{ chapter?.targetWordCount || 2000 }}</span>
            </div>
            <a-progress
              :percent="Math.min(100, Math.round(((chapter?.content ? countWords(chapter.content) : 0) / (chapter?.targetWordCount || 2000)) * 100))"
              :show-info="true"
              size="small"
            />
          </div>
        </a-card>

        <a-card size="small" :bordered="false" class="shadow-sm">
          <template #title>
            <div class="flex items-center space-x-2">
              <SettingOutlined class="text-purple-500" />
              <span class="text-sm font-medium">章节设置</span>
            </div>
          </template>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium theme-text-primary mb-1 block">目标字数</label>
              <a-input-number
                :value="chapter?.targetWordCount || 2000"
                @change="(val) => $emit('update-target-words', val)"
                :min="100"
                :max="20000"
                :step="100"
                style="width: 100%"
                size="small"
              />
            </div>
            <div>
              <label class="text-xs font-medium theme-text-primary mb-1 block">章节状态</label>
              <a-select
                :value="chapter?.status"
                style="width: 100%"
                size="small"
                disabled
              >
                <a-select-option value="planning">规划中</a-select-option>
                <a-select-option value="draft">草稿</a-select-option>
                <a-select-option value="review">审阅中</a-select-option>
                <a-select-option value="published">已发布</a-select-option>
              </a-select>
            </div>
          </div>
        </a-card>
      </div>

      <!-- 角色面板 -->
      <div v-else-if="localActivePanel === 'characters'" class="space-y-3">
        <a-card size="small" :bordered="false" class="shadow-sm">
          <template #title>
            <div class="flex items-center space-x-2">
              <TeamOutlined class="text-blue-500" />
              <span class="text-sm font-medium">章节角色</span>
            </div>
          </template>
          <div class="space-y-3">
            <div
              v-for="chapterChar in chapter?.characters"
              :key="chapterChar.characterId"
              class="p-3 rounded border theme-border bg-white"
            >
              <div class="flex items-start space-x-3">
                <a-avatar size="small" class="bg-blue-500 flex-shrink-0">
                  {{ chapterChar.character.name.charAt(0) }}
                </a-avatar>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <h5 class="font-medium theme-text-primary truncate">{{ chapterChar.character.name }}</h5>
                    <a-tag :color="getRoleColor(chapterChar.role)" size="small">
                      {{ getRoleText(chapterChar.role) }}
                    </a-tag>
                  </div>
                  <p class="text-xs theme-text-secondary truncate mb-2">{{ chapterChar.character.description }}</p>
                  <div class="flex items-center space-x-2">
                    <a-select
                      :value="chapterChar.role"
                      @change="(val) => $emit('update-character-role', chapterChar.characterId, val)"
                      size="small"
                      style="width: 80px"
                    >
                      <a-select-option value="main">主要</a-select-option>
                      <a-select-option value="supporting">配角</a-select-option>
                      <a-select-option value="mentioned">提及</a-select-option>
                    </a-select>
                    <a-button
                      type="text"
                      danger
                      size="small"
                      @click="$emit('remove-character', chapterChar.characterId)"
                      class="h-8 w-8"
                    >
                      <DeleteOutlined />
                    </a-button>
                  </div>
                </div>
              </div>
            </div>

            <a-button type="dashed" block size="small" @click="showAddCharacter = true" class="h-8">
              <PlusOutlined />
              添加角色
            </a-button>
          </div>
        </a-card>
      </div>

      <!-- 设定面板 -->
      <div v-else-if="localActivePanel === 'settings'" class="space-y-3">
        <a-card size="small" :bordered="false" class="shadow-sm">
          <template #title>
            <div class="flex items-center space-x-2">
              <GlobalOutlined class="text-green-500" />
              <span class="text-sm font-medium">相关设定</span>
            </div>
          </template>
          <div class="space-y-3">
            <div
              v-for="chapterSetting in chapter?.settings"
              :key="chapterSetting.settingId"
              class="p-3 rounded border theme-border bg-white"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="flex items-center space-x-2">
                  <a-tag :color="getSettingTypeColor(chapterSetting.setting.type)" size="small">
                    {{ getSettingTypeText(chapterSetting.setting.type) }}
                  </a-tag>
                  <h5 class="font-medium theme-text-primary">{{ chapterSetting.setting.name }}</h5>
                </div>
                <a-button
                  type="text"
                  danger
                  size="small"
                  @click="$emit('remove-setting', chapterSetting.settingId)"
                  class="h-8 w-8"
                >
                  <DeleteOutlined />
                </a-button>
              </div>
              <p class="text-xs theme-text-secondary mb-2">{{ chapterSetting.setting.description }}</p>
              <a-textarea
                :value="chapterSetting.usage"
                @update:value="(val) => $emit('update-setting-usage', chapterSetting.settingId, val)"
                :rows="2"
                size="small"
                placeholder="使用说明..."
              />
            </div>

            <a-button type="dashed" block size="small" @click="showAddSetting = true" class="h-8">
              <PlusOutlined />
              添加设定
            </a-button>
          </div>
        </a-card>
      </div>

      <!-- AI 助手面板 -->
      <div v-else-if="localActivePanel === 'ai'" class="space-y-4">
        <a-card size="small" :bordered="false" class="shadow-sm">
          <template #title>
            <div class="flex items-center space-x-2">
              <RobotOutlined class="text-purple-500" />
              <span class="text-sm font-medium">AI 助手</span>
            </div>
          </template>
          <div class="space-y-3">
            <a-button block size="small" @click="$emit('ai-action', 'outline')" class="h-8">
              <RobotOutlined />
              生成大纲
            </a-button>
            <a-button-group block class="w-full">
              <a-button size="small" @click="$emit('ai-action', 'content-500')" class="flex-1 h-8">
                500字
              </a-button>
              <a-button size="small" @click="$emit('ai-action', 'content-1000')" class="flex-1 h-8">
                1000字
              </a-button>
              <a-button size="small" @click="$emit('ai-action', 'content-2000')" class="flex-1 h-8">
                2000字
              </a-button>
            </a-button-group>
            <a-button block size="small" @click="$emit('ai-action', 'check')" class="h-8">
              <CheckCircleOutlined />
              一致性检查
            </a-button>
          </div>
        </a-card>

        <a-card size="small" :bordered="false" class="shadow-sm" v-if="consistencyIssues.length > 0">
          <template #title>
            <div class="flex items-center space-x-2">
              <WarningOutlined class="text-orange-500" />
              <span class="text-sm font-medium">检查结果</span>
            </div>
          </template>
          <div class="space-y-2">
            <div
              v-for="issue in consistencyIssues.slice(0, 5)"
              :key="issue.id"
              class="p-2 rounded border theme-border"
              :class="'issue-' + issue.severity"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-1 mb-1">
                    <a-tag :color="getSeverityColor(issue.severity)" size="small">
                      {{ getSeverityLabel(issue.severity) }}
                    </a-tag>
                  </div>
                  <p class="text-xs theme-text-primary">{{ issue.issue }}</p>
                </div>
                <a-button
                  type="text"
                  size="small"
                  @click="$emit('toggle-issue', issue.id, !issue.resolved)"
                  class="h-6 w-6"
                >
                  {{ issue.resolved ? '✓' : '○' }}
                </a-button>
              </div>
            </div>
            <a-button type="link" size="small" block v-if="consistencyIssues.length > 5">
              查看全部 {{ consistencyIssues.length }} 个问题
            </a-button>
          </div>
        </a-card>
      </div>
    </div>

    <!-- 收起按钮 -->
    <div class="px-4 py-2 border-t theme-border">
      <a-button type="text" block size="small" @click="$emit('update:visible', false)">
        <MenuFoldOutlined /> 收起
      </a-button>
    </div>

    <!-- 调整宽度手柄 -->
    <div class="resize-handle" @mousedown="startResize"></div>
  </div>

  <!-- 收起时的展开按钮 -->
  <div v-else class="flex items-center justify-center py-2 border-l theme-border theme-bg-container">
    <a-button type="text" @click="$emit('update:visible', true)">
      <MenuUnfoldOutlined />
    </a-button>
  </div>

  <!-- 添加角色对话框 -->
  <a-modal
    v-model:open="showAddCharacter"
    title="添加角色到章节"
    @ok="handleAddCharacter"
  >
    <a-select
      v-model:value="selectedCharacterId"
      placeholder="选择角色"
      style="width: 100%"
      show-search
    >
      <a-select-option
        v-for="character in filteredAvailableCharacters"
        :key="character.id"
        :value="character.id"
      >
        {{ character.name }} - {{ character.description }}
      </a-select-option>
    </a-select>
  </a-modal>

  <!-- 添加设定对话框 -->
  <a-modal
    v-model:open="showAddSetting"
    title="添加设定到章节"
    @ok="handleAddSetting"
  >
    <a-select
      v-model:value="selectedSettingId"
      placeholder="选择设定"
      style="width: 100%"
      show-search
    >
      <a-select-option
        v-for="setting in filteredAvailableSettings"
        :key="setting.id"
        :value="setting.id"
      >
        {{ setting.name }} - {{ setting.description }}
      </a-select-option>
    </a-select>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DeleteOutlined,
  PlusOutlined,
  RobotOutlined,
  EditOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  SettingOutlined,
  TeamOutlined,
  GlobalOutlined,
  WarningOutlined
} from '@ant-design/icons-vue'
import { countValidWords } from '@/utils/textUtils'

interface Props {
  visible: boolean
  chapter: any
  activePanel: 'info' | 'characters' | 'settings' | 'ai'
  availableCharacters: any[]
  availableSettings: any[]
  consistencyIssues: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'update:active-panel', value: string): void
  (e: 'update-target-words', value: number): void
  (e: 'add-character', characterId: string): void
  (e: 'remove-character', characterId: string): void
  (e: 'update-character-role', characterId: string, role: string): void
  (e: 'add-setting', settingId: string): void
  (e: 'remove-setting', settingId: string): void
  (e: 'update-setting-usage', settingId: string, usage: string): void
  (e: 'ai-action', action: string): void
  (e: 'toggle-issue', issueId: string, resolved: boolean): void
}>()

const panels = [
  { label: '信息', value: 'info' },
  { label: '角色', value: 'characters' },
  { label: '设定', value: 'settings' },
  { label: 'AI', value: 'ai' }
]

const localActivePanel = ref(props.activePanel)
const sidebarWidth = ref(320)
const isResizing = ref(false)
const showAddCharacter = ref(false)
const showAddSetting = ref(false)
const selectedCharacterId = ref<string>()
const selectedSettingId = ref<string>()

watch(localActivePanel, (val) => {
  emit('update:active-panel', val)
})

watch(() => props.activePanel, (val) => {
  localActivePanel.value = val
})

const filteredAvailableCharacters = computed(() => {
  if (!props.chapter) return props.availableCharacters
  const chapterCharacterIds = props.chapter.characters?.map((c: any) => c.characterId) || []
  return props.availableCharacters.filter(c => !chapterCharacterIds.includes(c.id))
})

const filteredAvailableSettings = computed(() => {
  if (!props.chapter) return props.availableSettings
  const chapterSettingIds = props.chapter.settings?.map((s: any) => s.settingId) || []
  return props.availableSettings.filter(s => !chapterSettingIds.includes(s.id))
})

const countWords = (text: string) => {
  return countValidWords(text, { removeMarkdown: true, removeHtml: true })
}

const getRoleColor = (role: string) => {
  const colors: Record<string, string> = {
    'main': 'red',
    'supporting': 'blue',
    'mentioned': 'default'
  }
  return colors[role] || 'default'
}

const getRoleText = (role: string) => {
  const texts: Record<string, string> = {
    'main': '主要',
    'supporting': '配角',
    'mentioned': '提及'
  }
  return texts[role] || role
}

const getSettingTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    'worldview': 'blue',
    'location': 'green',
    'rule': 'orange',
    'culture': 'purple'
  }
  return colors[type] || 'default'
}

const getSettingTypeText = (type: string) => {
  const texts: Record<string, string> = {
    'worldview': '世界观',
    'location': '地理',
    'rule': '规则',
    'culture': '文化'
  }
  return texts[type] || type
}

const getSeverityColor = (severity: string) => {
  const colors: Record<string, string> = {
    'high': 'red',
    'medium': 'orange',
    'low': 'blue'
  }
  return colors[severity] || 'default'
}

const getSeverityLabel = (severity: string) => {
  const labels: Record<string, string> = {
    'high': '严重',
    'medium': '中等',
    'low': '轻微'
  }
  return labels[severity] || severity
}

const handleAddCharacter = () => {
  if (selectedCharacterId.value) {
    emit('add-character', selectedCharacterId.value)
    showAddCharacter.value = false
    selectedCharacterId.value = undefined
  }
}

const handleAddSetting = () => {
  if (selectedSettingId.value) {
    emit('add-setting', selectedSettingId.value)
    showAddSetting.value = false
    selectedSettingId.value = undefined
  }
}

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.value) return
    const diff = startX - e.clientX
    const newWidth = Math.min(Math.max(startWidth + diff, 280), 480)
    sidebarWidth.value = newWidth
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}
</script>

<style scoped>
.editor-right-sidebar {
  position: relative;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  background: var(--theme-bg-container);
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  transition: background-color 0.2s;
  z-index: 10;
}

.resize-handle:hover {
  background-color: rgba(24, 144, 255, 0.3);
}

:deep(.ant-card-head) {
  padding: 12px 16px;
  min-height: auto;
  border-bottom: 1px solid var(--theme-border);
}

:deep(.ant-card-body) {
  padding: 16px;
}

:deep(.ant-card-small > .ant-card-body) {
  padding: 12px;
}

.issue-high {
  background: rgba(255, 77, 79, 0.1);
  border-color: rgba(255, 77, 79, 0.3);
}

.issue-medium {
  background: rgba(250, 173, 20, 0.1);
  border-color: rgba(250, 173, 20, 0.3);
}

.issue-low {
  background: rgba(24, 144, 255, 0.1);
  border-color: rgba(24, 144, 255, 0.3);
}
</style>
