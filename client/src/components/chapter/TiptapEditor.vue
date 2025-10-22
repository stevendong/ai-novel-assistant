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

  // 获取当前HTML内容
  let content = editor.value.getHTML()

  // 先转换为纯文本进行处理，然后重新格式化为HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content
  let plainText = tempDiv.textContent || tempDiv.innerText || ''

  // 清理和标准化文本
  plainText = cleanAndNormalizeText(plainText)

  // 按段落分割并格式化
  const paragraphs = plainText.split(/\n\s*\n+/).filter(p => p.trim())

  const formattedParagraphs = paragraphs.map(paragraph => {
    return formatParagraph(paragraph.trim())
  }).filter(p => p) // 过滤空段落

  // 重新构建HTML内容
  const formattedHTML = formattedParagraphs.join('\n')

  // 使用更新标志避免触发onChange事件
  isUpdating.value = true
  editor.value.commands.setContent(formattedHTML, false)

  // 恢复事件监听
  setTimeout(() => {
    isUpdating.value = false
  }, 0)

  message.success(`文档格式化完成，共处理 ${formattedParagraphs.length} 个段落`)
}

// 清理和标准化文本
const cleanAndNormalizeText = (text: string): string => {
  return text
    // 统一引号格式
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // 统一破折号
    .replace(/[—–]/g, '——')
    // 统一省略号
    .replace(/\.{3,}/g, '……')
    .replace(/。{3,}/g, '……')
    // 清理多余的空格和换行
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    // 移除段落开头的空格，但保留有意义的缩进
    .replace(/\n[ \t]*([　\s]*)/g, '\n')
    .trim()
}

// 格式化单个段落
const formatParagraph = (paragraph: string): string => {
  if (!paragraph) return ''

  // 检测段落类型并应用相应格式
  const paragraphType = detectParagraphType(paragraph)

  switch (paragraphType) {
    case 'dialogue':
      return formatDialogueParagraph(paragraph)
    case 'scene-break':
      return formatSceneBreak(paragraph)
    case 'thought':
      return formatThoughtParagraph(paragraph)
    case 'action':
      return formatActionParagraph(paragraph)
    case 'description':
      return formatDescriptionParagraph(paragraph)
    case 'normal':
    default:
      return formatNormalParagraph(paragraph)
  }
}

