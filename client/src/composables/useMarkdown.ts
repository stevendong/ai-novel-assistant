import { ref, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { countValidWords } from '@/utils/textUtils'

// 配置marked选项
const markedOptions = {
  gfm: true,
  breaks: true,
  pedantic: false,
  sanitize: false,
  smartypants: false,
  headerIds: false,
  mangle: false
}

// Markdown模板
const templates = {
  chapterOutline: `## 章节开头
- 时间地点的设定
- 人物状态描述
- 引入主要事件

## 内容发展
1. **开端** - 情况引入，设置悬念
2. **发展** - 矛盾展开，推进情节
3. **转折** - 意外变化，增强戏剧性
4. **结尾** - 解决当前冲突，为下章铺垫

## 章节重点
- 本章要解决的主要问题
- 需要推进的情节线
- 人物关系的变化

## 预期字数
约 2000 字`,

  chapterContent: `# 第一章：神秘的开始

## 场景描述
深夜的废弃工厂笼罩在月光下，显得格外阴森...

## 人物登场
李明小心翼翼地走进工厂，他的心跳声在寂静中显得格外清晰...

## 情节发展
就在这时，一阵奇怪的声音从远处传来...

## 结尾转折
当他以为一切都结束时，却发现这只是开始...`
}

export function useMarkdown(initialText: string = '') {
  const markdownText = ref(initialText)

  // 渲染HTML
  const renderedHtml = computed(() => {
    if (!markdownText.value) return ''
    
    try {
      // 兼容不同版本的marked API
      let html: string
      
      if (typeof marked.parse === 'function') {
        // 新版本API
        html = marked.parse(markdownText.value, markedOptions)
      } else {
        // 旧版本API
        html = marked(markdownText.value, markedOptions)
      }
      
      return DOMPurify.sanitize(html)
    } catch (error) {
      console.error('Markdown渲染错误:', error)
      return `<div class="error">Markdown渲染失败</div>`
    }
  })

  // 字数统计（去除markdown标记）
  const wordCount = computed(() => {
    return countValidWords(markdownText.value, {
      removeMarkdown: true,
      removeHtml: true
    })
  })

  // 段落数统计
  const paragraphCount = computed(() => {
    return markdownText.value
      .split('\n\n')
      .filter(p => p.trim().length > 0)
      .length
  })

  // 标题提取
  const headings = computed(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    const headings: Array<{ level: number; text: string; anchor: string }> = []
    let match

    while ((match = headingRegex.exec(markdownText.value)) !== null) {
      const level = match[1].length
      const text = match[2].trim()
      const anchor = text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-')
      
      headings.push({ level, text, anchor })
    }

    return headings
  })

  // 设置markdown内容
  const setMarkdown = (text: string) => {
    markdownText.value = text
  }

  // 追加内容
  const appendMarkdown = (text: string) => {
    markdownText.value += '\n' + text
  }

  // 应用模板
  const applyTemplate = (templateName: keyof typeof templates) => {
    const template = templates[templateName]
    if (template) {
      markdownText.value = template
    }
  }

  // 插入文本（在光标位置）
  const insertText = (text: string, position?: number) => {
    if (position !== undefined) {
      const before = markdownText.value.substring(0, position)
      const after = markdownText.value.substring(position)
      markdownText.value = before + text + after
    } else {
      markdownText.value += text
    }
  }

  // 格式化工具
  const formatTools = {
    bold: (text: string) => `**${text}**`,
    italic: (text: string) => `*${text}*`,
    code: (text: string) => `\`${text}\``,
    link: (text: string, url: string) => `[${text}](${url})`,
    image: (alt: string, src: string) => `![${alt}](${src})`,
    heading: (text: string, level: number = 2) => `${'#'.repeat(level)} ${text}`,
    list: (items: string[]) => items.map(item => `- ${item}`).join('\n'),
    numberedList: (items: string[]) => items.map((item, index) => `${index + 1}. ${item}`).join('\n'),
    quote: (text: string) => `> ${text}`,
    divider: () => '---',
  }

  // 清空内容
  const clear = () => {
    markdownText.value = ''
  }

  return {
    markdownText,
    renderedHtml,
    wordCount,
    paragraphCount,
    headings,
    setMarkdown,
    appendMarkdown,
    insertText,
    applyTemplate,
    formatTools,
    clear
  }
}