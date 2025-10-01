import { ref } from 'vue'

export function useMessageScroll() {
  const messagesContainer = ref<HTMLElement>()
  const showScrollButton = ref(false)
  const unreadCount = ref(0)
  const scrollProgress = ref(0)
  const autoScrollEnabled = ref(true)
  const lastScrollTime = ref(0)
  const scrollDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  const handleScroll = () => {
    if (!messagesContainer.value) return

    // 记录滚动时间，用于智能滚动判断
    lastScrollTime.value = Date.now()

    // 清除之前的防抖定时器
    if (scrollDebounceTimer.value) {
      clearTimeout(scrollDebounceTimer.value)
    }

    // 防抖处理，避免过度触发
    scrollDebounceTimer.value = setTimeout(() => {
      if (!messagesContainer.value) return

      const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight)
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      // 计算滚动进度（0-100）
      scrollProgress.value = Math.min(100, Math.max(0, scrollPercentage * 100))

      // 更精确的底部检测
      const isNearBottom = distanceFromBottom < 50 || scrollPercentage > 0.95
      const hasScrollableContent = scrollHeight > clientHeight + 10

      // 如果用户手动滚动了，暂时禁用自动滚动
      const timeSinceScroll = Date.now() - lastScrollTime.value
      if (timeSinceScroll < 100) {
        autoScrollEnabled.value = false
        // 5秒后重新启用自动滚动
        setTimeout(() => {
          autoScrollEnabled.value = true
        }, 5000)
      }

      showScrollButton.value = !isNearBottom && hasScrollableContent

      // 如果用户滚动到底部，清除未读计数
      if (isNearBottom) {
        unreadCount.value = 0
      }
    }, 50) // 50ms防抖
  }

  const scrollToBottom = (smooth = true) => {
    if (!messagesContainer.value) return

    // 清除未读计数
    unreadCount.value = 0

    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    })

    // 触发滚动检测，更新按钮状态
    setTimeout(() => {
      handleScroll()
    }, smooth ? 300 : 50)
  }

  // 增加未读消息计数
  const incrementUnreadCount = () => {
    if (messagesContainer.value && showScrollButton.value) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      const isNearBottom = distanceFromBottom < 50

      if (!isNearBottom) {
        unreadCount.value++
      }
    }
  }

  return {
    messagesContainer,
    showScrollButton,
    unreadCount,
    scrollProgress,
    autoScrollEnabled,
    handleScroll,
    scrollToBottom,
    incrementUnreadCount
  }
}
