import { computed, ref } from 'vue'

export interface NovelFormatterOptions {
  autoIndent?: boolean
  dialogueStyle?: 'quotes' | 'dashes' | 'guillemets'
  sceneBreakStyle?: 'stars' | 'dashes' | 'dots'
  chapterTitleFormat?: 'numeric' | 'chinese' | 'roman'
}

export function useNovelFormatter(options: NovelFormatterOptions = {}) {
  const {
    autoIndent = true,
    dialogueStyle = 'quotes',
    sceneBreakStyle = 'stars',
    chapterTitleFormat = 'chinese'
  } = options

  // 格式化整个文本
  const formatNovelText = (text: string): string => {
    if (!text) return ''

    let formatted = text
    
    // 1. 基础段落格式化
    formatted = formatParagraphs(formatted)
    
    // 2. 对话格式化
    formatted = formatDialogue(formatted)
    
    // 3. 场景分隔格式化
    formatted = formatSceneBreaks(formatted)
    
    // 4. 章节标题格式化
    formatted = formatChapterTitles(formatted)
    
    // 5. 特殊符号处理
    formatted = formatPunctuation(formatted)
    
    return formatted
  }

  // 段落格式化
  const formatParagraphs = (text: string): string => {
    if (!autoIndent) return text
    
    return text
      .split('\n')
      .map(line => {
        const trimmed = line.trim()
        if (!trimmed) return ''
        
        // 跳过已经有缩进的行
        if (line.startsWith('　　') || line.startsWith('  ')) {
          return line
        }
        
        // 跳过标题行
        if (isTitle(trimmed)) {
          return trimmed
        }
        
        // 跳过对话行（将在后续处理）
        if (isDialogue(trimmed)) {
          return trimmed
        }
        
        // 跳过场景分隔行
        if (isSceneBreak(trimmed)) {
          return trimmed
        }
        
        // 普通段落添加缩进
        return `　　${trimmed}`
      })
      .join('\n')
  }

  // 对话格式化
  const formatDialogue = (text: string): string => {
    return text
      .split('\n')
      .map(line => {
        const trimmed = line.trim()
        if (!isDialogue(trimmed)) return line
        
        let formatted = trimmed
        
        switch (dialogueStyle) {
          case 'quotes':
            // 标准引号格式：　　"对话内容。"
            if (!formatted.match(/^　　?".*?"?$/)) {
              // 移除现有的引号和缩进
              formatted = formatted.replace(/^[　\s]*["'「』『」]*\s*/, '')
              formatted = formatted.replace(/\s*["'「』『」]*\s*$/, '')
              // 添加标准格式
              formatted = `　　"${formatted}"`
            }
            break
            
          case 'dashes':
            // 破折号格式：　　——对话内容。
            if (!formatted.match(/^　　?——/)) {
              formatted = formatted.replace(/^[　\s]*["'「』『」——]*\s*/, '')
              formatted = `　　——${formatted}`
            }
            break
            
          case 'guillemets':
            // 法式引号：　　「对话内容。」
            if (!formatted.match(/^　　?「.*」$/)) {
              formatted = formatted.replace(/^[　\s]*["'「』『」]*\s*/, '')
              formatted = formatted.replace(/\s*["'「』『」]*\s*$/, '')
              formatted = `　　「${formatted}」`
            }
            break
        }
        
        return formatted
      })
      .join('\n')
  }

  // 场景分隔格式化
  const formatSceneBreaks = (text: string): string => {
    return text
      .split('\n')
      .map(line => {
        const trimmed = line.trim()
        if (!isSceneBreak(trimmed)) return line
        
        switch (sceneBreakStyle) {
          case 'stars':
            return '* * *'
          case 'dashes':
            return '———————————'
          case 'dots':
            return '…………………'
          default:
            return '* * *'
        }
      })
      .join('\n')
  }

  // 章节标题格式化
  const formatChapterTitles = (text: string): string => {
    return text
      .split('\n')
      .map(line => {
        const trimmed = line.trim()
        if (!isTitle(trimmed)) return line
        
        // 提取章节号
        const chapterMatch = trimmed.match(/第?(\d+)[章节]/i)
        if (!chapterMatch) return line
        
        const chapterNum = parseInt(chapterMatch[1])
        const title = trimmed.replace(/^第?\d+[章节][:：\s]*/, '').trim()
        
        switch (chapterTitleFormat) {
          case 'numeric':
            return title ? `第${chapterNum}章：${title}` : `第${chapterNum}章`
          case 'chinese':
            const chineseNum = numberToChinese(chapterNum)
            return title ? `第${chineseNum}章：${title}` : `第${chineseNum}章`
          case 'roman':
            const romanNum = numberToRoman(chapterNum)
            return title ? `第${romanNum}章：${title}` : `第${romanNum}章`
          default:
            return line
        }
      })
      .join('\n')
  }

  // 标点符号格式化
  const formatPunctuation = (text: string): string => {
    return text
      // 统一引号
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // 统一省略号
      .replace(/\.{3,}/g, '…')
      // 统一破折号
      .replace(/--+/g, '——')
      // 移除多余空格
      .replace(/\s+/g, ' ')
      // 中文标点后不加空格
      .replace(/([，。！？；：])\s+/g, '$1')
  }

  // 辅助函数：判断是否为标题
  const isTitle = (line: string): boolean => {
    return /^第?\d+[章节]/i.test(line.trim()) ||
           /^[一二三四五六七八九十百千万]+[章节]/i.test(line.trim()) ||
           /^(chapter|ch\.?)\s*\d+/i.test(line.trim())
  }

  // 辅助函数：判断是否为对话
  const isDialogue = (line: string): boolean => {
    const trimmed = line.trim()
    return /^["'「』『」——]/.test(trimmed) ||
           /["'「』『」]$/.test(trimmed) ||
           /^——/.test(trimmed)
  }

  // 辅助函数：判断是否为场景分隔
  const isSceneBreak = (line: string): boolean => {
    const trimmed = line.trim()
    return /^[\*\-…—·]{3,}$/.test(trimmed) ||
           trimmed === '***' ||
           trimmed === '---' ||
           trimmed === '……'
  }

  // 数字转中文
  const numberToChinese = (num: number): string => {
    const chars = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
    const units = ['', '十', '百', '千']
    
    if (num === 0) return '零'
    if (num < 10) return chars[num]
    if (num < 20) return num === 10 ? '十' : '十' + chars[num % 10]
    if (num < 100) return chars[Math.floor(num / 10)] + '十' + (num % 10 ? chars[num % 10] : '')
    
    // 简化处理，仅支持到千位
    let result = ''
    let temp = num
    let unitIndex = 0
    
    while (temp > 0) {
      const digit = temp % 10
      if (digit !== 0) {
        result = chars[digit] + units[unitIndex] + result
      }
      temp = Math.floor(temp / 10)
      unitIndex++
    }
    
    return result
  }

  // 数字转罗马数字
  const numberToRoman = (num: number): string => {
    const romanNumerals = [
      { value: 1000, numeral: 'M' },
      { value: 900, numeral: 'CM' },
      { value: 500, numeral: 'D' },
      { value: 400, numeral: 'CD' },
      { value: 100, numeral: 'C' },
      { value: 90, numeral: 'XC' },
      { value: 50, numeral: 'L' },
      { value: 40, numeral: 'XL' },
      { value: 10, numeral: 'X' },
      { value: 9, numeral: 'IX' },
      { value: 5, numeral: 'V' },
      { value: 4, numeral: 'IV' },
      { value: 1, numeral: 'I' }
    ]
    
    let result = ''
    let remaining = num
    
    for (const { value, numeral } of romanNumerals) {
      while (remaining >= value) {
        result += numeral
        remaining -= value
      }
    }
    
    return result
  }

  // 智能段落处理
  const smartParagraphBreak = (text: string, cursorPosition: number): { 
    newText: string, 
    newCursorPosition: number 
  } => {
    const before = text.substring(0, cursorPosition)
    const after = text.substring(cursorPosition)
    
    // 检查当前行是否是对话
    const currentLineStart = before.lastIndexOf('\n') + 1
    const currentLine = before.substring(currentLineStart)
    
    let insertion = '\n'
    
    if (isDialogue(currentLine.trim())) {
      // 对话后添加新的对话格式
      switch (dialogueStyle) {
        case 'quotes':
          insertion = '\n　　"'
          break
        case 'dashes':
          insertion = '\n　　——'
          break
        case 'guillemets':
          insertion = '\n　　「'
          break
        default:
          insertion = '\n　　"'
      }
    } else {
      // 普通段落
      insertion = '\n　　'
    }
    
    return {
      newText: before + insertion + after,
      newCursorPosition: cursorPosition + insertion.length
    }
  }

  // 快速格式化选中文本
  const formatSelection = (text: string, start: number, end: number, formatType: string): {
    newText: string,
    newStart: number,
    newEnd: number
  } => {
    const before = text.substring(0, start)
    const selected = text.substring(start, end)
    const after = text.substring(end)
    
    let formatted = selected
    let prefix = ''
    let suffix = ''
    
    switch (formatType) {
      case 'dialogue':
        prefix = '"'
        suffix = '"'
        break
      case 'thought':
        prefix = '【'
        suffix = '】'
        break
      case 'emphasis':
        prefix = '**'
        suffix = '**'
        break
      case 'italic':
        prefix = '*'
        suffix = '*'
        break
    }
    
    formatted = prefix + selected + suffix
    
    return {
      newText: before + formatted + after,
      newStart: start,
      newEnd: start + formatted.length
    }
  }

  return {
    formatNovelText,
    formatParagraphs,
    formatDialogue,
    formatSceneBreaks,
    formatChapterTitles,
    formatPunctuation,
    smartParagraphBreak,
    formatSelection,
    isTitle,
    isDialogue,
    isSceneBreak
  }
}