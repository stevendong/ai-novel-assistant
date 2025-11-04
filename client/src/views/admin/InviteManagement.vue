<template>
  <div class="invite-management">
    <div class="invite-header">
      <h2>{{ t('admin.inviteManagement.title') }}</h2>
      <div class="invite-actions">
        <a-button type="primary" @click="showCreateModal = true">
          <PlusOutlined />
          {{ t('admin.inviteManagement.toolbar.generate') }}
        </a-button>
        <a-button @click="showBatchModal = true">
          <TeamOutlined />
          {{ t('admin.inviteManagement.toolbar.batch') }}
        </a-button>
        <a-button @click="refreshData">
          <ReloadOutlined />
          {{ t('admin.inviteManagement.toolbar.refresh') }}
        </a-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="invite-stats">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-card>
            <a-statistic :title="t('admin.inviteManagement.stats.total')" :value="stats.total" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic :title="t('admin.inviteManagement.stats.used')" :value="stats.used" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic :title="t('admin.inviteManagement.stats.active')" :value="stats.active" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic :title="t('admin.inviteManagement.stats.usageRate')" :value="stats.usageRate" suffix="%" />
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 搜索和筛选 -->
    <div class="invite-filters">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-input
            v-model:value="searchText"
            :placeholder="t('admin.inviteManagement.filters.searchPlaceholder')"
            @input="handleSearch"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
        </a-col>
        <a-col :span="4">
          <a-select
            v-model:value="filterType"
            :placeholder="t('admin.inviteManagement.filters.type.label')"
            @change="handleFilter"
            style="width: 100%"
          >
            <a-select-option value="">{{ t('admin.inviteManagement.filters.type.all') }}</a-select-option>
            <a-select-option value="system">{{ t('admin.inviteManagement.filters.type.system') }}</a-select-option>
            <a-select-option value="admin">{{ t('admin.inviteManagement.filters.type.admin') }}</a-select-option>
            <a-select-option value="user">{{ t('admin.inviteManagement.filters.type.user') }}</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select
            v-model:value="filterStatus"
            :placeholder="t('admin.inviteManagement.filters.status.label')"
            @change="handleFilter"
            style="width: 100%"
          >
            <a-select-option value="">{{ t('admin.inviteManagement.filters.status.all') }}</a-select-option>
            <a-select-option value="true">{{ t('admin.inviteManagement.filters.status.active') }}</a-select-option>
            <a-select-option value="false">{{ t('admin.inviteManagement.filters.status.inactive') }}</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </div>

    <!-- 邀请码列表 -->
    <div class="invite-table">
      <a-table
        :dataSource="inviteCodes"
        :columns="tableColumns"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'code'">
            <a-typography-text
              :copyable="{ text: record.code }"
              code
            >
              {{ record.code }}
            </a-typography-text>
          </template>

          <template v-else-if="column.dataIndex === 'codeType'">
            <a-tag :color="getTypeColor(record.codeType)">
              {{ getTypeText(record.codeType) }}
            </a-tag>
          </template>

          <template v-else-if="column.dataIndex === 'isActive'">
            <a-tag :color="record.isActive ? 'success' : 'error'">
              {{ record.isActive ? t('admin.inviteManagement.status.active') : t('admin.inviteManagement.status.inactive') }}
            </a-tag>
          </template>

          <template v-else-if="column.dataIndex === 'usage'">
            <span>{{ t('admin.inviteManagement.table.usageProgress', { used: record.usedCount, max: record.maxUses }) }}</span>
            <a-progress
              :percent="(record.usedCount / record.maxUses) * 100"
              :show-info="false"
              size="small"
              style="margin-top: 4px"
            />
          </template>

          <template v-else-if="column.dataIndex === 'creator'">
            <span v-if="record.creator">
              {{ record.creator.nickname || record.creator.username }}
            </span>
            <a-tag v-else color="blue">{{ t('admin.inviteManagement.status.system') }}</a-tag>
          </template>

          <template v-else-if="column.dataIndex === 'expiresAt'">
            <span v-if="record.expiresAt">
              {{ formatDate(record.expiresAt) }}
            </span>
            <a-tag v-else color="green">{{ t('admin.inviteManagement.status.neverExpires') }}</a-tag>
          </template>

          <template v-else-if="column.dataIndex === 'actions'">
            <a-space>
              <a-button
                size="small"
                @click="viewUsages(record)"
              >
                {{ t('admin.inviteManagement.actions.viewUsage') }}
              </a-button>
              <a-button
                v-if="record.isActive"
                size="small"
                danger
                @click="deactivateCode(record)"
              >
                {{ t('admin.inviteManagement.actions.deactivate') }}
              </a-button>
              <a-button
                v-if="!record.isActive"
                size="small"
                type="primary"
                @click="activateCode(record)"
              >
                {{ t('admin.inviteManagement.actions.activate') }}
              </a-button>
              <a-popconfirm
                :title="t('admin.inviteManagement.popconfirm.deleteTitle')"
                @confirm="deleteCode(record)"
              >
                <a-button
                  size="small"
                  danger
                  :disabled="record.usages && record.usages.length > 0"
                >
                  {{ t('admin.inviteManagement.actions.delete') }}
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 创建邀请码弹窗 -->
    <a-modal
      v-model:open="showCreateModal"
      :title="t('admin.inviteManagement.forms.create.title')"
      @ok="createInviteCode"
      :confirm-loading="createLoading"
    >
      <a-form :model="createForm" layout="vertical">
        <a-form-item :label="t('admin.inviteManagement.forms.create.type')" required>
          <a-select v-model:value="createForm.codeType">
            <a-select-option value="user">{{ t('admin.inviteManagement.filters.type.user') }}</a-select-option>
            <a-select-option value="admin">{{ t('admin.inviteManagement.filters.type.admin') }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="t('admin.inviteManagement.forms.create.maxUses')" required>
          <a-input-number
            v-model:value="createForm.maxUses"
            :min="1"
            :max="100"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item :label="t('admin.inviteManagement.forms.create.expiresIn')">
          <a-input-number
            v-model:value="createForm.expiresIn"
            :min="1"
            :placeholder="t('admin.inviteManagement.forms.create.expiresPlaceholder')"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item :label="t('admin.inviteManagement.forms.create.description')">
          <a-textarea
            v-model:value="createForm.description"
            :placeholder="t('admin.inviteManagement.forms.create.descriptionPlaceholder')"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量生成弹窗 -->
    <a-modal
      v-model:open="showBatchModal"
      :title="t('admin.inviteManagement.forms.batch.title')"
      @ok="batchCreateInviteCodes"
      :confirm-loading="batchLoading"
    >
      <a-form :model="batchForm" layout="vertical">
        <a-form-item :label="t('admin.inviteManagement.forms.batch.count')" required>
          <a-input-number
            v-model:value="batchForm.count"
            :min="1"
            :max="100"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item :label="t('admin.inviteManagement.forms.batch.type')" required>
          <a-select v-model:value="batchForm.codeType">
            <a-select-option value="user">{{ t('admin.inviteManagement.filters.type.user') }}</a-select-option>
            <a-select-option value="admin">{{ t('admin.inviteManagement.filters.type.admin') }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="t('admin.inviteManagement.forms.batch.maxUses')" required>
          <a-input-number
            v-model:value="batchForm.maxUses"
            :min="1"
            :max="100"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item :label="t('admin.inviteManagement.forms.batch.expiresIn')">
          <a-input-number
            v-model:value="batchForm.expiresIn"
            :min="1"
            :placeholder="t('admin.inviteManagement.forms.batch.expiresPlaceholder')"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item :label="t('admin.inviteManagement.forms.batch.description')">
          <a-textarea
            v-model:value="batchForm.description"
            :placeholder="t('admin.inviteManagement.forms.batch.descriptionPlaceholder')"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 使用记录弹窗 -->
    <a-modal
      v-model:open="showUsageModal"
      :title="t('admin.inviteManagement.usageModal.title')"
      :footer="null"
      width="800px"
    >
      <a-table
        :dataSource="currentUsages"
        :columns="usageTableColumns"
        :pagination="false"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'user'">
            {{ record.user.nickname || record.user.username }}
          </template>
          <template v-else-if="column.dataIndex === 'usedAt'">
            {{ formatDateTime(record.usedAt) }}
          </template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  TeamOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import { api } from '@/utils/api'
import { useI18n } from 'vue-i18n'

// 响应式数据
const loading = ref(false)
const createLoading = ref(false)
const batchLoading = ref(false)
const inviteCodes = ref([])
const stats = ref({
  total: 0,
  active: 0,
  used: 0,
  expired: 0,
  usageRate: 0
})
const { t, locale } = useI18n()
const displayLocale = computed(() => (locale.value.startsWith('zh') ? 'zh-CN' : 'en-US'))

// 搜索和筛选
const searchText = ref('')
const filterType = ref('')
const filterStatus = ref('')

// 弹窗状态
const showCreateModal = ref(false)
const showBatchModal = ref(false)
const showUsageModal = ref(false)
const currentUsages = ref([])

// 表单数据
const createForm = reactive({
  codeType: 'user',
  maxUses: 1,
  expiresIn: null,
  description: ''
})

const batchForm = reactive({
  count: 10,
  codeType: 'user',
  maxUses: 1,
  expiresIn: null,
  description: ''
})

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number, range: number[]) =>
    t('admin.inviteManagement.pagination.summary', {
      total,
      start: range[0],
      end: range[1]
    })
})

