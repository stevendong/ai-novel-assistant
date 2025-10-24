import { Extension } from '@tiptap/core'
import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import type { Instance as TippyInstance } from 'tippy.js'
// @ts-ignore - Vue SFC import
import SuggestionList from '@/components/editor/SuggestionList.vue'
import { aiService } from '@/services/aiService'
import { AIInlineSuggestionPluginKey } from './aiInlineSuggestion'

// 建议项接口
export interface SuggestionItem {
  id: string
  text: string
  confidence: number
  type: 'continuation' | 'completion' | 'alternative'
}

// 扩展配置选项
export interface AISuggestionOptions {
  novelId: string
  chapterId: string
  enabled: boolean
  autoTrigger: boolean
  triggerDelay: number
  maxSuggestions: number
  minContextLength: number
  hotkey: string
}

// 缓存机制
const suggestionCache = new Map<string, CachedSuggestion>()

interface CachedSuggestion {
  suggestions: SuggestionItem[]
  timestamp: number
  contextHash: string
}

// 请求控制
let abortController: AbortController | null = null

// 弹窗管理
let currentPopup: TippyInstance | null = null
let currentComponent: VueRenderer | null = null
let isShowingSuggestions = false

// 导出状态供其他扩展使用
export function isSuggestionListVisible(): boolean {
  return isShowingSuggestions
}

export const AISuggestion = Extension.create<AISuggestionOptions>({
  name: 'aiSuggestion',

  // 默认选项
  addOptions() {
    return {
      novelId: '',
      chapterId: '',
      enabled: true,
      autoTrigger: true,
      triggerDelay: 800,
      maxSuggestions: 3,
      minContextLength: 50,
      hotkey: 'Mod-h'
    }
  },

  // 扩展创建时的调试
  onCreate() {
    console.log('🚀 AISuggestion 扩展已加载')
    console.log('⚙️ 配置参数:', this.options)
  },

  // 添加键盘快捷键
  addKeyboardShortcuts() {
    const extension = this

    return {
      // 快捷键触发建议列表
      [this.options.hotkey]: () => {
        console.log('🔥 AI快捷键被按下:', extension.options.hotkey)

        if (!extension.options.enabled) {
          console.warn('❌ AI建议功能未启用')
          return false
        }

        if (!extension.editor.isEditable) {
          console.warn('❌ 编辑器不可编辑')
          return false
        }

        const { state } = extension.editor
        const { from } = state.selection
        const text = state.doc.textBetween(0, from, '\n')

        // 检查上下文长度
        if (text.length < extension.options.minContextLength) {
          console.warn('❌ 上下文太短，无法触发AI建议')
          return false
        }

        console.log('✅ 显示建议列表面板')

        // 显示建议列表
        showSuggestionList(extension.editor, extension.options)

        return true
      },

      // Tab 接受建议
      Tab: () => {
        if (isShowingSuggestions && currentComponent?.ref) {
          const event = new KeyboardEvent('keydown', { key: 'Tab' })
          const handled = currentComponent.ref.onKeyDown({ event })
          if (handled) {
            hideSuggestionList()
            return true
          }
        }
        return false
      },

      // Escape 关闭建议
      Escape: () => {
        if (isShowingSuggestions) {
          hideSuggestionList()
          return true
        }
        return false
      },

      // 上箭头
      ArrowUp: () => {
        if (isShowingSuggestions && currentComponent?.ref) {
          const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
          return currentComponent.ref.onKeyDown({ event }) ?? false
        }
        return false
      },

      // 下箭头
      ArrowDown: () => {
        if (isShowingSuggestions && currentComponent?.ref) {
          const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
          return currentComponent.ref.onKeyDown({ event }) ?? false
        }
        return false
      }
    }
  },

  // ProseMirror 插件（已移除 / 触发逻辑，仅使用快捷键触发）
  addProseMirrorPlugins() {
    console.log('✅ ProseMirror 插件已加载（无 / 触发）')
    return []
  }
})

// 辅助函数：获取AI建议
async function fetchSuggestions(
  context: string,
  cursorPosition: number,
  options: AISuggestionOptions
): Promise<SuggestionItem[]> {
  console.log('📞 fetchSuggestions 被调用')

  const { novelId, chapterId, maxSuggestions } = options

  console.log('🔑 请求参数:', {
    novelId,
    chapterId,
    contextLength: context.length,
    cursorPosition,
    maxSuggestions
  })

  // 取消之前的请求
  if (abortController) {
    console.log('⚠️ 取消之前的请求')
    abortController.abort()
  }

  abortController = new AbortController()

  try {
    // 提取最近的上下文（最多500字）
    const recentContext = context.slice(-500)
    console.log('📝 发送给AI的上下文长度:', recentContext.length)

    // 调用 AI 服务
    console.log('🚀 调用 aiService.generateSuggestions...')
    const response = await aiService.generateSuggestions({
      novelId,
      chapterId,
      context: recentContext,
      cursorPosition,
      count: maxSuggestions,
      maxLength: 100
    })

    console.log('📥 收到AI响应:', response)

    // 转换为建议项格式
    const suggestions = response.suggestions.map((s, index) => ({
      id: `suggestion-${Date.now()}-${index}`,
      text: s.text,
      confidence: s.confidence || 0.8,
      type: s.type || 'continuation'
    }))

    console.log('✨ 转换后的建议:', suggestions)
    return suggestions
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('🛑 建议请求已取消')
    } else {
      console.error('❌ 获取AI建议失败:', error)
    }
    return []
  }
}

