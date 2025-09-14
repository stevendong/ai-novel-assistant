<template>
  <div class="tiptap-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar" v-if="showToolbar">
      <div class="toolbar-section">
        <!-- 基础格式工具 -->
        <div class="tool-group">
          <a-button size="small" @click="editor?.chain().focus().toggleBold().run()" 
            :class="{ 'is-active': editor?.isActive('bold') }" title="加粗 (Ctrl+B)">
            <template #icon><BoldOutlined /></template>
          </a-button>
          <a-button size="small" @click="editor?.chain().focus().toggleItalic().run()" 
            :class="{ 'is-active': editor?.isActive('italic') }" title="斜体 (Ctrl+I)">
            <template #icon><ItalicOutlined /></template>
          </a-button>
          <a-button size="small" @click="editor?.chain().focus().toggleUnderline().run()" 
            :class="{ 'is-active': editor?.isActive('underline') }" title="下划线 (Ctrl+U)">
            <template #icon><UnderlineOutlined /></template>
          </a-button>
          <a-button size="small" @click="editor?.chain().focus().toggleStrike().run()" 
            :class="{ 'is-active': editor?.isActive('strike') }" title="删除线">
            <template #icon><StrikethroughOutlined /></template>
          </a-button>
        </div>

        <!-- 段落工具 -->
        <div class="tool-group">
          <a-button size="small" @click="editor?.chain().focus().setParagraph().run()" 
            :class="{ 'is-active': editor?.isActive('paragraph') }" title="段落">
            <template #icon><AlignLeftOutlined /></template>
          </a-button>
          <a-button size="small" @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()" 
            :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }" title="标题1">
            H1
          </a-button>
          <a-button size="small" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()" 
            :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }" title="标题2">
            H2
          </a-button>
          <a-button size="small" @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()" 
            :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }" title="标题3">
            H3
          </a-button>
        </div>

        <!-- 小说专用工具 -->
        <div class="tool-group">
          <a-button size="small" @click="insertDialogue" title="对话 (Ctrl+D)">
            <template #icon><CommentOutlined /></template>
          </a-button>
          <a-button size="small" @click="insertSceneBreak" title="场景分隔 (Ctrl+Shift+B)">
            <template #icon><BorderOutlined /></template>
          </a-button>
          <a-button size="small" @click="insertThought" title="内心独白 (Ctrl+T)">
            <template #icon><BulbOutlined /></template>
          </a-button>
          <a-button size="small" @click="insertParagraphBreak" title="段落分隔 (Enter)">
            <template #icon><EnterOutlined /></template>
          </a-button>
        </div>

        <!-- 编辑工具 -->
        <div class="tool-group">
          <a-button size="small" @click="editor?.chain().focus().undo().run()" 
            :disabled="!editor?.can().undo()" title="撤销 (Ctrl+Z)">
            <template #icon><UndoOutlined /></template>
          </a-button>
          <a-button size="small" @click="editor?.chain().focus().redo().run()" 
            :disabled="!editor?.can().redo()" title="重做 (Ctrl+Y)">
            <template #icon><RedoOutlined /></template>
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
            {{ characterCount }} 字符
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
            @click="formatDocument" 
            title="格式化文档"
          >
            <template #icon><FormatPainterOutlined /></template>
          </a-button>
        </div>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div class="editor-container" :class="{ 'focus-mode': focusMode }">
      <EditorContent 
        :editor="editor" 
        class="editor-content"
        :class="{
          'novel-writing-mode': true,
          'focus-mode': focusMode
        }"
      />
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { FontFamily } from '@tiptap/extension-font-family'
import { Placeholder } from '@tiptap/extension-placeholder'
import { CharacterCount } from '@tiptap/extension-character-count'

import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  AlignLeftOutlined,
  CommentOutlined,
  BorderOutlined,
  BulbOutlined,
  EnterOutlined,
  UndoOutlined,
  RedoOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  EyeInvisibleOutlined,
  FormatPainterOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { countValidWords } from '@/utils/textUtils'

interface Props {
  modelValue: string
  placeholder?: string
  showToolbar?: boolean
  showStatusBar?: boolean
  autoSave?: boolean
  autoSaveInterval?: number
  limit?: number
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
  autoSaveInterval: 30000,
  limit: 50000
})

const emit = defineEmits<Emits>()

// 编辑器状态
const focusMode = ref(false)
const hasUnsavedChanges = ref(false)
const currentLine = ref(1)
const currentColumn = ref(1)
const writingTime = ref(0)
const writingTimer = ref<NodeJS.Timeout>()
const autoSaveTimer = ref<NodeJS.Timeout>()

// 添加一个标志来防止循环更新
const isUpdating = ref(false)

