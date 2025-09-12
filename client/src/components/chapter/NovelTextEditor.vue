<template>
  <div class="novel-text-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar" v-if="showToolbar">
      <div class="toolbar-section">
        <!-- 基础格式工具 -->
        <div class="tool-group">
          <a-button size="small" @click="insertParagraph" title="新段落 (Enter)">
            <template #icon><EnterOutlined /></template>
          </a-button>
          <a-button size="small" @click="insertDialogue" title="对话 (Ctrl+D)">
            <template #icon><CommentOutlined /></template>
          </a-button>
          <a-button size="small" @click="insertSceneBreak" title="场景分隔 (Ctrl+B)">
            <template #icon><BorderOutlined /></template>
          </a-button>
          <a-button size="small" @click="insertThought" title="内心独白 (Ctrl+T)">
            <template #icon><BulbOutlined /></template>
          </a-button>
        </div>

        <!-- 文本格式 -->
        <div class="tool-group">
          <a-button size="small" @click="formatBold" title="加粗 (Ctrl+B)">
            <template #icon><BoldOutlined /></template>
          </a-button>
          <a-button size="small" @click="formatItalic" title="斜体 (Ctrl+I)">
            <template #icon><ItalicOutlined /></template>
          </a-button>
          <a-button size="small" @click="formatUnderline" title="下划线 (Ctrl+U)">
            <template #icon><UnderlineOutlined /></template>
          </a-button>
          <a-button size="small" @click="formatAllText" title="格式化全文 (Ctrl+Shift+F)">
            <template #icon><FormatPainterOutlined /></template>
          </a-button>
        </div>

        <!-- 段落工具 -->
        <div class="tool-group">
          <a-button size="small" @click="increaseIndent" title="增加缩进 (Tab)">
            <template #icon><MenuUnfoldOutlined /></template>
          </a-button>
          <a-button size="small" @click="decreaseIndent" title="减少缩进 (Shift+Tab)">
            <template #icon><MenuFoldOutlined /></template>
          </a-button>
        </div>
      </div>

      <!-- 右侧工具 -->
      <div class="toolbar-section">
        <!-- 统计信息 -->
        <div class="tool-stats">
          <span class="stat-item">
            <FileTextOutlined />
            {{ wordCount }} 字
          </span>
          <span class="stat-item">
            <ClockCircleOutlined />
            {{ paragraphCount }} 段
          </span>
        </div>

        <!-- 视图控制 -->
        <div class="tool-group">
          <a-button 
            size="small" 
            :type="focusMode ? 'primary' : 'default'"
            @click="toggleFocusMode" 
            title="专注模式 (F11)"
          >
            <template #icon><EyeInvisibleOutlined /></template>
          </a-button>
          <a-button 
            size="small" 
            :type="showPreview ? 'primary' : 'default'"
            @click="togglePreview" 
            title="预览模式 (Ctrl+P)"
          >
            <template #icon><EyeOutlined /></template>
          </a-button>
        </div>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div class="editor-container" :class="{ 'focus-mode': focusMode }">
      <!-- 左侧：编辑区 -->
      <div class="editor-pane" :class="{ 'full-width': !showPreview }">
        <div 
          ref="editorRef"
          class="editor-content"
          contenteditable="true"
          @input="handleInput"
          @keydown="handleKeydown"
          @paste="handlePaste"
          @focus="handleFocus"
          @blur="handleBlur"
          :placeholder="placeholder"
          spellcheck="false"
          v-html="formattedContent"
        ></div>
      </div>

      <!-- 右侧：预览区 -->
      <div v-if="showPreview" class="preview-pane">
        <div class="preview-content">
          <div class="novel-preview" v-html="previewHtml"></div>
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="editor-status" v-if="showStatusBar">
      <div class="status-left">
        <span class="cursor-position">行 {{ currentLine }} 列 {{ currentColumn }}</span>
        <span class="writing-progress">{{ writingProgress }}</span>
      </div>
      <div class="status-right">
        <span class="save-status" :class="{ 'unsaved': hasUnsavedChanges }">
          {{ saveStatus }}
        </span>
        <span class="writing-time">写作时长: {{ formatTime(writingTime) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import {
  EnterOutlined,
  CommentOutlined,
  BorderOutlined,
  BulbOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FormatPainterOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useNovelFormatter } from '@/composables/useNovelFormatter'
import { countValidWords } from '@/utils/textUtils'

interface Props {
  modelValue: string
  placeholder?: string
  showToolbar?: boolean
  showStatusBar?: boolean
  autoSave?: boolean
  autoSaveInterval?: number
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '在这里开始你的故事创作...',
  showToolbar: true,
  showStatusBar: true,
  autoSave: true,
  autoSaveInterval: 30000
})

const emit = defineEmits<Emits>()

// 编辑器引用
const editorRef = ref<HTMLElement>()

// 编辑器状态
const content = ref('')
const focusMode = ref(false)
const showPreview = ref(false)
const hasUnsavedChanges = ref(false)
const isFocused = ref(false)

// 光标位置
const currentLine = ref(1)
const currentColumn = ref(1)

// 写作统计
const writingTime = ref(0)
const writingTimer = ref<NodeJS.Timeout>()

// 自动保存
const autoSaveTimer = ref<NodeJS.Timeout>()

// 小说格式化工具
const novelFormatter = useNovelFormatter({
  autoIndent: true,
  dialogueStyle: 'quotes',
  sceneBreakStyle: 'stars',
  chapterTitleFormat: 'chinese'
})

// 计算属性
const wordCount = computed(() => {
  return countValidWords(content.value, {
    removeMarkdown: false,
    removeHtml: true
  })
})

const paragraphCount = computed(() => {
  return content.value.split(/\n\s*\n/).filter(p => p.trim()).length
})

const formattedContent = computed(() => {
  if (!content.value) return ''
  
  // 为小说文本添加基础格式化
  return content.value
    .replace(/\n/g, '<br>')
    .replace(/^(\s*)(.*?)$/gm, '<div class="novel-paragraph">$1$2</div>')
})

const previewHtml = computed(() => {
  if (!content.value) return '<div class="empty-preview">暂无内容预览</div>'
  
  // 小说预览格式化
  let html = content.value
    // 段落处理
    .replace(/\n\s*\n/g, '</p><p class="novel-paragraph">')
    // 对话处理
    .replace(/^(\s*)"([^"]*)"(\s*)$/gm, '<p class="dialogue">"$2"</p>')
    // 场景分隔
    .replace(/^\s*\*\s*\*\s*\*\s*$/gm, '<div class="scene-break">* * *</div>')
    // 内心独白
    .replace(/^\s*【([^】]*)】\s*$/gm, '<p class="thought">【$1】</p>')
  
  return `<div class="novel-content">${html}</div>`
})

