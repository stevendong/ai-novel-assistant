<template>
  <div class="user-management">
    <a-page-header
      :title="t('admin.userManagement.title')"
      :sub-title="t('admin.userManagement.subtitle')"
      class="page-header"
    />

    <div class="management-content">
      <!-- 工具栏 -->
      <a-card class="toolbar-card">
        <div class="toolbar-content">
          <!-- 搜索区域 -->
          <div class="search-section">
            <a-space size="middle">
              <a-input-search
                v-model:value="searchQuery"
                :placeholder="t('admin.userManagement.searchPlaceholder')"
                @search="handleSearch"
                allow-clear
                class="search-input"
                :loading="loading"
              />
              <a-select
                v-model:value="roleFilter"
                :placeholder="t('admin.userManagement.filters.role.placeholder')"
                @change="handleSearch"
                allow-clear
                class="role-filter"
              >
                <a-select-option value="">{{ t('admin.userManagement.filters.role.all') }}</a-select-option>
                <a-select-option value="admin">{{ t('admin.userManagement.filters.role.admin') }}</a-select-option>
                <a-select-option value="user">{{ t('admin.userManagement.filters.role.user') }}</a-select-option>
              </a-select>
              <a-select
                v-model:value="statusFilter"
                :placeholder="t('admin.userManagement.filters.status.placeholder')"
                @change="handleSearch"
                allow-clear
                class="status-filter"
              >
                <a-select-option value="">{{ t('admin.userManagement.filters.status.all') }}</a-select-option>
                <a-select-option value="true">{{ t('admin.userManagement.filters.status.enabled') }}</a-select-option>
                <a-select-option value="false">{{ t('admin.userManagement.filters.status.disabled') }}</a-select-option>
              </a-select>
            </a-space>
          </div>

          <!-- 操作区域 -->
          <div class="action-section">
            <a-space>
              <!-- 批量操作 -->
              <a-dropdown
                v-if="selectedRowKeys.length > 0"
                :trigger="['click']"
                placement="bottomRight"
              >
                <template #overlay>
                  <a-menu @click="handleBatchMenuClick">
                    <a-menu-item key="activate">
                      <CheckCircleOutlined />
                      {{ t('admin.userManagement.toolbar.batch.activate') }}
                    </a-menu-item>
                    <a-menu-item key="deactivate">
                      <StopOutlined />
                      {{ t('admin.userManagement.toolbar.batch.deactivate') }}
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="delete" class="danger-menu-item">
                      <DeleteOutlined />
                      {{ t('admin.userManagement.toolbar.batch.delete') }}
                    </a-menu-item>
                  </a-menu>
                </template>
                <a-button type="primary" ghost>
                  {{ batchButtonLabel }} <DownOutlined />
                </a-button>
              </a-dropdown>

              <!-- 刷新按钮 -->
              <a-button @click="handleRefresh" :loading="loading">
                <ReloadOutlined />
                {{ t('common.refresh') }}
              </a-button>

              <!-- 导出按钮 -->
              <a-button @click="handleExportUsers">
                <DownloadOutlined />
                {{ t('common.export') }}
              </a-button>

              <!-- 创建用户 -->
              <a-button type="primary" @click="handleCreateUser">
                <PlusOutlined />
                {{ t('admin.userManagement.toolbar.create') }}
              </a-button>
            </a-space>
          </div>
        </div>
      </a-card>

      <!-- 用户列表 -->
      <a-card class="table-card">
        <template #title>
          <div class="table-header">
            <div class="table-title">
              <UserOutlined />
              <span>{{ t('admin.userManagement.table.title') }}</span>
              <a-tag class="user-count-tag">{{ t('admin.userManagement.table.countTag', { count: pagination.total }) }}</a-tag>
            </div>
            <div class="table-extra">
              <a-space>
                <!-- 表格密度切换 -->
                <a-dropdown>
                  <template #overlay>
                    <a-menu @click="handleTableSizeChange">
                      <a-menu-item key="small">{{ t('admin.userManagement.table.density.compact') }}</a-menu-item>
                      <a-menu-item key="middle">{{ t('admin.userManagement.table.density.default') }}</a-menu-item>
                      <a-menu-item key="large">{{ t('admin.userManagement.table.density.comfortable') }}</a-menu-item>
                    </a-menu>
                  </template>
                  <a-button size="small">
                    <ColumnHeightOutlined />
                    {{ t('admin.userManagement.table.density.label') }}
                  </a-button>
                </a-dropdown>

                <!-- 列设置 -->
                  <a-button size="small" @click="showColumnSettings">
                  <SettingOutlined />
                  {{ t('admin.userManagement.table.columnSettings') }}
                </a-button>
              </a-space>
            </div>
          </div>
        </template>

        <a-table
          :columns="visibleColumns"
          :data-source="users"
          :loading="loading"
          :pagination="paginationConfig"
          @change="handleTableChange"
          row-key="id"
          :row-selection="rowSelection"
          :size="tableSize"
          :scroll="{ x: 1400 }"
          class="user-table"
        >
          <template #bodyCell="{ column, record }">
            <!-- 用户信息 -->
            <template v-if="column.key === 'user'">
              <div class="user-info">
                <div class="user-avatar">
                  <a-avatar :src="record.avatar" :size="32">
                    {{ record.nickname?.[0] || record.username[0] }}
                  </a-avatar>
                </div>
                <div class="user-details">
                  <div class="user-name">
                  {{ record.nickname || record.username }}
                    <a-tag v-if="record.id === currentUserId" color="orange" size="small">
                      {{ t('admin.userManagement.table.currentUserTag') }}
                    </a-tag>
                  </div>
                  <div class="user-username">@{{ record.username }}</div>
                  <div class="user-email">{{ record.email }}</div>
                </div>
              </div>
            </template>

            <!-- 角色 -->
            <template v-if="column.key === 'role'">
              <div class="role-cell">
                <a-tag :color="getRoleColor(record.role)" class="role-tag">
                  <component :is="getRoleIcon(record.role)" class="role-icon" />
                  {{ getRoleText(record.role) }}
                </a-tag>
              </div>
            </template>

            <!-- 状态 -->
            <template v-if="column.key === 'status'">
              <div class="status-cell">
                <a-badge
                  :status="record.isActive ? 'success' : 'error'"
                  :text="record.isActive ? t('admin.userManagement.table.status.active') : t('admin.userManagement.table.status.disabled')"
                  class="status-badge"
                />
              </div>
            </template>

            <!-- 统计信息 -->
            <template v-if="column.key === 'stats'">
              <div class="stats-cell">
                <a-space direction="vertical" size="small">
                  <div class="stat-item">
                    <span class="stat-label">{{ t('admin.userManagement.table.stats.novels') }}</span>
                    <span class="stat-value">{{ record._count?.novels || 0 }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">{{ t('admin.userManagement.table.stats.invites') }}</span>
                    <span class="stat-value">{{ record._count?.invitees || 0 }}</span>
                  </div>
                </a-space>
              </div>
            </template>

            <!-- 最后登录 -->
            <template v-if="column.key === 'lastLogin'">
              <div class="time-cell">
                <template v-if="record.lastLogin">
                  <div class="time-value">{{ formatDateTime(record.lastLogin, 'date') }}</div>
                  <div class="time-detail">{{ formatDateTime(record.lastLogin, 'time') }}</div>
                </template>
                <span v-else class="never-login">{{ t('admin.userManagement.table.neverLogin') }}</span>
              </div>
            </template>

            <!-- 注册时间 -->
            <template v-if="column.key === 'createdAt'">
              <div class="time-cell">
                <div class="time-value">{{ formatDateTime(record.createdAt, 'date') }}</div>
                <div class="time-detail">{{ formatDateTime(record.createdAt, 'time') }}</div>
              </div>
            </template>

            <!-- 操作 -->
            <template v-if="column.key === 'actions'">
              <div class="actions-cell">
                <a-space size="small">
                  <!-- 查看 -->
                  <a-tooltip :title="t('admin.userManagement.actions.view')">
                    <a-button
                      type="text"
                      size="small"
                      @click="handleViewUser(record)"
                      class="action-btn"
                    >
                      <EyeOutlined />
                    </a-button>
                  </a-tooltip>

                  <!-- 编辑 -->
                  <a-tooltip :title="t('admin.userManagement.actions.edit')">
                    <a-button
                      type="text"
                      size="small"
                      @click="handleEditUser(record)"
                      class="action-btn"
                    >
                      <EditOutlined />
                    </a-button>
                  </a-tooltip>

                  <!-- 更多操作 -->
                  <a-dropdown placement="bottomRight">
                    <template #overlay>
                      <a-menu @click="(e) => handleUserAction(record, e.key)">
                        <!-- 角色管理 -->
                        <a-menu-sub-menu key="role" :title="t('admin.userManagement.actions.role.title')">
                          <template #icon><CrownOutlined /></template>
                          <a-menu-item
                            key="set-admin"
                            :disabled="record.role === 'admin' || record.id === currentUserId"
                          >
                            {{ t('admin.userManagement.actions.role.setAdmin') }}
                          </a-menu-item>
                          <a-menu-item
                            key="set-user"
                            :disabled="record.role === 'user' || record.id === currentUserId"
                          >
                            {{ t('admin.userManagement.actions.role.setUser') }}
                          </a-menu-item>
                        </a-menu-sub-menu>

                        <!-- 状态管理 -->
                        <a-menu-divider />
                        <a-menu-item
                          key="toggle-status"
                          :disabled="record.id === currentUserId && record.isActive"
                        >
                          <component :is="record.isActive ? StopOutlined : CheckCircleOutlined" />
                          {{ record.isActive ? t('admin.userManagement.actions.toggle.disable') : t('admin.userManagement.actions.toggle.enable') }}
                        </a-menu-item>

                        <!-- 危险操作 -->
                        <a-menu-divider />
                        <a-menu-item
                          key="reset-password"
                          :disabled="record.id === currentUserId"
                        >
                          <KeyOutlined />
                          {{ t('admin.userManagement.actions.resetPassword') }}
                        </a-menu-item>
                        <a-menu-item
                          key="delete"
                          :disabled="record.id === currentUserId"
                          class="danger-menu-item"
                        >
                          <DeleteOutlined />
                          {{ t('admin.userManagement.actions.delete') }}
                        </a-menu-item>
                      </a-menu>
                    </template>
                    <a-tooltip :title="t('admin.userManagement.actions.more')">
                      <a-button type="text" size="small" class="action-btn">
                        <MoreOutlined />
                      </a-button>
                    </a-tooltip>
                  </a-dropdown>
                </a-space>
              </div>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 列设置模态框 -->
    <a-modal
      v-model:visible="columnSettingsVisible"
      :title="t('admin.userManagement.modals.columnSettings.title')"
      @ok="handleColumnSettingsOk"
      width="500px"
    >
      <div class="column-settings">
        <a-list :data-source="allColumns" item-layout="horizontal">
          <template #renderItem="{ item }">
            <a-list-item>
              <template #actions>
                <a-switch
                  v-model:checked="item.visible"
                  size="small"
                  :disabled="item.key === 'user' || item.key === 'actions'"
                />
              </template>
              <a-list-item-meta>
                <template #title>
                  {{ t(item.titleKey) }}
                  <a-tag v-if="item.key === 'user' || item.key === 'actions'" size="small" color="blue">
                    {{ t('admin.userManagement.table.columnRequired') }}
                  </a-tag>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </div>
    </a-modal>

    <!-- 用户表单模态框 -->
    <UserForm
      :visible="userFormVisible"
      :user="selectedUser"
      @update:visible="userFormVisible = $event"
      @success="handleFormSuccess"
    />

    <!-- 用户详情抽屉 -->
    <UserDetail
      :visible="userDetailVisible"
      :userId="selectedUserId"
      @update:visible="userDetailVisible = $event"
      @edit="handleEditFromDetail"
      @refresh="loadUsers"
    />

    <!-- 重置密码确认模态框 -->
    <a-modal
      v-model:visible="resetPasswordVisible"
      :title="t('admin.userManagement.modals.resetPassword.title')"
      @ok="confirmResetPassword"
      :confirm-loading="resetPasswordLoading"
      :ok-text="t('admin.userManagement.modals.resetPassword.ok')"
      :cancel-text="t('admin.userManagement.modals.resetPassword.cancel')"
    >
      <a-alert
        :message="t('admin.userManagement.modals.resetPassword.confirmTitle')"
        :description="t('admin.userManagement.modals.resetPassword.description', { name: resetPasswordUser?.nickname || resetPasswordUser?.username || '' })"
        type="warning"
        show-icon
        class="mb-4"
      />
      <p>{{ t('admin.userManagement.modals.resetPassword.afterReset') }}</p>
      <ul>
        <li>{{ t('admin.userManagement.modals.resetPassword.effects.line1') }}</li>
        <li>{{ t('admin.userManagement.modals.resetPassword.effects.line2') }}</li>
        <li>{{ t('admin.userManagement.modals.resetPassword.effects.line3') }}</li>
      </ul>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  SearchOutlined,
  DownOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DownloadOutlined,
  ReloadOutlined,
  UserOutlined,
  ColumnHeightOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  CrownOutlined,
  KeyOutlined,
  MoreOutlined,
  SafetyCertificateOutlined,
  TeamOutlined
} from '@ant-design/icons-vue'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/auth'
import UserForm from '@/components/admin/UserForm.vue'
import UserDetail from '@/components/admin/UserDetail.vue'
import { useI18n } from 'vue-i18n'

