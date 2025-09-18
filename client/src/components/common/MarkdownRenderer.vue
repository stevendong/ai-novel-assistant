<template>
  <div
    class="markdown-content"
    v-html="renderedContent"
    @click="handleClick"
  ></div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'

interface Props {
  content: string
  enableHighlight?: boolean
  enableMath?: boolean
  enableTables?: boolean
  enableTaskLists?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  enableHighlight: true,
  enableMath: false,
  enableTables: true,
  enableTaskLists: true
})

// 配置markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: props.enableHighlight ? function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang }).value}</code></pre>`
      } catch (__) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  } : undefined
})

// 启用插件
if (props.enableTables) {
  md.enable(['table'])
}

// 自定义渲染规则
md.renderer.rules.heading_open = function(tokens, idx, options, env) {
  const token = tokens[idx]
  const level = token.tag.slice(1) // h1 -> 1, h2 -> 2, etc.
  const id = tokens[idx + 1].content.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')
  return `<${token.tag} id="${id}" class="markdown-heading markdown-h${level}">`
}

md.renderer.rules.code_inline = function(tokens, idx) {
  const token = tokens[idx]
  return `<code class="markdown-inline-code">${md.utils.escapeHtml(token.content)}</code>`
}

md.renderer.rules.blockquote_open = function() {
  return '<blockquote class="markdown-blockquote">'
}

md.renderer.rules.bullet_list_open = function() {
  return '<ul class="markdown-list">'
}

md.renderer.rules.ordered_list_open = function() {
  return '<ol class="markdown-list markdown-ordered-list">'
}

md.renderer.rules.list_item_open = function() {
  return '<li class="markdown-list-item">'
}

// 任务列表支持
if (props.enableTaskLists) {
  md.renderer.rules.list_item_open = function(tokens, idx) {
    const token = tokens[idx]
    const next = tokens[idx + 2]

    if (next && next.type === 'inline' && next.content.match(/^\[[ x]\]/)) {
      const checked = next.content.startsWith('[x]')
      const content = next.content.replace(/^\[[ x]\]\s*/, '')
      next.content = content

      return `<li class="markdown-task-item">
        <input type="checkbox" ${checked ? 'checked' : ''} disabled class="markdown-task-checkbox">
        <span class="markdown-task-content">`
    }

    return '<li class="markdown-list-item">'
  }
}

// 计算渲染内容
const renderedContent = computed(() => {
  if (!props.content) return ''

  try {
    const rendered = md.render(props.content)
    // 使用DOMPurify清理HTML，防止XSS攻击
    return DOMPurify.sanitize(rendered, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'strong', 'b', 'em', 'i', 'u', 's', 'del',
        'blockquote', 'code', 'pre',
        'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'a', 'img',
        'input', 'span', 'div'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'alt', 'src',
        'class', 'id',
        'type', 'checked', 'disabled'
      ]
    })
  } catch (error) {
    console.error('Markdown rendering error:', error)
    return md.utils.escapeHtml(props.content)
  }
})

// 处理点击事件
const handleClick = (event: Event) => {
  const target = event.target as HTMLElement

  // 处理链接点击
  if (target.tagName === 'A') {
    event.preventDefault()
    const href = (target as HTMLAnchorElement).href
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer')
    }
  }

  // 处理代码块复制
  if (target.closest('pre.hljs')) {
    const codeBlock = target.closest('pre.hljs')
    const code = codeBlock?.textContent
    if (code) {
      navigator.clipboard?.writeText(code).then(() => {
        // 可以添加复制成功的提示
        console.log('Code copied to clipboard')
      })
    }
  }
}

// 监听内容变化，重新高亮
watch(() => props.content, () => {
  if (props.enableHighlight) {
    nextTick(() => {
      const codeBlocks = document.querySelectorAll('pre code:not(.hljs)')
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement)
      })
    })
  }
})

onMounted(() => {
  if (props.enableHighlight) {
    nextTick(() => {
      const codeBlocks = document.querySelectorAll('pre code:not(.hljs)')
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement)
      })
    })
  }
})
</script>

