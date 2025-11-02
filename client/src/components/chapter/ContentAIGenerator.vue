<template>
  <div class="content-ai-generator">
    <!-- 操作按钮区域 -->
    <div class="generator-actions">
      <a-space :size="8" wrap>
        <a-button
          type="primary"
          size="small"
          @click="handleGenerate"
          :loading="generating"
          :disabled="!canGenerate"
        >
          <template #icon><ThunderboltOutlined /></template>
          AI生成正文
        </a-button>

        <a-button
          v-if="hasExistingContent"
          type="default"
          size="small"
          @click="handleContinue"
          :loading="generating"
          :disabled="!canGenerate"
        >
          <template #icon><ForwardOutlined /></template>
          续写内容
        </a-button>

        <a-dropdown>
          <a-button size="small">
            <template #icon><SettingOutlined /></template>
            选项
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item key="options" @click="showOptionsModal = true">
                <SettingOutlined />
                生成设置
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="clear" danger @click="handleClear" :disabled="!hasExistingContent">
                <ClearOutlined />
                清空内容
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-space>
    </div>

    <!-- 生成状态提示 -->
    <div v-if="generating" class="generating-indicator">
      <div class="indicator-header">
        <div class="spinner-wrapper">
          <div class="custom-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-core">
              <ThunderboltOutlined class="spinner-icon" />
            </div>
          </div>
        </div>
        <div class="status-text">
          <span class="generating-title">AI创作中</span>
          <span class="generating-subtitle">{{ generatingText }}</span>
        </div>
        <div class="progress-percentage">{{ progress }}%</div>
        <a-button
          type="default"
          size="small"
          danger
          @click="handleCancel"
          class="cancel-button"
        >
          <template #icon><CloseCircleOutlined /></template>
          取消
        </a-button>
      </div>

      <!-- 自定义进度条 -->
      <div class="custom-progress-bar">
        <div class="progress-track">
          <div
            class="progress-fill"
            :style="{ width: `${progress}%` }"
          >
            <div class="progress-shimmer"></div>
          </div>
        </div>
        <div class="progress-milestones">
          <div
            v-for="milestone in milestones"
            :key="milestone.value"
            class="milestone"
            :class="{
              active: progress >= milestone.value,
              current: progress >= milestone.value && progress < milestone.value + 20
            }"
            :style="{ left: `${milestone.value}%` }"
          >
            <div class="milestone-dot"></div>
            <div class="milestone-label">{{ milestone.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 生成选项Modal -->
    <a-modal
      v-model:open="showOptionsModal"
      title="生成设置"
      @ok="showOptionsModal = false"
      width="480px"
    >
      <a-form layout="vertical">
        <a-form-item label="生成长度">
          <a-input-number
            v-model:value="options.targetLength"
            :min="200"
            :max="10000"
            :step="100"
            style="width: 100%"
            placeholder="目标字数"
          >
            <template #addonAfter>字</template>
          </a-input-number>
          <div class="form-help-text">建议单次生成1000-3000字</div>
        </a-form-item>

        <a-form-item label="写作风格">
          <a-select v-model:value="options.style">
            <a-select-option value="modern">现代小说体</a-select-option>
            <a-select-option value="traditional">传统章回体</a-select-option>
            <a-select-option value="cinematic">电影式叙述</a-select-option>
            <a-select-option value="poetic">诗意抒情</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="内容侧重">
          <a-checkbox-group v-model:value="options.focus">
            <a-space direction="vertical">
              <a-checkbox value="dialogue">对话交流</a-checkbox>
              <a-checkbox value="description">环境描写</a-checkbox>
              <a-checkbox value="action">动作场景</a-checkbox>
              <a-checkbox value="emotion">情感细腻</a-checkbox>
            </a-space>
          </a-checkbox-group>
        </a-form-item>

        <a-form-item label="生成模式">
          <a-radio-group v-model:value="options.mode">
            <a-space direction="vertical">
              <a-radio value="outline">严格遵循大纲</a-radio>
              <a-radio value="creative">创意发挥</a-radio>
              <a-radio value="balanced">平衡模式</a-radio>
            </a-space>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  ThunderboltOutlined,
  ForwardOutlined,
  SettingOutlined,
  ClearOutlined,
  CloseCircleOutlined
} from '@ant-design/icons-vue'
import { aiService, type StreamChunk } from '@/services/aiService'

interface Props {
  novelId: string
  chapterId: string
  outline?: string
  existingContent?: string
  targetWordCount?: number
  characters?: any[]
  settings?: any[]
}

interface GenerateOptions {
  targetLength: number
  style: 'modern' | 'traditional' | 'cinematic' | 'poetic'
  focus: string[]
  mode: 'outline' | 'creative' | 'balanced'
}

const props = withDefaults(defineProps<Props>(), {
  outline: '',
  existingContent: '',
  targetWordCount: 2000,
  characters: () => [],
  settings: () => []
})

const emit = defineEmits<{
  'update:content': [text: string]
  'generated': [content: string]
  'cleared': []
}>()

// 状态
const generating = ref(false)
const generatingText = ref('AI正在准备创作...')
const progress = ref(0)
const showOptionsModal = ref(false)
const abortController = ref<AbortController | null>(null)
const isCancelled = ref(false)

const options = ref<GenerateOptions>({
  targetLength: props.targetWordCount || 2000,
  style: 'modern',
  focus: ['dialogue', 'description'],
  mode: 'balanced'
})

const htmlEntityDecoder = (() => {
  if (typeof window === 'undefined') {
    return (input: string) =>
      input
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
  }
  const textarea = document.createElement('textarea')
  return (input: string) => {
    textarea.innerHTML = input
    return textarea.value
  }
})()

const escapeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const htmlToPlainText = (html: string): string => {
  if (!html) return ''
  let text = html
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')

  text = htmlEntityDecoder(text)
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

const plainTextToHtml = (text: string): string => {
  const normalized = text.replace(/\r\n/g, '\n')
  if (!normalized.trim()) {
    return ''
  }

  const lines = normalized.split('\n')
  const paragraphs: string[] = []
  let buffer: string[] = []

  const flushParagraph = () => {
    if (buffer.length === 0) {
      return
    }
    const content = buffer.map(line => escapeHtml(line)).join('<br />')
    paragraphs.push(`<p>${content}</p>`)
    buffer = []
  }

  for (const line of lines) {
    if (line.trim() === '') {
      flushParagraph()
      continue
    }
    const sanitizedLine = line.replace(/\s+$/u, '')
    buffer.push(sanitizedLine)
  }

  flushParagraph()

  if (paragraphs.length === 0) {
    paragraphs.push('<p></p>')
  }

  return paragraphs.join('')
}

const emitContentUpdate = (text: string) => {
  emit('update:content', plainTextToHtml(text))
}

const getExistingContentPlain = () => htmlToPlainText(props.existingContent || '')

const TYPEWRITER_DELAY = 16
const TYPEWRITER_BATCH_SIZE = 4
let typewriterQueue: string[] = []
let typewriterTimer: ReturnType<typeof setTimeout> | null = null
let typewriterActive = false
let typewriterCancelled = false
let currentTypewriterContent = getExistingContentPlain()
let typewriterFlushResolver: (() => void) | null = null
let rawAggregatedContent = ''

const resolveTypewriterFlush = () => {
  if (typewriterFlushResolver) {
    typewriterFlushResolver()
    typewriterFlushResolver = null
  }
}

const runTypewriter = () => {
  if (typewriterCancelled) {
    typewriterActive = false
    typewriterQueue = []
    if (typewriterTimer) {
      clearTimeout(typewriterTimer)
      typewriterTimer = null
    }
    resolveTypewriterFlush()
    return
  }

  if (typewriterQueue.length === 0) {
    typewriterActive = false
    if (typewriterTimer) {
      clearTimeout(typewriterTimer)
      typewriterTimer = null
    }
    resolveTypewriterFlush()
    return
  }

  const batch = typewriterQueue.splice(0, TYPEWRITER_BATCH_SIZE).join('')
  currentTypewriterContent += batch
  emitContentUpdate(currentTypewriterContent)
  typewriterTimer = setTimeout(runTypewriter, TYPEWRITER_DELAY)
}

const enqueueTypewriterText = (text: string) => {
  if (!text) return
  typewriterQueue.push(...Array.from(text))
  if (!typewriterActive) {
    typewriterActive = true
    runTypewriter()
  }
}

const resetTypewriter = (initial = '') => {
  if (typewriterTimer) {
    clearTimeout(typewriterTimer)
    typewriterTimer = null
  }
  typewriterQueue = []
  typewriterActive = false
  typewriterCancelled = false
  currentTypewriterContent = initial
  emitContentUpdate(initial)
}

const waitForTypewriterFlush = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!typewriterActive && typewriterQueue.length === 0) {
      resolve()
    } else {
      typewriterFlushResolver = resolve
    }
  })
}