// 表格列定义
const tableColumns = computed(() => [
  {
    title: t('admin.inviteManagement.table.columns.code'),
    dataIndex: 'code',
    width: 150,
    ellipsis: true
  },
  {
    title: t('admin.inviteManagement.table.columns.type'),
    dataIndex: 'codeType',
    width: 80
  },
  {
    title: t('admin.inviteManagement.table.columns.status'),
    dataIndex: 'isActive',
    width: 80
  },
  {
    title: t('admin.inviteManagement.table.columns.usage'),
    dataIndex: 'usage',
    width: 120
  },
  {
    title: t('admin.inviteManagement.table.columns.creator'),
    dataIndex: 'creator',
    width: 100
  },
  {
    title: t('admin.inviteManagement.table.columns.description'),
    dataIndex: 'description',
    width: 150,
    ellipsis: true
  },
  {
    title: t('admin.inviteManagement.table.columns.expiresAt'),
    dataIndex: 'expiresAt',
    width: 120
  },
  {
    title: t('admin.inviteManagement.table.columns.createdAt'),
    dataIndex: 'createdAt',
    width: 120,
    customRender: ({ text }: any) => formatDate(text)
  },
  {
    title: t('admin.inviteManagement.table.columns.actions'),
    dataIndex: 'actions',
    width: 200,
    fixed: 'right'
  }
])

