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
  ClearOutlined
} from '@ant-design/icons-vue'
import { aiService } from '@/services/aiService'

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

const options = ref<GenerateOptions>({
  targetLength: props.targetWordCount || 2000,
  style: 'modern',
  focus: ['dialogue', 'description'],
  mode: 'balanced'
})

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
  return props.existingContent && props.existingContent.trim().length > 0
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
      onOk: () => performGenerate(false)
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
  try {
    generating.value = true
    progress.value = 0
    generatingText.value = 'AI正在分析章节信息...'

    // 准备参数
    const params = {
      novelId: props.novelId,
      chapterId: props.chapterId,
      outline: props.outline,
      existingContent: isContinue ? props.existingContent : '',
      targetLength: options.value.targetLength,
      style: options.value.style,
      characters: props.characters || [],
      settings: props.settings || []
    }

    progress.value = 20
    generatingText.value = 'AI正在构思情节...'

    // 调用AI服务
    const response = await aiService.generateContent(params)

    progress.value = 60
    generatingText.value = '正在生成文字...'

    // 处理响应
    let content = ''
    if (typeof response === 'string') {
      content = response
    } else if (response && typeof response === 'object') {
      content = response.content || response.message || response.data || (response as any).text || ''
      if (typeof content !== 'string') {
        content = JSON.stringify(response)
      }
    }

    if (!content || content.trim().length === 0) {
      throw new Error('生成的内容为空')
    }

    progress.value = 80
    generatingText.value = '正在格式化内容...'

    // 格式化内容
    const formattedContent = formatGeneratedContent(content)

    progress.value = 90
    generatingText.value = '正在呈现内容...'

    // 根据是否续写决定如何更新内容
    const finalContent = isContinue
      ? props.existingContent + '\n\n' + formattedContent
      : formattedContent

    // 使用打字机效果显示（可选）
    await typewriterEffect(finalContent, isContinue)

    progress.value = 100

    // 发送生成完成事件
    emit('generated', finalContent)

    message.success(`内容${isContinue ? '续写' : '生成'}成功！`)
  } catch (error) {
    console.error('Failed to generate content:', error)
    message.error(`内容${isContinue ? '续写' : '生成'}失败，请重试`)
  } finally {
    generating.value = false
    progress.value = 0
  }
}

// 格式化生成的内容
const formatGeneratedContent = (content: string): string => {
  // 移除可能的代码块标记
  let formatted = content.replace(/```(?:markdown|text)?\n?/g, '')

  // 移除说明性文字（如果AI添加了）
  formatted = formatted.replace(/^(以下是|这是|正文内容如下)[：:]\s*/gm, '')

  // 确保段落之间有适当的空行
  formatted = formatted.replace(/\n{3,}/g, '\n\n')

  // 移除首尾空白
  formatted = formatted.trim()

  return formatted
}

// 打字机效果
const typewriterEffect = async (text: string, append: boolean = false): Promise<void> => {
  const chars = text.split('')
  const delayPerChar = 10 // 较快的速度，适合长文本

  // 如果不是追加模式，先清空
  if (!append) {
    emit('update:content', '')
  }

  let currentText = append ? props.existingContent + '\n\n' : ''

  // 为了避免太慢，每次添加多个字符
  const charsPerBatch = 5
  for (let i = 0; i < chars.length; i += charsPerBatch) {
    const batch = chars.slice(i, i + charsPerBatch).join('')
    currentText += batch
    emit('update:content', currentText)

    // 每批次之间暂停一下
    await new Promise(resolve => setTimeout(resolve, delayPerChar))
  }
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
      emit('update:content', '')
      emit('cleared')
      message.success('内容已清空')
    }
  })
}

// 暴露方法供父组件调用
defineExpose({
  generate: handleGenerate,
  continue: handleContinue,
  clear: handleClear
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
