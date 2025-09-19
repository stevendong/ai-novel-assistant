<template>
  <div class="sync-typewriter-container">
    <MarkdownRenderer
      :content="displayedContent"
      :enable-highlight="enableHighlight"
      :enable-tables="enableTables"
      :enable-task-lists="enableTaskLists"
    />
    <span
      v-if="showCursor && (isActivelyTyping || showPersistentCursor)"
      class="typewriter-cursor"
      :class="{ 'cursor-blink': !isActivelyTyping }"
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
  // 流式同步相关参数
  syncMode?: 'realtime' | 'smooth' | 'burst'  // 同步模式
  bufferSize?: number     // 缓冲区大小，用于平滑显示
  minDisplayInterval?: number  // 最小显示间隔（ms）
  maxDisplayInterval?: number  // 最大显示间隔（ms）
  adaptiveTyping?: boolean     // 自适应打字速度
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false,
  enableHighlight: true,
  enableTables: true,
  enableTaskLists: true,
  showCursor: true,
  showPersistentCursor: false,
  syncMode: 'smooth',
  bufferSize: 3,  // 一次最多显示3个字符
  minDisplayInterval: 20,   // 最小20ms间隔
  maxDisplayInterval: 150,  // 最大150ms间隔
  adaptiveTyping: true
})

const emit = defineEmits<{
  complete: []
  contentUpdate: [content: string]
  typingSpeedChange: [speed: number]
}>()

// 核心状态
const displayedContent = ref('')
const isActivelyTyping = ref(false)
const pendingContent = ref('')

// 同步机制状态
const contentQueue = ref<string[]>([])
const lastUpdateTime = ref(0)
const updateHistory = ref<Array<{ time: number; length: number }>>([])
const currentTypingSpeed = ref(50) // 当前打字速度（ms）
const typingTimer = ref<number | null>(null)

// 流式数据检测
const streamMetrics = ref({
  totalUpdates: 0,
  avgUpdateInterval: 100,
  lastContentLength: 0,
  updatePattern: 'regular' as 'regular' | 'burst' | 'slow'
})

// 计算自适应打字速度
const calculateAdaptiveSpeed = (newContentLength: number): number => {
  const now = Date.now()
  const timeSinceLastUpdate = now - lastUpdateTime.value

  if (lastUpdateTime.value === 0) {
    return props.minDisplayInterval
  }

  // 更新历史记录
  updateHistory.value.push({
    time: now,
    length: newContentLength
  })

  // 只保留最近10次更新的历史
  if (updateHistory.value.length > 10) {
    updateHistory.value = updateHistory.value.slice(-10)
  }

  // 计算平均更新间隔
  if (updateHistory.value.length >= 2) {
    const intervals = []
    for (let i = 1; i < updateHistory.value.length; i++) {
      intervals.push(updateHistory.value[i].time - updateHistory.value[i - 1].time)
    }
    streamMetrics.value.avgUpdateInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  }

  // 计算内容增量
  const contentDiff = newContentLength - streamMetrics.value.lastContentLength
  streamMetrics.value.lastContentLength = newContentLength

  // 根据流式数据速度调整打字速度
  let adaptiveSpeed: number

  if (props.syncMode === 'realtime') {
    // 实时模式：尽量跟上流式数据速度
    adaptiveSpeed = Math.max(timeSinceLastUpdate * 0.8, props.minDisplayInterval)
  } else if (props.syncMode === 'smooth') {
    // 平滑模式：基于平均间隔，但有缓冲
    adaptiveSpeed = Math.min(streamMetrics.value.avgUpdateInterval * 0.6, props.maxDisplayInterval)
  } else {
    // 突发模式：检测到突发更新时快速显示
    if (contentDiff > props.bufferSize * 2) {
      adaptiveSpeed = props.minDisplayInterval
    } else {
      adaptiveSpeed = Math.min(timeSinceLastUpdate * 0.5, props.maxDisplayInterval)
    }
  }

  adaptiveSpeed = Math.max(adaptiveSpeed, props.minDisplayInterval)
  adaptiveSpeed = Math.min(adaptiveSpeed, props.maxDisplayInterval)

  return Math.round(adaptiveSpeed)
}