const usageTableColumns = computed(() => [
  {
    title: t('admin.inviteManagement.usageModal.columns.user'),
    dataIndex: 'user',
    width: 150
  },
  {
    title: t('admin.inviteManagement.usageModal.columns.usedAt'),
    dataIndex: 'usedAt',
    width: 150
  },
  {
    title: t('admin.inviteManagement.usageModal.columns.ip'),
    dataIndex: 'ipAddress',
    width: 120
  }
])

// 工具函数
const getTypeColor = (type: string) => {
  const colors = {
    system: 'purple',
    admin: 'red',
    user: 'blue'
  }
  return colors[type] || 'default'
}

const getTypeText = (type: string) => {
  const texts: Record<string, string> = {
    system: t('admin.inviteManagement.filters.type.system'),
    admin: t('admin.inviteManagement.filters.type.admin'),
    user: t('admin.inviteManagement.filters.type.user')
  }
  return texts[type] || type
}

const formatDate = (date: string) => {
  const dt = new Date(date)
  if (Number.isNaN(dt.getTime())) {
    return ''
  }
  return dt.toLocaleDateString(displayLocale.value)
}

const formatDateTime = (date: string) => {
  const dt = new Date(date)
  if (Number.isNaN(dt.getTime())) {
    return ''
  }
  return dt.toLocaleString(displayLocale.value)
}