const cancelTypewriter = () => {
  typewriterCancelled = true
  typewriterQueue = []
  if (typewriterTimer) {
    clearTimeout(typewriterTimer)
    typewriterTimer = null
  }
  typewriterActive = false
  resolveTypewriterFlush()
}

const formatGeneratedContent = (content: string, finalize = true): string => {
  if (!content) return ''

  let normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/```(?:markdown|text)?\n?/g, '')
    .replace(/```/g, '')
    .replace(/^(以下是|这是|正文内容如下)[：:]\s*/gm, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/[ \t]+\n/g, '\n')

  if (finalize) {
    normalized = normalized.replace(/\n{3,}/g, '\n\n').trim()
  }

  const lines = normalized.split('\n')
  const formattedLines = lines.map((line) => line.trim())

  let formatted = formattedLines.join('\n')

  if (finalize) {
    formatted = formatted.trimEnd()
  }

  return formatted
}

const computeSeparator = (content: string): string => {
  if (!content || !content.trim()) {
    return ''
  }

  if (content.endsWith('\n\n')) {
    return ''
  }

  if (content.endsWith('\n')) {
    return '\n'
  }

  return '\n\n'
}

const combineContent = (existing: string, separator: string, generated: string): string => {
  if (!existing || !existing.trim()) {
    return generated
  }

  return `${existing}${separator}${generated}`
}

