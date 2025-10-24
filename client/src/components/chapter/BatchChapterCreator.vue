<template>
  <div class="batch-chapter-creator">
    <a-steps :current="currentStep" class="mb-6">
      <a-step title="配置生成" />
      <a-step title="AI分析" />
      <a-step title="生成中" />
      <a-step title="预览应用" />
    </a-steps>

    <!-- 步骤 1: 配置生成 -->
    <div v-if="currentStep === 0" class="step-content">
      <a-form
        :model="formData"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 18 }"
        @finish="handleAnalyze"
      >
        <a-form-item
          label="小说"
          name="novelId"
          :rules="[{ required: true, message: '请选择小说' }]"
        >
          <a-select
            v-model:value="formData.novelId"
            placeholder="选择要生成章节的小说"
            @change="handleNovelChange"
          >
            <a-select-option
              v-for="novel in novels"
              :key="novel.id"
              :value="novel.id"
            >
              {{ novel.title }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item
          label="批次名称"
          name="batchName"
          :rules="[{ required: true, message: '请输入批次名称' }]"
        >
          <a-input
            v-model:value="formData.batchName"
            placeholder="例如：第二卷章节计划"
          />
        </a-form-item>

        <a-form-item
          label="生成模式"
          name="mode"
          :rules="[{ required: true, message: '请选择生成模式' }]"
        >
          <a-radio-group v-model:value="formData.mode">
            <a-radio value="continue">
              <div class="mode-option">
                <div class="mode-title">续写模式</div>
                <div class="mode-desc">基于现有剧情继续发展后续章节</div>
              </div>
            </a-radio>
            <a-radio value="insert">
              <div class="mode-option">
                <div class="mode-title">插入模式</div>
                <div class="mode-desc">在现有章节间插入新的剧情内容</div>
              </div>
            </a-radio>
            <a-radio value="branch">
              <div class="mode-option">
                <div class="mode-title">分支模式</div>
                <div class="mode-desc">探索不同的剧情发展分支</div>
              </div>
            </a-radio>
            <a-radio value="expand">
              <div class="mode-option">
                <div class="mode-title">扩展模式</div>
                <div class="mode-desc">将现有章节扩展为更详细的多个章节</div>
              </div>
            </a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item
          label="生成章节数"
          name="totalChapters"
          :rules="[
            { required: true, message: '请输入章节数' },
            { type: 'number', min: 1, max: 20, message: '章节数必须在1-20之间' }
          ]"
        >
          <a-input-number
            v-model:value="formData.totalChapters"
            :min="1"
            :max="20"
            placeholder="1-20章"
            style="width: 200px"
          />
          <span class="ml-2 text-gray-500">建议一次生成5-10章</span>
        </a-form-item>

        <a-form-item
          v-if="formData.mode === 'insert'"
          label="起始位置"
          name="startPosition"
        >
          <a-input-number
            v-model:value="formData.startPosition"
            :min="1"
            placeholder="从第几章开始插入"
            style="width: 200px"
          />
        </a-form-item>

        <a-divider>高级选项</a-divider>

        <a-form-item label="每章目标字数">
          <a-input-number
            v-model:value="formData.targetWordsPerChapter"
            :min="500"
            :max="10000"
            :step="500"
            placeholder="2000"
            style="width: 200px"
          />
          <span class="ml-2 text-gray-500">默认2000字</span>
        </a-form-item>

        <a-form-item label="重点关注">
          <a-select
            v-model:value="formData.focusAreas"
            mode="multiple"
            placeholder="选择重点关注的方向"
          >
            <a-select-option value="plot">剧情推进</a-select-option>
            <a-select-option value="character">角色塑造</a-select-option>
            <a-select-option value="world">世界观展开</a-select-option>
            <a-select-option value="conflict">冲突设计</a-select-option>
            <a-select-option value="emotion">情感描写</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
          <a-space>
            <a-button type="primary" html-type="submit" :loading="analyzing">
              <template #icon><RocketOutlined /></template>
              开始分析
            </a-button>
            <a-button @click="handleCancel">取消</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <!-- 步骤 2: AI分析结果 -->
    <div v-if="currentStep === 1" class="step-content">
      <a-spin :spinning="analyzing" tip="AI正在分析小说上下文...">
        <div v-if="analysisResult" class="analysis-result">
          <a-alert
            message="上下文分析完成"
            type="success"
            show-icon
            class="mb-4"
          >
            <template #description>
              AI已完成对《{{ analysisResult.novel.title }}》的分析，以下是分析结果摘要
            </template>
          </a-alert>

          <a-descriptions title="小说信息" bordered :column="2" class="mb-4">
            <a-descriptions-item label="类型">
              {{ analysisResult.novel.genre || '未设定' }}
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              {{ analysisResult.novel.status }}
            </a-descriptions-item>
            <a-descriptions-item label="当前字数">
              {{ analysisResult.novel.wordCount.toLocaleString() }}
            </a-descriptions-item>
            <a-descriptions-item label="章节数">
              {{ analysisResult.novel.chapterCount }}
            </a-descriptions-item>
          </a-descriptions>

          <a-card title="剧情分析" class="mb-4">
            <a-descriptions bordered :column="1">
              <a-descriptions-item label="当前阶段">
                {{ analysisResult.analysis.currentStage }}
              </a-descriptions-item>
              <a-descriptions-item label="主要冲突">
                <a-tag
                  v-for="(conflict, index) in analysisResult.analysis.mainConflicts"
                  :key="index"
                  color="red"
                  class="mb-1"
                >
                  {{ conflict }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="可能发展方向">
                <div
                  v-for="(direction, index) in analysisResult.analysis.potentialDirections"
                  :key="index"
                  class="mb-2"
                >
                  <CheckCircleOutlined class="text-green-500 mr-2" />
                  {{ direction }}
                </div>
              </a-descriptions-item>
            </a-descriptions>
          </a-card>

          <a-row :gutter="16" class="mb-4">
            <a-col :span="12">
              <a-card title="涉及角色" size="small">
                <a-tag
                  v-for="char in analysisResult.characters.slice(0, 10)"
                  :key="char.id"
                  color="blue"
                  class="mb-2"
                >
                  {{ char.name }} ({{ char.role }})
                </a-tag>
                <div v-if="analysisResult.characters.length > 10" class="text-gray-500 mt-2">
                  还有 {{ analysisResult.characters.length - 10 }} 个角色...
                </div>
              </a-card>
            </a-col>
            <a-col :span="12">
              <a-card title="世界设定" size="small">
                <a-tag
                  v-for="setting in analysisResult.settings.slice(0, 10)"
                  :key="setting.id"
                  color="purple"
                  class="mb-2"
                >
                  {{ setting.name }} ({{ setting.type }})
                </a-tag>
                <div v-if="analysisResult.settings.length > 10" class="text-gray-500 mt-2">
                  还有 {{ analysisResult.settings.length - 10 }} 个设定...
                </div>
              </a-card>
            </a-col>
          </a-row>

          <div class="step-actions">
            <a-space>
              <a-button @click="currentStep = 0">
                <template #icon><LeftOutlined /></template>
                返回修改
              </a-button>
              <a-button type="primary" @click="handleStartGeneration" :loading="generating">
                <template #icon><ThunderboltOutlined /></template>
                开始生成章节
              </a-button>
            </a-space>
          </div>
        </div>
      </a-spin>
    </div>

    <!-- 步骤 3: 生成进度 -->
    <div v-if="currentStep === 2" class="step-content">
      <div class="generation-progress">
        <a-result
          :status="generationStatus === 'failed' ? 'error' : 'info'"
          :title="generationStatusText"
        >
          <template #icon>
            <a-spin v-if="generationStatus !== 'failed'" size="large" />
            <CloseCircleOutlined v-else style="color: #ff4d4f" />
          </template>
          <template #extra>
            <a-progress
              :percent="generationProgress"
              :status="generationStatus === 'failed' ? 'exception' : 'active'"
              stroke-linecap="square"
            />
            <div class="mt-4 text-gray-600">
              {{ generationMessage }}
            </div>
            <div v-if="errorMessage" class="mt-2 text-red-500">
              错误：{{ errorMessage }}
            </div>
          </template>
        </a-result>
      </div>
    </div>

    <!-- 步骤 4: 预览和应用 -->
    <div v-if="currentStep === 3" class="step-content">
      <a-alert
        message="章节生成完成！"
        description="请预览生成的章节，选择要应用到小说中的章节"
        type="success"
        show-icon
        closable
        class="mb-4"
      />

      <div class="preview-actions mb-4">
        <a-space>
          <a-checkbox
            :indeterminate="indeterminate"
            :checked="checkAll"
            @change="handleCheckAllChange"
          >
            全选
          </a-checkbox>
          <a-button
            type="primary"
            :disabled="selectedChapters.length === 0"
            @click="handleApplyChapters"
            :loading="applying"
          >
            <template #icon><CheckOutlined /></template>
            应用选中章节 ({{ selectedChapters.length }})
          </a-button>
          <a-button @click="handleViewBatches">
            查看历史批次
          </a-button>
        </a-space>
      </div>

      <div class="chapter-previews">
        <a-list
          :data-source="preview?.chapters || []"
          :loading="loadingPreview"
          item-layout="vertical"
        >
          <template #renderItem="{ item }">
            <a-list-item>
              <template #extra>
                <a-checkbox
                  v-model:checked="selectedChapters"
                  :value="item.id"
                />
              </template>
              <a-list-item-meta>
                <template #title>
                  <a-space>
                    <span class="font-bold">第{{ item.chapterNumber }}章：{{ item.title }}</span>
                    <a-tag color="blue">优先级: {{ item.priority }}/5</a-tag>
                    <a-tag :color="getConfidenceColor(item.aiConfidence)">
                      AI信心: {{ Math.round(item.aiConfidence * 100) }}%
                    </a-tag>
                    <a-tag v-if="item.estimatedWords">
                      预估: {{ item.estimatedWords }}字
                    </a-tag>
                  </a-space>
                </template>
                <template #description>
                  <div class="chapter-outline">
                    {{ item.outline }}
                  </div>
                </template>
              </a-list-item-meta>

              <div class="chapter-details">
                <a-row :gutter="16">
                  <a-col :span="8" v-if="item.plotPoints.length > 0">
                    <div class="detail-section">
                      <div class="detail-title">剧情要点</div>
                      <ul class="detail-list">
                        <li v-for="(point, index) in item.plotPoints" :key="index">
                          {{ point }}
                        </li>
                      </ul>
                    </div>
                  </a-col>
                  <a-col :span="8" v-if="item.characters.length > 0">
                    <div class="detail-section">
                      <div class="detail-title">涉及角色</div>
                      <a-tag
                        v-for="char in item.characters"
                        :key="char"
                        color="blue"
                        class="mb-1"
                      >
                        {{ char }}
                      </a-tag>
                    </div>
                  </a-col>
                  <a-col :span="8" v-if="item.settings.length > 0">
                    <div class="detail-section">
                      <div class="detail-title">使用设定</div>
                      <a-tag
                        v-for="setting in item.settings"
                        :key="setting"
                        color="purple"
                        class="mb-1"
                      >
                        {{ setting }}
                      </a-tag>
                    </div>
                  </a-col>
                </a-row>

                <div class="detail-actions mt-3">
                  <a-space>
                    <a-button size="small" @click="handleEditChapter(item)">
                      <template #icon><EditOutlined /></template>
                      编辑
                    </a-button>
                    <a-button size="small" @click="handleRegenerateChapter(item)">
                      <template #icon><ReloadOutlined /></template>
                      重新生成
                    </a-button>
                  </a-space>
                </div>
              </div>
            </a-list-item>
          </template>
        </a-list>
      </div>
    </div>

    <!-- 编辑章节 Modal -->
    <a-modal
      v-model:open="editModalVisible"
      title="编辑章节"
      width="800px"
      @ok="handleSaveEdit"
      :confirm-loading="saving"
    >
      <a-form layout="vertical">
        <a-form-item label="章节标题">
          <a-input v-model:value="editingChapter.title" />
        </a-form-item>
        <a-form-item label="章节大纲">
          <a-textarea
            v-model:value="editingChapter.outline"
            :rows="8"
            placeholder="详细描述章节内容..."
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea
            v-model:value="editingChapter.notes"
            :rows="3"
            placeholder="添加备注..."
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批次历史 Modal -->
    <a-modal
      v-model:open="historyVisible"
      title="批次历史"
      width="1400px"
      :footer="null"
      :destroyOnClose="true"
    >
      <BatchHistoryModal
        @close="historyVisible = false"
        @applied="handleHistoryApplied"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  RocketOutlined,
  LeftOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  EditOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'
import { batchChapterService } from '@/services/batchChapterService'
import type {
  BatchGenerationMode,
  NovelContextAnalysis,
  BatchPreview,
  BatchStatus
} from '@/services/batchChapterService'
import { novelService } from '@/services/novelService'
import type { Novel } from '@/types'
import BatchHistoryModal from './BatchHistoryModal.vue'

const emit = defineEmits(['close', 'success'])

// 步骤控制
const currentStep = ref(0)

// 小说列表
const novels = ref<Novel[]>([])

// 表单数据
const formData = reactive({
  novelId: '',
  batchName: '',
  mode: 'continue' as BatchGenerationMode,
  totalChapters: 5,
  startPosition: undefined as number | undefined,
  targetWordsPerChapter: 2000,
  focusAreas: [] as string[]
})

// 分析结果
const analyzing = ref(false)
const analysisResult = ref<NovelContextAnalysis | null>(null)

// 生成状态
const generating = ref(false)
const generationProgress = ref(0)
const generationStatus = ref<BatchStatus>('pending')
const generationMessage = ref('')
const errorMessage = ref('')
const currentBatchId = ref('')

// 预览数据
const loadingPreview = ref(false)
const preview = ref<BatchPreview | null>(null)
const selectedChapters = ref<string[]>([])
const applying = ref(false)

// 编辑状态
const editModalVisible = ref(false)
const editingChapter = reactive({
  id: '',
  title: '',
  outline: '',
  notes: ''
})
const saving = ref(false)

// 计算属性
const generationStatusText = computed(() => {
  const statusMap: Record<BatchStatus, string> = {
    pending: '准备生成...',
    analyzing: 'AI正在分析上下文...',
    generating: 'AI正在生成章节...',
    completed: '生成完成！',
    failed: '生成失败'
  }
  return statusMap[generationStatus.value] || '处理中...'
})

const indeterminate = computed(() => {
  return selectedChapters.value.length > 0 &&
    selectedChapters.value.length < (preview.value?.chapters.length || 0)
})

const checkAll = computed(() => {
  return selectedChapters.value.length === (preview.value?.chapters.length || 0)
})

// 加载小说列表
const loadNovels = async () => {
  try {
    novels.value = await novelService.getNovels()
  } catch (error) {
    console.error('加载小说列表失败:', error)
    message.error('加载小说列表失败')
  }
}

// 小说变化处理
const handleNovelChange = (novelId: string) => {
  const novel = novels.value.find(n => n.id === novelId)
  if (novel && !formData.batchName) {
    formData.batchName = `${novel.title} - 批量生成 ${new Date().toLocaleDateString()}`
  }
}

// 开始分析
const handleAnalyze = async () => {
  analyzing.value = true
  try {
    analysisResult.value = await batchChapterService.analyzeNovelContext(formData.novelId)
    currentStep.value = 1
    message.success('上下文分析完成')
  } catch (error: any) {
    console.error('分析失败:', error)
    message.error(error.message || '分析失败，请重试')
  } finally {
    analyzing.value = false
  }
}

// 开始生成
const handleStartGeneration = async () => {
  generating.value = true
  generationStatus.value = 'pending'
  generationProgress.value = 0
  currentStep.value = 2

  try {
    // 创建批量生成任务
    const { batchId } = await batchChapterService.createBatchGeneration({
      novelId: formData.novelId,
      batchName: formData.batchName,
      mode: formData.mode,
      totalChapters: formData.totalChapters,
      startPosition: formData.startPosition,
      parameters: {
        targetWordsPerChapter: formData.targetWordsPerChapter,
        focusAreas: formData.focusAreas
      }
    })

    currentBatchId.value = batchId
    message.success('批量生成任务已创建')

    // 开始轮询进度
    await batchChapterService.pollBatchProgress(
      batchId,
      (progress) => {
        generationStatus.value = progress.status
        generationProgress.value = progress.progress
        generationMessage.value = `已完成 ${progress.completedChapters}/${progress.totalChapters} 章`

        if (progress.errorMessage) {
          errorMessage.value = progress.errorMessage
        }

        // 如果完成，加载预览
        if (progress.status === 'completed') {
          loadPreview(batchId)
        }
      }
    )
  } catch (error: any) {
    console.error('生成失败:', error)
    message.error(error.message || '生成失败，请重试')
    generationStatus.value = 'failed'
    errorMessage.value = error.message
  } finally {
    generating.value = false
  }
}

// 加载预览
const loadPreview = async (batchId: string) => {
  loadingPreview.value = true
  try {
    preview.value = await batchChapterService.getBatchPreview(batchId)
    currentStep.value = 3

    // 默认全选
    selectedChapters.value = preview.value.chapters.map(c => c.id)
  } catch (error: any) {
    console.error('加载预览失败:', error)
    message.error('加载预览失败')
  } finally {
    loadingPreview.value = false
  }
}

// 全选/取消全选
const handleCheckAllChange = (e: any) => {
  if (e.target.checked) {
    selectedChapters.value = preview.value?.chapters.map(c => c.id) || []
  } else {
    selectedChapters.value = []
  }
}

// 应用章节
const handleApplyChapters = async () => {
  if (selectedChapters.value.length === 0) {
    message.warning('请选择要应用的章节')
    return
  }

  applying.value = true
  try {
    const result = await batchChapterService.applyGeneratedChapters(
      currentBatchId.value,
      selectedChapters.value
    )

    message.success(`成功应用 ${result.createdChapters} 个章节`)
    emit('success', result)
    emit('close')
  } catch (error: any) {
    console.error('应用章节失败:', error)
    message.error(error.message || '应用章节失败')
  } finally {
    applying.value = false
  }
}

// 编辑章节
const handleEditChapter = (chapter: any) => {
  editingChapter.id = chapter.id
  editingChapter.title = chapter.title
  editingChapter.outline = chapter.outline
  editingChapter.notes = chapter.notes || ''
  editModalVisible.value = true
}

// 保存编辑
const handleSaveEdit = async () => {
  saving.value = true
  try {
    await batchChapterService.updateGeneratedChapter(editingChapter.id, {
      title: editingChapter.title,
      outline: editingChapter.outline,
      notes: editingChapter.notes
    })

    // 刷新预览
    if (currentBatchId.value) {
      await loadPreview(currentBatchId.value)
    }

    message.success('章节更新成功')
    editModalVisible.value = false
  } catch (error: any) {
    console.error('更新章节失败:', error)
    message.error('更新章节失败')
  } finally {
    saving.value = false
  }
}

// 重新生成章节
const handleRegenerateChapter = async (chapter: any) => {
  try {
    await batchChapterService.regenerateChapter(chapter.id)
    message.info('章节重新生成功能开发中')
  } catch (error: any) {
    console.error('重新生成失败:', error)
    message.error('重新生成失败')
  }
}

// 批次历史
const historyVisible = ref(false)

// 查看历史批次
const handleViewBatches = () => {
  historyVisible.value = true
}

// 从历史批次应用后的回调
const handleHistoryApplied = (result: any) => {
  historyVisible.value = false
  emit('success', result)
  emit('close')
}

// 取消
const handleCancel = () => {
  emit('close')
}

// 获取信心度颜色
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'green'
  if (confidence >= 0.6) return 'orange'
  return 'red'
}

