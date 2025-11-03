<template>
  <div class="chapter-list-page">
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <FileTextOutlined />
            {{ t('chapter.title') }}
          </h1>
          <p class="page-description">{{ t('nav.chapters') }}</p>
        </div>
        <div class="header-actions">
          <a-space>
            <a-input-search
              v-model:value="searchText"
              :placeholder="t('chapter.searchPlaceholder')"
              style="width: 200px"
              @search="handleSearch"
              @pressEnter="handleSearch"
              allow-clear
            />
            <a-select
              v-model:value="statusFilter"
              :placeholder="t('common.filter')"
              style="width: 120px"
              @change="handleStatusFilter"
              allow-clear
            >
              <a-select-option value="">{{ t('chapter.list.filters.allStatuses') }}</a-select-option>
              <a-select-option value="planning">{{ t('chapter.status.planning') }}</a-select-option>
              <a-select-option value="writing">{{ t('chapter.status.writing') }}</a-select-option>
              <a-select-option value="reviewing">{{ t('chapter.status.reviewing') }}</a-select-option>
              <a-select-option value="completed">{{ t('chapter.status.completed') }}</a-select-option>
            </a-select>
            <a-dropdown>
              <a-button type="primary" :loading="chaptersLoading">
                <template #icon>
                  <PlusOutlined />
                </template>
                {{ t('chapter.addChapter') }}
                <DownOutlined style="margin-left: 4px; font-size: 10px;" />
              </a-button>
              <template #overlay>
                <a-menu @click="handleAddMenuClick">
                  <a-menu-item key="single">
                    <PlusOutlined />
                    {{ t('chapter.list.menu.single') }}
                  </a-menu-item>
                  <a-menu-item key="batch">
                    <BulbOutlined />
                    {{ t('chapter.list.menu.batch') }}
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
        </div>
      </div>
    </div>

    <div class="page-content">
      <a-card>
        <a-table
          :columns="columns"
          :data-source="chapters"
          :loading="chaptersLoading"
          row-key="id"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: number) => t('chapter.list.pagination.total', { count: total }),
            onChange: handlePageChange,
            onShowSizeChange: handlePageSizeChange
          }"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'title'">
              <div class="chapter-title-cell">
                <a-typography-link @click="editChapter(record)">
                  {{ t('chapter.list.table.chapterTitle', { number: record.chapterNumber, title: record.title }) }}
                </a-typography-link>
              </div>
            </template>

            <template v-else-if="column.key === 'status'">
              <div class="status-cell">
                <a-tag :color="getStatusColor(record.status)">
                  {{ getStatusText(record.status) }}
                </a-tag>
                <consistency-indicator
                  :chapter-id="record.id"
                  size="small"
                  class="ml-2"
                />
              </div>
            </template>

            <template v-else-if="column.key === 'wordCount'">
              <span class="word-count">
                {{ getWordCount(record.content) }}
              </span>
            </template>

            <template v-else-if="column.key === 'updatedAt'">
              <span class="update-time">
                {{ formatDate(record.updatedAt) }}
              </span>
            </template>

            <template v-else-if="column.key === 'actions'">
              <a-space>
                <a-button
                    type="text"
                    size="small"
                    @click="editChapter(record)"
                >
                  <template #icon>
                    <EditOutlined />
                  </template>
                  {{ t('chapter.list.actions.write') }}
                </a-button>
                <a-button
                  type="text"
                  size="small"
                  @click="editChapterInfo(record)"
                >
                  <template #icon>
                    <EditOutlined />
                  </template>
                  {{ t('chapter.list.actions.editInfo') }}
                </a-button>
                <a-button
                  type="text"
                  size="small"
                  @click="duplicateChapter(record)"
                >
                  <template #icon>
                    <CopyOutlined />
                  </template>
                  {{ t('common.duplicate') }}
                </a-button>
                <a-popconfirm
                  :title="t('chapter.deleteConfirm')"
                  :ok-text="t('common.confirm')"
                  :cancel-text="t('common.cancel')"
                  @confirm="deleteChapterConfirm(record.id)"
                >
                  <a-button
                    type="text"
                    size="small"
                    danger
                  >
                    <template #icon>
                      <DeleteOutlined />
                    </template>
                    {{ t('common.delete') }}
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- Add Chapter Dialog -->
    <a-modal
      v-model:open="addChapterVisible"
      :title="t('chapter.addNew')"
      width="600px"
      @ok="handleAddChapter"
      :confirm-loading="chaptersLoading"
    >
      <a-form layout="vertical" :model="addChapterForm">
        <a-form-item
          :label="t('chapter.chapterTitle')"
          name="title"
          :rules="[{ required: true, message: t('chapter.enterTitleRequired') }]"
        >
          <a-input
            v-model:value="addChapterForm.title"
            :placeholder="t('chapter.enterTitle')"
            :maxlength="100"
            show-count
          />
        </a-form-item>

        <a-form-item
          :label="t('chapter.list.addModeLabel')"
          name="insertMode"
        >
          <a-radio-group v-model:value="addChapterForm.insertMode">
            <a-radio value="append">{{ t('chapter.list.addModeAppend', { number: nextChapterNumber }) }}</a-radio>
            <a-radio value="insert">{{ t('chapter.list.addModeInsert') }}</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item
          v-if="addChapterForm.insertMode === 'insert'"
          :label="t('chapter.chapterNumber')"
          name="chapterNumber"
          :rules="[{ required: true, message: t('chapter.list.validation.enterChapterNumber') }]"
        >
          <a-input-number
            v-model:value="addChapterForm.chapterNumber"
            :min="1"
            :max="nextChapterNumber"
            :placeholder="t('chapter.list.chapterNumberPlaceholder')"
            style="width: 200px"
          />
          <span style="margin-left: 8px; color: #8c8c8c; font-size: 12px;">
            {{ t('chapter.list.insertHint') }}
          </span>
        </a-form-item>

        <a-form-item
          :label="t('chapter.chapterOutline')"
          name="outline"
        >
          <a-textarea
            v-model:value="addChapterForm.outline"
            :placeholder="t('chapter.outlinePlaceholder')"
            :rows="4"
            :maxlength="500"
            show-count
          />
        </a-form-item>

        <div class="chapter-info">
          <a-descriptions :column="2" size="small">
            <a-descriptions-item :label="t('chapter.list.summary.willCreateAs')">
              <span v-if="addChapterForm.insertMode === 'append'">
                {{ t('chapter.list.summary.appendResult', { number: nextChapterNumber }) }}
              </span>
              <span v-else>
                {{ t('chapter.list.summary.insertResult', { number: addChapterForm.chapterNumber }) }}
              </span>
            </a-descriptions-item>
            <a-descriptions-item :label="t('chapter.list.summary.initialStatus')">
              {{ t('chapter.status.planning') }}
            </a-descriptions-item>
          </a-descriptions>
        </div>
      </a-form>
    </a-modal>

    <!-- Edit Chapter Dialog -->
    <a-modal
      v-model:open="editChapterVisible"
      :title="t('chapter.editChapter')"
      width="600px"
      @ok="handleEditChapter"
      :confirm-loading="chaptersLoading"
    >
      <a-form layout="vertical" :model="editChapterForm" v-if="editChapterForm">
        <a-form-item
          :label="t('chapter.chapterTitle')"
          name="title"
          :rules="[{ required: true, message: t('chapter.enterTitleRequired') }]"
        >
          <a-input
            v-model:value="editChapterForm.title"
            :placeholder="t('chapter.enterTitle')"
            :maxlength="100"
            show-count
          />
        </a-form-item>

        <a-form-item
          :label="t('chapter.chapterOutline')"
          name="outline"
        >
          <a-textarea
            v-model:value="editChapterForm.outline"
            :placeholder="t('chapter.outlinePlaceholder')"
            :rows="4"
            :maxlength="500"
            show-count
          />
        </a-form-item>

        <a-form-item
          :label="t('chapter.chapterStatus')"
          name="status"
        >
          <a-select v-model:value="editChapterForm.status">
            <a-select-option value="planning">{{ t('chapter.status.planning') }}</a-select-option>
            <a-select-option value="writing">{{ t('chapter.status.writing') }}</a-select-option>
            <a-select-option value="reviewing">{{ t('chapter.status.reviewing') }}</a-select-option>
            <a-select-option value="completed">{{ t('chapter.status.completed') }}</a-select-option>
          </a-select>
        </a-form-item>

        <div class="chapter-info">
          <a-descriptions :column="2" size="small">
            <a-descriptions-item :label="t('chapter.chapterNumber')">
              {{ t('chapter.list.summary.chapterNumberValue', { number: editChapterForm.chapterNumber }) }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('chapter.wordCount')">
              {{ t('chapter.list.summary.wordCountValue', { count: getWordCount(editChapterForm.content) }) }}
            </a-descriptions-item>
          </a-descriptions>
        </div>
      </a-form>
    </a-modal>

    <!-- Batch Chapter Creator Modal -->
    <a-modal
      v-model:open="batchChapterVisible"
      :title="t('chapter.list.batchModalTitle')"
      width="1200px"
      :footer="null"
      :maskClosable="false"
      :destroyOnClose="true"
      centered
    >
      <BatchChapterCreator
        @close="handleBatchCreatorClose"
        @success="handleBatchCreatorSuccess"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  FileTextOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  DownOutlined,
  BulbOutlined
} from '@ant-design/icons-vue'
import type { Chapter } from '@/types'
import { useChapterList } from '@/composables/useChapterList'
import { useProjectStore } from '@/stores/project'
import { countValidWords } from '@/utils/textUtils'
import BatchChapterCreator from '@/components/chapter/BatchChapterCreator.vue'
import ConsistencyIndicator from '@/components/consistency/ConsistencyIndicator.vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const projectStore = useProjectStore()
const { t, locale } = useI18n()
const {
  chapters,
  loading: chaptersLoading,
  pagination,
  nextChapterNumber,
  loadChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  changePage,
  changeSort,
  searchChapters,
  filterByStatus
} = useChapterList()