interface User {
  id: string
  username: string
  email: string
  nickname?: string
  role: 'admin' | 'user'
  isActive: boolean
  lastLogin?: string
  createdAt: string
  inviteCodeUsed?: string
  _count: {
    novels: number
  }
}

const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.id)
const { t, locale } = useI18n()
const displayLocale = computed(() => (locale.value.startsWith('zh') ? 'zh-CN' : 'en-US'))

const loading = ref(false)
const users = ref<User[]>([])
const searchQuery = ref('')
const roleFilter = ref('')
const statusFilter = ref('')

// 表格配置
const tableSize = ref<'small' | 'middle' | 'large'>('middle')
const columnSettingsVisible = ref(false)
const resetPasswordVisible = ref(false)
const resetPasswordLoading = ref(false)
const resetPasswordUser = ref<User | null>(null)

// 表单和详情相关状态
const userFormVisible = ref(false)
const userDetailVisible = ref(false)
const selectedUser = ref<User | null>(null)
const selectedUserId = ref<string>('')

// 批量选择相关状态
const selectedRowKeys = ref<string[]>([])
const rowSelection = {
  selectedRowKeys: selectedRowKeys,
  onChange: (keys: string[]) => {
    selectedRowKeys.value = keys
  },
  getCheckboxProps: (record: User) => ({
    disabled: record.id === currentUserId.value
  })
}

