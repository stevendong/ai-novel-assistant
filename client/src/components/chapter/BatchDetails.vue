<template>
  <div class="batch-details">
    <!-- 基本信息 -->
    <a-descriptions title="批次信息" bordered :column="2" class="mb-4">
      <a-descriptions-item label="批次名称" :span="2">
        {{ batch.batchName }}
      </a-descriptions-item>
      <a-descriptions-item label="小说">
        {{ batch.novel?.title || '未知' }}
      </a-descriptions-item>
      <a-descriptions-item label="生成模式">
        <a-tag color="blue">{{ getModeText(batch.mode) }}</a-tag>
      </a-descriptions-item>
      <a-descriptions-item label="状态">
        <a-tag :color="getStatusColor(batch.status)">
          {{ getStatusText(batch.status) }}
        </a-tag>
      </a-descriptions-item>
      <a-descriptions-item label="进度">
        {{ batch.progress }}%
      </a-descriptions-item>
      <a-descriptions-item label="章节数">
        {{ batch.completedChapters }} / {{ batch.totalChapters }}
      </a-descriptions-item>
      <a-descriptions-item label="起始位置" v-if="batch.startPosition">
        第 {{ batch.startPosition }} 章
      </a-descriptions-item>
      <a-descriptions-item label="创建时间">
        {{ formatDateTime(batch.createdAt) }}
      </a-descriptions-item>
      <a-descriptions-item label="更新时间">
        {{ formatDateTime(batch.updatedAt) }}
      </a-descriptions-item>
    </a-descriptions>

    <!-- 生成参数 -->
    <a-card title="生成参数" size="small" class="mb-4" v-if="parameters">
      <a-descriptions :column="2" size="small">
        <a-descriptions-item label="每章目标字数">
          {{ parameters.targetWordsPerChapter || 2000 }} 字
        </a-descriptions-item>
        <a-descriptions-item label="重点关注" v-if="parameters.focusAreas && parameters.focusAreas.length > 0">
          <a-tag
            v-for="area in parameters.focusAreas"
            :key="area"
            color="purple"
            class="mr-1"
          >
            {{ getFocusAreaText(area) }}
          </a-tag>
        </a-descriptions-item>
      </a-descriptions>
    </a-card>

    <!-- 分析结果 -->
    <a-card title="AI分析结果" size="small" class="mb-4" v-if="analysisResult">
      <a-collapse>
        <a-collapse-panel key="1" header="剧情分析">
          <a-descriptions :column="1" size="small" bordered>
            <a-descriptions-item label="当前阶段">
              {{ analysisResult.analysis?.currentStage || '未分析' }}
            </a-descriptions-item>
            <a-descriptions-item label="主要冲突" v-if="analysisResult.analysis?.mainConflicts">
              <a-tag
                v-for="(conflict, index) in analysisResult.analysis.mainConflicts"
                :key="index"
                color="red"
                class="mb-1"
              >
                {{ conflict }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="可能发展方向" v-if="analysisResult.analysis?.potentialDirections">
              <div
                v-for="(direction, index) in analysisResult.analysis.potentialDirections"
                :key="index"
                class="mb-1"
              >
                • {{ direction }}
              </div>
            </a-descriptions-item>
          </a-descriptions>
        </a-collapse-panel>

        <a-collapse-panel key="2" header="角色信息" v-if="analysisResult.characters">
          <a-tag
            v-for="char in analysisResult.characters.slice(0, 20)"
            :key="char.id"
            color="blue"
            class="mb-2"
          >
            {{ char.name }} ({{ char.role }})
          </a-tag>
          <div v-if="analysisResult.characters.length > 20" class="text-gray-500 mt-2">
            还有 {{ analysisResult.characters.length - 20 }} 个角色...
          </div>
        </a-collapse-panel>

        <a-collapse-panel key="3" header="世界设定" v-if="analysisResult.settings">
          <a-tag
            v-for="setting in analysisResult.settings.slice(0, 20)"
            :key="setting.id"
            color="purple"
            class="mb-2"
          >
            {{ setting.name }} ({{ setting.type }})
          </a-tag>
          <div v-if="analysisResult.settings.length > 20" class="text-gray-500 mt-2">
            还有 {{ analysisResult.settings.length - 20 }} 个设定...
          </div>
        </a-collapse-panel>
      </a-collapse>
    </a-card>

    <!-- 生成的章节列表 -->
    <a-card
      title="生成的章节"
      size="small"
      v-if="batch.generatedChapters && batch.generatedChapters.length > 0"
    >
      <template #extra>
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
            size="small"
            :disabled="selectedChapters.length === 0"
            @click="handleApply"
            :loading="applying"
          >
            应用选中 ({{ selectedChapters.length }})
          </a-button>
        </a-space>
      </template>

      <a-list
        :data-source="batch.generatedChapters"
        item-layout="vertical"
        size="small"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <template #extra>
              <a-checkbox
                v-model:checked="selectedChapters"
                :value="item.id"
                :disabled="item.status === 'applied'"
              />
            </template>

            <a-list-item-meta>
              <template #title>
                <a-space>
                  <span>第{{ item.chapterNumber }}章：{{ item.title }}</span>
                  <a-tag v-if="item.status === 'applied'" color="success">已应用</a-tag>
                  <a-tag v-else-if="item.status === 'approved'" color="green">已批准</a-tag>
                  <a-tag v-else-if="item.status === 'rejected'" color="red">已拒绝</a-tag>
                  <a-tag v-else>草稿</a-tag>
                  <a-tag color="blue">优先级: {{ item.priority }}/5</a-tag>
                  <a-tag :color="getConfidenceColor(item.aiConfidence)">
                    AI信心: {{ Math.round(item.aiConfidence * 100) }}%
                  </a-tag>
                </a-space>
              </template>

              <template #description>
                <div class="chapter-outline">{{ item.outline }}</div>
              </template>
            </a-list-item-meta>

            <div class="chapter-meta">
              <a-row :gutter="16">
                <a-col :span="8" v-if="item.plotPoints && JSON.parse(item.plotPoints).length > 0">
                  <div class="meta-section">
                    <div class="meta-title">剧情要点</div>
                    <ul class="meta-list">
                      <li v-for="(point, index) in JSON.parse(item.plotPoints)" :key="index">
                        {{ point }}
                      </li>
                    </ul>
                  </div>
                </a-col>
                <a-col :span="8" v-if="item.characters && JSON.parse(item.characters).length > 0">
                  <div class="meta-section">
                    <div class="meta-title">涉及角色</div>
                    <a-tag
                      v-for="char in JSON.parse(item.characters)"
                      :key="char"
                      color="blue"
                      size="small"
                      class="mb-1"
                    >
                      {{ char }}
                    </a-tag>
                  </div>
                </a-col>
                <a-col :span="8" v-if="item.settings && JSON.parse(item.settings).length > 0">
                  <div class="meta-section">
                    <div class="meta-title">使用设定</div>
                    <a-tag
                      v-for="setting in JSON.parse(item.settings)"
                      :key="setting"
                      color="purple"
                      size="small"
                      class="mb-1"
                    >
                      {{ setting }}
                    </a-tag>
                  </div>
                </a-col>
              </a-row>

              <div v-if="item.notes" class="chapter-notes">
                <strong>备注：</strong>{{ item.notes }}
              </div>
            </div>
          </a-list-item>
        </template>
      </a-list>
    </a-card>

    <!-- 错误信息 -->
    <a-alert
      v-if="batch.status === 'failed' && batch.errorMessage"
      type="error"
      :message="batch.errorMessage"
      show-icon
      class="mt-4"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import type { BatchGeneration, BatchGenerationMode, BatchStatus } from '@/services/batchChapterService'
import { batchChapterService } from '@/services/batchChapterService'

interface Props {
  batch: BatchGeneration
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'apply'])

