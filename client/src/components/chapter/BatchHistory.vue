<template>
  <div class="batch-history">
    <div class="history-header">
      <a-input-search
        v-model:value="searchKeyword"
        placeholder="搜索批次名称"
        style="width: 300px"
        @search="loadBatches"
        allow-clear
      />
      <a-select
        v-model:value="statusFilter"
        placeholder="筛选状态"
        style="width: 120px"
        allow-clear
        @change="loadBatches"
      >
        <a-select-option value="">全部</a-select-option>
        <a-select-option value="completed">已完成</a-select-option>
        <a-select-option value="pending">进行中</a-select-option>
        <a-select-option value="failed">失败</a-select-option>
      </a-select>
    </div>

    <a-table
      :columns="columns"
      :data-source="batches"
      :loading="loading"
      row-key="id"
      :pagination="{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条记录`
      }"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'batchName'">
          <div class="batch-name-cell">
            <div class="batch-title">{{ record.batchName }}</div>
            <div class="batch-meta">
              <a-tag :color="getModeColor(record.mode)" size="small">
                {{ getModeLabel(record.mode) }}
              </a-tag>
              <span class="novel-title">{{ record.novel?.title }}</span>
            </div>
          </div>
        </template>

        <template v-else-if="column.key === 'status'">
          <div class="status-cell">
            <a-badge :status="getStatusBadge(record.status)" />
            <span>{{ getStatusLabel(record.status) }}</span>
            <div class="progress-bar" v-if="record.status === 'generating'">
              <a-progress :percent="record.progress" size="small" />
            </div>
          </div>
        </template>

        <template v-else-if="column.key === 'chapters'">
          <div class="chapters-cell">
            <span class="completed">{{ record.completedChapters }}</span>
            <span class="separator">/</span>
            <span class="total">{{ record.totalChapters }}</span>
          </div>
        </template>

        <template v-else-if="column.key === 'createdAt'">
          <div class="time-cell">
            <div class="date">{{ formatDate(record.createdAt) }}</div>
            <div class="time">{{ formatTime(record.createdAt) }}</div>
          </div>
        </template>

        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button
              type="text"
              size="small"
              @click="previewBatch(record)"
              :disabled="record.status !== 'completed'"
            >
              <EyeOutlined />
              预览
            </a-button>
            <a-button
              type="text"
              size="small"
              @click="selectBatch(record)"
              :disabled="record.status !== 'completed'"
            >
              <CheckOutlined />
              选择
            </a-button>
            <a-popconfirm
              title="确定要删除这个批次吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="deleteBatch(record.id)"
            >
              <a-button type="text" size="small" danger>
                <DeleteOutlined />
                删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 批次预览弹窗 -->
    <a-modal
      v-model:open="previewVisible"
      :title="`预览：${selectedBatch?.batchName}`"
      width="900px"
      :footer="[
        h('a-button', { key: 'close', onClick: () => previewVisible = false }, '关闭'),
        h('a-button', {
          key: 'select',
          type: 'primary',
          onClick: () => {
            selectBatch(selectedBatch)
            previewVisible = false
          }
        }, '选择此批次')
      ]"
    >
      <div v-if="selectedBatch" class="batch-preview">
        <div class="preview-header">
          <a-descriptions :column="3" size="small">
            <a-descriptions-item label="生成模式">
              <a-tag :color="getModeColor(selectedBatch.mode)">
                {{ getModeLabel(selectedBatch.mode) }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="章节数量">
              {{ selectedBatch.completedChapters }}/{{ selectedBatch.totalChapters }}
            </a-descriptions-item>
            <a-descriptions-item label="创建时间">
              {{ formatDateTime(selectedBatch.createdAt) }}
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="preview-chapters" v-if="previewChapters.length">
          <h4>生成的章节</h4>
          <div class="chapters-list">
            <a-card
              v-for="chapter in previewChapters"
              :key="chapter.id"
              size="small"
              class="chapter-preview-card"
            >
              <template #title>
                <div class="chapter-preview-header">
                  <span>第{{ chapter.chapterNumber }}章：{{ chapter.title }}</span>
                  <a-tag :color="getPriorityColor(chapter.priority)" size="small">
                    优先级{{ chapter.priority }}
                  </a-tag>
                </div>
              </template>
              <div class="chapter-preview-content">
                <p class="outline">{{ chapter.outline }}</p>
                <div class="chapter-preview-meta">
                  <span>预估字数: {{ chapter.estimatedWords }}</span>
                  <span>AI信心度: {{ Math.round(chapter.aiConfidence * 100) }}%</span>
                  <span>状态: {{ getChapterStatusLabel(chapter.status) }}</span>
                </div>
              </div>
            </a-card>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue'
import { message } from 'ant-design-vue'
import {
  EyeOutlined,
  CheckOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'
import { apiClient } from '@/utils/api'
import { useProjectStore } from '@/stores/project'

const emit = defineEmits(['select-batch'])
const projectStore = useProjectStore()

// 响应式状态
const batches = ref([])
const loading = ref(false)
const searchKeyword = ref('')
const statusFilter = ref('')
const previewVisible = ref(false)
const selectedBatch = ref(null)
const previewChapters = ref([])

// 分页
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

// 表格列定义
const columns = [
  {
    title: '批次名称',
    key: 'batchName',
    dataIndex: 'batchName',
    width: '30%'
  },
  {
    title: '状态',
    key: 'status',
    dataIndex: 'status',
    width: '15%'
  },
  {
    title: '章节进度',
    key: 'chapters',
    width: '12%'
  },
  {
    title: '创建时间',
    key: 'createdAt',
    dataIndex: 'createdAt',
    width: '15%',
    sorter: true
  },
  {
    title: '操作',
    key: 'actions',
    width: '20%'
  }
]

// 方法
const loadBatches = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (projectStore.currentProject) {
      params.append('novelId', projectStore.currentProject.id)
    }
    if (searchKeyword.value) {
      params.append('search', searchKeyword.value)
    }
    if (statusFilter.value) {
      params.append('status', statusFilter.value)
    }

    const response = await apiClient.get(`/api/chapters/batch/list?${params}`)
    if (response.data.success) {
      batches.value = response.data.data
      pagination.value.total = response.data.data.length
    }
  } catch (error) {
    console.error('加载批次列表失败:', error)
    message.error('加载批次列表失败')
  } finally {
    loading.value = false
  }
}

