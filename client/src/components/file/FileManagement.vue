<template>
  <div class="file-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">文件管理</h1>
          <p class="page-subtitle">管理您的项目资源文件</p>
        </div>
        <div class="header-actions">
          <a-button @click="loadFiles" :loading="loading">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
          <a-button type="primary" @click="showUploadModal = true" size="large">
            <template #icon><UploadOutlined /></template>
            上传文件
          </a-button>
        </div>
      </div>
    </div>

    <!-- 统计面板 -->
    <div class="stats-panel">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12" :lg="6">
          <div class="stat-card" @click="filterCategory = ''">
            <div class="stat-icon total">
              <FileOutlined />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats?.totalFiles || 0 }}</div>
              <div class="stat-label">总文件数</div>
            </div>
          </div>
        </a-col>
        <a-col :xs="24" :sm="12" :lg="6">
          <div class="stat-card" @click="filterCategory = 'worldbook'">
            <div class="stat-icon worldbook">
              <BookOutlined />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ getCategoryCount('worldbook') }}</div>
              <div class="stat-label">世界书</div>
              <div class="stat-extra">{{ formatFileSize(getCategorySize('worldbook')) }}</div>
            </div>
          </div>
        </a-col>
        <a-col :xs="24" :sm="12" :lg="6">
          <div class="stat-card" @click="filterCategory = 'character'">
            <div class="stat-icon character">
              <TeamOutlined />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ getCategoryCount('character') }}</div>
              <div class="stat-label">角色卡</div>
              <div class="stat-extra">{{ formatFileSize(getCategorySize('character')) }}</div>
            </div>
          </div>
        </a-col>
        <a-col :xs="24" :sm="12" :lg="6">
          <div class="stat-card">
            <div class="stat-icon storage">
              <CloudServerOutlined />
            </div>
            <div class="stat-content">
              <div class="stat-value">
                <span class="size-number">{{ formatFileSizeNumber(stats?.totalSize || 0) }}</span>
                <span class="size-unit">{{ formatFileSizeUnit(stats?.totalSize || 0) }}</span>
              </div>
              <div class="stat-label">总容量</div>
            </div>
          </div>
        </a-col>
      </a-row>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <a-input-search
            v-model:value="searchKeyword"
            placeholder="搜索文件名..."
            class="search-input"
            @search="handleSearch"
            allow-clear
          >
            <template #prefix><SearchOutlined /></template>
          </a-input-search>

          <a-select
            v-model:value="filterCategory"
            placeholder="文件分类"
            class="filter-select"
            @change="handleFilterChange"
            allow-clear
          >
            <a-select-option value="">
              <AppstoreOutlined /> 全部分类
            </a-select-option>
            <a-select-option value="worldbook">
              <BookOutlined /> 世界书
            </a-select-option>
            <a-select-option value="character">
              <TeamOutlined /> 角色卡
            </a-select-option>
            <a-select-option value="document">
              <FileTextOutlined /> 文档
            </a-select-option>
            <a-select-option value="image">
              <PictureOutlined /> 图片
            </a-select-option>
            <a-select-option value="other">
              <FileOutlined /> 其他
            </a-select-option>
          </a-select>

          <a-select
            v-model:value="filterNovelId"
            placeholder="关联项目"
            class="filter-select"
            @change="handleFilterChange"
            :loading="novelsLoading"
            allow-clear
          >
            <a-select-option value="">
              <BookOutlined /> 全部项目
            </a-select-option>
            <a-select-option
              v-for="novel in novels"
              :key="novel.id"
              :value="novel.id"
            >
              {{ novel.title }}
            </a-select-option>
          </a-select>
        </div>

        <div class="toolbar-right">
          <a-badge :count="selectedFileIds.length" :offset="[-5, 5]">
            <a-dropdown v-if="selectedFileIds.length > 0" :trigger="['click']">
              <a-button>
                批量操作
                <DownOutlined />
              </a-button>
              <template #overlay>
                <a-menu @click="handleBatchAction">
                  <a-menu-item key="delete" danger>
                    <DeleteOutlined /> 删除选中
                  </a-menu-item>
                  <a-menu-item key="download">
                    <DownloadOutlined /> 下载选中
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-badge>

          <a-radio-group v-model:value="viewMode" button-style="solid" size="middle">
            <a-radio-button value="grid">
              <AppstoreOutlined />
            </a-radio-button>
            <a-radio-button value="list">
              <UnorderedListOutlined />
            </a-radio-button>
          </a-radio-group>
        </div>
      </div>

      <!-- 网格视图 -->
      <transition name="fade">
        <div v-if="viewMode === 'grid'" class="grid-view">
          <a-spin :spinning="loading" size="large">
            <a-empty v-if="!loading && files.length === 0" description="暂无文件">
              <a-button type="primary" @click="showUploadModal = true">
                立即上传
              </a-button>
            </a-empty>

            <div v-else class="file-grid">
              <transition-group name="file-list">
                <div
                  v-for="file in files"
                  :key="file.id"
                  class="file-card"
                  :class="{ selected: selectedFileIds.includes(file.id) }"
                  @click="handleCardClick(file)"
                >
                  <!-- 选择框 -->
                  <div class="file-checkbox" @click.stop>
                    <a-checkbox
                      :checked="selectedFileIds.includes(file.id)"
                      @change="() => toggleSelect(file.id)"
                    />
                  </div>

                  <!-- 文件预览 -->
                  <div class="file-preview">
                    <transition name="zoom">
                      <a-image
                        v-if="isImageFile(file.fileType)"
                        :src="file.fileUrl"
                        :alt="file.fileName"
                        :preview="false"
                        class="preview-image"
                        @click.stop="handlePreviewImage(file)"
                      />
                      <div v-else class="preview-icon">
                        <component
                          :is="getFileIcon(file.fileType)"
                          :style="{ fontSize: '48px' }"
                        />
                      </div>
                    </transition>
                  </div>

                  <!-- 文件信息 -->
                  <div class="file-info">
                    <div class="file-name" :title="file.fileName">
                      {{ file.fileName }}
                    </div>
                    <div class="file-meta">
                      <a-tag :color="getCategoryColor(file.category)" size="small">
                        {{ getCategoryName(file.category) }}
                      </a-tag>
                      <span class="file-size">{{ formatFileSize(file.fileSize) }}</span>
                    </div>
                    <div v-if="file.novel" class="file-novel">
                      <BookOutlined /> {{ file.novel.title }}
                    </div>
                    <div class="file-date">
                      {{ formatDateRelative(file.createdAt) }}
                    </div>
                  </div>

                  <!-- 快捷操作 -->
                  <div class="file-actions" @click.stop>
                    <a-tooltip title="查看详情">
                      <a-button type="text" size="small" @click="handleViewFile(file)">
                        <EyeOutlined />
                      </a-button>
                    </a-tooltip>
                    <a-tooltip title="下载">
                      <a-button type="text" size="small" @click="handleDownload(file)">
                        <DownloadOutlined />
                      </a-button>
                    </a-tooltip>
                    <a-dropdown :trigger="['click']">
                      <a-button type="text" size="small">
                        <MoreOutlined />
                      </a-button>
                      <template #overlay>
                        <a-menu @click="(e) => handleMenuAction(e.key, file)">
                          <a-menu-item key="edit">
                            <EditOutlined /> 编辑信息
                          </a-menu-item>
                          <a-menu-item key="copy">
                            <CopyOutlined /> 复制链接
                          </a-menu-item>
                          <a-menu-divider />
                          <a-menu-item key="delete" danger>
                            <DeleteOutlined /> 删除文件
                          </a-menu-item>
                        </a-menu>
                      </template>
                    </a-dropdown>
                  </div>
                </div>
              </transition-group>
            </div>
          </a-spin>

          <!-- 分页 -->
          <div v-if="files.length > 0" class="pagination-wrapper">
            <a-pagination
              v-model:current="pagination.current"
              v-model:page-size="pagination.pageSize"
              :total="pagination.total"
              :show-size-changer="true"
              :show-quick-jumper="true"
              :show-total="total => `共 ${total} 个文件`"
              :page-size-options="['12', '24', '48', '96']"
              @change="handlePaginationChange"
            />
          </div>
        </div>
      </transition>

      <!-- 列表视图 -->
      <transition name="fade">
        <div v-if="viewMode === 'list'" class="list-view">
          <a-table
            :columns="columns"
            :data-source="files"
            :loading="loading"
            :pagination="paginationConfig"
            :row-selection="rowSelection"
            :row-class-name="() => 'table-row'"
            @change="handleTableChange"
            row-key="id"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'fileName'">
                <div class="file-info-cell">
                  <component
                    :is="getFileIcon(record.fileType)"
                    class="file-icon"
                  />
                  <div class="file-details">
                    <a
                      :href="record.fileUrl"
                      target="_blank"
                      class="file-link"
                      @click.prevent="handleViewFile(record)"
                    >
                      {{ record.fileName }}
                    </a>
                    <div v-if="record.description" class="file-description">
                      {{ record.description }}
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="column.key === 'preview'">
                <a-image
                  v-if="isImageFile(record.fileType)"
                  :src="record.fileUrl"
                  :width="40"
                  :height="40"
                  :preview="false"
                  class="preview-thumbnail"
                  @click="handlePreviewImage(record)"
                />
                <component
                  v-else
                  :is="getFileIcon(record.fileType)"
                  class="preview-icon-small"
                />
              </template>

              <template v-else-if="column.key === 'fileSize'">
                <span class="file-size-text">
                  {{ formatFileSize(record.fileSize) }}
                </span>
              </template>

              <template v-else-if="column.key === 'category'">
                <a-tag :color="getCategoryColor(record.category)">
                  {{ getCategoryName(record.category) }}
                </a-tag>
              </template>

              <template v-else-if="column.key === 'novel'">
                <span v-if="record.novel" class="novel-tag">
                  <BookOutlined /> {{ record.novel.title }}
                </span>
                <span v-else class="text-muted">-</span>
              </template>

              <template v-else-if="column.key === 'createdAt'">
                <a-tooltip :title="formatDate(record.createdAt)">
                  <span class="date-text">
                    {{ formatDateRelative(record.createdAt) }}
                  </span>
                </a-tooltip>
              </template>

              <template v-else-if="column.key === 'actions'">
                <a-space :size="4">
                  <a-tooltip title="查看">
                    <a-button
                      type="text"
                      size="small"
                      @click="handleViewFile(record)"
                    >
                      <EyeOutlined />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip title="下载">
                    <a-button
                      type="text"
                      size="small"
                      @click="handleDownload(record)"
                    >
                      <DownloadOutlined />
                    </a-button>
                  </a-tooltip>
                  <a-dropdown :trigger="['click']">
                    <a-button type="text" size="small">
                      <MoreOutlined />
                    </a-button>
                    <template #overlay>
                      <a-menu @click="(e) => handleMenuAction(e.key, record)">
                        <a-menu-item key="edit">
                          <EditOutlined /> 编辑
                        </a-menu-item>
                        <a-menu-item key="copy">
                          <CopyOutlined /> 复制链接
                        </a-menu-item>
                        <a-menu-divider />
                        <a-menu-item key="delete" danger>
                          <DeleteOutlined /> 删除
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </transition>
    </div>

    <!-- 上传对话框 -->
    <a-modal
      v-model:open="showUploadModal"
      title="上传文件"
      width="600px"
      :footer="null"
      centered
    >
      <div class="upload-modal-content">
        <a-upload-dragger
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          :max-count="1"
          @remove="handleRemoveFile"
          accept="*"
          class="upload-dragger"
        >
          <p class="upload-icon">
            <InboxOutlined />
          </p>
          <p class="upload-text">点击或拖拽文件到此区域上传</p>
          <p class="upload-hint">
            支持任意格式文件，单个文件不超过 50MB
          </p>
        </a-upload-dragger>

        <a-form
          :model="uploadForm"
          layout="vertical"
          class="upload-form"
        >
          <a-form-item label="文件分类" required>
            <a-radio-group
              v-model:value="uploadForm.category"
              button-style="solid"
              class="category-radio"
            >
              <a-radio-button value="worldbook">
                <BookOutlined /> 世界书
              </a-radio-button>
              <a-radio-button value="character">
                <TeamOutlined /> 角色卡
              </a-radio-button>
              <a-radio-button value="document">
                <FileTextOutlined /> 文档
              </a-radio-button>
              <a-radio-button value="image">
                <PictureOutlined /> 图片
              </a-radio-button>
              <a-radio-button value="other">
                <FileOutlined /> 其他
              </a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="关联项目">
            <a-select
              v-model:value="uploadForm.novelId"
              :loading="novelsLoading"
              placeholder="选择项目（可选）"
              allow-clear
            >
              <a-select-option
                v-for="novel in novels"
                :key="novel.id"
                :value="novel.id"
              >
                <BookOutlined /> {{ novel.title }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="文件描述">
            <a-textarea
              v-model:value="uploadForm.description"
              :rows="3"
              placeholder="添加文件描述（可选）"
              :maxlength="500"
              show-count
            />
          </a-form-item>
        </a-form>

        <div class="upload-actions">
          <a-button @click="showUploadModal = false">
            取消
          </a-button>
          <a-button
            type="primary"
            :loading="uploading"
            :disabled="fileList.length === 0"
            @click="handleUpload"
          >
            确定上传
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- 编辑对话框 -->
    <a-modal
      v-model:open="showEditModal"
      title="编辑文件信息"
      width="600px"
      @ok="handleUpdate"
      @cancel="resetEditForm"
      :confirm-loading="updating"
      ok-text="保存"
      cancel-text="取消"
      centered
    >
      <a-form :model="editForm" layout="vertical">
        <a-form-item label="文件名">
          <a-input :value="editForm.fileName" disabled />
        </a-form-item>

        <a-form-item label="文件分类" required>
          <a-radio-group
            v-model:value="editForm.category"
            button-style="solid"
            class="category-radio"
          >
            <a-radio-button value="worldbook">
              <BookOutlined /> 世界书
            </a-radio-button>
            <a-radio-button value="character">
              <TeamOutlined /> 角色卡
            </a-radio-button>
            <a-radio-button value="document">
              <FileTextOutlined /> 文档
            </a-radio-button>
            <a-radio-button value="image">
              <PictureOutlined /> 图片
            </a-radio-button>
            <a-radio-button value="other">
              <FileOutlined /> 其他
            </a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="关联项目">
          <a-select
            v-model:value="editForm.novelId"
            :loading="novelsLoading"
            placeholder="选择项目（可选）"
            allow-clear
          >
            <a-select-option
              v-for="novel in novels"
              :key="novel.id"
              :value="novel.id"
            >
              <BookOutlined /> {{ novel.title }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="文件描述">
          <a-textarea
            v-model:value="editForm.description"
            :rows="3"
            placeholder="添加文件描述（可选）"
            :maxlength="500"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 文件详情抽屉 -->
    <a-drawer
      v-model:open="showDetailDrawer"
      title="文件详情"
      width="500"
      class="detail-drawer"
    >
      <div v-if="currentFile" class="detail-content">
        <!-- 文件预览 -->
        <div class="detail-preview">
          <a-image
            v-if="isImageFile(currentFile.fileType)"
            :src="currentFile.fileUrl"
            :alt="currentFile.fileName"
            class="detail-image"
          />
          <div v-else class="detail-placeholder">
            <component
              :is="getFileIcon(currentFile.fileType)"
              class="detail-icon"
            />
          </div>
        </div>

        <!-- 文件信息 -->
        <a-descriptions bordered :column="1" size="small">
          <a-descriptions-item label="文件名">
            {{ currentFile.fileName }}
          </a-descriptions-item>

          <a-descriptions-item label="文件大小">
            {{ formatFileSize(currentFile.fileSize) }}
          </a-descriptions-item>

          <a-descriptions-item label="文件类型">
            {{ currentFile.fileType }}
          </a-descriptions-item>

          <a-descriptions-item label="分类">
            <a-tag :color="getCategoryColor(currentFile.category)">
              {{ getCategoryName(currentFile.category) }}
            </a-tag>
          </a-descriptions-item>

          <a-descriptions-item label="关联项目">
            <span v-if="currentFile.novel">
              <BookOutlined /> {{ currentFile.novel.title }}
            </span>
            <span v-else class="text-muted">未关联</span>
          </a-descriptions-item>

          <a-descriptions-item label="上传时间">
            {{ formatDate(currentFile.createdAt) }}
          </a-descriptions-item>

          <a-descriptions-item label="更新时间">
            {{ formatDate(currentFile.updatedAt) }}
          </a-descriptions-item>

          <a-descriptions-item label="文件描述" v-if="currentFile.description">
            {{ currentFile.description }}
          </a-descriptions-item>

          <a-descriptions-item label="文件链接">
            <a-typography-paragraph
              :copyable="{ text: currentFile.fileUrl, tooltips: ['复制链接', '已复制!'] }"
              class="file-url"
            >
              <a :href="currentFile.fileUrl" target="_blank" class="link-text">
                {{ currentFile.fileUrl }}
              </a>
            </a-typography-paragraph>
          </a-descriptions-item>
        </a-descriptions>

        <!-- 操作按钮 -->
        <div class="detail-actions">
          <a-space>
            <a-button @click="handleEdit(currentFile)">
              <EditOutlined /> 编辑
            </a-button>
            <a-button @click="handleDownload(currentFile)">
              <DownloadOutlined /> 下载
            </a-button>
            <a-popconfirm
              title="确定删除此文件？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="() => { handleDelete(currentFile); showDetailDrawer = false }"
            >
              <a-button danger>
                <DeleteOutlined /> 删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  UploadOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  FileOutlined,
  PictureOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  BookOutlined,
  TeamOutlined,
  DownOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  InboxOutlined,
  EyeOutlined,
  DownloadOutlined,
  MoreOutlined,
  CopyOutlined,
  CloudServerOutlined
} from '@ant-design/icons-vue'
import { api } from '@/utils/api'

// 数据状态
const files = ref<any[]>([])
const stats = ref<any>(null)
const loading = ref(false)
const uploading = ref(false)
const updating = ref(false)
const selectedFileIds = ref<string[]>([])
const fileList = ref<any[]>([])
const currentFile = ref<any>(null)

// 筛选和搜索
const searchKeyword = ref('')
const filterCategory = ref('')
const filterNovelId = ref('')
const viewMode = ref<'grid' | 'list'>('grid')

// 对话框和抽屉状态
const showUploadModal = ref(false)
const showEditModal = ref(false)
const showDetailDrawer = ref(false)

// 小说列表
const novels = ref<any[]>([])
const novelsLoading = ref(false)

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 12,
  total: 0
})