// 数据加载
const loadInviteCodes = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      limit: pagination.pageSize,
      search: searchText.value || undefined,
      codeType: filterType.value || undefined,
      isActive: filterStatus.value || undefined
    }

    const response = await api.get('/api/invites/list', { params })

    inviteCodes.value = response.data.codes
    pagination.total = response.data.pagination.total
  } catch (error) {
    console.error('加载邀请码失败:', error)
    message.error(t('admin.inviteManagement.messages.loadFailed'))
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await api.get('/api/invites/stats')
    stats.value = response.data
  } catch (error) {
    console.error('加载统计数据失败:', error)
    message.error(t('admin.inviteManagement.messages.statsFailed'))
  }
}

// 事件处理
const handleSearch = () => {
  pagination.current = 1
  loadInviteCodes()
}

const handleFilter = () => {
  pagination.current = 1
  loadInviteCodes()
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadInviteCodes()
}

const refreshData = () => {
  loadInviteCodes()
  loadStats()
}

// 邀请码操作
const createInviteCode = async () => {
  createLoading.value = true
  try {
    await api.post('/api/invites/create', createForm)
    message.success(t('admin.inviteManagement.messages.createSuccess'))
    showCreateModal.value = false
    Object.assign(createForm, {
      codeType: 'user',
      maxUses: 1,
      expiresIn: null,
      description: ''
    })
    refreshData()
  } catch (error) {
    console.error('生成邀请码失败:', error)
    message.error(t('admin.inviteManagement.messages.createFailed'))
  } finally {
    createLoading.value = false
  }
}

const batchCreateInviteCodes = async () => {
  batchLoading.value = true
  try {
    const response = await api.post('/api/invites/batch-create', batchForm)
    message.success(t('admin.inviteManagement.messages.batchSuccess', { count: response.data.count }))
    showBatchModal.value = false
    Object.assign(batchForm, {
      count: 10,
      codeType: 'user',
      maxUses: 1,
      expiresIn: null,
      description: ''
    })
    refreshData()
  } catch (error) {
    console.error('批量生成邀请码失败:', error)
    message.error(t('admin.inviteManagement.messages.batchFailed'))
  } finally {
    batchLoading.value = false
  }
}

const deactivateCode = async (record: any) => {
  try {
    await api.post(`/api/invites/${record.id}/deactivate`)
    message.success(t('admin.inviteManagement.messages.deactivateSuccess'))
    refreshData()
  } catch (error) {
    console.error('禁用邀请码失败:', error)
    message.error(t('admin.inviteManagement.messages.deactivateFailed'))
  }
}

const activateCode = async (record: any) => {
  try {
    // 这里需要后端提供激活接口
    await api.post(`/api/invites/${record.id}/activate`)
    message.success(t('admin.inviteManagement.messages.activateSuccess'))
    refreshData()
  } catch (error) {
    console.error('激活邀请码失败:', error)
    message.error(t('admin.inviteManagement.messages.activateFailed'))
  }
}

const deleteCode = async (record: any) => {
  try {
    await api.delete(`/api/invites/${record.id}`)
    message.success(t('admin.inviteManagement.messages.deleteSuccess'))
    refreshData()
  } catch (error) {
    console.error('删除邀请码失败:', error)
    message.error(t('admin.inviteManagement.messages.deleteFailed'))
  }
}

const viewUsages = (record: any) => {
  currentUsages.value = record.usages || []
  showUsageModal.value = true
}

// 初始化
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.invite-management {
  padding: 24px;
}

.invite-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.invite-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.invite-actions {
  display: flex;
  gap: 8px;
}

.invite-stats {
  margin-bottom: 24px;
}

.invite-filters {
  margin-bottom: 16px;
}

.invite-table {
  background: var(--theme-bg-elevated);
  border-radius: 8px;
  overflow: hidden;
}

:deep(.ant-table-thead > tr > th) {
  background: var(--theme-bg-elevated);
  border-bottom: 2px solid var(--theme-border);
  font-weight: 600;
}

:deep(.ant-progress-line) {
  margin: 0;
}

:deep(.ant-typography-copy) {
  margin-left: 8px;
}
</style>