// 对话框状态
const addChapterVisible = ref(false)
const editChapterVisible = ref(false)
const batchChapterVisible = ref(false)
const addChapterForm = ref({
  title: '',
  outline: '',
  insertMode: 'append', // 'append' 添加到末尾, 'insert' 插入到指定位置
  chapterNumber: 1
})
const editChapterForm = ref<Chapter | null>(null)

// 搜索和筛选状态
const searchText = ref('')
const statusFilter = ref('')

// 表格列定义
const columns = computed(() => [
  {
    title: t('chapter.chapterTitle'),
    key: 'title',
    dataIndex: 'title',
    width: 300,
    sorter: true,
    sortDirections: ['ascend', 'descend']
  },
  {
    title: t('chapter.chapterStatus'),
    key: 'status',
    dataIndex: 'status',
    width: 140,
    sorter: true,
    sortDirections: ['ascend', 'descend']
  },
  {
    title: t('chapter.wordCount'),
    key: 'wordCount',
    dataIndex: 'content',
    width: 100
  },
  {
    title: t('common.updatedAt'),
    key: 'updatedAt',
    dataIndex: 'updatedAt',
    width: 150,
    sorter: true,
    sortDirections: ['ascend', 'descend']
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 200
  }
])

// 组件挂载时加载数据
onMounted(async () => {
  console.log('ChapterList mounted, currentProject:', projectStore.currentProject)
  if (projectStore.currentProject) {
    console.log('Loading chapters for project:', projectStore.currentProject.id)
    await loadChapters(projectStore.currentProject.id)
  } else {
    console.log('No current project, waiting for project store to load...')
    // 如果没有当前项目，等待项目加载
    setTimeout(async () => {
      if (projectStore.currentProject) {
        console.log('Project loaded, now loading chapters:', projectStore.currentProject.id)
        await loadChapters(projectStore.currentProject.id)
      }
    }, 1000)
  }
})