const batchButtonLabel = computed(() =>
  t('admin.userManagement.toolbar.batchButton', { count: selectedRowKeys.value.length })
)

const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number, range: [number, number]) =>
    t('admin.userManagement.pagination.summary', {
      start: range[0],
      end: range[1],
      total
    })
})

// 表格分页配置
const paginationConfig = computed(() => ({
  ...pagination.value,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number, range: [number, number]) => {
    const start = range[0]
    const end = range[1]
    return t('admin.userManagement.pagination.summary', {
      start,
      end,
      total
    })
  },
  pageSizeOptions: ['10', '20', '50', '100'],
  size: 'default'
}))

// 所有可用列
const allColumns = ref([
  {
    titleKey: 'admin.userManagement.table.columns.user',
    key: 'user',
    width: 280,
    fixed: 'left',
    visible: true
  },
  {
    titleKey: 'admin.userManagement.table.columns.role',
    key: 'role',
    width: 120,
    visible: true,
    filters: [
      { textKey: 'admin.userManagement.tableFilters.roleAdmin', value: 'admin' },
      { textKey: 'admin.userManagement.tableFilters.roleUser', value: 'user' }
    ]
  },
  {
    titleKey: 'admin.userManagement.table.columns.status',
    key: 'status',
    width: 100,
    visible: true,
    filters: [
      { textKey: 'admin.userManagement.tableFilters.statusActive', value: true },
      { textKey: 'admin.userManagement.tableFilters.statusDisabled', value: false }
    ]
  },
  {
    titleKey: 'admin.userManagement.table.columns.stats',
    key: 'stats',
    width: 120,
    visible: true
  },
  {
    titleKey: 'admin.userManagement.table.columns.lastLogin',
    key: 'lastLogin',
    width: 150,
    visible: true,
    sorter: true
  },
  {
    titleKey: 'admin.userManagement.table.columns.createdAt',
    key: 'createdAt',
    width: 150,
    visible: true,
    sorter: true
  },
  {
    titleKey: 'admin.userManagement.table.columns.actions',
    key: 'actions',
    width: 120,
    fixed: 'right',
    visible: true
  }
])

