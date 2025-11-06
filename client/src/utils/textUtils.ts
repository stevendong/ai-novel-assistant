/**
 * 文本处理工具函数
 */

import i18n from '@/i18n'

export interface CountValidWordsOptions {
  /** 是否移除markdown标记 */
  removeMarkdown?: boolean
  /** 是否移除HTML标签 */
  removeHtml?: boolean
  /** 是否移除标点符号 */
  removePunctuation?: boolean
  /** 当前语言环境，用于确定统计规则 */
  locale?: string
}

const resolveLocale = (localeHint?: string): string => {
  if (localeHint) {
    return localeHint
  }
  try {
    const globalLocale = i18n?.global?.locale?.value
    if (typeof globalLocale === 'string') {
      return globalLocale
    }
  } catch {
    // i18n 可能在服务端不可用，忽略错误
  }
  return 'zh'
}

const shouldUseEnglishRules = (text: string, locale?: string) => {
  const normalizedLocale = locale?.toLowerCase() || ''
  if (normalizedLocale.startsWith('en')) {
    return true
  }
  const hasCjk = /[\u3400-\u9FFF]/.test(text)
  const hasLatin = /[A-Za-z]/.test(text)
  return hasLatin && !hasCjk
}

/**
 * 计算有效字数/词数，忽略空格、换行等无意义字符
 * @param text 待统计的文本
 * @param options 配置选项
 */
export function countValidWords(text: string, options: CountValidWordsOptions = {}): number {
  if (!text || typeof text !== 'string') {
    return 0
  }

  let processedText = text
  const resolvedLocale = resolveLocale(options.locale)

  // 移除HTML标签
  if (options.removeHtml) {
    processedText = processedText.replace(/<[^>]*>/g, '')
  }

  // 移除Markdown标记
  if (options.removeMarkdown) {
    processedText = processedText
      // 移除标题标记
      .replace(/^#{1,6}\s+/gm, '')
      // 移除加粗标记
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // 移除斜体标记
      .replace(/\*(.*?)\*/g, '$1')
      // 移除删除线标记
      .replace(/~~(.*?)~~/g, '$1')
      // 移除代码块标记
      .replace(/```[\s\S]*?```/g, '')
      // 移除行内代码标记
      .replace(/`([^`]+)`/g, '$1')
      // 移除图片标记
      .replace(/!\[.*?\]\(.*?\)/g, '')
      // 移除链接标记，保留链接文本
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // 移除引用标记
      .replace(/^>\s+/gm, '')
      // 移除列表标记
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // 移除分割线
      .replace(/^---+$/gm, '')
      .replace(/^\*\*\*+$/gm, '')
      // 移除表格标记
      .replace(/\|/g, '')
  }

  // 移除标点符号（可选）
  if (options.removePunctuation) {
    // 移除中文标点
    processedText = processedText.replace(/[，。；：！？""''（）【】《》]/g, '')
    // 移除英文标点
    processedText = processedText.replace(/[,.;:!?"'()\[\]<>]/g, '')
  }

  const useEnglishRules = shouldUseEnglishRules(processedText, resolvedLocale)
  if (useEnglishRules) {
    const normalizedText = processedText
      .replace(/&nbsp;/gi, ' ')
      .replace(/[\u2018\u2019\u201A\u2032]/g, '\'')
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!normalizedText) {
      return 0
    }

    const wordMatches = normalizedText.match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g)
    return wordMatches ? wordMatches.length : 0
  }

  // 移除所有空白字符（空格、制表符、换行符等）
  processedText = processedText.replace(/\s+/g, '')

  return processedText.length
}

/**
 * 计算段落数量
 * @param text 文本内容
 */
export function countParagraphs(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0
  }

  return text
    .split(/\n\s*\n/)
    .filter(paragraph => paragraph.trim().length > 0)
    .length
}

/**
 * 计算句子数量
 * @param text 文本内容
 */
export function countSentences(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0
  }

  // 先移除HTML和Markdown标记
  const cleanText = text
    .replace(/<[^>]*>/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // 按中文句号、英文句号、感叹号、问号分割
  const sentences = cleanText
    .split(/[。！？.!?]+/)
    .filter(sentence => sentence.trim().length > 0)

  return sentences.length
}

/**
 * 获取文本统计信息
 * @param text 文本内容
 * @param options 配置选项
 */
export function getTextStats(text: string, options: {
  removeMarkdown?: boolean
  removeHtml?: boolean
  removePunctuation?: boolean
} = {}) {
  return {
    /** 有效字数（忽略空格换行） */
    validWords: countValidWords(text, options),
    /** 原始字符数 */
    totalChars: text.length,
    /** 段落数 */
    paragraphs: countParagraphs(text),
    /** 句子数 */
    sentences: countSentences(text),
    /** 空白字符数 */
    whitespaceChars: text.length - text.replace(/\s/g, '').length
  }
}

/**
 * 格式化字数显示
 * @param count 字数
 * @param unit 单位（默认为"字"）
 */
export function formatWordCount(count: number, unit: string = '字'): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万${unit}`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}千${unit}`
  }
  return `${count}${unit}`
}

/**
 * 计算阅读时间（按中文阅读速度估算）
 * @param wordCount 字数
 * @param wordsPerMinute 每分钟阅读字数，默认300字/分钟
 */
export function estimateReadingTime(wordCount: number, wordsPerMinute: number = 300): {
  minutes: number
  text: string
} {
  const minutes = Math.ceil(wordCount / wordsPerMinute)
  
  let text: string
  if (minutes < 1) {
    text = '不到1分钟'
  } else if (minutes < 60) {
    text = `约${minutes}分钟`
  } else {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    text = remainingMinutes > 0 ? `约${hours}小时${remainingMinutes}分钟` : `约${hours}小时`
  }

  return { minutes, text }
}