// 菜单点击处理
const handleAddMenuClick = ({ key }) => {
  switch (key) {
    case 'single':
      showAddChapterDialog()
      break
    case 'batch':
      showBatchChapterDialog()
      break
  }
}

// 添加章节相关方法
const showAddChapterDialog = () => {
  if (!projectStore.currentProject) {
    message.error(t('chapter.list.selectProjectFirst'))
    return
  }

  addChapterVisible.value = true
  addChapterForm.value = {
    title: '',
    outline: '',
    insertMode: 'append',
    chapterNumber: nextChapterNumber.value
  }
}

const showBatchChapterDialog = () => {
  if (!projectStore.currentProject) {
    message.error(t('chapter.list.selectProjectFirst'))
    return
  }

  batchChapterVisible.value = true
}

const handleBatchCreatorClose = () => {
  batchChapterVisible.value = false
}

const handleBatchCreatorSuccess = async (result: any) => {
  batchChapterVisible.value = false
  message.success(t('chapter.list.batchCreateSuccess', { count: result.createdChapters }))

  // 刷新章节列表以显示新创建的章节
  if (projectStore.currentProject) {
    await loadChapters(projectStore.currentProject.id)
  }
}

const handleAddChapter = async () => {
  if (!addChapterForm.value.title.trim()) {
    message.error(t('chapter.enterTitleRequired'))
    return
  }

  const isInsertMode = addChapterForm.value.insertMode === 'insert'
  const chapterNumber = isInsertMode ? addChapterForm.value.chapterNumber : undefined

  const newChapter = await createChapter({
    title: addChapterForm.value.title.trim(),
    outline: addChapterForm.value.outline.trim(),
    chapterNumber,
    insertMode: isInsertMode
  })

  if (newChapter) {
    addChapterVisible.value = false
    addChapterForm.value = {
      title: '',
      outline: '',
      insertMode: 'append',
      chapterNumber: 1
    }
  }
}

// 编辑章节相关方法
const editChapter = (chapter: Chapter) => {
  // 跳转到章节编辑器
  router.push({ name: 'chapter', params: { id: chapter.id } })
}