// 当前显示的列
const visibleColumns = computed(() =>
  allColumns.value
    .filter(col => col.visible)
    .map(col => ({
      ...col,
      title: t(col.titleKey),
      filters: col.filters
        ? col.filters.map(filter => ({
            text: t(filter.textKey),
            value: filter.value
          }))
        : undefined
    }))
)

const loadUsers = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.value.current,
      limit: pagination.value.pageSize,
      search: searchQuery.value,
      role: roleFilter.value,
      status: statusFilter.value
    }

    const response = await api.get('/api/admin/users', { params })
    users.value = response.data.users
    pagination.value.total = response.data.pagination.total
  } catch (error) {
    console.error('加载用户列表失败:', error)
    message.error(t('admin.userManagement.messages.loadFailed'))
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.value.current = 1
  loadUsers()
}

const handleTableChange = (pag: any) => {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  loadUsers()
}

// 刷新数据
const handleRefresh = () => {
  searchQuery.value = ''
  roleFilter.value = ''
  statusFilter.value = ''
  pagination.value.current = 1
  loadUsers()
}

// 表格尺寸变更
const handleTableSizeChange = ({ key }: { key: string }) => {
  tableSize.value = key as 'small' | 'middle' | 'large'
}

// 显示列设置
const showColumnSettings = () => {
  columnSettingsVisible.value = true
}

