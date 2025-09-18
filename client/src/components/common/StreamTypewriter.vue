<template>
  <div class="stream-typewriter-container">
    <MarkdownRenderer
      :content="displayedContent"
      :enable-highlight="enableHighlight"
      :enable-tables="enableTables"
      :enable-task-lists="enableTaskLists"
    />
    <span
      v-if="showCursor && (isStreaming || showPersistentCursor)"
      class="typewriter-cursor"
      :class="{ 'cursor-blink': !isStreaming }"
    >|</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import MarkdownRenderer from './MarkdownRenderer.vue'

interface Props {
  content: string
  isStreaming?: boolean
  enableHighlight?: boolean
  enableTables?: boolean
  enableTaskLists?: boolean
  showCursor?: boolean
  showPersistentCursor?: boolean
  maxDelay?: number // 最大延迟时间（毫秒），防止内容更新过快
  minDelay?: number // 最小延迟时间（毫秒），确保打字机效果
  adaptiveSpeed?: boolean // 自适应速度，根据流式数据速度调整
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false,
  enableHighlight: true,
  enableTables: true,
  enableTaskLists: true,
  showCursor: true,
  showPersistentCursor: false,
  maxDelay: 100, // 最大100ms延迟
  minDelay: 16, // 最小16ms，保持60fps
  adaptiveSpeed: true // 默认启用自适应速度
})

const emit = defineEmits<{
  complete: []
  contentUpdate: [content: string]
}>()

const displayedContent = ref('')
const isStreaming = ref(false)
const lastContent = ref('')
const pendingContent = ref('')
const updateTimer = ref<number | null>(null)
const lastUpdateTime = ref(0)
const contentUpdateHistory = ref<Array<{ time: number; length: number }>>([])
const avgUpdateSpeed = ref(50) // 平均更新间隔（毫秒）

// 更新显示内容的函数
const updateDisplayedContent = () => {
  if (pendingContent.value !== displayedContent.value) {
    console.log('StreamTypewriter: Updating displayed content', {
      from: displayedContent.value.length,
      to: pendingContent.value.length,
      preview: pendingContent.value.substring(displayedContent.value.length, displayedContent.value.length + 20)
    })
    displayedContent.value = pendingContent.value
    emit('contentUpdate', displayedContent.value)
  }
  updateTimer.value = null
}

// 计算自适应延迟
const calculateAdaptiveDelay = (newContent: string): number => {
  if (!props.adaptiveSpeed || !props.isStreaming) {
    return props.minDelay
  }

  const now = Date.now()
  const timeSinceLastUpdate = now - lastUpdateTime.value

  // 如果这是第一次更新，使用默认延迟
  if (lastUpdateTime.value === 0) {
    return props.minDelay
  }

  // 计算内容增量
  const contentDiff = newContent.length - displayedContent.value.length

  // 如果内容变化很小或时间间隔很短，使用较小的延迟以跟上速度
  if (contentDiff <= 5 || timeSinceLastUpdate < 50) {
    return props.minDelay
  }

  // 根据时间间隔调整延迟：时间间隔越长，说明数据流越慢，延迟可以稍大
  let adaptiveDelay = Math.min(timeSinceLastUpdate * 0.2, props.maxDelay)
  adaptiveDelay = Math.max(adaptiveDelay, props.minDelay)

  return adaptiveDelay
}

// 处理内容变化
const handleContentChange = (newContent: string) => {
  pendingContent.value = newContent
  isStreaming.value = props.isStreaming

  console.log('StreamTypewriter: Content change', {
    newLength: newContent.length,
    currentLength: displayedContent.value.length,
    isStreaming: props.isStreaming
  })

  // 如果内容没有变化，不需要更新
  if (newContent === displayedContent.value) {
    console.log('StreamTypewriter: No content change, skipping')
    return
  }

  // 清除之前的定时器
  if (updateTimer.value) {
    clearTimeout(updateTimer.value)
  }

  // 如果正在流式传输，应用固定延迟以确保打字效果可见
  if (props.isStreaming) {
    const delay = 50 // 固定50ms延迟，确保打字效果可见

    console.log('StreamTypewriter: Applying delay', delay, 'ms')

    updateTimer.value = window.setTimeout(() => {
      updateDisplayedContent()
      lastUpdateTime.value = Date.now()
    }, delay)
  } else {
    // 流式传输完成，立即显示完整内容
    console.log('StreamTypewriter: Streaming complete, immediate update')
    updateDisplayedContent()
    emit('complete')
  }
}

// 监听content属性变化
watch(
  () => props.content,
  (newContent) => {
    if (newContent !== lastContent.value) {
      lastContent.value = newContent
      handleContentChange(newContent)
    }
  },
  { immediate: true }
)

// 监听streaming状态变化
watch(
  () => props.isStreaming,
  (newStreaming) => {
    isStreaming.value = newStreaming
    if (!newStreaming && props.content) {
      // 流式传输结束，确保显示完整内容
      if (updateTimer.value) {
        clearTimeout(updateTimer.value)
      }
      updateDisplayedContent()
      emit('complete')
    }
  }
)

// 组件挂载时初始化
onMounted(() => {
  if (props.content) {
    displayedContent.value = props.content
    if (!props.isStreaming) {
      emit('complete')
    }
  }
})

// 组件卸载时清理
onUnmounted(() => {
  if (updateTimer.value) {
    clearTimeout(updateTimer.value)
  }
})

// 暴露方法给父组件
defineExpose({
  forceUpdate: () => {
    if (updateTimer.value) {
      clearTimeout(updateTimer.value)
    }
    updateDisplayedContent()
  },
  getCurrentContent: () => displayedContent.value,
  isComplete: () => !props.isStreaming && displayedContent.value === props.content
})
</script>

<style scoped>
.stream-typewriter-container {
  position: relative;
  display: inline-block;
  width: 100%;
}

.typewriter-cursor {
  display: inline-block;
  color: var(--theme-text);
  font-weight: normal;
  margin-left: 2px;
  animation: none;
}

.cursor-blink {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* 确保光标在内容后面 */
.stream-typewriter-container :deep(.markdown-content) {
  display: inline;
}

/* 适配不同主题 */
.typewriter-cursor {
  color: var(--theme-text, #333);
}

@media (prefers-color-scheme: dark) {
  .typewriter-cursor {
    color: var(--theme-text, #fff);
  }
}
</style>