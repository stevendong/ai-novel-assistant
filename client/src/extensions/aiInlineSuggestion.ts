import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { aiService } from '@/services/aiService'
import { isSuggestionListVisible } from './aiSuggestion'

// 插件唯一标识
export const AIInlineSuggestionPluginKey = new PluginKey('aiInlineSuggestion')

// 扩展配置选项
export interface AIInlineSuggestionOptions {
  novelId: string
  chapterId: string
  enabled: boolean
  idleDelay: number // 光标空闲多久后触发（毫秒）
  minContextLength: number
}

// 插件状态
interface PluginState {
  suggestion: string | null
  decorations: DecorationSet
  isLoading: boolean
  lastCursorPos: number
}

let idleTimer: ReturnType<typeof setTimeout> | null = null
let abortController: AbortController | null = null

export const AIInlineSuggestion = Extension.create<AIInlineSuggestionOptions>({
  name: 'aiInlineSuggestion',

  // 默认选项
  addOptions() {
    return {
      novelId: '',
      chapterId: '',
      enabled: true,
      idleDelay: 3000, // 3秒
      minContextLength: 50
    }
  },

  // 扩展创建时的调试
  onCreate() {
    console.log('🎯 AIInlineSuggestion 扩展已加载')
    console.log('⚙️ 配置参数:', this.options)
  },

  // 添加键盘快捷键
  addKeyboardShortcuts() {
    return {
      // Tab 接受建议
      Tab: () => {
        // 如果建议列表正在显示，不拦截 Tab
        if (isSuggestionListVisible()) {
          return false
        }

        const state = this.editor.state
        const pluginState = AIInlineSuggestionPluginKey.getState(state) as PluginState | undefined

        if (pluginState?.suggestion) {
          console.log('✅ 接受内联建议:', pluginState.suggestion)

          const { from } = state.selection
          const suggestionText = pluginState.suggestion

          // 插入建议文本并移动光标到末尾
          this.editor
            .chain()
            .focus()
            .insertContentAt(from, suggestionText)
            .setTextSelection(from + suggestionText.length)
            .run()

          // 清除建议
          const tr = this.editor.state.tr.setMeta(AIInlineSuggestionPluginKey, {
            type: 'clear'
          })
          this.editor.view.dispatch(tr)

          return true
        }

        return false
      },

      // Escape 取消建议
      Escape: () => {
        // 如果建议列表正在显示，不拦截 Escape
        if (isSuggestionListVisible()) {
          return false
        }

        const state = this.editor.state
        const pluginState = AIInlineSuggestionPluginKey.getState(state) as PluginState | undefined

        if (pluginState?.suggestion) {
          console.log('❌ 取消内联建议')

          const tr = state.tr.setMeta(AIInlineSuggestionPluginKey, {
            type: 'clear'
          })
          this.editor.view.dispatch(tr)

          return true
        }

        return false
      }
    }
  },

  // 添加 ProseMirror 插件
  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: AIInlineSuggestionPluginKey,

        state: {
          init(): PluginState {
            return {
              suggestion: null,
              decorations: DecorationSet.empty,
              isLoading: false,
              lastCursorPos: 0
            }
          },

          apply(tr, value): PluginState {
            // 检查是否有元数据操作
            const meta = tr.getMeta(AIInlineSuggestionPluginKey)

            if (meta) {
              if (meta.type === 'setSuggestion') {
                console.log('💡 设置内联建议:', meta.suggestion)

                // 创建装饰
                const decorations = meta.suggestion
                  ? DecorationSet.create(tr.doc, [
                      Decoration.widget(
                        meta.position,
                        () => {
                          const span = document.createElement('span')
                          span.className = 'ai-inline-suggestion'
                          span.textContent = meta.suggestion
                          return span
                        },
                        { side: 1 }
                      )
                    ])
                  : DecorationSet.empty

                return {
                  ...value,
                  suggestion: meta.suggestion,
                  decorations,
                  isLoading: false
                }
              }

              if (meta.type === 'clear') {
                console.log('🧹 清除内联建议')
                return {
                  suggestion: null,
                  decorations: DecorationSet.empty,
                  isLoading: false,
                  lastCursorPos: value.lastCursorPos
                }
              }

              if (meta.type === 'setLoading') {
                return {
                  ...value,
                  isLoading: meta.loading
                }
              }
            }

            // 如果文档被修改，清除建议
            if (tr.docChanged) {
              // 取消空闲计时器
              if (idleTimer) {
                clearTimeout(idleTimer)
                idleTimer = null
              }

              // 如果有建议且文档被修改，清除建议
              if (value.suggestion) {
                return {
                  suggestion: null,
                  decorations: DecorationSet.empty,
                  isLoading: false,
                  lastCursorPos: tr.selection.from
                }
              }

              // 启动新的空闲计时器
              if (extension.options.enabled && extension.editor.isEditable) {
                const currentPos = tr.selection.from

                idleTimer = setTimeout(() => {
                  console.log('⏰ 光标空闲检测触发')
                  triggerInlineSuggestion(extension.editor, currentPos, extension.options)
                }, extension.options.idleDelay)
              }

              return {
                ...value,
                lastCursorPos: tr.selection.from
              }
            }

            // 光标位置改变
            if (tr.selection.from !== value.lastCursorPos) {
              // 取消空闲计时器
              if (idleTimer) {
                clearTimeout(idleTimer)
                idleTimer = null
              }

              // 清除建议
              if (value.suggestion) {
                return {
                  suggestion: null,
                  decorations: DecorationSet.empty,
                  isLoading: false,
                  lastCursorPos: tr.selection.from
                }
              }

              // 启动新的空闲计时器
              if (extension.options.enabled && extension.editor.isEditable) {
                const currentPos = tr.selection.from

                idleTimer = setTimeout(() => {
                  console.log('⏰ 光标空闲检测触发')
                  triggerInlineSuggestion(extension.editor, currentPos, extension.options)
                }, extension.options.idleDelay)
              }

              return {
                ...value,
                lastCursorPos: tr.selection.from
              }
            }

            // 映射装饰位置
            return {
              ...value,
              decorations: value.decorations.map(tr.mapping, tr.doc)
            }
          }
        },

        props: {
          decorations(state) {
            const pluginState = this.getState(state) as PluginState
            return pluginState.decorations
          }
        },

        // 清理定时器
        destroy() {
          if (idleTimer) {
            clearTimeout(idleTimer)
            idleTimer = null
          }
          if (abortController) {
            abortController.abort()
            abortController = null
          }
        }
      })
    ]
  }
})

