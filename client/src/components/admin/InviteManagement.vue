<template>
  <div class="invite-management">
    <div class="invite-header">
      <h2>邀请码管理</h2>
      <div class="invite-actions">
        <a-button type="primary" @click="showCreateModal = true">
          <PlusOutlined />
          生成邀请码
        </a-button>
        <a-button @click="showBatchModal = true">
          <TeamOutlined />
          批量生成
        </a-button>
        <a-button @click="refreshData">
          <ReloadOutlined />
          刷新
        </a-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="invite-stats">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-card>
            <a-statistic title="总邀请码" :value="stats.total" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic title="已使用" :value="stats.used" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic title="活跃状态" :value="stats.active" />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic title="使用率" :value="stats.usageRate" suffix="%" />
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
            placeholder="搜索邀请码或描述"
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
            placeholder="类型"
            @change="handleFilter"
            style="width: 100%"
          >
            <a-select-option value="">全部类型</a-select-option>
            <a-select-option value="system">系统</a-select-option>
            <a-select-option value="admin">管理员</a-select-option>
            <a-select-option value="user">用户</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select
            v-model:value="filterStatus"
            placeholder="状态"
            @change="handleFilter"
            style="width: 100%"
          >
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option value="true">激活</a-select-option>
            <a-select-option value="false">禁用</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </div>

    <!-- 邀请码列表 -->
    <div class="invite-table">
      <a-table
        :dataSource="inviteCodes"
        :columns="columns"
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
              {{ record.isActive ? '激活' : '禁用' }}
            </a-tag>
          </template>

          <template v-else-if="column.dataIndex === 'usage'">
            <span>{{ record.usedCount }} / {{ record.maxUses }}</span>
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
            <a-tag v-else color="blue">系统</a-tag>
          </template>

          <template v-else-if="column.dataIndex === 'expiresAt'">
            <span v-if="record.expiresAt">
              {{ formatDate(record.expiresAt) }}
            </span>
            <a-tag v-else color="green">永不过期</a-tag>
          </template>

          <template v-else-if="column.dataIndex === 'actions'">
            <a-space>
              <a-button
                size="small"
                @click="viewUsages(record)"
              >
                查看使用
              </a-button>
              <a-button
                v-if="record.isActive"
                size="small"
                danger
                @click="deactivateCode(record)"
              >
                禁用
              </a-button>
              <a-button
                v-if="!record.isActive"
                size="small"
                type="primary"
                @click="activateCode(record)"
              >
                启用
              </a-button>
              <a-popconfirm
                title="确定要删除这个邀请码吗？"
                @confirm="deleteCode(record)"
              >
                <a-button
                  size="small"
                  danger
                  :disabled="record.usages && record.usages.length > 0"
                >
                  删除
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
      title="生成邀请码"
      @ok="createInviteCode"
      :confirm-loading="createLoading"
    >
      <a-form :model="createForm" layout="vertical">
        <a-form-item label="邀请码类型" required>
          <a-select v-model:value="createForm.codeType">
            <a-select-option value="user">普通用户</a-select-option>
            <a-select-option value="admin">管理员</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="最大使用次数" required>
          <a-input-number
            v-model:value="createForm.maxUses"
            :min="1"
            :max="100"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="有效期（小时）">
          <a-input-number
            v-model:value="createForm.expiresIn"
            :min="1"
            placeholder="留空表示永不过期"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="描述">
          <a-textarea
            v-model:value="createForm.description"
            placeholder="邀请码用途描述"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量生成弹窗 -->
    <a-modal
      v-model:open="showBatchModal"
      title="批量生成邀请码"
      @ok="batchCreateInviteCodes"
      :confirm-loading="batchLoading"
    >
      <a-form :model="batchForm" layout="vertical">
        <a-form-item label="生成数量" required>
          <a-input-number
            v-model:value="batchForm.count"
            :min="1"
            :max="100"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="邀请码类型" required>
          <a-select v-model:value="batchForm.codeType">
            <a-select-option value="user">普通用户</a-select-option>
            <a-select-option value="admin">管理员</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="最大使用次数" required>
          <a-input-number
            v-model:value="batchForm.maxUses"
            :min="1"
            :max="100"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="有效期（小时）">
          <a-input-number
            v-model:value="batchForm.expiresIn"
            :min="1"
            placeholder="留空表示永不过期"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="描述">
          <a-textarea
            v-model:value="batchForm.description"
            placeholder="批量生成邀请码的用途描述"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 使用记录弹窗 -->
    <a-modal
      v-model:open="showUsageModal"
      title="邀请码使用记录"
      :footer="null"
      width="800px"
    >
      <a-table
        :dataSource="currentUsages"
        :columns="usageColumns"
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
import { apiClient } from '@/utils/api'

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
    `共 ${total} 条记录，显示 ${range[0]}-${range[1]} 条`
})