const previewBatch = async (batch) => {
  selectedBatch.value = batch
  previewVisible.value = true

  try {
    const response = await apiClient.get(`/api/chapters/batch/${batch.id}/preview`)
    if (response.data.success) {
      previewChapters.value = response.data.data.chapters || []
    }
  } catch (error) {
    console.error('加载批次预览失败:', error)
    message.error('加载批次预览失败')
    previewChapters.value = []
  }
}

const selectBatch = (batch) => {
  emit('select-batch', batch)
}

const deleteBatch = async (batchId) => {
  try {
    const response = await apiClient.delete(`/api/chapters/batch/${batchId}`)
    if (response.data.success) {
      message.success('批次删除成功')
      await loadBatches()
    }
  } catch (error) {
    console.error('删除批次失败:', error)
    message.error('删除批次失败')
  }
}

const handleTableChange = (paginationInfo, filters, sorter) => {
  pagination.value = paginationInfo
  // 这里可以实现服务端排序和分页
  loadBatches()
}

// 工具方法
const getModeColor = (mode) => {
  const colors = {
    'continue': 'blue',
    'insert': 'green',
    'branch': 'orange',
    'expand': 'purple'
  }
  return colors[mode] || 'default'
}

const getModeLabel = (mode) => {
  const labels = {
    'continue': '续写',
    'insert': '插入',
    'branch': '分支',
    'expand': '扩展'
  }
  return labels[mode] || mode
}

const getStatusBadge = (status) => {
  const badges = {
    'pending': 'default',
    'analyzing': 'processing',
    'generating': 'processing',
    'completed': 'success',
    'failed': 'error'
  }
  return badges[status] || 'default'
}

const getStatusLabel = (status) => {
  const labels = {
    'pending': '等待开始',
    'analyzing': '分析中',
    'generating': '生成中',
    'completed': '已完成',
    'failed': '失败'
  }
  return labels[status] || status
}

const getChapterStatusLabel = (status) => {
  const labels = {
    'draft': '草稿',
    'approved': '已批准',
    'rejected': '已拒绝',
    'applied': '已应用'
  }
  return labels[status] || status
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

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 生命周期
onMounted(() => {
  loadBatches()
})
</script>

<style scoped>
.batch-history {
  padding: 16px 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.batch-name-cell {
  display: flex;
  flex-direction: column;
}

.batch-title {
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--theme-text);
}

.batch-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.novel-title {
  color: var(--theme-text-secondary);
}

.status-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar {
  width: 80px;
}

.chapters-cell {
  font-variant-numeric: tabular-nums;
}

.completed {
  font-weight: 500;
  color: var(--theme-text);
}

.separator {
  margin: 0 2px;
  color: var(--theme-text-secondary);
}

.total {
  color: var(--theme-text-secondary);
}

.time-cell {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}

.date {
  font-weight: 500;
  color: var(--theme-text);
}

.time {
  color: var(--theme-text-secondary);
}

/* 预览弹窗样式 */
.batch-preview {
  max-height: 600px;
  overflow-y: auto;
}

.preview-header {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--theme-border);
}

.preview-chapters h4 {
  margin-bottom: 12px;
  color: var(--theme-text);
}

.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.chapter-preview-card {
  border: 1px solid var(--theme-border);
}

.chapter-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chapter-preview-content {
  font-size: 12px;
}

.outline {
  color: var(--theme-text-secondary);
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.chapter-preview-meta {
  display: flex;
  justify-content: space-between;
  color: var(--theme-text-tertiary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .history-header {
    flex-direction: column;
    align-items: stretch;
  }

  .batch-meta {
    flex-wrap: wrap;
  }

  .chapter-preview-meta {
    flex-direction: column;
    gap: 2px;
  }
}
</style>