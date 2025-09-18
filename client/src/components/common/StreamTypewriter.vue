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
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false,
  enableHighlight: true,
  enableTables: true,
  enableTaskLists: true,
  showCursor: true,
  showPersistentCursor: false,
  maxDelay: 50 // 最大50ms延迟，确保用户能看到流式效果
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

// 更新显示内容的函数
const updateDisplayedContent = () => {
  if (pendingContent.value !== displayedContent.value) {
    displayedContent.value = pendingContent.value
    emit('contentUpdate', displayedContent.value)
  }
  updateTimer.value = null
}

// 处理内容变化
const handleContentChange = (newContent: string) => {
  const now = Date.now()
  pendingContent.value = newContent
  isStreaming.value = props.isStreaming

  // 如果内容没有变化，不需要更新
  if (newContent === displayedContent.value) {
    return
  }

  // 如果正在流式传输，应用适当的延迟来创建平滑的打字效果
  if (props.isStreaming) {
    const timeSinceLastUpdate = now - lastUpdateTime.value
    const delay = Math.max(0, Math.min(props.maxDelay, props.maxDelay - timeSinceLastUpdate))

    if (updateTimer.value) {
      clearTimeout(updateTimer.value)
    }

    updateTimer.value = window.setTimeout(() => {
      updateDisplayedContent()
      lastUpdateTime.value = Date.now()
    }, delay)
  } else {
    // 流式传输完成，立即显示完整内容
    if (updateTimer.value) {
      clearTimeout(updateTimer.value)
    }
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