// 初始化
onMounted(() => {
  loadNovels()
})
</script>

<style scoped>
.batch-chapter-creator {
  padding: 24px;
  max-height: 80vh;
  overflow-y: auto;
}

.step-content {
  margin-top: 24px;
}

.mode-option {
  margin-left: 8px;
}

.mode-title {
  font-weight: 600;
  color: var(--theme-text);
}

.mode-desc {
  font-size: 12px;
  color: var(--theme-text-secondary);
  margin-top: 2px;
}

.analysis-result {
  max-width: 1000px;
  margin: 0 auto;
}

.step-actions {
  margin-top: 24px;
  text-align: center;
}

.generation-progress {
  padding: 40px 0;
  text-align: center;
}

.preview-actions {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--theme-bg-elevated);
  border-radius: 8px;
}

.chapter-previews {
  max-height: 600px;
  overflow-y: auto;
}

.chapter-outline {
  margin: 12px 0;
  padding: 12px;
  background: var(--theme-bg-elevated);
  border-radius: 4px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.chapter-details {
  margin-top: 16px;
  padding: 16px;
  background: var(--theme-bg-base);
  border-radius: 8px;
}

.detail-section {
  margin-bottom: 12px;
}

.detail-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--theme-text);
}

.detail-list {
  margin: 0;
  padding-left: 20px;
}

.detail-list li {
  margin-bottom: 4px;
  color: var(--theme-text-secondary);
}

.detail-actions {
  border-top: 1px solid var(--theme-border);
  padding-top: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .batch-chapter-creator {
    padding: 16px;
  }

  :deep(.ant-form-item-label) {
    text-align: left;
  }

  :deep(.ant-col-6) {
    max-width: 100%;
    flex: 0 0 100%;
  }

  :deep(.ant-col-18) {
    max-width: 100%;
    flex: 0 0 100%;
  }
}
</style>
