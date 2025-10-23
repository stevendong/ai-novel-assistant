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
        AI生成大纲
      </a-button>

      <a-button
        v-if="hasContent && !generating"
        type="link"
        size="small"
        danger
        @click="handleClear"
      >
        <template #icon><ClearOutlined /></template>
        清空
      </a-button>

      <a-tooltip v-if="!canGenerate" title="请先填写章节标题">
        <QuestionCircleOutlined class="help-icon" />
      </a-tooltip>
    </div>

    <!-- 生成状态提示 -->
    <div v-if="generating" class="generating-indicator">
      <a-spin size="small" />
      <span class="generating-text">{{ generatingText }}</span>
    </div>

    <!-- 生成选项（可展开） -->
    <div v-if="showOptions" class="generator-options">
      <a-collapse v-model:activeKey="activeOptionsKey" ghost>
        <a-collapse-panel key="options" header="生成选项">
          <a-form layout="vertical" size="small">
            <a-form-item label="生成风格">
              <a-select v-model:value="options.style" size="small">
                <a-select-option value="standard">标准</a-select-option>
                <a-select-option value="detailed">详细</a-select-option>
                <a-select-option value="brief">简要</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="内容侧重">
              <a-checkbox-group v-model:value="options.focus">
                <a-checkbox value="plot">情节发展</a-checkbox>
                <a-checkbox value="character">角色刻画</a-checkbox>
                <a-checkbox value="emotion">情感描写</a-checkbox>
                <a-checkbox value="world">世界设定</a-checkbox>
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
  QuestionCircleOutlined
} from '@ant-design/icons-vue'
import { aiService, type ChapterOutlineData } from '@/services/aiService'

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
const generatingText = ref('AI正在分析章节信息...')
const activeOptionsKey = ref<string[]>([])
const options = ref<GenerateOptions>({
  style: 'standard',
  focus: ['plot', 'character']
})

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

// AI生成大纲
const handleGenerate = async () => {
  if (!canGenerate.value) {
    message.warning('请先填写章节标题')
    return
  }

  try {
    generating.value = true
    generatingText.value = 'AI正在分析章节信息...'

    // 准备参数
    const params = {
      novelId: props.novelId,
      chapterId: props.chapterId || '',
      chapterNumber: props.chapterNumber,
      chapterTitle: props.chapterTitle,
      existingOutline: props.existingOutline,
      characters: props.characters || [],
      settings: props.settings || [],
      targetWords: props.targetWordCount,
      previousChapterSummary: props.previousChapterSummary,
      nextChapterPlan: props.nextChapterPlan
    }

    generatingText.value = 'AI正在生成大纲...'

    // 调用AI服务
    const result: ChapterOutlineData = await aiService.generateChapterOutline(params)

    generatingText.value = '正在格式化内容...'

    // 构建大纲文本
    const outlineText = buildOutlineText(result, options.value.style)

    // 使用打字机效果显示
    generatingText.value = '正在呈现大纲...'
    await typewriterEffect(outlineText)

    // 发送剧情要点更新
    if (result.plotPoints && result.plotPoints.length > 0) {
      const plotPoints = result.plotPoints.map(p => ({
        type: p.type,
        description: p.description
      }))
      emit('update:plotPoints', plotPoints)
    }

    // 发送生成完成事件
    emit('generated', result)

    message.success('大纲生成成功！')
  } catch (error) {
    console.error('Failed to generate outline:', error)
    message.error('大纲生成失败，请重试')
  } finally {
    generating.value = false
  }
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
      text += '【关键要点】\n'
      result.keyPoints.forEach((point, index) => {
        text += `${index + 1}. ${point}\n`
      })
    }
  } else if (style === 'detailed') {
    // 详细版 - 显示所有信息
    if (result.contentStructure && result.contentStructure.length > 0) {
      text += '【内容结构】\n'
      result.contentStructure.forEach((section, index) => {
        text += `${index + 1}. ${section.title}（约${section.estimatedWords}字）\n`
        text += `   ${section.description}\n\n`
      })
    }

    if (result.keyPoints && result.keyPoints.length > 0) {
      text += '【关键要点】\n'
      result.keyPoints.forEach((point, index) => {
        text += `${index + 1}. ${point}\n`
      })
      text += '\n'
    }

    if (result.emotionalTone) {
      text += `【情感基调】${result.emotionalTone}\n\n`
    }

    if (result.plotPoints && result.plotPoints.length > 0) {
      text += '【情节要点】\n'
      result.plotPoints.forEach((point, index) => {
        const typeText = getPlotPointTypeText(point.type)
        text += `${index + 1}. [${typeText}] ${point.description}\n`
      })
    }
  } else {
    // 标准版 - 显示主要信息
    if (result.contentStructure && result.contentStructure.length > 0) {
      text += '【内容结构】\n'
      result.contentStructure.forEach((section, index) => {
        text += `${index + 1}. ${section.title}（约${section.estimatedWords}字）\n`
        text += `   ${section.description}\n\n`
      })
    }

    if (result.keyPoints && result.keyPoints.length > 0) {
      text += '【关键要点】\n'
      result.keyPoints.forEach((point, index) => {
        text += `${index + 1}. ${point}\n`
      })
      text += '\n'
    }

    if (result.emotionalTone) {
      text += `【情感基调】${result.emotionalTone}\n`
    }
  }

  return text
}

// 获取情节要点类型文本
const getPlotPointTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    conflict: '冲突',
    discovery: '发现',
    emotion: '情感',
    action: '行动',
    dialogue: '对话'
  }
  return typeMap[type] || type
}

// 打字机效果
const typewriterEffect = async (text: string): Promise<void> => {
  // 首先清空现有内容
  emit('update:outline', '')

  const chars = text.split('')
  const delayPerChar = getTypewriterDelay()
  const totalChars = chars.length

  // 计算总时长，避免过长
  const maxDuration = 5000 // 最多5秒
  const actualDelay = Math.min(delayPerChar, maxDuration / totalChars)

  let currentText = ''

  for (let i = 0; i < chars.length; i++) {
    currentText += chars[i]
    emit('update:outline', currentText)

    // 每隔几个字符暂停一下
    if (i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, actualDelay))
    }
  }
}

// 清空大纲
const handleClear = () => {
  Modal.confirm({
    title: '确认清空大纲？',
    content: '此操作将清空当前大纲内容，是否继续？',
    okText: '确定',
    cancelText: '取消',
    onOk() {
      emit('update:outline', '')
      emit('cleared')
      message.success('大纲已清空')
    }
  })
}

// 暴露方法供父组件调用
defineExpose({
  generate: handleGenerate,
  clear: handleClear
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
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(90deg, #e6f7ff 0%, #f0f9ff 100%);
  border: 1px solid #91d5ff;
  border-radius: 6px;
  font-size: 13px;
  color: #1890ff;
  margin-bottom: 12px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.generating-text {
  font-weight: 500;
  flex: 1;
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
  border: none;
}

.generator-options :deep(.ant-collapse-header) {
  padding: 4px 0;
  font-size: 13px;
  color: var(--theme-text-secondary);
}

.generator-options :deep(.ant-collapse-content) {
  border-top: 1px solid var(--theme-border);
}

.generator-options :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.generator-options :deep(.ant-form-item:last-child) {
  margin-bottom: 0;
}

.generator-options :deep(.ant-checkbox-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 暗色主题支持 */
:deep(.dark) .generating-indicator {
  background: linear-gradient(90deg, #111d2c 0%, #15395b 100%);
  border-color: #15395b;
}

:deep(.dark) .generator-options {
  background: rgba(255, 255, 255, 0.04);
}
</style>