const saveStatus = computed(() => {
  return hasUnsavedChanges.value ? '未保存' : '已保存'
})

const writingProgress = computed(() => {
  const target = 2000 // 目标字数
  const progress = Math.min(100, (wordCount.value / target) * 100)
  return `进度: ${progress.toFixed(1)}%`
})

// 方法
const handleInput = (event: Event) => {
  const target = event.target as HTMLElement
  content.value = target.innerText || ''
  hasUnsavedChanges.value = true
  emit('update:modelValue', content.value)
  emit('change', content.value)
  updateCursorPosition()
}

const handleKeydown = (event: KeyboardEvent) => {
  // 处理快捷键
  if (event.ctrlKey || event.metaKey) {
    switch (event.key.toLowerCase()) {
      case 'd':
        event.preventDefault()
        insertDialogue()
        break
      case 'b':
        event.preventDefault()
        if (event.shiftKey) {
          insertSceneBreak()
        } else {
          formatBold()
        }
        break
      case 't':
        event.preventDefault()
        insertThought()
        break
      case 'i':
        event.preventDefault()
        formatItalic()
        break
      case 'u':
        event.preventDefault()
        formatUnderline()
        break
      case 'p':
        event.preventDefault()
        togglePreview()
        break
      case 's':
        event.preventDefault()
        saveContent()
        break
      case 'f':
        if (event.shiftKey) {
          event.preventDefault()
          formatAllText()
        }
        break
    }
  }

  // F11 专注模式
  if (event.key === 'F11') {
    event.preventDefault()
    toggleFocusMode()
  }

  // Tab 缩进
  if (event.key === 'Tab') {
    event.preventDefault()
    if (event.shiftKey) {
      decreaseIndent()
    } else {
      increaseIndent()
    }
  }

  // Enter 自动段落格式化
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    insertParagraph()
  }
}

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const text = event.clipboardData?.getData('text/plain') || ''
  insertTextAtCursor(text)
}