// 状态
const applying = ref(false)
const selectedChapters = ref<string[]>([])

// 解析参数和分析结果
const parameters = computed(() => {
  if (!props.batch.parameters) return null
  try {
    return JSON.parse(props.batch.parameters)
  } catch {
    return null
  }
})

const analysisResult = computed(() => {
  if (!props.batch.analysisResult) return null
  try {
    return JSON.parse(props.batch.analysisResult)
  } catch {
    return null
  }
})

// 全选逻辑
const indeterminate = computed(() => {
  const unappliedChapters = props.batch.generatedChapters?.filter(c => c.status !== 'applied') || []
  return selectedChapters.value.length > 0 &&
    selectedChapters.value.length < unappliedChapters.length
})

const checkAll = computed(() => {
  const unappliedChapters = props.batch.generatedChapters?.filter(c => c.status !== 'applied') || []
  return selectedChapters.value.length === unappliedChapters.length && unappliedChapters.length > 0
})

const handleCheckAllChange = (e: any) => {
  if (e.target.checked) {
    selectedChapters.value = props.batch.generatedChapters
      ?.filter(c => c.status !== 'applied')
      .map(c => c.id) || []
  } else {
    selectedChapters.value = []
  }
}

// 应用章节
const handleApply = async () => {
  if (selectedChapters.value.length === 0) {
    message.warning('请选择要应用的章节')
    return
  }

  applying.value = true
  try {
    const result = await batchChapterService.applyGeneratedChapters(
      props.batch.id,
      selectedChapters.value
    )
    emit('apply', result)
  } catch (error: any) {
    console.error('应用章节失败:', error)
    message.error(error.message || '应用章节失败')
  } finally {
    applying.value = false
  }
}