// 检测段落类型
const detectParagraphType = (paragraph: string): 'dialogue' | 'scene-break' | 'thought' | 'action' | 'description' | 'normal' => {
  // 对话：以引号开始或包含引号
  if (/^[""]/.test(paragraph) || /[""][^"""]*?[""]/.test(paragraph)) {
    return 'dialogue'
  }

  // 场景分隔：星号、破折号等
  if (/^[*\-=]{2,}$/.test(paragraph.trim()) || /^\s*[*]{2,}\s*$/.test(paragraph)) {
    return 'scene-break'
  }

  // 内心独白：方括号包围
  if (/【[^】]*】/.test(paragraph)) {
    return 'thought'
  }

  // 动作描写：包含动作词汇
  if (/[走跑跳坐站起身转身点头摇头等着看到听到感到想到伸手拿起放下打开关闭]/.test(paragraph)) {
    return 'action'
  }

  // 环境描写：包含景物描述词汇
  if (/[天空阳光月光风雨雪山水树花草房屋建筑街道道路窗户门灯光影子]/.test(paragraph)) {
    return 'description'
  }

  return 'normal'
}

// 格式化对话段落
const formatDialogueParagraph = (paragraph: string): string => {
  // 处理对话格式
  let formatted = paragraph
    // 标准化引号内的对话
    .replace(/"([^"]*)"/g, (match, content) => {
      return `<span class="dialogue">"${content.trim()}"</span>`
    })
    // 处理对话后的说话人描述
    .replace(/(<span class="dialogue">"[^"]*"<\/span>)([^。，！？]*?)([。，！？])/g, '$1$2$3')

  return `<p class="paragraph-indent dialogue-paragraph">　　${formatted}</p>`
}

// 格式化场景分隔
const formatSceneBreak = (paragraph: string): string => {
  let breakText = paragraph.trim()

  // 标准化场景分隔符
  if (/^[*\-=]+$/.test(breakText)) {
    breakText = '* * *'
  }

  return `<div class="scene-break">${breakText}</div>`
}

// 格式化内心独白段落
const formatThoughtParagraph = (paragraph: string): string => {
  const formatted = paragraph.replace(/【([^】]*)】/g, '<span class="thought">【$1】</span>')
  return `<p class="paragraph-indent thought-paragraph">　　${formatted}</p>`
}

// 格式化动作描写段落
const formatActionParagraph = (paragraph: string): string => {
  const needsIndent = !paragraph.startsWith('　　')
  const indentPrefix = needsIndent ? '　　' : ''

  let formatted = paragraph
    .replace(/"([^"]*)"/g, '<span class="dialogue">"$1"</span>')
    .replace(/【([^】]*)】/g, '<span class="thought">【$1】</span>')
    .replace(/《([^》]*)》/g, '<em>《$1》</em>')
    .replace(/……/g, '<span class="ellipsis">……</span>')

  return `<p class="paragraph-indent action-paragraph">${indentPrefix}${formatted}</p>`
}

// 格式化环境描写段落
const formatDescriptionParagraph = (paragraph: string): string => {
  const needsIndent = !paragraph.startsWith('　　')
  const indentPrefix = needsIndent ? '　　' : ''

  let formatted = paragraph
    .replace(/"([^"]*)"/g, '<span class="dialogue">"$1"</span>')
    .replace(/【([^】]*)】/g, '<span class="thought">【$1】</span>')
    .replace(/《([^》]*)》/g, '<em>《$1》</em>')
    .replace(/……/g, '<span class="ellipsis">……</span>')

  return `<p class="paragraph-indent description-paragraph">${indentPrefix}${formatted}</p>`
}

// 格式化普通段落
const formatNormalParagraph = (paragraph: string): string => {
  // 确保段落不是以缩进开始就添加缩进
  const needsIndent = !paragraph.startsWith('　　')
  const indentPrefix = needsIndent ? '　　' : ''

  // 处理段落内的特殊格式
  let formatted = paragraph
    // 处理引号对话（如果段落中间有对话）
    .replace(/"([^"]*)"/g, '<span class="dialogue">"$1"</span>')
    // 处理内心独白
    .replace(/【([^】]*)】/g, '<span class="thought">【$1】</span>')
    // 处理强调（书名号、专有名词等）
    .replace(/《([^》]*)》/g, '<em>《$1》</em>')
    // 处理省略号
    .replace(/……/g, '<span class="ellipsis">……</span>')

  return `<p class="paragraph-indent">${indentPrefix}${formatted}</p>`
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
  // 不在这里显示保存成功消息，让父组件处理
}

const startAutoSave = () => {
  // 禁用自动保存，让父组件控制保存时机
  if (!props.autoSave) return

  // 注释掉自动保存逻辑，避免与父组件冲突
  // autoSaveTimer.value = setInterval(() => {
  //   if (hasUnsavedChanges.value) {
  //     saveContent()
  //   }
  // }, props.autoSaveInterval)
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
      // 移除 Ctrl+S 处理，让父组件处理保存
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
  getText: () => editor.value?.getText() || '',
  // 重置未保存状态
  markAsSaved: () => {
    hasUnsavedChanges.value = false
  },
  // 获取未保存状态
  getHasUnsavedChanges: () => hasUnsavedChanges.value
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
  line-height: 1.8;
}

:deep(.ProseMirror p.paragraph-indent) {
  text-indent: 2em;
}

/* 对话段落样式 */
:deep(.ProseMirror p.dialogue-paragraph) {
  margin: 0.6em 0;
  position: relative;
}

:deep(.ProseMirror .dialogue) {
  color: var(--theme-editor-dialogue);
  font-weight: 500;
  position: relative;
  transition: color 0.3s ease;
}

:deep(.ProseMirror .dialogue::before) {
  content: '';
  position: absolute;
  left: -3px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--theme-editor-dialogue);
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

/* 内心独白段落样式 */
:deep(.ProseMirror p.thought-paragraph) {
  margin: 0.6em 0;
  background: var(--theme-editor-thought-bg, rgba(108, 117, 125, 0.1));
  border-left: 3px solid var(--theme-editor-thought);
  padding: 0.5em 1em;
  border-radius: 0 8px 8px 0;
  transition: background-color 0.3s ease;
}

:deep(.ProseMirror .thought) {
  color: var(--theme-editor-thought);
  font-style: italic;
  font-weight: 500;
  transition: color 0.3s ease;
}

/* 场景分隔样式 */
:deep(.ProseMirror .scene-break) {
  text-align: center;
  margin: 3em 0;
  padding: 1.5em 0;
  color: var(--theme-editor-scene);
  font-size: 1.2em;
  font-weight: bold;
  position: relative;
  transition: color 0.3s ease;
}

:deep(.ProseMirror .scene-break::before),
:deep(.ProseMirror .scene-break::after) {
  content: '';
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--theme-editor-scene), transparent);
}

:deep(.ProseMirror .scene-break::before) {
  left: 0;
}

:deep(.ProseMirror .scene-break::after) {
  right: 0;
}

/* 强调文本样式 */
:deep(.ProseMirror em) {
  font-style: normal;
  color: var(--theme-editor-emphasis, #1890ff);
  font-weight: 500;
  transition: color 0.3s ease;
}

/* 省略号样式 */
:deep(.ProseMirror .ellipsis) {
  color: var(--theme-editor-ellipsis, #8c8c8c);
  letter-spacing: 2px;
  transition: color 0.3s ease;
}

/* 动作描写段落 */
:deep(.ProseMirror p.action-paragraph) {
  border-left: 2px solid var(--theme-editor-action, #52c41a);
  padding-left: 1em;
  margin-left: 0.5em;
}

/* 环境描写段落 */
:deep(.ProseMirror p.description-paragraph) {
  background: var(--theme-editor-description-bg, rgba(24, 144, 255, 0.05));
  border-radius: 4px;
  padding: 0.5em 1em;
  margin: 1em 0;
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