const handleFocus = () => {
  isFocused.value = true
  emit('focus')
  startWritingTimer()
}

const handleBlur = () => {
  isFocused.value = false
  emit('blur')
  stopWritingTimer()
}

// 文本插入功能
const insertTextAtCursor = (text: string) => {
  const selection = window.getSelection()
  if (!selection) return

  const range = selection.getRangeAt(0)
  range.deleteContents()
  
  const textNode = document.createTextNode(text)
  range.insertNode(textNode)
  
  // 移动光标到插入文本后面
  range.setStartAfter(textNode)
  range.setEndAfter(textNode)
  selection.removeAllRanges()
  selection.addRange(range)
  
  handleInput({ target: editorRef.value } as any)
}

const insertParagraph = () => {
  const selection = window.getSelection()
  if (!selection) return
  
  const range = selection.getRangeAt(0)
  const cursorPos = range.startOffset
  
  const result = novelFormatter.smartParagraphBreak(content.value, cursorPos)
  content.value = result.newText
  
  // 更新编辑器内容
  if (editorRef.value) {
    editorRef.value.innerText = result.newText
  }
  
  emit('update:modelValue', content.value)
  emit('change', content.value)
}

const insertDialogue = () => {
  insertTextAtCursor('\n　　"在这里输入对话内容。"')
}

const insertSceneBreak = () => {
  insertTextAtCursor('\n\n* * *\n\n')
}

const insertThought = () => {
  insertTextAtCursor('【内心独白】')
}

const formatAllText = () => {
  const formatted = novelFormatter.formatNovelText(content.value)
  content.value = formatted
  
  if (editorRef.value) {
    editorRef.value.innerText = formatted
  }
  
  emit('update:modelValue', formatted)
  emit('change', formatted)
  hasUnsavedChanges.value = true
  message.success('文本格式化完成')
}

// 格式化功能
const formatBold = () => {
  document.execCommand('bold')
  handleInput({ target: editorRef.value } as any)
}

const formatItalic = () => {
  document.execCommand('italic')
  handleInput({ target: editorRef.value } as any)
}

const formatUnderline = () => {
  document.execCommand('underline')
  handleInput({ target: editorRef.value } as any)
}

const increaseIndent = () => {
  insertTextAtCursor('　　')
}

const decreaseIndent = () => {
  // 简单实现：删除前面的空白字符
  const selection = window.getSelection()
  if (!selection) return
  
  const range = selection.getRangeAt(0)
  range.setStart(range.startContainer, Math.max(0, range.startOffset - 2))
  range.deleteContents()
  handleInput({ target: editorRef.value } as any)
}

// 视图控制
const toggleFocusMode = () => {
  focusMode.value = !focusMode.value
  message.info(focusMode.value ? '已进入专注模式' : '已退出专注模式')
}

const togglePreview = () => {
  showPreview.value = !showPreview.value
}

// 光标位置更新
const updateCursorPosition = () => {
  const selection = window.getSelection()
  if (!selection || !editorRef.value) return

  const range = selection.getRangeAt(0)
  const preRange = range.cloneRange()
  preRange.selectNodeContents(editorRef.value)
  preRange.setEnd(range.startContainer, range.startOffset)
  
  const text = preRange.toString()
  const lines = text.split('\n')
  currentLine.value = lines.length
  currentColumn.value = lines[lines.length - 1].length + 1
}

// 写作时间统计
const startWritingTimer = () => {
  if (writingTimer.value) return
  
  writingTimer.value = setInterval(() => {
    writingTime.value += 1
  }, 1000)
}

const stopWritingTimer = () => {
  if (writingTimer.value) {
    clearInterval(writingTimer.value)
    writingTimer.value = undefined
  }
}

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// 保存功能
const saveContent = () => {
  hasUnsavedChanges.value = false
  message.success('内容已保存')
}

const startAutoSave = () => {
  if (!props.autoSave) return
  
  autoSaveTimer.value = setInterval(() => {
    if (hasUnsavedChanges.value) {
      saveContent()
    }
  }, props.autoSaveInterval)
}

// 监听外部内容变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== content.value) {
    content.value = newValue
    if (editorRef.value) {
      editorRef.value.innerText = newValue
    }
  }
}, { immediate: true })

// 生命周期
onMounted(() => {
  if (props.modelValue) {
    content.value = props.modelValue
  }
  startAutoSave()
})

onUnmounted(() => {
  stopWritingTimer()
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value)
  }
})