// 处理内容更新
const processContentUpdate = (newContent: string) => {
  if (!newContent) {
    return
  }

  console.log('SyncTypewriter: Processing content update', {
    newLength: newContent.length,
    currentLength: displayedContent.value.length,
    pendingLength: pendingContent.value.length,
    isStreaming: props.isStreaming,
    syncMode: props.syncMode,
    hasNewContent: newContent !== pendingContent.value
  })

  // 如果内容没有变化，跳过处理
  if (newContent === pendingContent.value) {
    return
  }

  pendingContent.value = newContent

  const now = Date.now()
  const newSpeed = props.adaptiveTyping ?
    calculateAdaptiveSpeed(newContent.length) :
    props.minDisplayInterval

  currentTypingSpeed.value = newSpeed
  emit('typingSpeedChange', newSpeed)

  if (props.isStreaming) {
    // 流式传输中，启动或更新打字机效果
    if (!isActivelyTyping.value || displayedContent.value.length < newContent.length) {
      startSyncedTyping()
    }
  } else {
    // 流式传输完成，立即显示完整内容
    finishTyping()
  }

  lastUpdateTime.value = now
  streamMetrics.value.totalUpdates++
}

// 启动同步打字机效果
const startSyncedTyping = () => {
  if (!isActivelyTyping.value) {
    isActivelyTyping.value = true
    console.log('SyncTypewriter: Starting typing animation')
  }

  // 清除之前的定时器
  if (typingTimer.value) {
    clearTimeout(typingTimer.value)
    typingTimer.value = null
  }

  // 计算需要显示的内容
  const targetContent = pendingContent.value
  const currentContent = displayedContent.value

  console.log('SyncTypewriter: Typing step', {
    currentLength: currentContent.length,
    targetLength: targetContent.length,
    isStreaming: props.isStreaming
  })

  if (currentContent.length >= targetContent.length) {
    // 如果已显示完当前所有内容
    if (!props.isStreaming) {
      // 流式传输已完成，结束打字
      finishTyping()
    } else {
      // 仍在流式传输中，等待更多内容
      console.log('SyncTypewriter: Waiting for more stream data...')
    }
    return
  }

  // 确定这次要显示多少字符
  let charsToAdd = 1
  if (props.syncMode === 'burst') {
    charsToAdd = Math.min(props.bufferSize, targetContent.length - currentContent.length)
  } else if (props.syncMode === 'smooth') {
    // 根据内容更新速度决定每次显示的字符数
    const contentDiff = targetContent.length - currentContent.length
    if (contentDiff > props.bufferSize * 3) {
      charsToAdd = props.bufferSize
    } else if (contentDiff > props.bufferSize) {
      charsToAdd = 2
    } else {
      charsToAdd = 1
    }
  }

  // 更新显示内容
  const nextLength = Math.min(currentContent.length + charsToAdd, targetContent.length)
  const newDisplayContent = targetContent.substring(0, nextLength)

  if (newDisplayContent !== displayedContent.value) {
    displayedContent.value = newDisplayContent
    emit('contentUpdate', displayedContent.value)
    console.log('SyncTypewriter: Displayed content updated', {
      newLength: displayedContent.value.length,
      chars: charsToAdd
    })
  }

  // 如果还有未显示的内容或仍在流式传输，继续打字
  if (displayedContent.value.length < targetContent.length) {
    typingTimer.value = window.setTimeout(() => {
      startSyncedTyping()
    }, currentTypingSpeed.value)
  } else if (!props.isStreaming) {
    // 如果流式传输已完成且内容已全部显示，结束打字
    finishTyping()
  }
}

