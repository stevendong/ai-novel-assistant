<template>
  <div class="batch-chapter-creator">
    <!-- 头部信息 -->
    <div class="creator-header">
      <div class="header-left">
        <h2 class="creator-title">
          <BulbOutlined />
          AI批量章节生成
        </h2>
        <p class="creator-description">
          运用AI智能分析，批量创建符合剧情发展的章节大纲
        </p>
      </div>
      <div class="header-actions">
        <a-button @click="showBatchHistory = true">
          <HistoryOutlined />
          历史记录
        </a-button>
      </div>
    </div>

    <!-- 创建向导步骤 -->
    <div class="creator-content">
      <a-steps :current="currentStep" class="wizard-steps">
        <a-step title="选择模式" description="确定生成方式" />
        <a-step title="设置参数" description="配置生成选项" />
        <a-step title="预览分析" description="查看AI分析" />
        <a-step title="生成章节" description="开始批量创建" />
      </a-steps>

      <!-- 步骤内容 -->
      <div class="step-content">
        <!-- 步骤1: 选择模式 -->
        <div v-if="currentStep === 0" class="step-panel mode-selection">
          <h3>选择生成模式</h3>
          <div class="mode-grid">
            <div
              v-for="mode in generationModes"
              :key="mode.key"
              class="mode-card"
              :class="{ active: selectedMode === mode.key }"
              @click="selectMode(mode.key)"
            >
              <div class="mode-icon">
                <component :is="mode.icon" />
              </div>
              <div class="mode-info">
                <h4>{{ mode.title }}</h4>
                <p>{{ mode.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤2: 设置参数 -->
        <div v-if="currentStep === 1" class="step-panel parameters-setup">
          <h3>生成参数设置</h3>
          <a-form layout="vertical" :model="generationParams">
            <a-row :gutter="24">
              <a-col :span="12">
                <a-form-item label="批次名称" required>
                  <a-input
                    v-model:value="generationParams.batchName"
                    placeholder="为本次生成起个名字"
                    :maxlength="50"
                    show-count
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="生成章节数">
                  <a-input-number
                    v-model:value="generationParams.totalChapters"
                    :min="1"
                    :max="20"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="24" v-if="selectedMode === 'insert'">
              <a-col :span="12">
                <a-form-item label="插入位置">
                  <a-select
                    v-model:value="generationParams.startPosition"
                    placeholder="选择在哪个章节后插入"
                  >
                    <a-select-option
                      v-for="chapter in existingChapters"
                      :key="chapter.chapterNumber"
                      :value="chapter.chapterNumber"
                    >
                      第{{ chapter.chapterNumber }}章：{{ chapter.title }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="每章预期字数">
              <a-slider
                v-model:value="generationParams.targetWordsPerChapter"
                :min="1000"
                :max="5000"
                :step="500"
                :tooltip-formatter="(value) => `${value} 字`"
                :marks="{
                  1000: '1K',
                  2000: '2K',
                  3000: '3K',
                  4000: '4K',
                  5000: '5K'
                }"
              />
            </a-form-item>

            <a-form-item label="重点关注">
              <a-select
                v-model:value="generationParams.focusAreas"
                mode="multiple"
                placeholder="选择希望重点发展的元素"
                :options="focusOptions"
              />
            </a-form-item>

            <a-form-item label="生成风格">
              <a-radio-group v-model:value="generationParams.style">
                <a-radio value="detailed">详细描述</a-radio>
                <a-radio value="concise">简洁明了</a-radio>
                <a-radio value="creative">创意丰富</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-form>
        </div>

        <!-- 步骤3: 预览分析 -->
        <div v-if="currentStep === 2" class="step-panel analysis-preview">
          <h3>小说上下文分析</h3>
          <div v-if="contextAnalysis" class="analysis-content">
            <a-row :gutter="24">
              <a-col :span="12">
                <a-card title="基本信息" size="small">
                  <div class="info-item">
                    <span class="label">标题：</span>
                    <span>{{ contextAnalysis.novel.title }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">类型：</span>
                    <span>{{ contextAnalysis.novel.genre || '未设定' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">当前字数：</span>
                    <span>{{ contextAnalysis.novel.wordCount }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">现有章节：</span>
                    <span>{{ contextAnalysis.novel.chapterCount }}</span>
                  </div>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="AI分析结果" size="small">
                  <div class="analysis-result">
                    <p><strong>当前阶段：</strong>{{ contextAnalysis.analysis.currentStage }}</p>
                    <div v-if="contextAnalysis.analysis.mainConflicts?.length">
                      <strong>主要冲突：</strong>
                      <a-tag
                        v-for="conflict in contextAnalysis.analysis.mainConflicts"
                        :key="conflict"
                        color="orange"
                        style="margin: 2px"
                      >
                        {{ conflict }}
                      </a-tag>
                    </div>
                  </div>
                </a-card>
              </a-col>
            </a-row>

            <a-row :gutter="24" style="margin-top: 16px">
              <a-col :span="8">
                <a-card title="涉及角色" size="small">
                  <div class="character-list">
                    <a-tag
                      v-for="character in contextAnalysis.characters"
                      :key="character.id"
                      color="blue"
                      style="margin: 2px 0"
                    >
                      {{ character.name }}
                    </a-tag>
                  </div>
                </a-card>
              </a-col>
              <a-col :span="8">
                <a-card title="可用设定" size="small">
                  <div class="settings-list">
                    <a-tag
                      v-for="setting in contextAnalysis.settings"
                      :key="setting.id"
                      color="green"
                      style="margin: 2px 0"
                    >
                      {{ setting.name }}
                    </a-tag>
                  </div>
                </a-card>
              </a-col>
              <a-col :span="8">
                <a-card title="最近章节" size="small">
                  <div class="recent-chapters">
                    <div
                      v-for="chapter in contextAnalysis.recentChapters.slice(0, 3)"
                      :key="chapter.number"
                      class="chapter-item"
                    >
                      <span class="chapter-num">第{{ chapter.number }}章</span>
                      <span class="chapter-title">{{ chapter.title }}</span>
                    </div>
                  </div>
                </a-card>
              </a-col>
            </a-row>
          </div>
          <div v-else class="analysis-loading">
            <a-spin size="large" />
            <p>正在分析小说上下文...</p>
          </div>
        </div>

        <!-- 步骤4: 生成进度 -->
        <div v-if="currentStep === 3" class="step-panel generation-progress">
          <h3>批量生成进度</h3>
          <div class="progress-content">
            <a-progress
              :percent="generationProgress.progress"
              :status="generationProgress.status === 'failed' ? 'exception' : 'active'"
              stroke-color="#52c41a"
            />
            <div class="progress-info">
              <p class="status-text">{{ generationProgress.statusText }}</p>
              <p class="detail-text">{{ generationProgress.detail }}</p>
            </div>

            <!-- 生成完成后的预览 -->
            <div v-if="generationProgress.status === 'completed' && generatedChapters.length" class="results-preview">
              <h4>生成结果预览</h4>
              <div class="chapters-grid">
                <a-card
                  v-for="chapter in generatedChapters"
                  :key="chapter.id"
                  size="small"
                  class="chapter-card"
                  :class="{ selected: selectedChapters.includes(chapter.id) }"
                  @click="toggleChapterSelection(chapter.id)"
                >
                  <template #title>
                    <div class="chapter-header">
                      <a-checkbox
                        :checked="selectedChapters.includes(chapter.id)"
                        @click.stop="toggleChapterSelection(chapter.id)"
                      />
                      <span>第{{ chapter.chapterNumber }}章</span>
                      <a-tag :color="getPriorityColor(chapter.priority)" size="small">
                        优先级{{ chapter.priority }}
                      </a-tag>
                    </div>
                  </template>
                  <div class="chapter-content">
                    <h5>{{ chapter.title }}</h5>
                    <p class="chapter-outline">{{ chapter.outline }}</p>
                    <div class="chapter-meta">
                      <span>预估字数: {{ chapter.estimatedWords }}</span>
                      <span>AI信心度: {{ Math.round(chapter.aiConfidence * 100) }}%</span>
                    </div>
                  </div>
                </a-card>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="step-actions">
        <a-button v-if="currentStep > 0" @click="prevStep">
          上一步
        </a-button>
        <a-button
          v-if="currentStep < 3"
          type="primary"
          @click="nextStep"
          :disabled="!canProceed"
          :loading="isLoading"
        >
          {{ currentStep === 2 ? '开始生成' : '下一步' }}
        </a-button>
        <a-button
          v-if="currentStep === 3 && generationProgress.status === 'completed'"
          type="primary"
          @click="applySelectedChapters"
          :disabled="selectedChapters.length === 0"
        >
          应用选中章节 ({{ selectedChapters.length }})
        </a-button>
      </div>
    </div>

    <!-- 历史记录弹窗 -->
    <a-modal
      v-model:open="showBatchHistory"
      title="批量生成历史"
      width="800px"
      :footer="null"
    >
      <BatchHistory @select-batch="loadBatch" />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  BulbOutlined,
  HistoryOutlined,
  ArrowRightOutlined,
  PlusCircleOutlined,
  InsertRowBelowOutlined,
  BranchesOutlined,
  ExpandOutlined
} from '@ant-design/icons-vue'
import { useProjectStore } from '@/stores/project'
import { apiClient } from '@/utils/api'
import BatchHistory from './BatchHistory.vue'

const projectStore = useProjectStore()

// 响应式状态
const currentStep = ref(0)
const selectedMode = ref('continue')
const contextAnalysis = ref(null)
const isLoading = ref(false)
const showBatchHistory = ref(false)

// 生成参数
const generationParams = ref({
  batchName: '',
  totalChapters: 3,
  targetWordsPerChapter: 2000,
  focusAreas: [],
  style: 'detailed',
  startPosition: null
})

// 生成进度
const generationProgress = ref({
  status: 'pending', // pending, analyzing, generating, completed, failed
  progress: 0,
  statusText: '准备开始',
  detail: ''
})

// 生成结果
const generatedChapters = ref([])
const selectedChapters = ref([])
const currentBatchId = ref(null)
const existingChapters = ref([])

// 生成模式配置
const generationModes = [
  {
    key: 'continue',
    title: '续写模式',
    description: '基于现有剧情继续发展后续章节',
    icon: ArrowRightOutlined
  },
  {
    key: 'insert',
    title: '插入模式',
    description: '在指定章节间插入新的剧情内容',
    icon: InsertRowBelowOutlined
  },
  {
    key: 'branch',
    title: '分支模式',
    description: '探索不同的剧情发展分支可能',
    icon: BranchesOutlined
  },
  {
    key: 'expand',
    title: '扩展模式',
    description: '将现有章节扩展为更详细的多个章节',
    icon: ExpandOutlined
  }
]

// 关注选项
const focusOptions = [
  { value: 'characters', label: '角色发展' },
  { value: 'plot', label: '剧情推进' },
  { value: 'worldbuilding', label: '世界构建' },
  { value: 'conflict', label: '冲突深化' },
  { value: 'romance', label: '情感线' },
  { value: 'action', label: '动作场面' }
]

// 计算属性
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0:
      return selectedMode.value !== null
    case 1:
      return generationParams.value.batchName.trim() &&
             generationParams.value.totalChapters > 0
    case 2:
      return contextAnalysis.value !== null
    default:
      return false
  }
})

// 方法
const selectMode = (mode) => {
  selectedMode.value = mode
}

const nextStep = async () => {
  if (!canProceed.value) return

  isLoading.value = true

  try {
    if (currentStep.value === 1) {
      // 步骤2 -> 3: 分析上下文
      await analyzeContext()
    } else if (currentStep.value === 2) {
      // 步骤3 -> 4: 开始生成
      await startGeneration()
    }

    currentStep.value++
  } catch (error) {
    console.error('步骤执行失败:', error)
    message.error('操作失败: ' + error.message)
  } finally {
    isLoading.value = false
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const analyzeContext = async () => {
  const novelId = projectStore.currentProject?.id
  if (!novelId) {
    throw new Error('请先选择项目')
  }

  const response = await apiClient.get(`/api/chapters/batch/${novelId}/analyze`)
  if (response.data.success) {
    contextAnalysis.value = response.data.data
  } else {
    throw new Error(response.data.error)
  }
}

const startGeneration = async () => {
  const novelId = projectStore.currentProject?.id
  if (!novelId) {
    throw new Error('请先选择项目')
  }

  // 创建生成任务
  const response = await apiClient.post('/api/chapters/batch/generate', {
    novelId,
    batchName: generationParams.value.batchName,
    mode: selectedMode.value,
    totalChapters: generationParams.value.totalChapters,
    startPosition: generationParams.value.startPosition,
    parameters: {
      targetWordsPerChapter: generationParams.value.targetWordsPerChapter,
      focusAreas: generationParams.value.focusAreas,
      style: generationParams.value.style
    }
  })

  if (response.data.success) {
    currentBatchId.value = response.data.data.batchId
    startProgressPolling()
  } else {
    throw new Error(response.data.error)
  }
}

const startProgressPolling = () => {
  const pollInterval = setInterval(async () => {
    try {
      const response = await apiClient.get(`/api/chapters/batch/${currentBatchId.value}/progress`)
      if (response.data.success) {
        const batch = response.data.data
        generationProgress.value = {
          status: batch.status,
          progress: batch.progress,
          statusText: getStatusText(batch.status),
          detail: `已生成 ${batch.completedChapters} / ${batch.totalChapters} 章节`
        }

        if (batch.status === 'completed' || batch.status === 'failed') {
          clearInterval(pollInterval)
          if (batch.status === 'completed') {
            await loadGeneratedChapters()
          }
        }
      }
    } catch (error) {
      console.error('获取进度失败:', error)
      clearInterval(pollInterval)
    }
  }, 2000) // 每2秒轮询一次
}

const loadGeneratedChapters = async () => {
  try {
    const response = await apiClient.get(`/api/chapters/batch/${currentBatchId.value}/preview`)
    if (response.data.success) {
      generatedChapters.value = response.data.data.chapters
      selectedChapters.value = generatedChapters.value.map(ch => ch.id) // 默认全选
    }
  } catch (error) {
    console.error('加载生成章节失败:', error)
    message.error('加载生成结果失败')
  }
}

const toggleChapterSelection = (chapterId) => {
  const index = selectedChapters.value.indexOf(chapterId)
  if (index > -1) {
    selectedChapters.value.splice(index, 1)
  } else {
    selectedChapters.value.push(chapterId)
  }
}

const applySelectedChapters = async () => {
  if (selectedChapters.value.length === 0) {
    message.warning('请选择要应用的章节')
    return
  }

  try {
    isLoading.value = true
    const response = await apiClient.post(`/api/chapters/batch/${currentBatchId.value}/apply`, {
      selectedChapterIds: selectedChapters.value
    })

    if (response.data.success) {
      message.success(`成功创建 ${response.data.data.createdChapters} 个章节`)
      // 刷新项目数据或跳转到章节列表
      await projectStore.loadCurrentProject()
      resetWizard()
    } else {
      message.error('应用章节失败: ' + response.data.error)
    }
  } catch (error) {
    console.error('应用章节失败:', error)
    message.error('应用章节失败')
  } finally {
    isLoading.value = false
  }
}

const loadBatch = (batch) => {
  // 加载历史批次
  showBatchHistory.value = false
  // TODO: 实现历史批次加载逻辑
}

const resetWizard = () => {
  currentStep.value = 0
  selectedMode.value = 'continue'
  contextAnalysis.value = null
  generationParams.value = {
    batchName: '',
    totalChapters: 3,
    targetWordsPerChapter: 2000,
    focusAreas: [],
    style: 'detailed',
    startPosition: null
  }
  generationProgress.value = {
    status: 'pending',
    progress: 0,
    statusText: '准备开始',
    detail: ''
  }
  generatedChapters.value = []
  selectedChapters.value = []
  currentBatchId.value = null
}

// 工具方法
const getStatusText = (status) => {
  const statusMap = {
    'pending': '等待开始',
    'analyzing': '分析上下文',
    'generating': '生成章节中',
    'completed': '生成完成',
    'failed': '生成失败'
  }
  return statusMap[status] || status
}

const getPriorityColor = (priority) => {
  const colors = {
    1: 'default',
    2: 'blue',
    3: 'green',
    4: 'orange',
    5: 'red'
  }
  return colors[priority] || 'default'
}

// 生命周期
onMounted(async () => {
  if (projectStore.currentProject) {
    // 加载现有章节用于插入模式
    try {
      const response = await apiClient.get(`/api/chapters?novelId=${projectStore.currentProject.id}`)
      if (response.data.success) {
        existingChapters.value = response.data.data.chapters || []
      }
    } catch (error) {
      console.error('加载现有章节失败:', error)
    }
  }
})

// 监听项目变化
watch(() => projectStore.currentProject, (newProject) => {
  if (newProject) {
    resetWizard()
  }
})
</script>

<style scoped>
.batch-chapter-creator {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.creator-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.creator-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--theme-text);
  margin: 0;
}

.creator-title .anticon {
  color: #1890ff;
}

.creator-description {
  color: var(--theme-text-secondary);
  margin: 8px 0 0 0;
  font-size: 14px;
}

.wizard-steps {
  margin-bottom: 32px;
}

.step-content {
  background: var(--theme-bg-container);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  min-height: 400px;
}

.step-panel h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--theme-text);
}

/* 模式选择 */
.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.mode-card {
  border: 2px solid var(--theme-border);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--theme-bg-base);
}