// 列设置确认
const handleColumnSettingsOk = () => {
  columnSettingsVisible.value = false
  message.success(t('admin.userManagement.modals.columnSettings.saved'))
}

// 获取角色颜色
const getRoleColor = (role: string) => {
  return role === 'admin' ? 'red' : 'blue'
}

// 获取角色图标
const getRoleIcon = (role: string) => {
  return role === 'admin' ? SafetyCertificateOutlined : TeamOutlined
}

// 获取角色文本
const getRoleText = (role: string) => {
  return role === 'admin'
    ? t('admin.userManagement.tableFilters.roleAdmin')
    : t('admin.userManagement.tableFilters.roleUser')
}

// 格式化日期时间
const formatDateTime = (dateString: string, type: 'date' | 'time' = 'date') => {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const localeString = displayLocale.value
  if (type === 'date') {
    return date.toLocaleDateString(localeString)
  }
  return date.toLocaleTimeString(localeString, { hour12: localeString !== 'zh-CN' })
}

const handleRoleChange = async (user: User, newRole: string) => {
  try {
    await api.patch(`/api/admin/users/${user.id}/role`, { role: newRole })
    message.success(t('admin.userManagement.messages.roleUpdated'))
    loadUsers()
  } catch (error) {
    console.error('角色更新失败:', error)
    message.error(t('admin.userManagement.messages.roleUpdateFailed'))
  }
}