// 完成打字
const finishTyping = () => {
  if (typingTimer.value) {
    clearTimeout(typingTimer.value)
    typingTimer.value = null
  }

  isActivelyTyping.value = false
  displayedContent.value = pendingContent.value
  emit('contentUpdate', displayedContent.value)
  emit('complete')

  console.log('SyncTypewriter: Typing completed', {
    finalLength: displayedContent.value.length,
    totalUpdates: streamMetrics.value.totalUpdates,
    avgSpeed: currentTypingSpeed.value
  })
}

// 强制同步（立即显示所有内容）
const forceSync = () => {
  if (typingTimer.value) {
    clearTimeout(typingTimer.value)
    typingTimer.value = null
  }

  displayedContent.value = pendingContent.value
  isActivelyTyping.value = false
  emit('contentUpdate', displayedContent.value)
  emit('complete')
}

// 重置状态
const reset = () => {
  if (typingTimer.value) {
    clearTimeout(typingTimer.value)
    typingTimer.value = null
  }

  displayedContent.value = ''
  pendingContent.value = ''
  isActivelyTyping.value = false
  lastUpdateTime.value = 0
  updateHistory.value = []
  streamMetrics.value = {
    totalUpdates: 0,
    avgUpdateInterval: 100,
    lastContentLength: 0,
    updatePattern: 'regular'
  }
}

// 监听content属性变化
watch(
  () => props.content,
  (newContent, oldContent) => {
    console.log('SyncTypewriter: Content watch triggered', {
      oldLength: oldContent?.length || 0,
      newLength: newContent?.length || 0,
      isStreaming: props.isStreaming,
      diff: newContent?.length - (oldContent?.length || 0)
    })

    // 只有在内容真正发生变化时才处理
    if (newContent !== oldContent) {
      processContentUpdate(newContent)
    }
  },
  { immediate: true, flush: 'sync' }
)

// 监听streaming状态变化
watch(
  () => props.isStreaming,
  (newStreaming, oldStreaming) => {
    console.log('SyncTypewriter: Streaming status changed', {
      from: oldStreaming,
      to: newStreaming,
      contentLength: props.content.length
    })

    if (!newStreaming && oldStreaming) {
      // 流式传输结束，完成打字
      finishTyping()
    }
  }
)

// 组件挂载时初始化
onMounted(() => {
  console.log('SyncTypewriter: Component mounted', {
    initialContent: props.content.length,
    isStreaming: props.isStreaming,
    syncMode: props.syncMode
  })

  if (props.content) {
    if (props.isStreaming) {
      processContentUpdate(props.content)
    } else {
      displayedContent.value = props.content
      emit('complete')
    }
  }
})

// 组件卸载时清理
onUnmounted(() => {
  if (typingTimer.value) {
    clearTimeout(typingTimer.value)
  }
})

// 暴露方法给父组件
defineExpose({
  forceSync,
  reset,
  isTyping: () => isActivelyTyping.value,
  getCurrentContent: () => displayedContent.value,
  getTypingSpeed: () => currentTypingSpeed.value,
  getStreamMetrics: () => ({ ...streamMetrics.value })
})
</script>

<style scoped>
.sync-typewriter-container {
  position: relative;
  display: inline-block;
  width: 100%;
}

.typewriter-cursor {
  display: inline-block;
  color: var(--theme-text, #333);
  font-weight: normal;
  margin-left: 2px;
  animation: none;
  transition: opacity 0.1s ease;
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
.sync-typewriter-container :deep(.markdown-content) {
  display: inline;
}

/* 适配不同主题 */
@media (prefers-color-scheme: dark) {
  .typewriter-cursor {
    color: var(--theme-text, #fff);
  }
}

/* 打字过程中的微动画效果 */
.sync-typewriter-container :deep(.markdown-content) {
  transition: none;
}

/* 流式打字时的特殊样式 */
.sync-typewriter-container.typing :deep(.markdown-content) {
  position: relative;
}

.sync-typewriter-container.typing :deep(.markdown-content):after {
  content: '';
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: transparent;
}
</style>