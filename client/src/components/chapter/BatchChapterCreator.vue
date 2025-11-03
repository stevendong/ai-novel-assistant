<template>
  <div class="batch-chapter-creator">
    <a-steps :current="currentStep" class="mb-6">
      <a-step :title="t('chapter.batch.steps.configure')" />
      <a-step :title="t('chapter.batch.steps.analysis')" />
      <a-step :title="t('chapter.batch.steps.generating')" />
      <a-step :title="t('chapter.batch.steps.preview')" />
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
          :label="t('chapter.batch.form.novel')"
          name="novelId"
          :rules="[{ required: true, message: t('chapter.batch.form.errors.selectNovel') }]"
        >
          <a-select
            v-model:value="formData.novelId"
            :placeholder="t('chapter.batch.form.novelPlaceholder')"
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
          :label="t('chapter.batch.form.batchName')"
          name="batchName"
          :rules="[{ required: true, message: t('chapter.batch.form.errors.batchName') }]"
        >
          <a-input
            v-model:value="formData.batchName"
            :placeholder="t('chapter.batch.form.batchNamePlaceholder')"
          />
        </a-form-item>

        <a-form-item
          :label="t('chapter.batch.form.mode')"
          name="mode"
          :rules="[{ required: true, message: t('chapter.batch.form.errors.mode') }]"
        >
          <a-radio-group v-model:value="formData.mode">
            <a-radio value="continue">
              <div class="mode-option">
                <div class="mode-title">{{ t('chapter.batch.modes.continue.title') }}</div>
                <div class="mode-desc">{{ t('chapter.batch.modes.continue.desc') }}</div>
              </div>
            </a-radio>
            <a-radio value="insert">
              <div class="mode-option">
                <div class="mode-title">{{ t('chapter.batch.modes.insert.title') }}</div>
                <div class="mode-desc">{{ t('chapter.batch.modes.insert.desc') }}</div>
              </div>
            </a-radio>
            <a-radio value="branch">
              <div class="mode-option">
                <div class="mode-title">{{ t('chapter.batch.modes.branch.title') }}</div>
                <div class="mode-desc">{{ t('chapter.batch.modes.branch.desc') }}</div>
              </div>
            </a-radio>
            <a-radio value="expand">
              <div class="mode-option">
                <div class="mode-title">{{ t('chapter.batch.modes.expand.title') }}</div>
                <div class="mode-desc">{{ t('chapter.batch.modes.expand.desc') }}</div>
              </div>
            </a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item
          :label="t('chapter.batch.form.chapterCount')"
          name="totalChapters"
          :rules="[
            { required: true, message: t('chapter.batch.form.errors.chapterCount') },
            { type: 'number', min: 1, max: 20, message: t('chapter.batch.form.errors.chapterCountRange') }
          ]"
        >
          <a-input-number
            v-model:value="formData.totalChapters"
            :min="1"
            :max="20"
            :placeholder="t('chapter.batch.form.chapterCountPlaceholder')"
            style="width: 200px"
          />
          <span class="ml-2 text-gray-500">{{ t('chapter.batch.form.chapterCountHint') }}</span>
        </a-form-item>

        <a-form-item
          v-if="formData.mode === 'insert'"
          :label="t('chapter.batch.form.startPosition')"
          name="startPosition"
        >
          <a-input-number
            v-model:value="formData.startPosition"
            :min="1"
            :placeholder="t('chapter.batch.form.startPositionPlaceholder')"
            style="width: 200px"
          />
        </a-form-item>

        <a-divider>{{ t('chapter.batch.form.advanced') }}</a-divider>

        <a-form-item :label="t('chapter.batch.form.targetWords')">
          <a-input-number
            v-model:value="formData.targetWordsPerChapter"
            :min="500"
            :max="10000"
            :step="500"
            :placeholder="t('chapter.batch.form.targetWordsPlaceholder')"
            style="width: 200px"
          />
          <span class="ml-2 text-gray-500">{{ t('chapter.batch.form.targetWordsHint') }}</span>
        </a-form-item>

        <a-form-item :label="t('chapter.batch.form.focusAreas')">
          <a-select
            v-model:value="formData.focusAreas"
            mode="multiple"
            :placeholder="t('chapter.batch.form.focusAreasPlaceholder')"
          >
            <a-select-option value="plot">{{ t('chapter.batch.form.focusOptions.plot') }}</a-select-option>
            <a-select-option value="character">{{ t('chapter.batch.form.focusOptions.character') }}</a-select-option>
            <a-select-option value="world">{{ t('chapter.batch.form.focusOptions.world') }}</a-select-option>
            <a-select-option value="conflict">{{ t('chapter.batch.form.focusOptions.conflict') }}</a-select-option>
            <a-select-option value="emotion">{{ t('chapter.batch.form.focusOptions.emotion') }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
          <a-space>
            <a-button type="primary" html-type="submit" :loading="analyzing">
              <template #icon><RocketOutlined /></template>
              {{ t('chapter.batch.form.startAnalysis') }}
            </a-button>
            <a-button @click="handleCancel">{{ t('common.cancel') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <!-- 步骤 2: AI分析结果 -->
    <div v-if="currentStep === 1" class="step-content">
      <a-spin :spinning="analyzing" :tip="t('chapter.batch.analysis.loading')">
        <div v-if="analysisResult" class="analysis-result">
          <a-alert
            :message="t('chapter.batch.analysis.completedTitle')"
            type="success"
            show-icon
            class="mb-4"
          >
            <template #description>
              {{ t('chapter.batch.analysis.completedDescription', { title: analysisResult.novel.title }) }}
            </template>
          </a-alert>

          <a-descriptions :title="t('chapter.batch.analysis.novelInfo')" bordered :column="2" class="mb-4">
            <a-descriptions-item :label="t('chapter.batch.analysis.genre')">
              {{ analysisResult.novel.genre || t('common.notSet') }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('chapter.batch.analysis.status')">
              {{ analysisResult.novel.status }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('chapter.batch.analysis.wordCount')">
              {{ analysisResult.novel.wordCount.toLocaleString() }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('chapter.batch.analysis.chapterCount')">
              {{ analysisResult.novel.chapterCount }}
            </a-descriptions-item>
          </a-descriptions>

          <a-card :title="t('chapter.batch.analysis.plotAnalysis')" class="mb-4">
            <a-descriptions bordered :column="1">
              <a-descriptions-item :label="t('chapter.batch.analysis.currentStage')">
                {{ analysisResult.analysis.currentStage }}
              </a-descriptions-item>
              <a-descriptions-item :label="t('chapter.batch.analysis.mainConflicts')">
                <a-tag
                  v-for="(conflict, index) in analysisResult.analysis.mainConflicts"
                  :key="index"
                  color="red"
                  class="mb-1"
                >
                  {{ conflict }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item :label="t('chapter.batch.analysis.directions')">
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
              <a-card :title="t('chapter.batch.analysis.characters')" size="small">
                <a-tag
                  v-for="char in analysisResult.characters.slice(0, 10)"
                  :key="char.id"
                  color="blue"
                  class="mb-2"
                >
                  {{ char.name }} ({{ char.role }})
                </a-tag>
                <div v-if="analysisResult.characters.length > 10" class="text-gray-500 mt-2">
                  {{ t('chapter.batch.analysis.moreCharacters', { count: analysisResult.characters.length - 10 }) }}
                </div>
              </a-card>
            </a-col>
            <a-col :span="12">
              <a-card :title="t('chapter.batch.analysis.settings')" size="small">
                <a-tag
                  v-for="setting in analysisResult.settings.slice(0, 10)"
                  :key="setting.id"
                  color="purple"
                  class="mb-2"
                >
                  {{ setting.name }} ({{ setting.type }})
                </a-tag>
                <div v-if="analysisResult.settings.length > 10" class="text-gray-500 mt-2">
                  {{ t('chapter.batch.analysis.moreSettings', { count: analysisResult.settings.length - 10 }) }}
                </div>
              </a-card>
            </a-col>
          </a-row>

          <div class="step-actions">
            <a-space>
              <a-button @click="currentStep = 0">
                <template #icon><LeftOutlined /></template>
                {{ t('chapter.batch.analysis.backToEdit') }}
              </a-button>
              <a-button type="primary" @click="handleStartGeneration" :loading="generating">
                <template #icon><ThunderboltOutlined /></template>
                {{ t('chapter.batch.analysis.startGeneration') }}
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
              {{ t('chapter.batch.generation.errorPrefix', { message: errorMessage }) }}
            </div>
          </template>
        </a-result>
      </div>
    </div>

    <!-- 步骤 4: 预览和应用 -->
    <div v-if="currentStep === 3" class="step-content">
      <a-alert
        :message="t('chapter.batch.preview.alertTitle')"
        :description="t('chapter.batch.preview.alertDescription')"
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
            {{ t('common.selectAll') }}
          </a-checkbox>
          <a-button
            type="primary"
            :disabled="selectedChapters.length === 0"
            @click="handleApplyChapters"
            :loading="applying"
          >
            <template #icon><CheckOutlined /></template>
            {{ t('chapter.batch.preview.applySelected', { count: selectedChapters.length }) }}
          </a-button>
          <a-button @click="handleViewBatches">
            {{ t('chapter.batch.preview.viewHistory') }}
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
                    <span class="font-bold">{{ t('chapter.list.table.chapterTitle', { number: item.chapterNumber, title: item.title }) }}</span>
                    <a-tag color="blue">{{ t('chapter.batch.preview.tagPriority', { priority: item.priority }) }}</a-tag>
                    <a-tag :color="getConfidenceColor(item.aiConfidence)">
                      {{ t('chapter.batch.preview.tagConfidence', { confidence: Math.round(item.aiConfidence * 100) }) }}
                    </a-tag>
                    <a-tag v-if="item.estimatedWords">
                      {{ t('chapter.batch.preview.tagEstimate', { words: item.estimatedWords }) }}
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
                      <div class="detail-title">{{ t('chapter.batch.preview.sections.plotPoints') }}</div>
                      <ul class="detail-list">
                        <li v-for="(point, index) in item.plotPoints" :key="index">
                          {{ point }}
                        </li>
                      </ul>
                    </div>
                  </a-col>
                  <a-col :span="8" v-if="item.characters.length > 0">
                    <div class="detail-section">
                      <div class="detail-title">{{ t('chapter.batch.preview.sections.characters') }}</div>
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
                      <div class="detail-title">{{ t('chapter.batch.preview.sections.settings') }}</div>
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
                      {{ t('common.edit') }}
                    </a-button>
                    <a-button size="small" @click="handleRegenerateChapter(item)">
                      <template #icon><ReloadOutlined /></template>
                      {{ t('chapter.batch.preview.actions.regenerate') }}
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
      :title="t('chapter.batch.editModal.title')"
      width="800px"
      @ok="handleSaveEdit"
      :confirm-loading="saving"
    >
      <a-form layout="vertical">
        <a-form-item :label="t('chapter.chapterTitle')">
          <a-input v-model:value="editingChapter.title" />
        </a-form-item>
        <a-form-item :label="t('chapter.chapterOutline')">
          <a-textarea
            v-model:value="editingChapter.outline"
            :rows="8"
            :placeholder="t('chapter.batch.editModal.outlinePlaceholder')"
          />
        </a-form-item>
        <a-form-item :label="t('chapter.batch.editModal.notesLabel')">
          <a-textarea
            v-model:value="editingChapter.notes"
            :rows="3"
            :placeholder="t('chapter.batch.editModal.notesPlaceholder')"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批次历史 Modal -->
    <a-modal
      v-model:open="historyVisible"
      :title="t('chapter.batch.history.title')"
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
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['close', 'success'])

const { t, locale } = useI18n()

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
  const statusKeyMap: Record<BatchStatus, string> = {
    pending: 'chapter.batch.generation.status.pending',
    analyzing: 'chapter.batch.generation.status.analyzing',
    generating: 'chapter.batch.generation.status.generating',
    completed: 'chapter.batch.generation.status.completed',
    failed: 'chapter.batch.generation.status.failed'
  }
  return t(statusKeyMap[generationStatus.value] || 'chapter.batch.generation.status.processing')
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
    message.error(t('chapter.batch.messages.loadNovelsFailed'))
  }
}

// 小说变化处理
const handleNovelChange = (novelId: string) => {
  const novel = novels.value.find(n => n.id === novelId)
  if (novel && !formData.batchName) {
    const formatter = new Intl.DateTimeFormat(locale.value === 'zh' ? 'zh-CN' : 'en-US')
    formData.batchName = t('chapter.batch.autoBatchName', {
      title: novel.title,
      date: formatter.format(new Date())
    })
  }
}

// 开始分析
const handleAnalyze = async () => {
  analyzing.value = true
  try {
    analysisResult.value = await batchChapterService.analyzeNovelContext(formData.novelId)
    currentStep.value = 1
    message.success(t('chapter.batch.messages.analysisSuccess'))
  } catch (error: any) {
    console.error('分析失败:', error)
    message.error(error.message || t('chapter.batch.messages.analysisFailed'))
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
    message.success(t('chapter.batch.messages.generationCreated'))

    // 开始轮询进度
    await batchChapterService.pollBatchProgress(
      batchId,
      (progress) => {
        generationStatus.value = progress.status
        generationProgress.value = progress.progress
        generationMessage.value = t('chapter.batch.generation.progress', {
          completed: progress.completedChapters,
          total: progress.totalChapters
        })

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
    message.error(error.message || t('chapter.batch.messages.generationFailed'))
    generationStatus.value = 'failed'
    errorMessage.value = error.message || ''
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
    message.error(t('chapter.batch.messages.loadPreviewFailed'))
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
    message.warning(t('chapter.batch.messages.selectChapters'))
    return
  }

  applying.value = true
  try {
    const result = await batchChapterService.applyGeneratedChapters(
      currentBatchId.value,
      selectedChapters.value
    )

    message.success(t('chapter.batch.messages.applySuccess', { count: result.createdChapters }))
    emit('success', result)
    emit('close')
  } catch (error: any) {
    console.error('应用章节失败:', error)
    message.error(error.message || t('chapter.batch.messages.applyFailed'))
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

    message.success(t('chapter.batch.messages.updateSuccess'))
    editModalVisible.value = false
  } catch (error: any) {
    console.error('更新章节失败:', error)
    message.error(t('chapter.batch.messages.updateFailed'))
  } finally {
    saving.value = false
  }
}

// 重新生成章节
const handleRegenerateChapter = async (chapter: any) => {
  try {
    await batchChapterService.regenerateChapter(chapter.id)
    message.info(t('chapter.batch.messages.regenerateInfo'))
  } catch (error: any) {
    console.error('重新生成失败:', error)
    message.error(t('chapter.batch.messages.regenerateFailed'))
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
