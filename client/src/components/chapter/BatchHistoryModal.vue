<template>
  <div class="batch-history-modal">
    <a-card :bordered="false">
      <!-- 顶部操作栏 -->
      <div class="history-header">
        <a-space>
          <a-select
            v-model:value="filterNovel"
            placeholder="筛选小说"
            style="width: 200px"
            allow-clear
            @change="loadBatchList"
          >
            <a-select-option
              v-for="novel in novels"
              :key="novel.id"
              :value="novel.id"
            >
              {{ novel.title }}
            </a-select-option>
          </a-select>

          <a-select
            v-model:value="filterStatus"
            placeholder="筛选状态"
            style="width: 150px"
            allow-clear
            @change="handleFilterChange"
          >
            <a-select-option value="pending">等待中</a-select-option>
            <a-select-option value="analyzing">分析中</a-select-option>
            <a-select-option value="generating">生成中</a-select-option>
            <a-select-option value="completed">已完成</a-select-option>
            <a-select-option value="failed">失败</a-select-option>
          </a-select>

          <a-button @click="loadBatchList" :loading="loading">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </a-space>

        <div class="history-stats">
          <a-statistic
            title="总批次"
            :value="stats.totalBatches"
            :value-style="{ fontSize: '16px' }"
          />
          <a-divider type="vertical" style="height: 40px" />
          <a-statistic
            title="已生成章节"
            :value="stats.totalCompletedChapters"
            :value-style="{ fontSize: '16px', color: '#52c41a' }"
          />
        </div>
      </div>

      <!-- 批次列表 -->
      <a-list
        :data-source="filteredBatches"
        :loading="loading"
        item-layout="vertical"
        :pagination="{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个批次`
        }"
        class="batch-list"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <template #actions>
              <a-space>
                <a-button
                  type="link"
                  size="small"
                  @click="handleViewDetails(item)"
                  :disabled="item.status === 'pending'"
                >
                  <template #icon><EyeOutlined /></template>
                  查看详情
                </a-button>
                <a-button
                  v-if="item.status === 'completed'"
                  type="link"
                  size="small"
                  @click="handleViewPreview(item)"
                >
                  <template #icon><FileTextOutlined /></template>
                  查看章节
                </a-button>
                <a-popconfirm
                  title="确定要删除这个批次吗？"
                  ok-text="确定"
                  cancel-text="取消"
                  @confirm="handleDelete(item.id)"
                >
                  <a-button type="link" size="small" danger>
                    <template #icon><DeleteOutlined /></template>
                    删除
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>

            <a-list-item-meta>
              <template #title>
                <a-space>
                  <span class="batch-name">{{ item.batchName }}</span>
                  <a-tag :color="getStatusColor(item.status)">
                    {{ getStatusText(item.status) }}
                  </a-tag>
                  <a-tag color="blue">{{ getModeText(item.mode) }}</a-tag>
                </a-space>
              </template>

              <template #description>
                <div class="batch-meta">
                  <a-space :size="16">
                    <span>
                      <BookOutlined />
                      {{ item.novel?.title || '未知小说' }}
                    </span>
                    <span>
                      <FileTextOutlined />
                      {{ item.completedChapters }} / {{ item.totalChapters }} 章
                    </span>
                    <span>
                      <ClockCircleOutlined />
                      {{ formatDate(item.createdAt) }}
                    </span>
                  </a-space>
                </div>
              </template>
            </a-list-item-meta>

            <!-- 进度条 -->
            <div v-if="item.status === 'analyzing' || item.status === 'generating'" class="batch-progress">
              <a-progress
                :percent="item.progress"
                :status="item.status === 'failed' ? 'exception' : 'active'"
                :show-info="true"
              />
              <span class="progress-text">{{ getProgressText(item) }}</span>
            </div>

            <!-- 错误信息 -->
            <div v-if="item.status === 'failed' && item.errorMessage" class="batch-error">
              <a-alert
                :message="item.errorMessage"
                type="error"
                show-icon
                closable
              />
            </div>
          </a-list-item>
        </template>

        <template #header>
          <div class="list-header">
            <span class="list-title">生成历史</span>
            <span class="list-count">{{ filteredBatches.length }} 个批次</span>
          </div>
        </template>
      </a-list>
    </a-card>

    <!-- 批次详情Modal -->
    <a-modal
      v-model:open="detailsVisible"
      title="批次详情"
      width="900px"
      :footer="null"
      :destroyOnClose="true"
    >
      <BatchDetails
        v-if="selectedBatch"
        :batch="selectedBatch"
        @close="detailsVisible = false"
        @apply="handleApplyFromDetails"
      />
    </a-modal>

    <!-- 章节预览Modal -->
    <a-modal
      v-model:open="previewVisible"
      title="生成的章节预览"
      width="1200px"
      :footer="null"
      :destroyOnClose="true"
    >
      <BatchPreviewPanel
        v-if="selectedBatch"
        :batch-id="selectedBatch.id"
        @close="previewVisible = false"
        @applied="handleApplied"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  DeleteOutlined,
  BookOutlined,
  ClockCircleOutlined
} from '@ant-design/icons-vue'
import { batchChapterService } from '@/services/batchChapterService'
import type { BatchGeneration, BatchStatus, BatchGenerationMode } from '@/services/batchChapterService'
import { novelService } from '@/services/novelService'
import type { Novel } from '@/types'
import BatchDetails from './BatchDetails.vue'
import BatchPreviewPanel from './BatchPreviewPanel.vue'