// 暴露方法给父组件
defineExpose({
  focus: () => editorRef.value?.focus(),
  blur: () => editorRef.value?.blur(),
  insertText: insertTextAtCursor,
  clear: () => {
    content.value = ''
    if (editorRef.value) {
      editorRef.value.innerText = ''
    }
  }
})
</script>

<style scoped>
.novel-text-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--theme-editor-bg);
  transition: background-color 0.3s ease;
}

/* 工具栏样式 */
.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--theme-editor-border);
  background-color: var(--theme-editor-toolbar);
  transition: background-color 0.3s ease, border-color 0.3s ease;
  min-height: 48px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-right: 1px solid var(--theme-editor-border);
  transition: border-color 0.3s ease;
}

.tool-group:last-child {
  border-right: none;
}

.tool-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--theme-editor-secondary-text);
  transition: color 0.3s ease;
  font-size: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 编辑器容器 */
.editor-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  transition: all 0.3s ease;
}

.editor-container.focus-mode {
  .editor-toolbar,
  .editor-status,
  .preview-pane {
    display: none;
  }
  
  .editor-pane {
    width: 100% !important;
  }
}

/* 编辑区域 */
.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-pane.full-width {
  width: 100%;
}

.editor-content {
  flex: 1;
  padding: 24px 32px;
  font-family: 'Source Han Serif CN', 'Noto Serif CJK SC', serif;
  font-size: 16px;
  line-height: 1.8;
  color: var(--theme-editor-text);
  background-color: var(--theme-editor-bg);
  transition: color 0.3s ease, background-color 0.3s ease;
  overflow-y: auto;
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.editor-content:empty::before {
  content: attr(placeholder);
  color: var(--theme-editor-placeholder);
  transition: color 0.3s ease;
  font-style: italic;
}

/* 预览区域 */
.preview-pane {
  width: 45%;
  border-left: 1px solid var(--theme-editor-border);
  background-color: var(--theme-editor-preview);
  transition: background-color 0.3s ease, border-color 0.3s ease;
  overflow: hidden;
}

.preview-content {
  height: 100%;
  padding: 24px;
  overflow-y: auto;
}

.novel-preview {
  background-color: var(--theme-editor-bg);
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-family: 'Source Han Serif CN', 'Noto Serif CJK SC', serif;
  font-size: 16px;
  line-height: 1.8;
  color: var(--theme-editor-text);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* 状态栏 */
.editor-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-top: 1px solid var(--theme-editor-border);
  background-color: var(--theme-editor-toolbar);
  transition: background-color 0.3s ease, border-color 0.3s ease;
  font-size: 12px;
  color: var(--theme-editor-secondary-text);
  min-height: 32px;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.save-status.unsaved {
  color: var(--theme-editor-unsaved);
  transition: color 0.3s ease;
}

/* 小说文本样式 */
:deep(.novel-paragraph) {
  margin: 0.8em 0;
  text-indent: 2em;
  text-align: justify;
}

:deep(.dialogue) {
  color: var(--theme-editor-dialogue);
  font-style: italic;
  text-indent: 2em;
  margin: 0.8em 0;
  transition: color 0.3s ease;
}

:deep(.scene-break) {
  text-align: center;
  margin: 2em 0;
  color: var(--theme-editor-scene);
  font-size: 1.2em;
  transition: color 0.3s ease;
}

:deep(.thought) {
  color: var(--theme-editor-thought);
  font-style: italic;
  text-indent: 2em;
  margin: 0.8em 0;
  transition: color 0.3s ease;
}

:deep(.empty-preview) {
  text-align: center;
  color: var(--theme-editor-placeholder);
  font-style: italic;
  margin: 40px 0;
  transition: color 0.3s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-container {
    flex-direction: column;
  }
  
  .preview-pane {
    width: 100%;
    height: 50%;
    border-left: none;
    border-top: 1px solid var(--theme-editor-border);
  }
  
  .tool-stats {
    display: none;
  }
  
  .editor-content {
    padding: 16px 20px;
    font-size: 14px;
  }
}

/* 专注模式样式 */
.editor-container.focus-mode .editor-content {
  padding: 10% 15%;
  background-color: var(--theme-editor-focus-bg);
  transition: background-color 0.3s ease;
}

@media (max-width: 768px) {
  .editor-container.focus-mode .editor-content {
    padding: 5% 8%;
  }
}
</style>