// 工具方法
const getStatusColor = (status: BatchStatus) => {
  const colors: Record<BatchStatus, string> = {
    pending: 'default',
    analyzing: 'processing',
    generating: 'processing',
    completed: 'success',
    failed: 'error'
  }
  return colors[status] || 'default'
}

const getStatusText = (status: BatchStatus) => {
  const texts: Record<BatchStatus, string> = {
    pending: '等待中',
    analyzing: '分析中',
    generating: '生成中',
    completed: '已完成',
    failed: '失败'
  }
  return texts[status] || status
}

const getModeText = (mode: BatchGenerationMode) => {
  const texts: Record<BatchGenerationMode, string> = {
    continue: '续写模式',
    insert: '插入模式',
    branch: '分支模式',
    expand: '扩展模式'
  }
  return texts[mode] || mode
}

const getFocusAreaText = (area: string) => {
  const texts: Record<string, string> = {
    plot: '剧情推进',
    character: '角色塑造',
    world: '世界观展开',
    conflict: '冲突设计',
    emotion: '情感描写'
  }
  return texts[area] || area
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'green'
  if (confidence >= 0.6) return 'orange'
  return 'red'
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.batch-details {
  max-height: 70vh;
  overflow-y: auto;
}

.mb-1 {
  margin-bottom: 4px;
}

.mb-2 {
  margin-bottom: 8px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mr-1 {
  margin-right: 4px;
}

.mt-2 {
  margin-top: 8px;
}

.mt-4 {
  margin-top: 16px;
}

.text-gray-500 {
  color: var(--theme-text-secondary);
}

.chapter-outline {
  margin: 8px 0;
  padding: 8px;
  background: var(--theme-bg-elevated);
  border-radius: 4px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.chapter-meta {
  margin-top: 12px;
  padding: 12px;
  background: var(--theme-bg-base);
  border-radius: 4px;
}

.meta-section {
  margin-bottom: 12px;
}

.meta-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--theme-text);
}

.meta-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
}

.meta-list li {
  margin-bottom: 4px;
  color: var(--theme-text-secondary);
}

.chapter-notes {
  margin-top: 12px;
  padding: 8px;
  background: var(--theme-bg-elevated);
  border-radius: 4px;
  font-size: 13px;
  color: var(--theme-text-secondary);
}
</style>