// 上传表单
const uploadForm = reactive({
  category: 'other',
  novelId: '',
  description: ''
})

// 编辑表单
const editForm = reactive({
  id: '',
  fileName: '',
  category: '',
  novelId: null as string | null,
  description: ''
})

// 表格列定义
const columns = [
  {
    title: '预览',
    key: 'preview',
    width: 60,
    align: 'center'
  },
  {
    title: '文件名',
    key: 'fileName',
    ellipsis: true
  },
  {
    title: '分类',
    key: 'category',
    width: 100,
    filters: [
      { text: '世界书', value: 'worldbook' },
      { text: '角色卡', value: 'character' },
      { text: '文档', value: 'document' },
      { text: '图片', value: 'image' },
      { text: '其他', value: 'other' }
    ]
  },
  {
    title: '大小',
    key: 'fileSize',
    width: 100,
    sorter: true
  },
  {
    title: '关联项目',
    key: 'novel',
    width: 150,
    ellipsis: true
  },
  {
    title: '上传时间',
    key: 'createdAt',
    width: 120,
    sorter: true
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right'
  }
]

// 分页配置
const paginationConfig = computed(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: pagination.total,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 个文件`,
  pageSizeOptions: ['10', '20', '50', '100']
}))

// 行选择配置
const rowSelection = computed(() => ({
  selectedRowKeys: selectedFileIds.value,
  onChange: (selectedKeys: string[]) => {
    selectedFileIds.value = selectedKeys
  }
}))

// 加载文件列表
const loadFiles = async () => {
  try {
    loading.value = true
    const params: any = {
      page: pagination.current,
      limit: pagination.pageSize
    }

    if (filterCategory.value) {
      params.category = filterCategory.value
    }

    if (filterNovelId.value) {
      params.novelId = filterNovelId.value
    }

    if (searchKeyword.value) {
      params.search = searchKeyword.value
    }

    const response = await api.get('/api/upload/files', { params })
    files.value = response.data.files
    pagination.total = response.data.pagination.total
  } catch (error: any) {
    message.error(error.response?.data?.error || '加载文件列表失败')
  } finally {
    loading.value = false
  }
}

// 加载统计信息
const loadStats = async () => {
  try {
    const params: any = {}
    if (filterNovelId.value) {
      params.novelId = filterNovelId.value
    }

    const response = await api.get('/api/upload/stats', { params })
    stats.value = response.data
  } catch (error: any) {
    console.error('加载统计信息失败:', error)
  }
}

// 加载小说列表
const loadNovels = async () => {
  try {
    novelsLoading.value = true
    const response = await api.get('/api/novels')
    novels.value = response.data
  } catch (error: any) {
    console.error('加载项目列表失败:', error)
  } finally {
    novelsLoading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.current = 1
  loadFiles()
}

// 筛选变化
const handleFilterChange = () => {
  pagination.current = 1
  loadFiles()
  loadStats()
}

// 分页变化
const handlePaginationChange = () => {
  loadFiles()
}

// 上传前校验
const beforeUpload = (file: File) => {
  const isLt50M = file.size / 1024 / 1024 < 50
  if (!isLt50M) {
    message.error('文件大小不能超过 50MB!')
    return false
  }
  return false // 阻止自动上传
}

// 移除文件
const handleRemoveFile = () => {
  fileList.value = []
}

// 上传文件
const handleUpload = async () => {
  if (fileList.value.length === 0) {
    message.warning('请选择要上传的文件')
    return
  }

  try {
    uploading.value = true
    const formData = new FormData()
    formData.append('file', fileList.value[0].originFileObj)
    formData.append('category', uploadForm.category)
    if (uploadForm.novelId) {
      formData.append('novelId', uploadForm.novelId)
    }
    if (uploadForm.description) {
      formData.append('description', uploadForm.description)
    }

    await api.post('/api/upload/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    message.success('文件上传成功')
    showUploadModal.value = false
    resetUploadForm()
    loadFiles()
    loadStats()
  } catch (error: any) {
    message.error(error.response?.data?.error || '文件上传失败')
  } finally {
    uploading.value = false
  }
}

// 重置上传表单
const resetUploadForm = () => {
  uploadForm.category = 'other'
  uploadForm.novelId = ''
  uploadForm.description = ''
  fileList.value = []
}

// 卡片点击
const handleCardClick = (file: any) => {
  handleViewFile(file)
}

// 预览图片
const handlePreviewImage = (file: any) => {
  // Ant Design Vue 的 Image 组件会自动处理预览
}

// 编辑文件
const handleEdit = (record: any) => {
  editForm.id = record.id
  editForm.fileName = record.fileName
  editForm.category = record.category
  editForm.novelId = record.novelId
  editForm.description = record.description || ''
  showEditModal.value = true
  showDetailDrawer.value = false
}

// 更新文件信息
const handleUpdate = async () => {
  try {
    updating.value = true
    await api.put(`/api/upload/files/${editForm.id}`, {
      category: editForm.category,
      novelId: editForm.novelId,
      description: editForm.description
    })

    message.success('文件信息更新成功')
    showEditModal.value = false
    resetEditForm()
    loadFiles()

    // 如果当前文件详情打开，更新它
    if (currentFile.value?.id === editForm.id) {
      const updatedFile = files.value.find(f => f.id === editForm.id)
      if (updatedFile) {
        currentFile.value = updatedFile
      }
    }
  } catch (error: any) {
    message.error(error.response?.data?.error || '更新文件信息失败')
  } finally {
    updating.value = false
  }
}

// 重置编辑表单
const resetEditForm = () => {
  editForm.id = ''
  editForm.fileName = ''
  editForm.category = ''
  editForm.novelId = null
  editForm.description = ''
}

// 查看文件详情
const handleViewFile = (record: any) => {
  currentFile.value = record
  showDetailDrawer.value = true
}

// 下载文件
const handleDownload = (record: any) => {
  window.open(record.fileUrl, '_blank')
}

// 复制链接
const handleCopyLink = (record: any) => {
  navigator.clipboard.writeText(record.fileUrl)
  message.success('链接已复制到剪贴板')
}

// 菜单操作
const handleMenuAction = (key: string, file: any) => {
  switch (key) {
    case 'edit':
      handleEdit(file)
      break
    case 'copy':
      handleCopyLink(file)
      break
    case 'delete':
      handleDelete(file)
      break
  }
}

// 删除文件
const handleDelete = (record: any) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除文件 "${record.fileName}" 吗？此操作不可恢复。`,
    okText: '确定',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await api.delete(`/api/upload/files/${record.id}`)
        message.success('文件删除成功')
        loadFiles()
        loadStats()
      } catch (error: any) {
        message.error(error.response?.data?.error || '删除文件失败')
      }
    }
  })
}

