import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import SuggestionList from '@/components/editor/SuggestionList.vue'
import { aiService } from '@/services/aiService'

// 插件唯一标识
export const AISuggestionPluginKey = new PluginKey('aiSuggestion')

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
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let isLoadingSuggestions = false
let currentComponent: any = null

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
      hotkey: 'Mod-Space'
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
      // 快捷键触发建议
      [this.options.hotkey]: () => {
        console.log('🔥 AI快捷键被按下:', extension.options.hotkey)

        console.log('📋 当前配置:', {
          enabled: extension.options.enabled,
          novelId: extension.options.novelId,
          chapterId: extension.options.chapterId,
          minContextLength: extension.options.minContextLength
        })

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

        console.log('📝 当前文本长度:', text.length, '最小要求:', extension.options.minContextLength)
        console.log('📝 文本内容预览:', text.slice(-100))

        // 检查上下文长度
        if (text.length < extension.options.minContextLength) {
          console.warn('❌ 上下文太短，无法触发AI建议')
          return false
        }

        console.log('✅ 所有条件满足，直接获取AI建议')

        // 异步获取并插入建议（不阻塞快捷键处理）
        const context = extension.editor.getText()
        console.log('📄 获取编辑器文本，长度:', context.length)

        // 检查缓存
        const cached = getCachedSuggestions(context)
        if (cached && cached.length > 0) {
          console.log('💾 使用缓存的建议:', cached.length, '条')
          // 直接插入第一条建议
          extension.editor.commands.insertContent(cached[0].text)
          return true
        }

        // 异步获取建议
        console.log('🌐 调用 fetchSuggestions 获取新建议...')
        fetchSuggestions(context, from, extension.options)
          .then(suggestions => {
            console.log('✅ 获取到建议:', suggestions.length, '条')

            if (suggestions.length > 0) {
              // 缓存结果
              cacheSuggestions(context, suggestions)

              // 插入第一条建议
              console.log('📝 插入第一条建议:', suggestions[0].text)
              extension.editor.commands.insertContent(suggestions[0].text)
            } else {
              console.warn('⚠️ 没有获取到建议')
            }
          })
          .catch(error => {
            console.error('❌ 快捷键触发建议失败:', error)
          })

        return true
      },

      // Tab 接受建议
      Tab: () => {
        const { state } = this.editor
        const suggestionState = AISuggestionPluginKey.getState(state)

        if (suggestionState?.active && suggestionState.items?.length > 0) {
          // 接受当前选中的建议
          const selectedIndex = suggestionState.index ?? 0
          const suggestion = suggestionState.items[selectedIndex]

          if (suggestion) {
            const { from } = state.selection
            this.editor.chain()
              .focus()
              .insertContentAt(from, suggestion.text)
              .run()

            return true
          }
        }

        return false
      },

      // Escape 关闭建议
      Escape: () => {
        const { state } = this.editor
        const suggestionState = AISuggestionPluginKey.getState(state)

        if (suggestionState?.active) {
          const tr = state.tr.setMeta(AISuggestionPluginKey, {
            dismiss: true
          })
          this.editor.view.dispatch(tr)
          return true
        }

        return false
      }
    }
  },

  // 添加 Suggestion 插件
  addProseMirrorPlugins() {
    const extension = this

    console.log('🔌 正在添加 ProseMirror 插件...')
    console.log('🔌 Suggestion 插件配置:', {
      char: '/',
      pluginKey: AISuggestionPluginKey,
      enabled: extension.options.enabled
    })
    console.log('🔌 Suggestion 函数类型:', typeof Suggestion)

    const suggestionPlugin = Suggestion({
      editor: this.editor,
      pluginKey: AISuggestionPluginKey,

      // 使用 / 作为触发字符
      char: '/',

      // 允许空格
      allowSpaces: false,

      // 不要求在行首
      startOfLine: true,

      // 决定何时显示建议
      allow: ({ editor, state, range }: any) => {
        console.log('🔍 [斜杠触发] 检查是否允许显示建议', {
          range,
          editorState: state.doc.content.size
        })

        // 如果功能未启用，不显示
        if (!extension.options.enabled) {
          console.warn('❌ allow检查: 功能未启用')
          return false
        }

        // 检查是否有足够的上下文
        const text = state.doc.textBetween(0, range.from, '\n')
        if (text.length < extension.options.minContextLength) {
          console.warn('❌ allow检查: 上下文长度不足', text.length, '<', extension.options.minContextLength)
          return false
        }

        // 检查是否在编辑状态
        if (!editor.isEditable) {
          console.warn('❌ allow检查: 编辑器不可编辑')
          return false
        }

        console.log('✅ allow检查通过')
        return true
      },

      // 获取建议项
      items: async ({ query, editor }: any) => {
        console.log('📡 开始获取AI建议...', { query })

        try {
          const context = editor.getText()
          const { from } = editor.state.selection

          console.log('📄 上下文信息:', {
            contextLength: context.length,
            cursorPosition: from,
            query
          })

          const cached = getCachedSuggestions(context)
          if (cached) {
            console.log('💾 使用缓存的建议:', cached.length, '条')
            isLoadingSuggestions = false
            return cached
          }

          console.log('✅ 设置加载状态并返回占位符')
          isLoadingSuggestions = true
          
          const loadingItem: SuggestionItem = {
            id: 'loading',
            text: '正在生成建议...',
            confidence: 0,
            type: 'continuation'
          }

          fetchSuggestions(context, from, extension.options).then(suggestions => {
            console.log('✅ 获取到建议:', suggestions.length, '条', suggestions)
            
            if (suggestions.length > 0) {
              cacheSuggestions(context, suggestions)
              
              isLoadingSuggestions = false
              
              if (currentComponent) {
                console.log('🔄 直接更新组件 props')
                currentComponent.updateProps({
                  items: suggestions,
                  loading: false
                })
              }
            }
          }).catch(error => {
            console.error('❌ 获取AI建议失败:', error)
            isLoadingSuggestions = false
            
            if (currentComponent) {
              currentComponent.updateProps({
                items: [],
                loading: false
              })
            }
          })

          return [loadingItem]
        } catch (error) {
          console.error('❌ 获取AI建议失败:', error)
          isLoadingSuggestions = false
          return []
        }
      },

      // 渲染建议 UI
      render: () => {
        let component: VueRenderer | null = null
        let popup: any = null

        return {
          // 建议开始显示
          onStart: (props: any) => {
              console.log('🎨 开始渲染建议UI, 建议数量:', props.items?.length)
              console.log('📍 触发范围:', props.range)
              console.log('📍 clientRect:', props.clientRect)

              const isLoading = props.items?.length === 1 && props.items[0]?.id === 'loading'
              console.log('🔄 加载状态:', isLoading)

              component = new VueRenderer(SuggestionList, {
                props: {
                  items: props.items,
                  command: (item: SuggestionItem) => {
                    if (item.id === 'loading') {
                      console.log('⚠️ 加载中，忽略点击')
                      return
                    }

                    console.log('✨ 用户选择了建议:', item.text)
                    console.log('📍 Range 信息:', props.range)

                    extension.editor.chain()
                      .focus()
                      .deleteRange(props.range)
                      .insertContent(item.text)
                      .run()
                  },
                  loading: isLoading
                },
                editor: props.editor
              })

              currentComponent = component

              if (!props.clientRect) {
                console.warn('⚠️ clientRect 为空，无法显示弹窗')
                return
              }

              if (!component?.element) {
                console.warn('⚠️ 组件元素为空，无法显示弹窗')
                return
              }

              // 创建 tippy 实例
              try {
                popup = tippy(document.body, {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  theme: 'ai-suggestion',
                  maxWidth: 600,
                  offset: [0, 8],
                  zIndex: 9999,
                  animation: 'shift-away',
                  duration: [200, 150]
                })

                console.log('✅ 弹窗已创建', popup)
              } catch (error) {
                console.error('❌ 创建弹窗失败:', error)
              }
            },

            // 建议更新
            onUpdate: (props) => {
              if (!component || !popup) {
                console.warn('⚠️ 组件或弹窗不存在，无法更新')
                return
              }

              try {
                const isLoading = props.items?.length === 1 && props.items[0]?.id === 'loading'
                console.log('🔄 更新建议列表, 数量:', props.items?.length, '加载状态:', isLoading)

                component.updateProps({
                  items: props.items,
                  loading: isLoading
                })

                if (!props.clientRect) return

                const instances = Array.isArray(popup) ? popup : [popup]
                instances[0]?.setProps({
                  getReferenceClientRect: props.clientRect
                })

                console.log('✅ 建议列表已更新')
              } catch (error) {
                console.error('❌ 更新弹窗失败:', error)
              }
            },

            // 键盘事件处理
            onKeyDown: (props) => {
              if (!component || !popup) return false

              if (props.event.key === 'Escape') {
                const instances = Array.isArray(popup) ? popup : [popup]
                instances[0]?.hide()
                return true
              }

              // 将键盘事件传递给组件
              return component.ref?.onKeyDown?.(props) ?? false
            },

            // 建议结束
            onExit: () => {
              console.log('👋 建议UI关闭')

              if (popup) {
                try {
                  const instances = Array.isArray(popup) ? popup : [popup]
                  instances.forEach((instance: any) => instance.destroy())
                } catch (error) {
                  console.error('❌ 销毁弹窗失败:', error)
                }
              }

              if (component) {
                try {
                  component.destroy()
                } catch (error) {
                  console.error('❌ 销毁组件失败:', error)
                }
              }

              currentComponent = null
              isLoadingSuggestions = false
            }
          }
        }
      })

    console.log('✅ Suggestion 插件已创建:', suggestionPlugin)
    console.log('✅ 插件类型:', suggestionPlugin?.constructor?.name)

    return [suggestionPlugin]
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