// 进度条里程碑
const milestones = ref([
  { value: 0, label: '开始' },
  { value: 20, label: '分析' },
  { value: 60, label: '创作' },
  { value: 90, label: '完成' }
])

// 计算属性
const canGenerate = computed(() => {
  return props.novelId && props.chapterId
})

const hasExistingContent = computed(() => {
  return getExistingContentPlain().trim().length > 0
})

// AI生成正文
const handleGenerate = async () => {
  if (!canGenerate.value) {
    message.warning('缺少必要信息，无法生成内容')
    return
  }

  // 如果已有内容，确认是否覆盖
  if (hasExistingContent.value) {
    Modal.confirm({
      title: '确认生成新内容？',
      content: '当前已有内容，生成新内容将覆盖现有内容，是否继续？',
      okText: '确定',
      cancelText: '取消',
      onOk() {
        performGenerate(false)
      }
    })
  } else {
    await performGenerate(false)
  }
}

// 续写内容
const handleContinue = async () => {
  if (!canGenerate.value) {
    message.warning('缺少必要信息，无法续写内容')
    return
  }

  await performGenerate(true)
}

// 执行生成
const performGenerate = async (isContinue: boolean) => {
  const existingSnapshot = getExistingContentPlain()
  const separator = isContinue ? computeSeparator(existingSnapshot) : ''
  let streamError: string | null = null

  try {
    generating.value = true
    isCancelled.value = false
    progress.value = 5
    generatingText.value = 'AI正在分析章节信息...'

    cancelTypewriter()
    abortController.value?.abort()

    const baseContent = isContinue ? existingSnapshot + separator : ''
    resetTypewriter(baseContent)
    rawAggregatedContent = ''

    abortController.value = new AbortController()

    const params = {
      novelId: props.novelId,
      chapterId: props.chapterId,
      outline: props.outline,
      existingContent: isContinue ? existingSnapshot : '',
      targetLength: options.value.targetLength,
      style: options.value.style,
      characters: props.characters || [],
      settings: props.settings || [],
      signal: abortController.value.signal
    }

    await aiService.generateContentStream(params, (chunk: StreamChunk) => {
      switch (chunk.type) {
        case 'connected':
          progress.value = Math.max(progress.value, 10)
          generatingText.value = 'AI创作已连接...'
          break
        case 'chunk':
          if (!chunk.content) break
          rawAggregatedContent += chunk.content
          const formattedPartial = formatGeneratedContent(rawAggregatedContent, false)
          const targetContent = isContinue
            ? combineContent(existingSnapshot, separator, formattedPartial)
            : formattedPartial

          const currentDisplayed = currentTypewriterContent + typewriterQueue.join('')

          if (targetContent.startsWith(currentDisplayed)) {
            const delta = targetContent.slice(currentDisplayed.length)
            if (delta) {
              enqueueTypewriterText(delta)
              progress.value = Math.min(
                progress.value + Math.max(Math.floor(delta.length / 10), 1),
                85
              )
            }
          } else {
            resetTypewriter(targetContent)
          }

          generatingText.value = '正在生成文字...'
          break
        case 'finish':
          progress.value = Math.max(progress.value, 90)
          generatingText.value = '正在整理内容...'
          break
        case 'done':
          progress.value = Math.max(progress.value, 95)
          break
        case 'error':
          if (chunk.reason === 'abort') {
            isCancelled.value = true
          } else {
            streamError = chunk.message || '流式生成失败，请稍后重试'
          }
          break
      }
    })

    await waitForTypewriterFlush()

    if (isCancelled.value) {
      const fallback = isContinue ? existingSnapshot : ''
      currentTypewriterContent = fallback
      emitContentUpdate(fallback)
      message.info('内容生成已取消')
      return
    }

    if (streamError) {
      throw new Error(streamError)
    }

    progress.value = 100
    generatingText.value = '正在完成...'

    const formatted = formatGeneratedContent(rawAggregatedContent, true)

    if (!formatted) {
      throw new Error('生成的内容为空')
    }

    const finalContent = isContinue
      ? combineContent(existingSnapshot, separator, formatted)
      : formatted

    const currentDisplayed = currentTypewriterContent + typewriterQueue.join('')

    if (finalContent.startsWith(currentDisplayed)) {
      const delta = finalContent.slice(currentDisplayed.length)
      if (delta) {
        enqueueTypewriterText(delta)
        await waitForTypewriterFlush()
      }
    }

    currentTypewriterContent = finalContent
    emitContentUpdate(finalContent)
    emit('generated', plainTextToHtml(finalContent))

    message.success(`内容${isContinue ? '续写' : '生成'}成功！`)
  } catch (error: any) {
    if (error?.name === 'AbortError' || isCancelled.value) {
      message.info('内容生成已取消')
    } else {
      console.error('Failed to generate content:', error)
      message.error(`内容${isContinue ? '续写' : '生成'}失败，请重试`)
      const fallback = isContinue ? existingSnapshot : ''
      currentTypewriterContent = fallback
      emitContentUpdate(fallback)
    }
  } finally {
    abortController.value = null
    typewriterQueue = []
    if (typewriterTimer) {
      clearTimeout(typewriterTimer)
      typewriterTimer = null
    }
    typewriterActive = false
    typewriterCancelled = false
    typewriterFlushResolver = null
    rawAggregatedContent = ''
    generating.value = false
    progress.value = 0
    generatingText.value = 'AI正在准备创作...'
    isCancelled.value = false
  }
}