// 批量操作
const handleBatchAction = ({ key }: { key: string }) => {
  if (key === 'delete') {
    handleBatchDelete()
  } else if (key === 'download') {
    handleBatchDownload()
  }
}

// 批量删除
const handleBatchDelete = () => {
  if (selectedFileIds.value.length === 0) {
    message.warning('请选择要删除的文件')
    return
  }

  Modal.confirm({
    title: '确认批量删除',
    content: `确定要删除选中的 ${selectedFileIds.value.length} 个文件吗？此操作不可恢复。`,
    okText: '确定',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await api.post('/api/upload/files/batch-delete', {
          fileIds: selectedFileIds.value
        })
        message.success('批量删除成功')
        selectedFileIds.value = []
        loadFiles()
        loadStats()
      } catch (error: any) {
        message.error(error.response?.data?.error || '批量删除失败')
      }
    }
  })
}

// 批量下载
const handleBatchDownload = () => {
  const selectedFiles = files.value.filter(f => selectedFileIds.value.includes(f.id))
  selectedFiles.forEach(file => {
    window.open(file.fileUrl, '_blank')
  })
  message.success(`开始下载 ${selectedFiles.length} 个文件`)
}

// 切换选择
const toggleSelect = (fileId: string) => {
  const index = selectedFileIds.value.indexOf(fileId)
  if (index > -1) {
    selectedFileIds.value.splice(index, 1)
  } else {
    selectedFileIds.value.push(fileId)
  }
}