const handleStatusChange = async (user: User) => {
  try {
    const newStatus = !user.isActive
    await api.patch(`/api/admin/users/${user.id}/status`, { isActive: newStatus })
    const actionText = newStatus
      ? t('admin.userManagement.statusAction.enable')
      : t('admin.userManagement.statusAction.disable')
    message.success(t('admin.userManagement.messages.statusUpdated', { action: actionText }))
    loadUsers()
  } catch (error) {
    console.error('状态更新失败:', error)
    message.error(t('admin.userManagement.messages.statusUpdateFailed'))
  }
}

const handleDelete = async (user: User) => {
  try {
    await api.delete(`/api/admin/users/${user.id}`)
    message.success(t('admin.userManagement.messages.deleteSuccess'))
    loadUsers()
  } catch (error) {
    console.error('删除用户失败:', error)
    message.error(t('admin.userManagement.messages.deleteFailed'))
  }
}

// 创建用户
const handleCreateUser = () => {
  selectedUser.value = null
  userFormVisible.value = true
}

// 编辑用户
const handleEditUser = (user: User) => {
  selectedUser.value = user
  userFormVisible.value = true
}

// 查看用户详情
const handleViewUser = (user: User) => {
  selectedUserId.value = user.id
  userDetailVisible.value = true
}

// 从详情页编辑
const handleEditFromDetail = (user: User) => {
  userDetailVisible.value = false
  selectedUser.value = user
  userFormVisible.value = true
}

// 表单成功回调
const handleFormSuccess = () => {
  selectedRowKeys.value = []
  loadUsers()
}

// 批量操作菜单点击
const handleBatchMenuClick = (e: any) => {
  const key = e.key
  const selectedCount = selectedRowKeys.value.length
  const actionMap: Record<string, 'activate' | 'deactivate' | 'delete'> = {
    activate: 'activate',
    deactivate: 'deactivate',
    delete: 'delete'
  }
  const actionKey = actionMap[key] || 'activate'
  const actionText = t(`admin.userManagement.batchActionText.${actionKey}`)

  Modal.confirm({
    title: t('admin.userManagement.toolbar.batch.confirmTitle', { action: actionText }),
    content: t('admin.userManagement.toolbar.batch.confirmContent', { action: actionText, count: selectedCount }),
    okText: t('common.confirm'),
    cancelText: t('common.cancel'),
    onOk: () => handleBatchOperation(key)
  })
}

// 批量操作
const handleBatchOperation = async (action: string) => {
  if (selectedRowKeys.value.length === 0) {
    message.warning(t('admin.userManagement.messages.batchSelectRequired'))
    return
  }

  try {
    const response = await api.patch('/api/admin/users/batch', {
      userIds: selectedRowKeys.value,
      action
    })

    message.success(response.data.message)
    selectedRowKeys.value = []
    loadUsers()
  } catch (error) {
    console.error('批量操作失败:', error)
    message.error(t('admin.userManagement.messages.batchFailed'))
  }
}