// 触发内联建议
async function triggerInlineSuggestion(
  editor: any,
  position: number,
  options: AIInlineSuggestionOptions
) {
  // 如果建议列表正在显示，不触发内联建议
  if (isSuggestionListVisible()) {
    console.log('⏸️ 建议列表正在显示，跳过内联建议')
    return
  }

  const { state } = editor
  const text = state.doc.textBetween(0, position, '\n')

  console.log('🚀 触发内联建议', {
    position,
    textLength: text.length,
    minContextLength: options.minContextLength
  })

  // 检查上下文长度
  if (text.length < options.minContextLength) {
    console.warn('❌ 上下文太短，跳过内联建议')
    return
  }

  // 取消之前的请求
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()

  // 设置加载状态
  const loadingTr = state.tr.setMeta(AIInlineSuggestionPluginKey, {
    type: 'setLoading',
    loading: true
  })
  editor.view.dispatch(loadingTr)

  try {
    // 提取最近的上下文（最多500字）
    const recentContext = text.slice(-500)
    console.log('📝 发送给AI的上下文长度:', recentContext.length)

    // 调用 AI 服务
    const response = await aiService.generateSuggestions({
      novelId: options.novelId,
      chapterId: options.chapterId,
      context: recentContext,
      cursorPosition: position,
      count: 1, // 只要一条建议
      maxLength: 100
    })

    console.log('📥 收到AI响应:', response)

    if (response.suggestions && response.suggestions.length > 0) {
      const suggestionText = response.suggestions[0].text

      // 设置建议
      const tr = editor.state.tr.setMeta(AIInlineSuggestionPluginKey, {
        type: 'setSuggestion',
        suggestion: suggestionText,
        position
      })
      editor.view.dispatch(tr)

      console.log('✨ 内联建议已显示:', suggestionText)
    } else {
      console.warn('⚠️ 没有获取到建议')

      // 清除加载状态
      const clearTr = editor.state.tr.setMeta(AIInlineSuggestionPluginKey, {
        type: 'clear'
      })
      editor.view.dispatch(clearTr)
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('🛑 内联建议请求已取消')
    } else {
      console.error('❌ 获取内联建议失败:', error)
    }

    // 清除加载状态
    const clearTr = editor.state.tr.setMeta(AIInlineSuggestionPluginKey, {
      type: 'clear'
    })
    editor.view.dispatch(clearTr)
  }
}
