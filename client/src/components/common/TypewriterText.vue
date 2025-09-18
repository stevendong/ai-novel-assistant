<template>
  <div class="typewriter-container">
    <MarkdownRenderer
      :content="displayedContent"
      :enable-highlight="enableHighlight"
      :enable-tables="enableTables"
      :enable-task-lists="enableTaskLists"
    />
    <span
      v-if="isTyping && showCursor"
      class="typewriter-cursor"
      :class="{ 'cursor-blink': !isTyping }"
    >|</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import MarkdownRenderer from './MarkdownRenderer.vue'

interface Props {
  content: string
  speed?: number
  enableHighlight?: boolean
  enableTables?: boolean
  enableTaskLists?: boolean
  showCursor?: boolean
  autoStart?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  speed: 30,
  enableHighlight: true,
  enableTables: true,
  enableTaskLists: true,
  showCursor: true,
  autoStart: true
})

const emit = defineEmits<{
  complete: []
  typing: [progress: number]
}>()

const displayedContent = ref('')
const isTyping = ref(false)
const currentIndex = ref(0)
const animationId = ref<number | null>(null)
const lastUpdateTime = ref(0)

const startTyping = () => {
  if (isTyping.value || !props.content) return

  isTyping.value = true
  currentIndex.value = 0
  displayedContent.value = ''
  lastUpdateTime.value = performance.now()

  nextTick(() => {
    typeNextCharacter()
  })
}

const typeNextCharacter = () => {
  const now = performance.now()
  const elapsed = now - lastUpdateTime.value

  if (elapsed >= props.speed) {
    if (currentIndex.value < props.content.length) {
      displayedContent.value = props.content.slice(0, currentIndex.value + 1)
      currentIndex.value++
      lastUpdateTime.value = now

      // 发出进度事件
      emit('typing', currentIndex.value / props.content.length)
    } else {
      // 打字完成
      isTyping.value = false
      emit('complete')
      return
    }
  }

  animationId.value = requestAnimationFrame(typeNextCharacter)
}

const stopTyping = () => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
    animationId.value = null
  }
  isTyping.value = false
  displayedContent.value = props.content
  emit('complete')
}

const resetTyping = () => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
    animationId.value = null
  }
  isTyping.value = false
  currentIndex.value = 0
  displayedContent.value = ''
}

// 监听内容变化
watch(
  () => props.content,
  (newContent) => {
    if (newContent && props.autoStart) {
      resetTyping()
      nextTick(() => {
        startTyping()
      })
    } else if (!newContent) {
      resetTyping()
    }
  },
  { immediate: true }
)

// 组件挂载时开始打字
onMounted(() => {
  if (props.content && props.autoStart) {
    startTyping()
  }
})

// 组件卸载时清理
onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
})

// 暴露方法给父组件
defineExpose({
  startTyping,
  stopTyping,
  resetTyping,
  isTyping: () => isTyping.value
})
</script>

<style scoped>
.typewriter-container {
  position: relative;
  display: inline-block;
  width: 100%;
}

.typewriter-cursor {
  display: inline-block;
  color: var(--theme-text);
  font-weight: normal;
  animation: blink 1s infinite;
  margin-left: 2px;
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
.typewriter-container :deep(.markdown-content) {
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