<style scoped>
.markdown-content {
  line-height: 1.6;
  color: var(--theme-text);
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* 标题样式 */
.markdown-content :deep(.markdown-heading) {
  margin: 1.5em 0 0.8em 0;
  font-weight: 600;
  line-height: 1.4;
  color: var(--theme-text);
}

.markdown-content :deep(.markdown-h1) {
  font-size: 1.8em;
  border-bottom: 2px solid var(--theme-border);
  padding-bottom: 0.3em;
}

.markdown-content :deep(.markdown-h2) {
  font-size: 1.5em;
  border-bottom: 1px solid var(--theme-border);
  padding-bottom: 0.3em;
}

.markdown-content :deep(.markdown-h3) {
  font-size: 1.3em;
}

.markdown-content :deep(.markdown-h4) {
  font-size: 1.1em;
}

.markdown-content :deep(.markdown-h5),
.markdown-content :deep(.markdown-h6) {
  font-size: 1em;
  color: var(--theme-text-secondary);
}

/* 段落样式 */
.markdown-content :deep(p) {
  margin: 0.8em 0;
}

/* 强调样式 */
.markdown-content :deep(strong),
.markdown-content :deep(b) {
  font-weight: 600;
  color: var(--theme-text);
}

.markdown-content :deep(em),
.markdown-content :deep(i) {
  font-style: italic;
}

.markdown-content :deep(del),
.markdown-content :deep(s) {
  text-decoration: line-through;
  opacity: 0.7;
}

/* 引用样式 */
.markdown-content :deep(.markdown-blockquote) {
  margin: 1em 0;
  padding: 0.8em 1.2em;
  border-left: 4px solid #1890ff;
  background: var(--theme-bg-elevated);
  border-radius: 0 4px 4px 0;
  color: var(--theme-text-secondary);
}

.markdown-content :deep(.markdown-blockquote p) {
  margin: 0.4em 0;
}

/* 代码样式 */
.markdown-content :deep(.markdown-inline-code) {
  background: var(--theme-bg-elevated);
  border: 1px solid var(--theme-border);
  border-radius: 3px;
  padding: 0.2em 0.4em;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
  color: #c41d7f;
}

.markdown-content :deep(pre.hljs) {
  background: #f6f8fa !important;
  border: 1px solid var(--theme-border);
  border-radius: 6px;
  padding: 1em;
  margin: 1em 0;
  overflow-x: auto;
  position: relative;
  cursor: pointer;
}

.markdown-content :deep(pre.hljs:hover::after) {
  content: '点击复制';
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  pointer-events: none;
}

.markdown-content :deep(pre code) {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
  line-height: 1.4;
}

/* 列表样式 */
.markdown-content :deep(.markdown-list) {
  margin: 0.8em 0;
  padding-left: 2em;
}

.markdown-content :deep(.markdown-list-item) {
  margin: 0.4em 0;
  line-height: 1.6;
}

.markdown-content :deep(.markdown-ordered-list) {
  list-style-type: decimal;
}

.markdown-content :deep(.markdown-list:not(.markdown-ordered-list)) {
  list-style-type: disc;
}

/* 任务列表样式 */
.markdown-content :deep(.markdown-task-item) {
  display: flex;
  align-items: flex-start;
  list-style: none;
  margin: 0.4em 0;
  padding-left: 0;
}

.markdown-content :deep(.markdown-task-checkbox) {
  margin-right: 0.5em;
  margin-top: 0.3em;
  flex-shrink: 0;
}

.markdown-content :deep(.markdown-task-content) {
  flex: 1;
}

/* 表格样式 */
.markdown-content :deep(table) {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
  background: var(--theme-bg-container);
  border: 1px solid var(--theme-border);
  border-radius: 4px;
  overflow: hidden;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid var(--theme-border);
  padding: 0.6em 1em;
  text-align: left;
}

.markdown-content :deep(th) {
  background: var(--theme-bg-elevated);
  font-weight: 600;
  color: var(--theme-text);
}

.markdown-content :deep(td) {
  background: var(--theme-bg-container);
}

.markdown-content :deep(tr:nth-child(even) td) {
  background: var(--theme-bg-elevated);
}

/* 链接样式 */
.markdown-content :deep(a) {
  color: #1890ff;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.2s;
}

.markdown-content :deep(a:hover) {
  border-bottom-color: #1890ff;
}

/* 分割线 */
.markdown-content :deep(hr) {
  border: none;
  height: 1px;
  background: var(--theme-border);
  margin: 2em 0;
}

/* 图片样式 */
.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 0.5em 0;
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .markdown-content :deep(pre.hljs) {
    background: #1e1e1e !important;
    color: #d4d4d4 !important;
  }

  .markdown-content :deep(.markdown-inline-code) {
    color: #ff7875;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .markdown-content :deep(.markdown-h1) {
    font-size: 1.5em;
  }

  .markdown-content :deep(.markdown-h2) {
    font-size: 1.3em;
  }

  .markdown-content :deep(.markdown-list) {
    padding-left: 1.5em;
  }

  .markdown-content :deep(pre.hljs) {
    padding: 0.8em;
    font-size: 0.8em;
  }

  .markdown-content :deep(table) {
    font-size: 0.9em;
  }

  .markdown-content :deep(th),
  .markdown-content :deep(td) {
    padding: 0.4em 0.6em;
  }
}
</style>