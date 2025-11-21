<template>
  <div class="outline-ai-generator">
    <!-- 操作按钮区域 -->
    <div class="generator-actions">
      <a-button
        type="link"
        size="small"
        @click="handleGenerate"
        :loading="generating"
        :disabled="!canGenerate"
      >
        <template #icon><BulbOutlined /></template>
        {{ t('chapterEditor.outline.actions.generate') }}
      </a-button>

      <a-button
        v-if="hasContent && !generating"
        type="link"
        size="small"
        danger
        @click="handleClear"
      >
        <template #icon><ClearOutlined /></template>
        {{ t('chapterEditor.outline.actions.clear') }}
      </a-button>

      <a-tooltip v-if="!canGenerate" :title="t('chapterEditor.outline.hints.needTitle')">
        <QuestionCircleOutlined class="help-icon" />
      </a-tooltip>
    </div>

    <!-- 生成状态提示 -->
    <div v-if="generating" class="generating-indicator">
      <div class="indicator-header">
        <div class="status-icon">
          <BulbOutlined />
        </div>
        <div class="status-text">
          <span class="generating-title">{{ t('chapterEditor.outline.progress.title') }}</span>
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
          {{ t('chapterEditor.outline.actions.cancel') }}
        </a-button>
      </div>

      <div class="custom-progress-bar">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${progress}%` }">
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
              current: progress >= milestone.value && progress < milestone.value + 25
            }"
            :style="{ left: `${milestone.value}%` }"
          >
            <div class="milestone-dot"></div>
            <div class="milestone-label">{{ milestone.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 生成选项（可展开） -->
    <div v-if="showOptions" class="generator-options">
      <a-collapse v-model:activeKey="activeOptionsKey" ghost>
        <a-collapse-panel key="options" :header="t('chapterEditor.outline.options.title')">
          <a-form layout="vertical" size="small">
            <a-form-item :label="t('chapterEditor.outline.options.styleLabel')">
              <a-select v-model:value="options.style" size="small">
                <a-select-option value="standard">{{ t('chapterEditor.outline.options.style.standard') }}</a-select-option>
                <a-select-option value="detailed">{{ t('chapterEditor.outline.options.style.detailed') }}</a-select-option>
                <a-select-option value="brief">{{ t('chapterEditor.outline.options.style.brief') }}</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item :label="t('chapterEditor.outline.options.focusLabel')">
              <a-checkbox-group v-model:value="options.focus">
                <a-checkbox value="plot">{{ t('chapterEditor.outline.options.focus.plot') }}</a-checkbox>
                <a-checkbox value="character">{{ t('chapterEditor.outline.options.focus.character') }}</a-checkbox>
                <a-checkbox value="emotion">{{ t('chapterEditor.outline.options.focus.emotion') }}</a-checkbox>
                <a-checkbox value="world">{{ t('chapterEditor.outline.options.focus.world') }}</a-checkbox>
              </a-checkbox-group>
            </a-form-item>
          </a-form>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  BulbOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons-vue'
import { aiService, type ChapterOutlineData, type StreamChunk } from '@/services/aiService'
import { useI18n } from 'vue-i18n'

interface Props {
  novelId: string
  chapterId?: string
  chapterNumber: number
  chapterTitle: string
  existingOutline?: string
  characters?: any[]
  settings?: any[]
  targetWordCount?: number
  previousChapterSummary?: string
  nextChapterPlan?: string
  showOptions?: boolean
  typewriterSpeed?: 'slow' | 'medium' | 'fast'
}

interface GenerateOptions {
  style: 'standard' | 'detailed' | 'brief'
  focus: string[]
}

const props = withDefaults(defineProps<Props>(), {
  chapterId: '',
  existingOutline: '',
  characters: () => [],
  settings: () => [],
  targetWordCount: 2000,
  previousChapterSummary: '',
  nextChapterPlan: '',
  showOptions: false,
  typewriterSpeed: 'medium'
})

const emit = defineEmits<{
  'update:outline': [text: string]
  'update:plotPoints': [points: any[]]
  'generated': [data: ChapterOutlineData]
  'cleared': []
}>()

// 状态
const generating = ref(false)
const progress = ref(0)
const generatingStatus = ref<'preparing' | 'analyzing' | 'connected' | 'drafting' | 'structuring' | 'finalizing' | 'presenting' | 'cancelling'>('preparing')
const abortController = ref<AbortController | null>(null)
const isCancelled = ref(false)
const { t } = useI18n()
const generatingText = computed(() => t(`chapterEditor.outline.progress.status.${generatingStatus.value}`))
const activeOptionsKey = ref<string[]>([])
const options = ref<GenerateOptions>({
  style: 'standard',
  focus: ['plot', 'character']
})
const milestones = computed(() => ([
  { value: 0, label: t('chapterEditor.outline.progress.milestones.start') },
  { value: 25, label: t('chapterEditor.outline.progress.milestones.analysis') },
  { value: 60, label: t('chapterEditor.outline.progress.milestones.structure') },
  { value: 90, label: t('chapterEditor.outline.progress.milestones.finalize') }
]))

// 计算属性
const canGenerate = computed(() => {
  return props.chapterTitle && props.chapterTitle.trim().length > 0
})

const hasContent = computed(() => {
  return props.existingOutline && props.existingOutline.trim().length > 0
})

// 打字机速度配置
const getTypewriterDelay = () => {
  const speeds = {
    slow: 50,
    medium: 30,
    fast: 15
  }
  return speeds[props.typewriterSpeed]
}

let typewriterCancelled = false
let typewriterTimer: ReturnType<typeof setTimeout> | null = null
let typewriterResolve: (() => void) | null = null

const cancelTypewriterEffect = () => {
  typewriterCancelled = true
  if (typewriterTimer) {
    clearTimeout(typewriterTimer)
    typewriterTimer = null
  }
  if (typewriterResolve) {
    typewriterResolve()
    typewriterResolve = null
  }
}

const typewriterEffect = async (text: string): Promise<void> => {
  cancelTypewriterEffect()
  typewriterCancelled = false
  emit('update:outline', '')

  if (!text) {
    return
  }

  const chars = Array.from(text)
  const delayPerChar = getTypewriterDelay()
  const maxDuration = 6000
  const effectiveDelay = chars.length > 0
    ? Math.min(delayPerChar, maxDuration / chars.length)
    : delayPerChar

  let currentText = ''

  for (let i = 0; i < chars.length; i++) {
    if (typewriterCancelled) break

    currentText += chars[i]
    emit('update:outline', currentText)

    if (i % 5 === 0) {
      await new Promise<void>((resolve) => {
        typewriterResolve = resolve
        typewriterTimer = setTimeout(() => {
          typewriterTimer = null
          typewriterResolve = null
          resolve()
        }, effectiveDelay)
      })

      if (typewriterCancelled) {
        break
      }
    }
  }

  if (!typewriterCancelled) {
    emit('update:outline', currentText)
  }

  if (typewriterTimer) {
    clearTimeout(typewriterTimer)
    typewriterTimer = null
  }
  if (typewriterResolve) {
    typewriterResolve()
    typewriterResolve = null
  }
}

const formatOutlineContent = (content: string, finalize = true): string => {
  if (!content) return ''

  let normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/```(?:json|markdown|text)?\n?/gi, '')
    .replace(/```/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/[ \t]+\n/g, '\n')

  if (finalize) {
    normalized = normalized.replace(/\n{3,}/g, '\n\n').trim()
  }

  return normalized
}

const performGenerate = async () => {
  const existingSnapshot = props.existingOutline || ''
  let rawAggregatedContent = ''
  let streamError: string | null = null

  try {
    generating.value = true
    isCancelled.value = false
    progress.value = 5
    generatingStatus.value = 'analyzing'

    cancelTypewriterEffect()
    abortController.value?.abort()

    abortController.value = new AbortController()

    await aiService.generateChapterOutlineStream(
      {
        novelId: props.novelId,
        chapterId: props.chapterId || '',
        chapterNumber: props.chapterNumber,
        chapterTitle: props.chapterTitle,
        existingOutline: props.existingOutline,
        characters: props.characters || [],
        settings: props.settings || [],
        targetWords: props.targetWordCount || 2000,
        previousChapterSummary: props.previousChapterSummary,
        nextChapterPlan: props.nextChapterPlan,
        signal: abortController.value.signal
      },
      (chunk: StreamChunk) => {
        switch (chunk.type) {
          case 'connected':
            progress.value = Math.max(progress.value, 10)
            generatingStatus.value = 'connected'
            break
          case 'chunk':
            if (chunk.content) {
              rawAggregatedContent += chunk.content
              const increment = Math.max(Math.floor(chunk.content.length / 20), 1)
              progress.value = Math.min(progress.value + increment, 85)
            }
            generatingStatus.value = 'drafting'
            break
          case 'finish':
            progress.value = Math.max(progress.value, 92)
            generatingStatus.value = 'structuring'
            break
          case 'done':
            progress.value = Math.max(progress.value, 96)
            break
          case 'error':
            if (chunk.reason === 'abort') {
              isCancelled.value = true
            } else {
              streamError = chunk.message || t('chapterEditor.outline.messages.streamFailed')
            }
            break
        }
      }
    )

    if (isCancelled.value) {
      emit('update:outline', existingSnapshot)
      message.info(t('chapterEditor.outline.messages.cancelled'))
      return
    }

    if (streamError) {
      throw new Error(streamError)
    }

    const formatted = formatOutlineContent(rawAggregatedContent, true)

    if (!formatted) {
      throw new Error(t('chapterEditor.outline.messages.emptyResult'))
    }

    const outlineData = aiService.parseChapterOutlineResponse(
      formatted,
      props.chapterNumber,
      props.chapterTitle,
      props.targetWordCount || 2000
    )

    generatingStatus.value = 'finalizing'
    progress.value = 100

    const outlineText = buildOutlineText(outlineData, options.value.style)

    generatingStatus.value = 'presenting'
    await typewriterEffect(outlineText)

    if (outlineData.plotPoints && outlineData.plotPoints.length > 0) {
      const plotPoints = outlineData.plotPoints.map(p => ({
        type: p.type,
        description: p.description
      }))
      emit('update:plotPoints', plotPoints)
    }

    emit('generated', outlineData)

    message.success(t('chapterEditor.outline.messages.success'))
  } catch (error: any) {
    if (error?.name === 'AbortError' || isCancelled.value) {
      emit('update:outline', existingSnapshot)
      message.info(t('chapterEditor.outline.messages.cancelled'))
    } else {
      console.error('Failed to generate outline:', error)
      message.error(streamError || t('chapterEditor.outline.messages.failed'))
      emit('update:outline', existingSnapshot)
    }
  } finally {
    abortController.value = null
    generating.value = false
    progress.value = 0
    generatingStatus.value = 'preparing'
    isCancelled.value = false
    rawAggregatedContent = ''
    cancelTypewriterEffect()
  }
}

// AI生成大纲
const handleGenerate = async () => {
  if (!canGenerate.value) {
    message.warning(t('chapterEditor.outline.messages.needTitle'))
    return
  }

  await performGenerate()
}

// 构建大纲文本
const buildOutlineText = (result: ChapterOutlineData, style: string): string => {
  let text = ''

  // 概述
  if (result.summary) {
    text += `${result.summary}\n\n`
  }

  // 根据风格决定详细程度
  if (style === 'brief') {
    // 简要版 - 只显示关键要点
    if (result.keyPoints && result.keyPoints.length > 0) {
      text += `${t('chapterEditor.outline.sections.keyPoints')}\n`
      result.keyPoints.forEach((point, index) => {
        text += `${index + 1}. ${point}\n`
      })
    }
  } else if (style === 'detailed') {
    // 详细版 - 显示所有信息
    if (result.contentStructure && result.contentStructure.length > 0) {
      text += `${t('chapterEditor.outline.sections.contentStructure')}\n`
      result.contentStructure.forEach((section, index) => {
        const approx = section.estimatedWords
          ? t('chapterEditor.outline.text.approxWords', { words: section.estimatedWords })
          : ''
        text += `${index + 1}. ${section.title}${approx}\n`
        text += `   ${section.description}\n\n`
      })
    }

    if (result.keyPoints && result.keyPoints.length > 0) {
      text += `${t('chapterEditor.outline.sections.keyPoints')}\n`
      result.keyPoints.forEach((point, index) => {
        text += `${index + 1}. ${point}\n`
      })
      text += '\n'
    }

    if (result.emotionalTone) {
      text += `${t('chapterEditor.outline.sections.emotionalTone')}${result.emotionalTone}\n\n`
    }

    if (result.plotPoints && result.plotPoints.length > 0) {
      text += `${t('chapterEditor.outline.sections.plotPoints')}\n`
      result.plotPoints.forEach((point, index) => {
        const typeText = getPlotPointTypeText(point.type)
        text += `${index + 1}. [${typeText}] ${point.description}\n`
      })
    }
  } else {
    // 标准版 - 显示主要信息
    if (result.contentStructure && result.contentStructure.length > 0) {
      text += `${t('chapterEditor.outline.sections.contentStructure')}\n`
      result.contentStructure.forEach((section, index) => {
        const approx = section.estimatedWords
          ? t('chapterEditor.outline.text.approxWords', { words: section.estimatedWords })
          : ''
        text += `${index + 1}. ${section.title}${approx}\n`
        text += `   ${section.description}\n\n`
      })
    }

    if (result.keyPoints && result.keyPoints.length > 0) {
      text += `${t('chapterEditor.outline.sections.keyPoints')}\n`
      result.keyPoints.forEach((point, index) => {
        text += `${index + 1}. ${point}\n`
      })
      text += '\n'
    }

    if (result.emotionalTone) {
      text += `${t('chapterEditor.outline.sections.emotionalTone')}${result.emotionalTone}\n`
    }
  }

  return text
}

// 获取情节要点类型文本
const getPlotPointTypeText = (type: string): string => {
  const typeKeyMap: Record<string, string> = {
    conflict: 'conflict',
    discovery: 'discovery',
    emotion: 'emotion',
    action: 'action',
    dialogue: 'dialogue'
  }
  const key = typeKeyMap[type] || type
  return t(`chapterEditor.outline.plotPointTypes.${key}`, key)
}

// 清空大纲
const handleClear = () => {
  Modal.confirm({
    title: t('chapterEditor.outline.messages.clearConfirmTitle'),
    content: t('chapterEditor.outline.messages.clearConfirmContent'),
    okText: t('common.confirm'),
    cancelText: t('common.cancel'),
    onOk() {
      emit('update:outline', '')
      emit('cleared')
      message.success(t('chapterEditor.outline.messages.cleared'))
    }
  })
}

const handleCancel = () => {
  if (!generating.value) return
  isCancelled.value = true
  generatingStatus.value = 'cancelling'
  progress.value = Math.min(progress.value, 95)
  cancelTypewriterEffect()
  abortController.value?.abort()
}

// 暴露方法供父组件调用
defineExpose({
  generate: handleGenerate,
  clear: handleClear,
  cancel: handleCancel
})
</script>

<style scoped>
.outline-ai-generator {
  width: 100%;
}

.generator-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.help-icon {
  color: var(--theme-text-secondary);
  font-size: 14px;
  cursor: help;
}

.generating-indicator {
  position: relative;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f6fbff 0%, #e8f3ff 100%);
  border-radius: 10px;
  color: #0b3c66;
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid rgba(12, 94, 177, 0.15);
  box-shadow:
    0 6px 16px rgba(12, 94, 177, 0.12),
    0 2px 6px rgba(12, 94, 177, 0.08);
}

.indicator-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
  position: relative;
  z-index: 1;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  color: #0d4e8c;
  font-size: 20px;
  box-shadow: inset 0 0 12px rgba(13, 78, 140, 0.15);
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.generating-title {
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: rgba(11, 60, 102, 0.85);
}

.generating-subtitle {
  font-size: 13px;
  color: rgba(11, 60, 102, 0.9);
}

.progress-percentage {
  font-weight: 600;
  font-size: 16px;
  color: rgba(11, 60, 102, 0.95);
}

.cancel-button {
  border: none;
  background: rgba(255, 255, 255, 0.85);
  color: #cf1b1b;
  box-shadow: 0 0 0 1px rgba(207, 27, 27, 0.15);
}

.cancel-button:hover {
  color: #a01313;
  background: rgba(255, 255, 255, 0.95);
}

.custom-progress-bar {
  position: relative;
  z-index: 1;
}

.progress-track {
  position: relative;
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  position: relative;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #1488CC 0%, #1488CC 100%);
  transition: width 0.3s ease;
}

.progress-shimmer {
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0) 100%);
  animation: shimmer 1.2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(200%);
  }
}

.progress-milestones {
  position: relative;
  margin-top: 10px;
  height: 20px;
}

.milestone {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  text-align: center;
  transition: color 0.3s ease;
}

.milestone-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin: 0 auto 6px;
  background: rgba(11, 60, 102, 0.25);
}

.milestone-label {
  font-size: 11px;
  color: rgba(11, 60, 102, 0.6);
  white-space: nowrap;
}

.milestone.active .milestone-dot {
  background: #1488CC;
  box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.15);
}

.milestone.current .milestone-label {
  color: rgba(11, 60, 102, 0.9);
  font-weight: 500;
}

.generator-options {
  margin-top: 12px;
  padding: 12px;
  background: var(--theme-bg-elevated);
  border-radius: 6px;
  border: 1px solid var(--theme-border);
}

.generator-options :deep(.ant-collapse) {
  background: transparent;
}

.generator-options :deep(.ant-collapse-item) {
  border-bottom: none !important;
}
</style>