// 缓存辅助函数
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString()
}

function getCachedSuggestions(context: string): SuggestionItem[] | null {
  const hash = hashString(context.slice(-200)) // 使用最后200字作为key
  const cached = suggestionCache.get(hash)

  if (cached && Date.now() - cached.timestamp < 60000) { // 1分钟有效期
    return cached.suggestions
  }

  return null
}

function cacheSuggestions(context: string, suggestions: SuggestionItem[]) {
  const hash = hashString(context.slice(-200))
  suggestionCache.set(hash, {
    suggestions,
    timestamp: Date.now(),
    contextHash: hash
  })

  // 清理过期缓存
  if (suggestionCache.size > 10) {
    const entries = Array.from(suggestionCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    suggestionCache.delete(entries[0][0])
  }
}

// 显示建议列表
function showSuggestionList(editor: any, options: AISuggestionOptions) {
  // 如果已经在显示，先隐藏
  if (isShowingSuggestions) {
    hideSuggestionList()
  }

  const { state, view } = editor
  const { from } = state.selection
  const context = editor.getText()

  console.log('📍 显示建议列表，位置:', from)

  // 清除内联建议
  const clearInlineTr = state.tr.setMeta(AIInlineSuggestionPluginKey, {
    type: 'clear'
  })
  editor.view.dispatch(clearInlineTr)

  // 获取光标位置
  const coords = view.coordsAtPos(from)

  const clientRect = () => ({
    top: coords.top,
    bottom: coords.bottom,
    left: coords.left,
    right: coords.left,
    width: 0,
    height: coords.bottom - coords.top
  })

  // 检查缓存
  const cached = getCachedSuggestions(context)
  const initialItems: SuggestionItem[] = cached || [{
    id: 'loading',
    text: '正在生成建议...',
    confidence: 0,
    type: 'continuation'
  }]

  // 创建 Vue 组件
  currentComponent = new VueRenderer(SuggestionList, {
    props: {
      items: initialItems,
      loading: !cached,
      command: (item: SuggestionItem) => {
        console.log('✨ 用户选择了建议:', item.text)
        editor.commands.insertContent(item.text)
        hideSuggestionList()
      }
    },
    editor
  })

  // 创建一个临时元素作为 tippy 的锚点
  const anchorElement = document.createElement('div')
  anchorElement.style.position = 'absolute'
  anchorElement.style.top = '0'
  anchorElement.style.left = '0'
  document.body.appendChild(anchorElement)

  // 创建 tippy 弹窗
  currentPopup = (tippy as any)(anchorElement, {
    getReferenceClientRect: clientRect,
    content: currentComponent.element,
    showOnCreate: true,
    interactive: true,
    trigger: 'manual',
    placement: 'bottom-start',
    theme: 'ai-suggestion',
    maxWidth: 600,
    offset: [0, 8],
    zIndex: 9999,
    animation: 'shift-away',
    duration: [200, 150],
    onDestroy: () => {
      // 清理锚点元素
      if (anchorElement.parentNode) {
        anchorElement.parentNode.removeChild(anchorElement)
      }
    }
  }) as TippyInstance

  isShowingSuggestions = true

  // 如果没有缓存，异步获取建议
  if (!cached) {
    console.log('🌐 异步获取AI建议...')
    fetchSuggestions(context, from, options)
      .then(suggestions => {
        console.log('✅ 获取到建议:', suggestions.length, '条')

        if (suggestions.length > 0) {
          cacheSuggestions(context, suggestions)

          // 更新组件
          if (currentComponent) {
            currentComponent.updateProps({
              items: suggestions,
              loading: false
            })
          }
        } else {
          // 没有建议，显示空状态
          if (currentComponent) {
            currentComponent.updateProps({
              items: [],
              loading: false
            })
          }
        }
      })
      .catch(error => {
        console.error('❌ 获取AI建议失败:', error)
        if (currentComponent) {
          currentComponent.updateProps({
            items: [],
            loading: false
          })
        }
      })
  }
}

// 隐藏建议列表
function hideSuggestionList() {
  console.log('👋 隐藏建议列表')

  if (currentPopup) {
    currentPopup.destroy()
    currentPopup = null
  }

  if (currentComponent) {
    currentComponent.destroy()
    currentComponent = null
  }

  isShowingSuggestions = false
}
