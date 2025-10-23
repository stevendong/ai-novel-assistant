<template>
  <div class="tiptap-editor">
    <!-- Toolbar -->
    <div class="editor-toolbar" v-if="editor">
      <div class="toolbar-content">
        <!-- 标题 -->
        <a-dropdown>
          <a-button size="small" :type="editor.isActive('heading') ? 'primary' : 'default'">
            <template #icon><FontSizeOutlined /></template>
            标题
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item
                @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
                :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
              >
                标题 1
              </a-menu-item>
              <a-menu-item
                @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
              >
                标题 2
              </a-menu-item>
              <a-menu-item
                @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
              >
                标题 3
              </a-menu-item>
              <a-menu-item
                @click="editor.chain().focus().setParagraph().run()"
                :class="{ 'is-active': editor.isActive('paragraph') }"
              >
                正文
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>

        <a-divider type="vertical" />

        <!-- 文本格式 -->
        <a-tooltip title="加粗 (Ctrl+B)">
          <a-button
            size="small"
            :type="editor.isActive('bold') ? 'primary' : 'default'"
            @click="editor.chain().focus().toggleBold().run()"
          >
            <template #icon><BoldOutlined /></template>
          </a-button>
        </a-tooltip>

        <a-tooltip title="斜体 (Ctrl+I)">
          <a-button
            size="small"
            :type="editor.isActive('italic') ? 'primary' : 'default'"
            @click="editor.chain().focus().toggleItalic().run()"
          >
            <template #icon><ItalicOutlined /></template>
          </a-button>
        </a-tooltip>

        <a-tooltip title="删除线">
          <a-button
            size="small"
            :type="editor.isActive('strike') ? 'primary' : 'default'"
            @click="editor.chain().focus().toggleStrike().run()"
          >
            <template #icon><StrikethroughOutlined /></template>
          </a-button>
        </a-tooltip>

        <a-divider type="vertical" />

        <!-- 列表 -->
        <a-tooltip title="无序列表">
          <a-button
            size="small"
            :type="editor.isActive('bulletList') ? 'primary' : 'default'"
            @click="editor.chain().focus().toggleBulletList().run()"
          >
            <template #icon><UnorderedListOutlined /></template>
          </a-button>
        </a-tooltip>

        <a-tooltip title="有序列表">
          <a-button
            size="small"
            :type="editor.isActive('orderedList') ? 'primary' : 'default'"
            @click="editor.chain().focus().toggleOrderedList().run()"
          >
            <template #icon><OrderedListOutlined /></template>
          </a-button>
        </a-tooltip>

        <a-divider type="vertical" />

        <!-- 引用和分割线 -->
        <a-tooltip title="引用">
          <a-button
            size="small"
            :type="editor.isActive('blockquote') ? 'primary' : 'default'"
            @click="editor.chain().focus().toggleBlockquote().run()"
          >
            <template #icon><FontColorsOutlined /></template>
          </a-button>
        </a-tooltip>

        <a-tooltip title="分割线">
          <a-button
            size="small"
            @click="editor.chain().focus().setHorizontalRule().run()"
          >
            <template #icon><MinusOutlined /></template>
          </a-button>
        </a-tooltip>

        <a-divider type="vertical" />

        <!-- 撤销/重做 -->
        <a-tooltip title="撤销 (Ctrl+Z)">
          <a-button
            size="small"
            @click="editor.chain().focus().undo().run()"
            :disabled="!editor.can().undo()"
          >
            <template #icon><UndoOutlined /></template>
          </a-button>
        </a-tooltip>

        <a-tooltip title="重做 (Ctrl+Shift+Z)">
          <a-button
            size="small"
            @click="editor.chain().focus().redo().run()"
            :disabled="!editor.can().redo()"
          >
            <template #icon><RedoOutlined /></template>
          </a-button>
        </a-tooltip>

        <a-divider type="vertical" />

        <!-- 清除格式 -->
        <a-tooltip title="清除格式">
          <a-button
            size="small"
            @click="editor.chain().focus().clearNodes().unsetAllMarks().run()"
          >
            <template #icon><ClearOutlined /></template>
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <!-- Editor Content -->
    <div class="editor-wrapper">
      <editor-content :editor="editor" class="editor-content" />
    </div>

    <!-- Status Bar -->
    <div class="editor-status-bar" v-if="editor">
      <div class="status-items">
        <span class="status-item">
          <FileWordOutlined />
          字数: {{ wordCount }}
        </span>
        <span class="status-item" v-if="characterCount">
          字符: {{ characterCount }}
        </span>
        <span class="status-item" v-if="targetWordCount">
          进度: {{ Math.round((wordCount / targetWordCount) * 100) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import {
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  FontColorsOutlined,
  FontSizeOutlined,
  MinusOutlined,
  UndoOutlined,
  RedoOutlined,
  ClearOutlined,
  FileWordOutlined
} from '@ant-design/icons-vue'
import { countValidWords } from '@/utils/textUtils'

interface Props {
  modelValue?: string
  placeholder?: string
  targetWordCount?: number
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '开始编写章节内容...',
  editable: true
})

const emit = defineEmits(['update:modelValue', 'update:wordCount'])

// 初始化编辑器
const editor = useEditor({
  content: props.modelValue,
  editable: props.editable,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
      }
    }),
    Placeholder.configure({
      placeholder: props.placeholder
    }),
    CharacterCount,
    Typography
  ],
  onUpdate: ({ editor }) => {
    const html = editor.getHTML()
    emit('update:modelValue', html)
    emit('update:wordCount', wordCount.value)
  },
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none'
    }
  }
})

