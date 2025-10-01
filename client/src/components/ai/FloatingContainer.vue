<template>
  <div
    class="floating-container"
    :class="{
      'floating': isFloating,
      'dragging': isDragging,
      'resizing': isResizing,
      'minimized': isFloating && isMinimized,
      'maximized': isMaximized
    }"
    :style="containerStyle"
  >
    <slot />

    <!-- 浮动模式调整大小手柄 -->
    <div
      v-if="isFloating && !isMinimized"
      class="resize-handle"
      @mousedown="handleResizeStart($event)"
    >
      <div class="resize-icon">⋰</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Props
const props = defineProps<{
  isFloating: boolean
  isMinimized: boolean
  isMaximized: boolean
  floatingPosition?: { x: number; y: number }
  floatingSize?: { width: number; height: number }
  isDragging?: boolean
  isResizing?: boolean
}>()

// Emits
const emit = defineEmits<{
  'update:isFloating': [value: boolean]
  'update:isMinimized': [value: boolean]
  'update:isMaximized': [value: boolean]
  'drag-start': [event: MouseEvent]
  'resize-start': [event: MouseEvent]
}>()

// 计算容器样式
const containerStyle = computed(() => {
  if (!props.isFloating) {
    return {}
  }

  const position = props.floatingPosition || { x: 100, y: 100 }
  const size = props.floatingSize || { width: 400, height: 600 }

  return {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: props.isMinimized ? 'auto' : `${size.width}px`,
    height: props.isMinimized ? 'auto' : `${size.height}px`,
    zIndex: 1000,
    borderRadius: '12px',
    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden'
  } as const
})

// 处理调整大小
const handleResizeStart = (event: MouseEvent) => {
  emit('resize-start', event)
}
</script>

<style scoped>
.floating-container {
  transition: box-shadow 0.3s ease;
}

.floating-container.dragging {
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.2) !important;
}

.floating-container.resizing {
  transition: none;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: nw-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.1) 50%);
  border-radius: 0 0 12px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  z-index: 1001;
}

.resize-handle:hover {
  background: linear-gradient(135deg, transparent 40%, rgba(0, 0, 0, 0.2) 40%);
}

.resize-icon {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.3);
  user-select: none;
  transform: rotate(45deg);
  margin-bottom: 2px;
  margin-right: 2px;
}

/* 浮动模式样式 */
.floating-container {
  border-radius: 12px;
  overflow: hidden;
  background: var(--theme-bg-container);
}

/* 浮动模式渐变边框效果 */
.floating-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(24, 144, 255, 0.6) 25%,
    rgba(114, 46, 209, 0.6) 50%,
    rgba(24, 144, 255, 0.6) 75%,
    transparent 100%);
  border-radius: 12px 12px 0 0;
  pointer-events: none;
}

.floating-container.dragging {
  transform: scale(1.02);
  transition: all 0.1s ease;
}

.floating-container.minimized {
  width: auto !important;
  height: auto !important;
  min-width: 280px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 暗色模式适配 */
.dark .floating-container {
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
}

.dark .floating-container::before {
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(96, 165, 250, 0.6) 25%,
    rgba(168, 85, 247, 0.6) 50%,
    rgba(96, 165, 250, 0.6) 75%,
    transparent 100%);
}

.dark .floating-container.dragging {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6) !important;
}

.dark .resize-handle {
  background: linear-gradient(135deg,
    transparent 50%,
    rgba(96, 165, 250, 0.2) 50%);
}

.dark .resize-handle:hover {
  background: linear-gradient(135deg,
    transparent 40%,
    rgba(96, 165, 250, 0.3) 40%);
}

.dark .resize-icon {
  color: #60a5fa;
}
</style>