// 表格列定义
const columns = [
  {
    title: '邀请码',
    dataIndex: 'code',
    width: 150,
    ellipsis: true
  },
  {
    title: '类型',
    dataIndex: 'codeType',
    width: 80
  },
  {
    title: '状态',
    dataIndex: 'isActive',
    width: 80
  },
  {
    title: '使用情况',
    dataIndex: 'usage',
    width: 120
  },
  {
    title: '创建者',
    dataIndex: 'creator',
    width: 100
  },
  {
    title: '描述',
    dataIndex: 'description',
    width: 150,
    ellipsis: true
  },
  {
    title: '过期时间',
    dataIndex: 'expiresAt',
    width: 120
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    width: 120,
    customRender: ({ text }: any) => formatDate(text)
  },
  {
    title: '操作',
    dataIndex: 'actions',
    width: 200,
    fixed: 'right'
  }
]

const usageColumns = [
  {
    title: '用户',
    dataIndex: 'user',
    width: 150
  },
  {
    title: '使用时间',
    dataIndex: 'usedAt',
    width: 150
  },
  {
    title: 'IP地址',
    dataIndex: 'ipAddress',
    width: 120
  }
]

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
  const texts = {
    system: '系统',
    admin: '管理员',
    user: '普通'
  }
  return texts[type] || type
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString('zh-CN')
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

    const response = await apiClient.get('/api/invites/list', { params })

    inviteCodes.value = response.data.codes
    pagination.total = response.data.pagination.total
  } catch (error) {
    console.error('加载邀请码失败:', error)
    message.error('加载邀请码失败')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await apiClient.get('/api/invites/stats')
    stats.value = response.data
  } catch (error) {
    console.error('加载统计数据失败:', error)
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
    await apiClient.post('/api/invites/create', createForm)
    message.success('邀请码生成成功')
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
    message.error('生成邀请码失败')
  } finally {
    createLoading.value = false
  }
}

const batchCreateInviteCodes = async () => {
  batchLoading.value = true
  try {
    const response = await apiClient.post('/api/invites/batch-create', batchForm)
    message.success(`批量生成 ${response.data.count} 个邀请码成功`)
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
    message.error('批量生成邀请码失败')
  } finally {
    batchLoading.value = false
  }
}

const deactivateCode = async (record: any) => {
  try {
    await apiClient.post(`/api/invites/${record.id}/deactivate`)
    message.success('邀请码已禁用')
    refreshData()
  } catch (error) {
    console.error('禁用邀请码失败:', error)
    message.error('禁用邀请码失败')
  }
}

const activateCode = async (record: any) => {
  try {
    // 这里需要后端提供激活接口
    await apiClient.post(`/api/invites/${record.id}/activate`)
    message.success('邀请码已激活')
    refreshData()
  } catch (error) {
    console.error('激活邀请码失败:', error)
    message.error('激活邀请码失败')
  }
}

const deleteCode = async (record: any) => {
  try {
    await apiClient.delete(`/api/invites/${record.id}`)
    message.success('邀请码已删除')
    refreshData()
  } catch (error) {
    console.error('删除邀请码失败:', error)
    message.error('删除邀请码失败')
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
