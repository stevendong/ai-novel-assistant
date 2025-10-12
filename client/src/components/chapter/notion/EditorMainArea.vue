<template>
  <div class="editor-main-area flex-1 flex flex-col overflow-hidden theme-bg-layout">
    <!-- 标题区域 (固定，不滚动) -->
    <div class="title-area flex-shrink-0 px-8 pt-8 pb-6" :class="{ 'max-w-4xl mx-auto w-full': !isFocusMode }">
      <div class="flex items-center space-x-3 mb-4">
        <a-avatar size="large" class="bg-blue-500 shadow-sm">
          <FileTextOutlined />
        </a-avatar>
        <div class="flex-1">
          <a-input
            v-model:value="localTitle"
            @blur="handleTitleBlur"
            @keydown.enter="handleTitleEnter"
            size="large"
            placeholder="输入章节标题..."
            class="chapter-title-input"
            :bordered="false"
          />

          <!-- 元信息 -->
          <div class="meta-info flex items-center space-x-4 mt-2 text-sm theme-text-secondary">
            <div class="flex items-center space-x-1">
              <FileTextOutlined class="text-xs" />
              <span>第{{ chapter.chapterNumber }}章</span>
            </div>
            <a-divider type="vertical" class="h-3" />
            <div class="flex items-center space-x-1">
              <EditOutlined class="text-xs" />
              <span>{{ wordCount }} / {{ targetWordCount }} 字</span>
            </div>
            <a-divider type="vertical" class="h-3" />
            <div class="flex items-center space-x-1">
              <TagOutlined class="text-xs" />
              <span>{{ statusText }}</span>
            </div>
            <a-tag v-if="hasUnsavedChanges" color="orange" size="small" class="ml-2">
              <ClockCircleOutlined />
              未保存
            </a-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑器区域 (可滚动) -->
    <div class="editor-container flex-1 overflow-y-auto">
      <div class="editor-wrapper" :class="{ 'max-w-4xl mx-auto w-full px-8': !isFocusMode, 'px-16': isFocusMode }">
        <TiptapEditor
          ref="editor"
          v-model="localContent"
          :show-toolbar="true"
          :show-status-bar="false"
          :auto-save="true"
          placeholder="开始写作... 输入 / 快速插入内容"
          @change="handleContentChange"
        />
      </div>
    </div>

    <!-- 浮动工具栏 -->
    <div
      v-if="showFloatingToolbar"
      class="floating-toolbar theme-bg-container border theme-border shadow-lg rounded-lg"
      :style="toolbarPosition"
    >
      <a-space size="small">
        <a-tooltip title="粗体 (Ctrl+B)">
          <a-button size="small" class="h-8 w-8">
            <BoldOutlined />
          </a-button>
        </a-tooltip>
        <a-tooltip title="斜体 (Ctrl+I)">
          <a-button size="small" class="h-8 w-8">
            <ItalicOutlined />
          </a-button>
        </a-tooltip>
        <a-tooltip title="下划线 (Ctrl+U)">
          <a-button size="small" class="h-8 w-8">
            <UnderlineOutlined />
          </a-button>
        </a-tooltip>
        <a-divider type="vertical" class="h-4" />
        <a-tooltip title="AI 续写">
          <a-button type="primary" size="small" class="h-8">
            <RobotOutlined />
            AI
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <!-- 专注模式切换 (非专注模式时显示) -->
    <a-button
      v-if="!isFocusMode"
      class="focus-mode-toggle"
      type="primary"
      shape="circle"
      size="large"
      @click="$emit('toggle-focus')"
      title="进入专注模式 (Ctrl+Enter)"
    >
      <template #icon>
        <FullscreenOutlined />
      </template>
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  RobotOutlined,
  FullscreenOutlined,
  FileTextOutlined,
  EditOutlined,
  TagOutlined,
  ClockCircleOutlined
} from '@ant-design/icons-vue'
import TiptapEditor from '../TiptapEditor.vue'

interface Props {
  chapter: any
  content: string
  wordCount: number
  targetWordCount: number
  hasUnsavedChanges: boolean
  isFocusMode: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:content', value: string): void
  (e: 'update:title', value: string): void
  (e: 'toggle-focus'): void
}>()

const localTitle = ref(props.chapter?.title || '')
const localContent = ref(props.content || '')
const editor = ref()
const showFloatingToolbar = ref(false)
const toolbarPosition = ref({ top: '0px', left: '0px' })

const statusText = computed(() => {
  const statusMap: Record<string, string> = {
    'planning': '规划中',
    'draft': '草稿',
    'review': '审阅中',
    'published': '已发布'
  }
  return statusMap[props.chapter?.status] || props.chapter?.status
})

watch(() => props.chapter?.title, (newTitle) => {
  if (newTitle !== localTitle.value) {
    localTitle.value = newTitle
  }
})

watch(() => props.content, (newContent) => {
  if (newContent !== localContent.value) {
    localContent.value = newContent
  }
})

const handleTitleBlur = () => {
  if (localTitle.value !== props.chapter?.title) {
    emit('update:title', localTitle.value)
  }
}

const handleTitleEnter = (e: KeyboardEvent) => {
  e.preventDefault()
  ;(e.target as HTMLInputElement).blur()
  // 聚焦到编辑器
  if (editor.value) {
    editor.value.focus()
  }
}

const handleContentChange = (value: string) => {
  localContent.value = value
  emit('update:content', value)
}
</script>

<style scoped>
.editor-main-area {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: var(--theme-bg-layout);
}

.chapter-title-input {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--theme-text-primary);
  padding: 0;
  line-height: 1.2;
}

.chapter-title-input :deep(.ant-input) {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--theme-text-primary);
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.chapter-title-input :deep(.ant-input)::placeholder {
  color: var(--theme-text-secondary);
  opacity: 0.6;
}

.meta-info {
  padding: 8px 0;
}

.editor-container {
  height: 100%;
}

.editor-wrapper {
  padding-bottom: 200px; /* 底部留白，方便编辑 */
  min-height: 100%;
}

.floating-toolbar {
  position: fixed;
  z-index: 1000;
  border-radius: 8px;
  padding: 8px;
  background: var(--theme-bg-container);
  border: 1px solid var(--theme-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.focus-mode-toggle {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.focus-mode-toggle:hover {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}

/* Notion 风格的编辑器样式 */
.editor-wrapper :deep(.tiptap-editor) {
  font-size: 16px;
  line-height: 1.8;
  color: var(--theme-text-primary);
}

.editor-wrapper :deep(.tiptap) {
  outline: none;
}

.editor-wrapper :deep(p) {
  margin: 1em 0;
}

.editor-wrapper :deep(h1),
.editor-wrapper :deep(h2),
.editor-wrapper :deep(h3) {
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.editor-wrapper :deep(h1) {
  font-size: 1.875em;
}

.editor-wrapper :deep(h2) {
  font-size: 1.5em;
}

.editor-wrapper :deep(h3) {
  font-size: 1.25em;
}
</style>