// 表格变化
const handleTableChange = (pag: any, filters: any, sorter: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize

  // 处理筛选
  if (filters.category) {
    filterCategory.value = filters.category[0] || ''
  }

  loadFiles()
}

// 工具函数
const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatFileSizeNumber = (bytes: number) => {
  if (!bytes || bytes === 0) return '0'
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (Math.round(bytes / Math.pow(k, i) * 100) / 100).toString()
}

const formatFileSizeUnit = (bytes: number) => {
  if (!bytes || bytes === 0) return 'B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return sizes[i]
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateRelative = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const isImageFile = (mimeType: string) => {
  return mimeType?.startsWith('image/')
}

const getFileIcon = (mimeType: string) => {
  if (!mimeType) return FileOutlined
  if (mimeType.startsWith('image/')) return PictureOutlined
  if (mimeType.startsWith('video/')) return FileOutlined
  if (mimeType.includes('pdf')) return FileTextOutlined
  if (mimeType.includes('word') || mimeType.includes('document')) return FileTextOutlined
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return FileTextOutlined
  return FileOutlined
}

const getCategoryName = (category: string) => {
  const names: Record<string, string> = {
    worldbook: '世界书',
    character: '角色卡',
    document: '文档',
    image: '图片',
    other: '其他'
  }
  return names[category] || category
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    worldbook: 'purple',
    character: 'blue',
    document: 'orange',
    image: 'green',
    other: 'default'
  }
  return colors[category] || 'default'
}