// Tiptap 编辑器实例
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      history: {
        depth: 100,
      },
    }),
    Underline,
    TextStyle,
    Color,
    FontFamily,
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
    CharacterCount.configure({
      limit: props.limit,
    }),
  ],
  editorProps: {
    attributes: {
      class: 'novel-prose',
      spellcheck: 'false',
    },
  },
  onUpdate: ({ editor }) => {
    // 如果正在程序化更新，不触发change事件
    if (isUpdating.value) return
    
    const content = editor.getHTML()
    hasUnsavedChanges.value = true
    emit('update:modelValue', content)
    emit('change', content)
    updateCursorPosition()
  },
  onFocus: () => {
    emit('focus')
    startWritingTimer()
  },
  onBlur: () => {
    emit('blur')
    stopWritingTimer()
  },
})

// 计算属性
const wordCount = computed(() => {
  if (!editor.value) return 0
  // 使用自定义的字数统计，忽略空格换行等无意义字符
  const plainText = editor.value.getText()
  return countValidWords(plainText, {
    removeMarkdown: false,
    removeHtml: true
  })
})

const characterCount = computed(() => {
  if (!editor.value) return 0
  return editor.value.storage.characterCount.characters()
})

// 原始字符统计（包含空格等）
const rawCharacterCount = computed(() => {
  if (!editor.value) return 0
  return editor.value.getText().length
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
const insertDialogue = () => {
  if (!editor.value) return
  
  editor.value
    .chain()
    .focus()
    .insertContent('<p class="dialogue">"在这里输入对话内容。"</p>')
    .run()
}

const insertSceneBreak = () => {
  if (!editor.value) return
  
  editor.value
    .chain()
    .focus()
    .insertContent('<div class="scene-break">* * *</div><p></p>')
    .run()
}

const insertThought = () => {
  if (!editor.value) return
  
  editor.value
    .chain()
    .focus()
    .insertContent('<p class="thought">【在这里输入内心独白】</p>')
    .run()
}

const insertParagraphBreak = () => {
  if (!editor.value) return
  
  editor.value
    .chain()
    .focus()
    .insertContent('<p class="paragraph-indent">　　')
    .run()
}

const formatDocument = () => {
  if (!editor.value) return
  
  // 获取当前内容
  let content = editor.value.getHTML()
  
  // 简单的小说格式化
  content = content
    // 段落首行缩进
    .replace(/<p>/g, '<p class="paragraph-indent">　　')
    // 对话格式
    .replace(/"([^"]*)"/g, '<span class="dialogue">"$1"</span>')
    // 内心独白格式
    .replace(/【([^】]*)】/g, '<span class="thought">【$1】</span>')
  
  editor.value.commands.setContent(content)
  message.success('文档格式化完成')
}

const toggleFocusMode = () => {
  focusMode.value = !focusMode.value
  message.info(focusMode.value ? '已进入专注模式' : '已退出专注模式')
}

const updateCursorPosition = () => {
  // Tiptap 中的光标位置计算比较复杂，这里简化处理
  currentLine.value = 1
  currentColumn.value = 1
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

// 自动保存
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
  if (editor.value && newValue !== undefined) {
    // 获取当前编辑器内容
    const currentContent = editor.value.getHTML()
    
    // 标准化内容进行比较，避免空格、换行等微小差异导致的误判
    const normalizeHTML = (html: string) => {
      return html
        .replace(/>\s+</g, '><') // 移除标签间的空白
        .replace(/(<[^>]+>)\s+/g, '$1') // 移除开标签后的空格
        .replace(/\s+(<\/[^>]+>)/g, '$1') // 移除闭标签前的空格
        .replace(/\s{2,}/g, ' ') // 将多个空格合并为一个
        .replace(/\n\s*/g, ' ') // 将换行和后续空格替换为单个空格
        .trim()
    }
    
    const normalizedNew = normalizeHTML(newValue || '')
    const normalizedCurrent = normalizeHTML(currentContent)
    
    // 只有在内容真正不同时才更新
    if (normalizedNew !== normalizedCurrent) {
      // 暂时关闭更新事件，避免循环更新
      const wasUpdating = isUpdating.value
      isUpdating.value = true
      
      // 设置内容，第二个参数false表示不触发onUpdate回调
      editor.value.commands.setContent(newValue || '', false)
      
      // 恢复更新事件
      setTimeout(() => {
        isUpdating.value = wasUpdating
      }, 0)
    }
  }
}, { immediate: true })

// 快捷键处理
const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key.toLowerCase()) {
      case 'd':
        event.preventDefault()
        insertDialogue()
        break
      case 't':
        event.preventDefault()
        insertThought()
        break
      case 's':
        event.preventDefault()
        saveContent()
        break
    }
  }

  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'b') {
    event.preventDefault()
    insertSceneBreak()
  }

  if (event.key === 'F11') {
    event.preventDefault()
    toggleFocusMode()
  }
}