// 用户操作处理
const handleUserAction = async (user: User, action: string) => {
  switch (action) {
    case 'set-admin':
      await handleRoleChange(user, 'admin')
      break
    case 'set-user':
      await handleRoleChange(user, 'user')
      break
    case 'toggle-status':
      await handleStatusChange(user)
      break
    case 'reset-password':
      handleResetPassword(user)
      break
    case 'delete':
      Modal.confirm({
        title: t('admin.userManagement.modals.deleteUser.title'),
        content: t('admin.userManagement.modals.deleteUser.content', {
          name: user.nickname || user.username
        }),
        okText: t('admin.userManagement.modals.deleteUser.ok'),
        okType: 'danger',
        cancelText: t('admin.userManagement.modals.deleteUser.cancel'),
        onOk: () => handleDelete(user)
      })
      break
  }
}

// 重置密码
const handleResetPassword = (user: User) => {
  resetPasswordUser.value = user
  resetPasswordVisible.value = true
}

// 确认重置密码
const confirmResetPassword = async () => {
  if (!resetPasswordUser.value) return

  try {
    resetPasswordLoading.value = true
    await api.patch(`/api/admin/users/${resetPasswordUser.value.id}/password`, {
      newPassword: Math.random().toString(36).slice(-8)
    })
    message.success(t('admin.userManagement.messages.resetSuccess'))
    resetPasswordVisible.value = false
    loadUsers()
  } catch (error) {
    console.error('密码重置失败:', error)
    message.error(t('admin.userManagement.messages.resetFailed'))
  } finally {
    resetPasswordLoading.value = false
  }
}

// 导出用户数据
const handleExportUsers = async () => {
  try {
    const response = await api.get('/api/admin/users/export', {
      params: { format: 'csv' },
      responseType: 'blob'
    })

    const blob = new Blob([response.data], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)

    message.success(t('admin.userManagement.messages.exportSuccess'))
  } catch (error) {
    console.error('导出失败:', error)
    message.error(t('admin.userManagement.messages.exportFailed'))
  }
}

onMounted(() => {
  loadUsers()
})

// 监听状态筛选变化
const handleStatusFilterChange = () => {
  pagination.value.current = 1
  loadUsers()
}
</script>

<style scoped>
.user-management {
  height: 100%;
}

.page-header {
  margin-bottom: 16px;
}

.management-content {
  padding: 0 24px 24px;
}

.toolbar-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.toolbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.search-section {
  flex: 1;
  min-width: 600px;
}

.search-input {
  width: 280px;
}

.role-filter,
.status-filter {
  width: 140px;
}

.action-section {
  flex-shrink: 0;
}

.table-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.user-count-tag {
  margin-left: 8px;
}

.table-extra {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-table {
  border-radius: 8px;
}

/* 用户信息单元格 */
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-username {
  color: #666;
  font-size: 12px;
  margin-bottom: 2px;
}

.user-email {
  color: #999;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 角色单元格 */
.role-cell {
  text-align: center;
}

.role-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 4px;
}

.role-icon {
  font-size: 12px;
}

/* 状态单元格 */
.status-cell {
  text-align: center;
}

.status-badge {
  font-weight: 500;
}

/* 统计信息单元格 */
.stats-cell {
  text-align: center;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: 600;
  color: #1890ff;
}

/* 时间单元格 */
.time-cell {
  text-align: center;
}

.time-value {
  font-weight: 500;
  margin-bottom: 2px;
}

.time-detail {
  color: #999;
  font-size: 11px;
}

.never-login {
  color: #ccc;
  font-style: italic;
}

/* 操作单元格 */
.actions-cell {
  text-align: center;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f0f0f0;
}

/* 危险菜单项 */
:deep(.danger-menu-item) {
  color: #ff4d4f !important;
}

:deep(.danger-menu-item:hover) {
  background: #fff2f0 !important;
}

/* 列设置 */
.column-settings {
  max-height: 400px;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .search-section {
    min-width: auto;
  }

  .search-input {
    width: 240px;
  }

  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
  }

  .action-section {
    justify-self: stretch;
  }
}

@media (max-width: 768px) {
  .management-content {
    padding: 0 16px 16px;
  }

  .search-input {
    width: 200px;
  }

  .role-filter,
  .status-filter {
    width: 120px;
  }
}
</style>