const getCategoryCount = (category: string) => {
  if (!stats.value?.categories) return 0
  const cat = stats.value.categories.find((c: any) => c.category === category)
  return cat?.count || 0
}

const getCategorySize = (category: string) => {
  if (!stats.value?.categories) return 0
  const cat = stats.value.categories.find((c: any) => c.category === category)
  return cat?.size || 0
}

// 初始化
onMounted(() => {
  loadFiles()
  loadStats()
  loadNovels()
})
</script>

<style scoped lang="scss">
.file-management {
  min-height: 100vh;
  background: var(--theme-bg-base);
  padding: 24px;
  transition: background-color 0.3s ease;

  // 页面头部
  .page-header {
    background: var(--theme-bg-container);
    border-radius: 16px;
    padding: 24px 32px;
    margin-bottom: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid var(--theme-border);
    transition: all 0.3s ease;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        .page-title {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: var(--theme-text);
          line-height: 1.4;
          transition: color 0.3s ease;
        }

        .page-subtitle {
          margin: 4px 0 0;
          font-size: 14px;
          color: var(--theme-text-secondary);
          transition: color 0.3s ease;
        }
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }
    }
  }

  // 统计面板
  .stats-panel {
    margin-bottom: 24px;

    .stat-card {
      background: var(--theme-bg-container);
      border-radius: 12px;
      padding: 20px;
      min-height: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid var(--theme-border);

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: #fff;

        &.total {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        &.worldbook {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        &.character {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        &.storage {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }
      }

      .stat-content {
        flex: 1;

        .stat-value {
          font-size: 28px;
          font-weight: 600;
          color: var(--theme-text);
          line-height: 1.2;
          transition: color 0.3s ease;
          display: flex;
          align-items: baseline;
          gap: 4px;

          .size-number {
            font-size: 28px;
            font-weight: 600;
          }

          .size-unit {
            font-size: 16px;
            font-weight: 500;
            color: var(--theme-text-secondary);
            opacity: 0.85;
          }
        }

        .stat-label {
          font-size: 14px;
          color: var(--theme-text-secondary);
          margin-top: 4px;
          transition: color 0.3s ease;
        }

        .stat-extra {
          font-size: 12px;
          color: var(--theme-text-secondary);
          opacity: 0.65;
          margin-top: 2px;
          transition: color 0.3s ease;
        }
      }
    }
  }

  // 主内容区
  .main-content {
    background: var(--theme-bg-container);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid var(--theme-border);
    transition: all 0.3s ease;

    // 工具栏
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--theme-border);
      flex-wrap: wrap;
      gap: 16px;
      transition: border-color 0.3s ease;

      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;

        .search-input {
          width: 280px;
        }

        .filter-select {
          width: 140px;
        }
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }
    }

    // 网格视图
    .grid-view {
      .file-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 20px;
        margin-bottom: 24px;
      }

      .file-card {
        background: var(--theme-bg-container);
        border: 2px solid var(--theme-border);
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;

        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
          border-color: #1890ff;

          .file-actions {
            opacity: 1;
            transform: translateY(0);
          }
        }

        &.selected {
          border-color: #1890ff;
          background: var(--theme-selected-bg);
        }

        .file-checkbox {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 10;
          background: var(--theme-bg-container);
          border-radius: 4px;
          padding: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .file-preview {
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--theme-bg-elevated);
          overflow: hidden;
          transition: background-color 0.3s ease;

          .preview-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .preview-icon {
            font-size: 48px;
            color: var(--theme-text-secondary);
            opacity: 0.5;
            transition: color 0.3s ease;
          }
        }

        .file-info {
          padding: 16px;

          .file-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--theme-text);
            margin-bottom: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            transition: color 0.3s ease;
          }

          .file-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;

            .file-size {
              font-size: 12px;
              color: var(--theme-text-secondary);
              transition: color 0.3s ease;
            }
          }

          .file-novel {
            font-size: 12px;
            color: #1890ff;
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .file-date {
            font-size: 12px;
            color: var(--theme-text-secondary);
            opacity: 0.7;
            transition: color 0.3s ease;
          }
        }

        .file-actions {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 12px;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
          display: flex;
          justify-content: center;
          gap: 8px;
          opacity: 0;
          transform: translateY(100%);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

          :deep(.ant-btn) {
            color: #fff;
            border-color: rgba(255, 255, 255, 0.3);

            &:hover {
              background: rgba(255, 255, 255, 0.2);
              border-color: #fff;
            }
          }
        }
      }

      .pagination-wrapper {
        display: flex;
        justify-content: center;
        padding-top: 16px;
      }
    }

    // 列表视图
    .list-view {
      .file-info-cell {
        display: flex;
        align-items: center;
        gap: 12px;

        .file-icon {
          font-size: 24px;
          color: var(--theme-text-secondary);
          flex-shrink: 0;
          transition: color 0.3s ease;
        }

        .file-details {
          flex: 1;
          min-width: 0;

          .file-link {
            color: #1890ff;
            font-weight: 500;
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

            &:hover {
              text-decoration: underline;
            }
          }

          .file-description {
            font-size: 12px;
            color: var(--theme-text-secondary);
            margin-top: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            transition: color 0.3s ease;
          }
        }
      }

      .preview-thumbnail {
        border-radius: 6px;
        object-fit: cover;
        cursor: pointer;
      }

      .preview-icon-small {
        font-size: 28px;
        color: var(--theme-text-secondary);
        opacity: 0.5;
        transition: color 0.3s ease;
      }

      .file-size-text,
      .date-text {
        color: var(--theme-text);
        transition: color 0.3s ease;
      }

      .novel-tag {
        color: #1890ff;
        font-size: 13px;
      }

      .text-muted {
        color: var(--theme-text-secondary);
        opacity: 0.7;
        transition: color 0.3s ease;
      }

      :deep(.table-row) {
        transition: all 0.3s;

        &:hover {
          background: var(--theme-bg-elevated);
        }
      }
    }
  }
}