// 字数统计
const wordCount = computed(() => {
  if (!editor.value) return 0
  const text = editor.value.getText()
  return countValidWords(text, {
    removeMarkdown: false,
    removeHtml: false
  })
})

const characterCount = computed(() => {
  if (!editor.value) return 0
  return editor.value.storage.characterCount.characters()
})

// 监听外部内容变化
watch(() => props.modelValue, (value) => {
  if (!editor.value) return
  const isSame = editor.value.getHTML() === value
  if (isSame) return
  editor.value.commands.setContent(value, false)
})

// 监听编辑状态变化
watch(() => props.editable, (value) => {
  if (editor.value) {
    editor.value.setEditable(value)
  }
})

// 清理
onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.tiptap-editor {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  background: var(--theme-bg-container);
  overflow: hidden;
}

.editor-toolbar {
  padding: 12px;
  border-bottom: 1px solid var(--theme-border);
  background: var(--theme-bg-elevated);
}

.toolbar-content {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.editor-toolbar :deep(.ant-btn) {
  border-radius: 4px;
}

.editor-toolbar :deep(.is-active) {
  background: #e6f7ff;
  color: #1890ff;
}

.editor-wrapper {
  flex: 1;
  overflow-y: auto;
  min-height: 400px;
  max-height: 600px;
}

.editor-content {
  height: 100%;
}

.editor-content :deep(.ProseMirror) {
  padding: 24px;
  min-height: 400px;
  font-size: 15px;
  line-height: 2;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--theme-text);
  outline: none;
}

.editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: var(--theme-text-secondary);
  opacity: 0.5;
  pointer-events: none;
  height: 0;
  float: left;
}

.editor-content :deep(.ProseMirror h1) {
  font-size: 2em;
  font-weight: 700;
  margin-top: 1em;
  margin-bottom: 0.5em;
  line-height: 1.4;
}

.editor-content :deep(.ProseMirror h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.5em;
  line-height: 1.4;
}

.editor-content :deep(.ProseMirror h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 0.8em;
  margin-bottom: 0.4em;
  line-height: 1.4;
}

.editor-content :deep(.ProseMirror p) {
  margin-bottom: 1em;
  text-indent: 2em;
}

.editor-content :deep(.ProseMirror ul),
.editor-content :deep(.ProseMirror ol) {
  padding-left: 2em;
  margin: 1em 0;
}

.editor-content :deep(.ProseMirror li) {
  margin: 0.5em 0;
}

.editor-content :deep(.ProseMirror blockquote) {
  border-left: 3px solid #1890ff;
  padding-left: 1em;
  margin: 1em 0;
  color: var(--theme-text-secondary);
  font-style: italic;
}

.editor-content :deep(.ProseMirror hr) {
  border: none;
  border-top: 2px solid var(--theme-border);
  margin: 2em 0;
}

.editor-content :deep(.ProseMirror strong) {
  font-weight: 700;
}

.editor-content :deep(.ProseMirror em) {
  font-style: italic;
}

.editor-content :deep(.ProseMirror s) {
  text-decoration: line-through;
}

/* 选中文本样式 */
.editor-content :deep(.ProseMirror ::selection) {
  background: #b5d5ff;
}

.editor-status-bar {
  padding: 8px 16px;
  border-top: 1px solid var(--theme-border);
  background: var(--theme-bg-elevated);
  font-size: 13px;
  color: var(--theme-text-secondary);
}

.status-items {
  display: flex;
  gap: 16px;
  align-items: center;
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 暗色主题支持 */
:deep(.dark) .editor-content .ProseMirror {
  color: #e8e8e8;
}

:deep(.dark) .editor-toolbar .is-active {
  background: #1f1f1f;
  color: #1890ff;
}
</style>