// 生命周期
onMounted(() => {
  startAutoSave()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  stopWritingTimer()
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value)
  }
  if (editor.value) {
    editor.value.destroy()
  }
  document.removeEventListener('keydown', handleKeydown)
})

// 处理文本插入，正确处理换行符
const insertTextWithLineBreaks = (text: string) => {
  if (!editor.value) return

  // 将文本中的换行符转换为HTML段落
  const htmlContent = text
    // 先处理连续的换行符，将3个以上的换行符替换为2个
    .replace(/\n{3,}/g, '\n\n')
    // 将双换行符分割成段落
    .split('\n\n')
    .filter(paragraph => paragraph.trim()) // 过滤空段落
    .map(paragraph => {
      // 处理段落内的单换行符，转换为 <br>
      const processedParagraph = paragraph
        .replace(/\n/g, '<br>')
        .trim()

      // 如果段落不是以中文缩进开始，添加缩进
      if (processedParagraph && !processedParagraph.startsWith('　　')) {
        return `<p class="paragraph-indent">　　${processedParagraph}</p>`
      } else {
        return `<p class="paragraph-indent">${processedParagraph}</p>`
      }
    })
    .join('')

  // 插入HTML内容而不是纯文本
  editor.value.commands.insertContent(htmlContent)
}

// 暴露方法给父组件
defineExpose({
  focus: () => editor.value?.commands.focus(),
  blur: () => editor.value?.commands.blur(),
  insertText: insertTextWithLineBreaks,
  clear: () => editor.value?.commands.clearContent(),
  getEditor: () => editor.value,
  // 强制更新内容，用于解决格式丢失问题
  forceSetContent: (content: string) => {
    if (editor.value) {
      isUpdating.value = true
      editor.value.commands.setContent(content || '', false)
      setTimeout(() => {
        isUpdating.value = false
      }, 0)
    }
  },
  // 获取当前HTML内容
  getHTML: () => editor.value?.getHTML() || '',
  // 获取纯文本内容
  getText: () => editor.value?.getText() || ''
})
</script>

<style scoped>
.tiptap-editor {
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

/* 工具按钮激活状态 */
.ant-btn.is-active {
  background-color: var(--theme-editor-active-btn);
  color: white;
  transition: background-color 0.3s ease;
}

/* 编辑器容器 */
.editor-container {
  flex: 1;
  overflow: hidden;
  transition: all 0.3s ease;
}

.editor-container.focus-mode {
  padding: 0 10%;
}

.editor-container.focus-mode .editor-toolbar,
.editor-container.focus-mode .editor-status {
  display: none;
}

/* 编辑器内容区域 */
.editor-content {
  height: 100%;
  overflow-y: auto;
}

:deep(.ProseMirror) {
  height: 100%;
  padding: 24px 32px;
  font-family: 'Source Han Serif CN', 'Noto Serif CJK SC', serif;
  font-size: 16px;
  line-height: 1.8;
  color: var(--theme-editor-text);
  background-color: var(--theme-editor-bg);
  transition: color 0.3s ease, background-color 0.3s ease;
  outline: none;
  overflow-y: auto;
}

:deep(.ProseMirror.focus-mode) {
  padding: 10% 15%;
  background-color: var(--theme-editor-focus-bg);
  transition: background-color 0.3s ease;
}

/* 小说文本样式 */
:deep(.ProseMirror p) {
  margin: 0.8em 0;
  text-align: justify;
}

:deep(.ProseMirror p.paragraph-indent) {
  text-indent: 2em;
}

:deep(.ProseMirror .dialogue) {
  color: var(--theme-editor-dialogue);
  font-style: italic;
  transition: color 0.3s ease;
}

:deep(.ProseMirror .scene-break) {
  text-align: center;
  margin: 2em 0;
  color: var(--theme-editor-scene);
  font-size: 1.2em;
  font-weight: bold;
  transition: color 0.3s ease;
}

:deep(.ProseMirror .thought) {
  color: var(--theme-editor-thought);
  font-style: italic;
  transition: color 0.3s ease;
}

:deep(.ProseMirror h1, .ProseMirror h2, .ProseMirror h3) {
  font-weight: bold;
  margin: 1em 0 0.5em 0;
}

:deep(.ProseMirror h1) {
  font-size: 1.8em;
}

:deep(.ProseMirror h2) {
  font-size: 1.5em;
}

:deep(.ProseMirror h3) {
  font-size: 1.2em;
}

/* Placeholder 样式 */
:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--theme-editor-placeholder);
  transition: color 0.3s ease;
  pointer-events: none;
  height: 0;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .tool-stats {
    display: none;
  }
  
  :deep(.ProseMirror) {
    padding: 16px 20px;
    font-size: 14px;
  }
  
  .editor-container.focus-mode {
    padding: 0 5%;
  }
  
  :deep(.ProseMirror.focus-mode) {
    padding: 5% 8%;
  }
}
</style>