// 上传对话框
.upload-modal-content {
  .upload-dragger {
    margin-bottom: 24px;

    .upload-icon {
      font-size: 48px;
      color: #1890ff;
    }

    .upload-text {
      font-size: 16px;
      font-weight: 500;
      color: var(--theme-text);
      margin: 8px 0 0;
      transition: color 0.3s ease;
    }

    .upload-hint {
      font-size: 14px;
      color: var(--theme-text-secondary);
      transition: color 0.3s ease;
    }
  }

  .upload-form {
    .category-radio {
      width: 100%;

      :deep(.ant-radio-button-wrapper) {
        flex: 1;
        text-align: center;
      }
    }
  }

  .upload-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--theme-border);
    transition: border-color 0.3s ease;
  }
}

// 文件详情抽屉
.detail-drawer {
  .detail-content {
    .detail-preview {
      margin-bottom: 24px;
      border-radius: 8px;
      overflow: hidden;
      background: var(--theme-bg-elevated);
      transition: background-color 0.3s ease;

      .detail-image {
        width: 100%;
        display: block;
      }

      .detail-placeholder {
        height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;

        .detail-icon {
          font-size: 64px;
          color: var(--theme-text-secondary);
          opacity: 0.5;
          transition: color 0.3s ease;
        }
      }
    }

    .file-url {
      margin-bottom: 0;

      .link-text {
        color: #1890ff;
        word-break: break-all;
      }
    }

    .detail-actions {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--theme-border);
      transition: border-color 0.3s ease;
    }
  }
}

// 动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.file-list-move,
.file-list-enter-active,
.file-list-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.file-list-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.file-list-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.file-list-leave-active {
  position: absolute;
}

.zoom-enter-active,
.zoom-leave-active {
  transition: all 0.3s;
}

.zoom-enter-from,
.zoom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

// 响应式
@media (max-width: 1200px) {
  .file-management {
    .main-content .grid-view .file-grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
  }
}

@media (max-width: 768px) {
  .file-management {
    padding: 16px;

    .page-header {
      padding: 20px;

      .header-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;

        .header-actions {
          width: 100%;

          :deep(.ant-btn) {
            flex: 1;
          }
        }
      }
    }

    .main-content {
      padding: 16px;

      .toolbar {
        flex-direction: column;
        align-items: stretch;

        .toolbar-left {
          flex-direction: column;

          .search-input,
          .filter-select {
            width: 100%;
          }
        }

        .toolbar-right {
          justify-content: space-between;
        }
      }

      .grid-view .file-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;

        .file-card .file-preview {
          height: 150px;
        }
      }
    }
  }
}
</style>