const handleCancel = () => {
  if (abortController.value) {
    abortController.value.abort()
  }
  isCancelled.value = true
  generatingText.value = '正在取消...'
  cancelTypewriter()
  rawAggregatedContent = ''
}

// 清空内容
const handleClear = () => {
  Modal.confirm({
    title: '确认清空内容？',
    content: '此操作将清空当前正文内容，是否继续？',
    okText: '确定',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      emitContentUpdate('')
      emit('cleared')
      message.success('内容已清空')
    }
  })
}

defineExpose({
  generate: handleGenerate,
  continue: handleContinue,
  clear: handleClear,
  cancel: handleCancel
})
</script>

<style scoped>
.content-ai-generator {
  width: 100%;
}

.generator-actions {
  margin-bottom: 12px;
}

/* 生成状态指示器 */
.generating-indicator {
  position: relative;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  margin-bottom: 16px;
  overflow: hidden;
  box-shadow:
    0 8px 24px rgba(102, 126, 234, 0.25),
    0 4px 12px rgba(118, 75, 162, 0.2);
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow:
      0 8px 24px rgba(102, 126, 234, 0.25),
      0 4px 12px rgba(118, 75, 162, 0.2);
  }
  50% {
    box-shadow:
      0 12px 32px rgba(102, 126, 234, 0.4),
      0 6px 16px rgba(118, 75, 162, 0.35);
  }
}

