import { ref } from 'vue'

export function useFloatingWindow() {
  // 状态
  const isDragging = ref(false)
  const isResizing = ref(false)
  const floatingPosition = ref({ x: 100, y: 100 })
  const floatingSize = ref({ width: 400, height: 600 })
  const originalSize = ref({ width: 400, height: 600 })
  const originalPosition = ref({ x: 100, y: 100 })
  const dragStart = ref({ x: 0, y: 0 })
  const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })

  // 确保窗口在可见区域内
  const ensureWindowInBounds = () => {
    const maxX = window.innerWidth - floatingSize.value.width
    const maxY = window.innerHeight - floatingSize.value.height

    floatingPosition.value.x = Math.max(0, Math.min(maxX, floatingPosition.value.x))
    floatingPosition.value.y = Math.max(0, Math.min(maxY, floatingPosition.value.y))

    // 确保最小尺寸
    floatingSize.value.width = Math.max(320, floatingSize.value.width)
    floatingSize.value.height = Math.max(400, floatingSize.value.height)
  }

  // 保存浮动状态
  const saveFloatingState = () => {
    try {
      localStorage.setItem('ai_panel_position', JSON.stringify(floatingPosition.value))
      localStorage.setItem('ai_panel_size', JSON.stringify(floatingSize.value))
      localStorage.setItem('ai_panel_original_size', JSON.stringify(originalSize.value))
      localStorage.setItem('ai_panel_original_position', JSON.stringify(originalPosition.value))
    } catch (error) {
      console.warn('Failed to save floating state:', error)
    }
  }

  // 加载浮动状态
  const loadFloatingState = () => {
    try {
      const position = localStorage.getItem('ai_panel_position')
      if (position) {
        floatingPosition.value = JSON.parse(position)
      }

      const size = localStorage.getItem('ai_panel_size')
      if (size) {
        floatingSize.value = JSON.parse(size)
      }

      const originalSizeState = localStorage.getItem('ai_panel_original_size')
      if (originalSizeState) {
        originalSize.value = JSON.parse(originalSizeState)
      }

      const originalPositionState = localStorage.getItem('ai_panel_original_position')
      if (originalPositionState) {
        originalPosition.value = JSON.parse(originalPositionState)
      }

      ensureWindowInBounds()
    } catch (error) {
      console.warn('Failed to load floating state:', error)
    }
  }

  // 开始拖拽
  const startDrag = (e: MouseEvent, isMinimized: boolean = false) => {
    // 防止在按钮上开始拖拽
    const target = e.target as HTMLElement
    if (target.closest('.float-toggle-container, .control-btn, .history-btn')) {
      return
    }

    isDragging.value = true
    dragStart.value = {
      x: e.clientX - floatingPosition.value.x,
      y: e.clientY - floatingPosition.value.y
    }

    const handleDrag = (moveEvent: MouseEvent) => {
      if (!isDragging.value) return

      const newPosition = {
        x: moveEvent.clientX - dragStart.value.x,
        y: moveEvent.clientY - dragStart.value.y
      }

      // 获取当前窗口的实际尺寸（最小化时使用最小宽度）
      const currentWidth = isMinimized ? 280 : floatingSize.value.width
      const currentHeight = isMinimized ? 60 : floatingSize.value.height

      // 磁性吸附到边缘
      const snapThreshold = 20
      const maxX = window.innerWidth - currentWidth
      const maxY = window.innerHeight - currentHeight

      // 边缘吸附逻辑
      if (newPosition.x < snapThreshold) {
        newPosition.x = 0
      } else if (newPosition.x > maxX - snapThreshold) {
        newPosition.x = maxX
      }

      if (newPosition.y < snapThreshold) {
        newPosition.y = 0
      } else if (newPosition.y > maxY - snapThreshold) {
        newPosition.y = maxY
      }

      // 确保不超出边界
      floatingPosition.value = {
        x: Math.max(0, Math.min(maxX, newPosition.x)),
        y: Math.max(0, Math.min(maxY, newPosition.y))
      }
    }

    const stopDrag = () => {
      if (!isDragging.value) return

      isDragging.value = false
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', stopDrag)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      saveFloatingState()
    }

    document.addEventListener('mousemove', handleDrag)
    document.addEventListener('mouseup', stopDrag)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'move'
    e.preventDefault()
  }

  // 开始调整大小
  const startResize = (e: MouseEvent) => {
    isResizing.value = true
    resizeStart.value = {
      x: e.clientX,
      y: e.clientY,
      width: floatingSize.value.width,
      height: floatingSize.value.height
    }

    const handleResize = (moveEvent: MouseEvent) => {
      if (!isResizing.value) return

      const deltaX = moveEvent.clientX - resizeStart.value.x
      const deltaY = moveEvent.clientY - resizeStart.value.y

      const newWidth = Math.max(320, Math.min(1200, resizeStart.value.width + deltaX))
      const newHeight = Math.max(400, Math.min(900, resizeStart.value.height + deltaY))

      // 确保不超出视窗边界
      const maxWidth = window.innerWidth - floatingPosition.value.x - 20
      const maxHeight = window.innerHeight - floatingPosition.value.y - 20

      floatingSize.value = {
        width: Math.min(newWidth, maxWidth),
        height: Math.min(newHeight, maxHeight)
      }
    }

    const stopResize = () => {
      if (!isResizing.value) return

      isResizing.value = false
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      saveFloatingState()
    }

    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResize)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'nw-resize'
    e.preventDefault()
    e.stopPropagation()
  }

  // 最大化/还原窗口
  const toggleMaximize = () => {
    const isMaximized = floatingSize.value.width >= window.innerWidth - 40

    if (!isMaximized) {
      // 保存当前尺寸和位置
      originalSize.value = { ...floatingSize.value }
      originalPosition.value = { ...floatingPosition.value }

      // 最大化
      floatingSize.value = {
        width: window.innerWidth - 40,
        height: window.innerHeight - 40
      }
      floatingPosition.value = { x: 20, y: 20 }
    } else {
      // 还原
      floatingSize.value = { ...originalSize.value }
      floatingPosition.value = { ...originalPosition.value }
    }

    saveFloatingState()
  }

  return {
    // 状态
    isDragging,
    isResizing,
    floatingPosition,
    floatingSize,
    originalSize,
    originalPosition,
    
    // 方法
    ensureWindowInBounds,
    saveFloatingState,
    loadFloatingState,
    startDrag,
    startResize,
    toggleMaximize
  }
}
