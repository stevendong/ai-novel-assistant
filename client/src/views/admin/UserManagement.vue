<template>
  <div class="user-management">
    <a-page-header
      title="用户管理"
      sub-title="管理系统用户权限和状态"
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
                placeholder="搜索用户名、邮箱或昵称"
                @search="handleSearch"
                allow-clear
                class="search-input"
                :loading="loading"
              />
              <a-select
                v-model:value="roleFilter"
                placeholder="角色筛选"
                @change="handleSearch"
                allow-clear
                class="role-filter"
              >
                <a-select-option value="">全部角色</a-select-option>
                <a-select-option value="admin">管理员</a-select-option>
                <a-select-option value="user">普通用户</a-select-option>
              </a-select>
              <a-select
                v-model:value="statusFilter"
                placeholder="状态筛选"
                @change="handleSearch"
                allow-clear
                class="status-filter"
              >
                <a-select-option value="">全部状态</a-select-option>
                <a-select-option value="true">已启用</a-select-option>
                <a-select-option value="false">已禁用</a-select-option>
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
                      批量启用
                    </a-menu-item>
                    <a-menu-item key="deactivate">
                      <StopOutlined />
                      批量禁用
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="delete" class="danger-menu-item">
                      <DeleteOutlined />
                      批量删除
                    </a-menu-item>
                  </a-menu>
                </template>
                <a-button type="primary" ghost>
                  批量操作 ({{ selectedRowKeys.length }}) <DownOutlined />
                </a-button>
              </a-dropdown>

              <!-- 刷新按钮 -->
              <a-button @click="handleRefresh" :loading="loading">
                <ReloadOutlined />
                刷新
              </a-button>

              <!-- 导出按钮 -->
              <a-button @click="handleExportUsers">
                <DownloadOutlined />
                导出
              </a-button>

              <!-- 创建用户 -->
              <a-button type="primary" @click="handleCreateUser">
                <PlusOutlined />
                创建用户
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
              <span>用户列表</span>
              <a-tag class="user-count-tag">共 {{ pagination.total }} 名用户</a-tag>
            </div>
            <div class="table-extra">
              <a-space>
                <!-- 表格密度切换 -->
                <a-dropdown>
                  <template #overlay>
                    <a-menu @click="handleTableSizeChange">
                      <a-menu-item key="small">紧凑</a-menu-item>
                      <a-menu-item key="middle">默认</a-menu-item>
                      <a-menu-item key="large">宽松</a-menu-item>
                    </a-menu>
                  </template>
                  <a-button size="small">
                    <ColumnHeightOutlined />
                    密度
                  </a-button>
                </a-dropdown>

                <!-- 列设置 -->
                <a-button size="small" @click="showColumnSettings">
                  <SettingOutlined />
                  列设置
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
                    <a-tag v-if="record.id === currentUserId" color="orange" size="small">当前用户</a-tag>
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
                  :text="record.isActive ? '正常' : '禁用'"
                  class="status-badge"
                />
              </div>
            </template>

            <!-- 统计信息 -->
            <template v-if="column.key === 'stats'">
              <div class="stats-cell">
                <a-space direction="vertical" size="small">
                  <div class="stat-item">
                    <span class="stat-label">小说:</span>
                    <span class="stat-value">{{ record._count?.novels || 0 }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">邀请:</span>
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
                <span v-else class="never-login">从未登录</span>
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
                  <a-tooltip title="查看详情">
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
                  <a-tooltip title="编辑用户">
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
                        <a-menu-sub-menu key="role" title="角色管理">
                          <template #icon><CrownOutlined /></template>
                          <a-menu-item
                            key="set-admin"
                            :disabled="record.role === 'admin' || record.id === currentUserId"
                          >
                            设为管理员
                          </a-menu-item>
                          <a-menu-item
                            key="set-user"
                            :disabled="record.role === 'user' || record.id === currentUserId"
                          >
                            设为普通用户
                          </a-menu-item>
                        </a-menu-sub-menu>

                        <!-- 状态管理 -->
                        <a-menu-divider />
                        <a-menu-item
                          key="toggle-status"
                          :disabled="record.id === currentUserId && record.isActive"
                        >
                          <component :is="record.isActive ? StopOutlined : CheckCircleOutlined" />
                          {{ record.isActive ? '禁用用户' : '启用用户' }}
                        </a-menu-item>

                        <!-- 危险操作 -->
                        <a-menu-divider />
                        <a-menu-item
                          key="reset-password"
                          :disabled="record.id === currentUserId"
                        >
                          <KeyOutlined />
                          重置密码
                        </a-menu-item>
                        <a-menu-item
                          key="delete"
                          :disabled="record.id === currentUserId"
                          class="danger-menu-item"
                        >
                          <DeleteOutlined />
                          删除用户
                        </a-menu-item>
                      </a-menu>
                    </template>
                    <a-tooltip title="更多操作">
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
      title="列设置"
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
                  {{ item.title }}
                  <a-tag v-if="item.key === 'user' || item.key === 'actions'" size="small" color="blue">
                    必需
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
      title="重置用户密码"
      @ok="confirmResetPassword"
      :confirm-loading="resetPasswordLoading"
      ok-text="确定重置"
      cancel-text="取消"
    >
      <a-alert
        message="重置确认"
        :description="`确定要重置用户 ${resetPasswordUser?.nickname || resetPasswordUser?.username} 的密码吗？`"
        type="warning"
        show-icon
        class="mb-4"
      />
      <p>重置后：</p>
      <ul>
        <li>新密码将自动生成</li>
        <li>用户的所有登录会话将被终止</li>
        <li>用户需要使用新密码重新登录</li>
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

const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number, range: [number, number]) =>
    `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
})

// 表格分页配置
const paginationConfig = computed(() => ({
  ...pagination.value,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number, range: [number, number]) => {
    const start = range[0]
    const end = range[1]
    return `显示 ${start}-${end} / 共 ${total} 条`
  },
  pageSizeOptions: ['10', '20', '50', '100'],
  size: 'default'
}))

// 所有可用列
const allColumns = ref([
  {
    title: '用户信息',
    key: 'user',
    width: 280,
    fixed: 'left',
    visible: true
  },
  {
    title: '角色',
    key: 'role',
    width: 120,
    visible: true,
    filters: [
      { text: '管理员', value: 'admin' },
      { text: '普通用户', value: 'user' }
    ]
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    visible: true,
    filters: [
      { text: '正常', value: true },
      { text: '禁用', value: false }
    ]
  },
  {
    title: '统计',
    key: 'stats',
    width: 120,
    visible: true
  },
  {
    title: '最后登录',
    key: 'lastLogin',
    width: 150,
    visible: true,
    sorter: true
  },
  {
    title: '注册时间',
    key: 'createdAt',
    width: 150,
    visible: true,
    sorter: true
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
    visible: true
  }
])

// 当前显示的列
const visibleColumns = computed(() =>
  allColumns.value.filter(col => col.visible)
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
    message.error('加载用户列表失败')
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
  message.success('列设置已保存')
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
  return role === 'admin' ? '管理员' : '普通用户'
}

// 格式化日期时间
const formatDateTime = (dateString: string, type: 'date' | 'time' = 'date') => {
  const date = new Date(dateString)
  if (type === 'date') {
    return date.toLocaleDateString('zh-CN')
  } else {
    return date.toLocaleTimeString('zh-CN', { hour12: false })
  }
}

const handleRoleChange = async (user: User, newRole: string) => {
  try {
    await api.patch(`/api/admin/users/${user.id}/role`, { role: newRole })
    message.success('角色更新成功')
    loadUsers()
  } catch (error) {
    console.error('角色更新失败:', error)
    message.error('角色更新失败')
  }
}

const handleStatusChange = async (user: User) => {
  try {
    const newStatus = !user.isActive
    await api.patch(`/api/admin/users/${user.id}/status`, { isActive: newStatus })
    message.success(`用户${newStatus ? '启用' : '禁用'}成功`)
    loadUsers()
  } catch (error) {
    console.error('状态更新失败:', error)
    message.error('状态更新失败')
  }
}

const handleDelete = async (user: User) => {
  try {
    await api.delete(`/api/admin/users/${user.id}`)
    message.success('用户删除成功')
    loadUsers()
  } catch (error) {
    console.error('删除用户失败:', error)
    message.error('删除用户失败')
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
  const actionText = {
    activate: '启用',
    deactivate: '禁用',
    delete: '删除'
  }[key] || '操作'

  Modal.confirm({
    title: `批量${actionText}用户`,
    content: `确定要${actionText} ${selectedCount} 名用户吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: () => handleBatchOperation(key)
  })
}

// 批量操作
const handleBatchOperation = async (action: string) => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请选择要操作的用户')
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
    message.error('批量操作失败')
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
        title: '删除用户',
        content: `确定要删除用户 ${user.nickname || user.username} 吗？`,
        okText: '确定删除',
        okType: 'danger',
        cancelText: '取消',
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
    message.success('密码重置成功，用户会话已终止')
    resetPasswordVisible.value = false
    loadUsers()
  } catch (error) {
    console.error('密码重置失败:', error)
    message.error('密码重置失败')
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

    message.success('用户数据导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    message.error('导出失败')
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