/* 背景装饰 */
.generating-indicator::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  animation: rotate-background 15s linear infinite;
  pointer-events: none;
}

@keyframes rotate-background {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 指示器头部 */
.indicator-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

/* 自定义Spinner */
.spinner-wrapper {
  flex-shrink: 0;
}

.custom-spinner {
  position: relative;
  width: 48px;
  height: 48px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse-core 2s ease-in-out infinite;
}

@keyframes pulse-core {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
  }
}

.spinner-icon {
  font-size: 16px;
  color: white;
  animation: flash 1.5s ease-in-out infinite;
}

@keyframes flash {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 状态文字 */
.status-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.generating-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.generating-subtitle {
  font-size: 13px;
  opacity: 0.9;
  font-weight: 400;
}

/* 进度百分比 */
.progress-percentage {
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  min-width: 60px;
  text-align: right;
}

.cancel-button {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.cancel-button:hover {
  background: rgba(255, 77, 79, 0.9) !important;
  border-color: rgba(255, 77, 79, 1) !important;
  color: white !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.4);
}

.cancel-button:active {
  transform: translateY(0);
}

/* 自定义进度条 */
.custom-progress-bar {
  position: relative;
  z-index: 1;
}

.progress-track {
  position: relative;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 100px;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #ffffff 0%, #f0f0f0 100%);
  border-radius: 100px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow:
    0 0 12px rgba(255, 255, 255, 0.6),
    inset 0 1px 2px rgba(255, 255, 255, 0.8);
}

/* 进度条光效 */
.progress-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.6) 50%,
    transparent 100%
  );
  animation: shimmer 2s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 200%;
  }
}

/* 里程碑 */
.progress-milestones {
  position: relative;
  height: 40px;
  margin-top: 8px;
}

.milestone {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.milestone-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.5);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.milestone.active .milestone-dot {
  background: white;
  border-color: white;
  box-shadow:
    0 0 8px rgba(255, 255, 255, 0.8),
    0 0 16px rgba(255, 255, 255, 0.4);
}

.milestone.current .milestone-dot {
  animation: milestone-pulse 1s ease-in-out infinite;
  transform: scale(1.3);
}

@keyframes milestone-pulse {
  0%, 100% {
    box-shadow:
      0 0 8px rgba(255, 255, 255, 0.8),
      0 0 16px rgba(255, 255, 255, 0.4);
  }
  50% {
    box-shadow:
      0 0 12px rgba(255, 255, 255, 1),
      0 0 24px rgba(255, 255, 255, 0.6);
  }
}

.milestone-label {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.7;
  white-space: nowrap;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.milestone.active .milestone-label {
  opacity: 1;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.milestone.current .milestone-label {
  transform: translateY(-2px);
}

.form-help-text {
  font-size: 12px;
  color: var(--theme-text-secondary);
  margin-top: 4px;
}

/* 暗色主题支持 */
:deep(.dark) .generating-indicator {
  background: linear-gradient(135deg, #4c5fd5 0%, #6a3fa0 100%);
}

:deep(.dark) .progress-fill {
  background: linear-gradient(90deg, #a0b0ff 0%, #c0c8ff 100%);
}
</style>