const emit = defineEmits(['close', 'applied'])

// 状态
const loading = ref(false)
const batches = ref<BatchGeneration[]>([])
const novels = ref<Novel[]>([])
const filterNovel = ref<string>()
const filterStatus = ref<string>()
const stats = ref({
  totalBatches: 0,
  totalPlannedChapters: 0,
  totalCompletedChapters: 0,
  statusBreakdown: {} as Record<BatchStatus, number>
})

// 详情和预览
const detailsVisible = ref(false)
const previewVisible = ref(false)
const selectedBatch = ref<BatchGeneration | null>(null)

// 筛选后的批次列表
const filteredBatches = computed(() => {
  let result = batches.value

  if (filterStatus.value) {
    result = result.filter(b => b.status === filterStatus.value)
  }

  return result.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

// 加载批次列表
const loadBatchList = async () => {
  loading.value = true
  try {
    batches.value = await batchChapterService.getBatchList(filterNovel.value)
  } catch (error: any) {
    console.error('加载批次列表失败:', error)
    message.error('加载批次列表失败')
  } finally {
    loading.value = false
  }
}

// 加载统计信息
const loadStats = async () => {
  try {
    stats.value = await batchChapterService.getBatchStats()
  } catch (error: any) {
    console.error('加载统计信息失败:', error)
  }
}

// 加载小说列表
const loadNovels = async () => {
  try {
    novels.value = await novelService.getNovels()
  } catch (error: any) {
    console.error('加载小说列表失败:', error)
  }
}

// 筛选变化
const handleFilterChange = () => {
  // 筛选逻辑在computed中处理
}

// 查看详情
const handleViewDetails = async (batch: BatchGeneration) => {
  try {
    selectedBatch.value = await batchChapterService.getBatchDetails(batch.id)
    detailsVisible.value = true
  } catch (error: any) {
    console.error('加载批次详情失败:', error)
    message.error('加载批次详情失败')
  }
}

// 查看预览
const handleViewPreview = async (batch: BatchGeneration) => {
  selectedBatch.value = batch
  previewVisible.value = true
}

// 从详情中应用
const handleApplyFromDetails = async (result: any) => {
  detailsVisible.value = false
  message.success(`成功应用 ${result.createdChapters} 个章节`)
  emit('applied', result)
  await loadBatchList()
  await loadStats()
}

// 应用完成
const handleApplied = async (result: any) => {
  previewVisible.value = false
  message.success(`成功应用 ${result.createdChapters} 个章节`)
  emit('applied', result)
  await loadBatchList()
  await loadStats()
}

// 删除批次
const handleDelete = async (batchId: string) => {
  try {
    await batchChapterService.deleteBatch(batchId)
    message.success('批次删除成功')
    await loadBatchList()
    await loadStats()
  } catch (error: any) {
    console.error('删除批次失败:', error)
    message.error('删除批次失败')
  }
}

// 获取状态颜色
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

// 获取状态文本
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

// 获取模式文本
const getModeText = (mode: BatchGenerationMode) => {
  const texts: Record<BatchGenerationMode, string> = {
    continue: '续写',
    insert: '插入',
    branch: '分支',
    expand: '扩展'
  }
  return texts[mode] || mode
}

// 获取进度文本
const getProgressText = (batch: BatchGeneration) => {
  if (batch.status === 'analyzing') {
    return 'AI正在分析小说上下文...'
  } else if (batch.status === 'generating') {
    return `正在生成第 ${batch.completedChapters + 1} 章...`
  }
  return ''
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) {
    return '刚刚'
  } else if (diffInHours < 24) {
    return `${diffInHours}小时前`
  } else if (diffInHours < 24 * 7) {
    const days = Math.floor(diffInHours / 24)
    return `${days}天前`
  } else {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

// 初始化
onMounted(async () => {
  await Promise.all([
    loadNovels(),
    loadBatchList(),
    loadStats()
  ])
})
</script>

<style scoped>
.batch-history-modal {
  padding: 0;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--theme-border);
}

.history-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.batch-list {
  margin-top: 16px;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.list-title {
  font-size: 16px;
  color: var(--theme-text);
}

.list-count {
  font-size: 14px;
  color: var(--theme-text-secondary);
}

.batch-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--theme-text);
}

.batch-meta {
  margin-top: 8px;
  color: var(--theme-text-secondary);
  font-size: 13px;
}

.batch-meta :deep(.anticon) {
  margin-right: 4px;
}

.batch-progress {
  margin-top: 16px;
  padding: 12px;
  background: var(--theme-bg-elevated);
  border-radius: 4px;
}

.progress-text {
  display: block;
  margin-top: 8px;
  font-size: 13px;
  color: var(--theme-text-secondary);
}

.batch-error {
  margin-top: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .history-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .history-stats {
    width: 100%;
    justify-content: space-around;
  }
}
</style>