// 在弹窗中编辑章节基本信息
const editChapterInfo = (chapter: Chapter) => {
  editChapterForm.value = { ...chapter }
  editChapterVisible.value = true
}

const handleEditChapter = async () => {
  if (!editChapterForm.value) return

  if (!editChapterForm.value.title.trim()) {
    message.error(t('chapter.enterTitleRequired'))
    return
  }

  const updated = await updateChapter(editChapterForm.value.id, {
    title: editChapterForm.value.title.trim(),
    outline: editChapterForm.value.outline || '',
    status: editChapterForm.value.status
  })

  if (updated) {
    editChapterVisible.value = false
    editChapterForm.value = null
  }
}

// 复制章节
const duplicateChapter = async (chapter: Chapter) => {
  const newChapter = await createChapter({
    title: `${chapter.title}${t('chapter.list.duplicateSuffix')}`,
    outline: chapter.outline || ''
  })

  if (newChapter) {
    message.success(t('chapter.list.duplicateSuccess'))
  }
}

// 删除章节
const deleteChapterConfirm = async (chapterId: string) => {
  const success = await deleteChapter(chapterId)
  if (success) {
    message.success(t('message.deleteSuccess'))
  }
}

// 工具方法
const getStatusColor = (status: string) => {
  const colors = {
    'planning': 'default',
    'writing': 'processing',
    'reviewing': 'warning',
    'completed': 'success'
  }
  return colors[status as keyof typeof colors] || 'default'
}

const getStatusText = (status: string) => {
  const key = `chapter.status.${status}`
  const translated = t(key)
  return translated === key ? status : translated
}

const getWordCount = (content?: string) => {
  if (!content) return 0
  return countValidWords(content, {
    removeMarkdown: true,
    removeHtml: true
  })
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) {
    return t('date.justNow')
  } else if (diffInHours < 24) {
    return `${diffInHours}${t('date.hoursAgo')}`
  } else if (diffInHours < 24 * 7) {
    const days = Math.floor(diffInHours / 24)
    return `${days}${t('date.daysAgo')}`
  } else {
    const localeValue = locale.value === 'zh' ? 'zh-CN' : 'en-US'
    return new Intl.DateTimeFormat(localeValue, {
      month: 'short',
      day: 'numeric'
    }).format(date)
  }
}

// 分页和排序处理
const handlePageChange = (page: number, pageSize: number) => {
  changePage(page, pageSize)
}

const handlePageSizeChange = (current: number, size: number) => {
  changePage(current, size)
}

const handleTableChange = (pagination: any, filters: any, sorter: any) => {
  if (sorter && sorter.field) {
    const sortOrder = sorter.order === 'ascend' ? 'asc' : 'desc'
    let sortBy = sorter.field

    // 映射前端字段到后端字段
    if (sortBy === 'title') {
      sortBy = 'title'
    } else if (sortBy === 'status') {
      sortBy = 'status'
    } else if (sortBy === 'updatedAt') {
      sortBy = 'updatedAt'
    }

    changeSort(sortBy, sortOrder)
  }
}

// 搜索处理
const handleSearch = () => {
  searchChapters(searchText.value)
}

// 状态筛选处理
const handleStatusFilter = (value: string) => {
  statusFilter.value = value
  filterByStatus(value || undefined)
}
</script>

<style scoped>
.chapter-list-page {
  padding: 24px;
  background: var(--theme-bg-base);
  min-height: 50vh;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--theme-bg-container);
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.header-left {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--theme-text);
  margin: 0 0 8px 0;
}

.page-title .anticon {
  color: #1890ff;
  font-size: 22px;
}

.page-description {
  color: var(--theme-text-secondary);
  margin: 0;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.page-content {
  background: transparent;
}

.chapter-title-cell {
  font-weight: 500;
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ml-2 {
  margin-left: 0.5rem;
}

.word-count {
  color: var(--theme-text-secondary);
  font-variant-numeric: tabular-nums;
}

.update-time {
  color: var(--theme-text-secondary);
  font-size: 12px;
}

/* Dialog styles */
.chapter-info {
  margin-top: 16px;
  padding: 12px;
  background: var(--theme-bg-elevated);
  border-radius: 6px;
}

.chapter-info :deep(.ant-descriptions-item-label) {
  font-weight: 500;
  color: var(--theme-text-secondary);
}

.chapter-info :deep(.ant-descriptions-item-content) {
  color: var(--theme-text);
}

/* Table styles */
:deep(.ant-table-thead > tr > th) {
  background: var(--theme-bg-elevated);
  border-bottom: 1px solid var(--theme-border);
  font-weight: 600;
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: var(--theme-bg-elevated);
}

:deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid var(--theme-border);
}

/* Responsive design */
@media (max-width: 768px) {
  .chapter-list-page {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