.mode-card:hover {
  border-color: #1890ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
}

.mode-card.active {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.05);
}

.mode-icon {
  font-size: 32px;
  color: #1890ff;
  margin-bottom: 12px;
}

.mode-info h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--theme-text);
}

.mode-info p {
  color: var(--theme-text-secondary);
  font-size: 14px;
  margin: 0;
}

/* 分析预览 */
.analysis-content .info-item {
  display: flex;
  margin-bottom: 8px;
}

.analysis-content .label {
  font-weight: 500;
  min-width: 80px;
  color: var(--theme-text-secondary);
}

.analysis-result p {
  margin-bottom: 8px;
}

.character-list,
.settings-list {
  max-height: 120px;
  overflow-y: auto;
}

.recent-chapters {
  max-height: 120px;
  overflow-y: auto;
}

.chapter-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 4px;
  font-size: 12px;
}

.chapter-num {
  font-weight: 500;
  color: var(--theme-text-secondary);
}

.chapter-title {
  color: var(--theme-text);
}

.analysis-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.analysis-loading p {
  margin-top: 16px;
  color: var(--theme-text-secondary);
}

/* 生成进度 */
.progress-content {
  text-align: center;
}

.progress-info {
  margin-top: 16px;
}

.status-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.detail-text {
  color: var(--theme-text-secondary);
  font-size: 14px;
}

.results-preview {
  margin-top: 32px;
  text-align: left;
}

.results-preview h4 {
  font-size: 16px;
  margin-bottom: 16px;
  color: var(--theme-text);
}

.chapters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.chapter-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.chapter-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.chapter-card.selected {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.chapter-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chapter-content h5 {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
}

.chapter-outline {
  font-size: 12px;
  color: var(--theme-text-secondary);
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.chapter-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--theme-text-tertiary);
}

/* 操作按钮 */
.step-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .batch-chapter-creator {
    padding: 16px;
  }

  .creator-header {
    flex-direction: column;
    gap: 16px;
  }

  .mode-grid {
    grid-template-columns: 1fr;
  }

  .chapters-grid {
    grid-template-columns: 1fr;
  }
}
</style>