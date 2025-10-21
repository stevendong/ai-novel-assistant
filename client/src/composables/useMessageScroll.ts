import { ref } from 'vue'

export function useMessageScroll() {
  // 状态管理
  const messagesContainer = ref<HTMLElement>()
  const showScrollButton = ref(false)
  const unreadCount = ref(0)
  const scrollProgress = ref(0)
  const isUserScrolling = ref(false)
  const scrollTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  /**
   * 判断是否在底部
   * @returns true 表示在底部，false 表示不在底部
   */
  const isAtBottom = (): boolean => {
    if (!messagesContainer.value) return true

    const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value

    // 计算距离底部的像素距离（确保不为负数）
    const distanceFromBottom = Math.max(0, scrollHeight - scrollTop - clientHeight)

    // 阈值设为 5px，考虑浮点数精度和亚像素渲染
    return distanceFromBottom <= 5
  }

  /**
   * 判断是否有可滚动内容
   * @returns true 表示内容超过一屏需要滚动，false 表示内容不足一屏
   */
  const hasScrollableContent = (): boolean => {
    if (!messagesContainer.value) return false

    const { scrollHeight, clientHeight } = messagesContainer.value

    // 内容高度比可见高度多至少 20px 才认为有可滚动内容
    return scrollHeight > clientHeight + 20
  }

  /**
   * 更新按钮显示状态
   */
  const updateButtonState = () => {
    if (!messagesContainer.value) {
      showScrollButton.value = false
      return
    }

    const atBottom = isAtBottom()
    const hasContent = hasScrollableContent()

    // 按钮显示规则：
    // 1. 不在底部 且 有可滚动内容 -> 显示
    // 2. 在底部 或 无可滚动内容 -> 隐藏
    showScrollButton.value = !atBottom && hasContent

    // 在底部时清除未读计数
    if (atBottom) {
      unreadCount.value = 0
    }

    // 更新滚动进度
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
    const maxScroll = Math.max(1, scrollHeight - clientHeight)
    scrollProgress.value = Math.round((scrollTop / maxScroll) * 100)
  }

  /**
   * 处理滚动事件
   */
  const handleScroll = () => {
    if (!messagesContainer.value) return
    // 标记用户正在滚动
    updateButtonState()
    isUserScrolling.value = false
  }

  /**
   * 滚动到底部
   * @param smooth 是否平滑滚动
   */
  const scrollToBottom = (smooth = true) => {
    if (!messagesContainer.value) return

    // 清除未读计数
    unreadCount.value = 0

    // 执行滚动
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    })

    // 延迟更新按钮状态（等待滚动完成）
    setTimeout(() => {
      updateButtonState()
    }, smooth ? 400 : 100)
  }

  /**
   * 处理新消息到达
   * - 如果在底部，自动滚动到底部
   * - 如果不在底部，增加未读计数
   */
  const onNewMessage = () => {
    if (!messagesContainer.value) return

    const atBottom = isAtBottom()

    if (atBottom) {
      // 在底部：自动滚动到新消息
      scrollToBottom(true)
    } else {
      // 不在底部：增加未读计数
      unreadCount.value++
      updateButtonState()
    }
  }

  /**
   * 检查并更新滚动位置（用于外部调用）
   */
  const checkScrollPosition = () => {
    updateButtonState()
  }

  return {
    // 状态
    messagesContainer,
    showScrollButton,
    unreadCount,
    scrollProgress,
    isUserScrolling,

    // 方法
    handleScroll,
    scrollToBottom,
    onNewMessage,
    checkScrollPosition,
    isAtBottom,
    hasScrollableContent
  }
}
