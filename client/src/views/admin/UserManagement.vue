<template>
  <div class="user-management">
    <a-page-header
      title="用户管理"
      sub-title="管理系统用户权限和状态"
    />

    <div class="management-content p-6">
      <!-- 搜索和筛选 -->
      <a-card class="mb-4">
        <a-row :gutter="16" align="middle">
          <a-col :span="8">
            <a-input-search
              v-model:value="searchQuery"
              placeholder="搜索用户名、邮箱或昵称"
              @search="handleSearch"
              allow-clear
            />
          </a-col>
          <a-col :span="4">
            <a-select
              v-model:value="roleFilter"
              placeholder="角色筛选"
              style="width: 100%"
              @change="handleSearch"
              allow-clear
            >
              <a-select-option value="">全部</a-select-option>
              <a-select-option value="admin">管理员</a-select-option>
              <a-select-option value="user">普通用户</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="4">
            <a-button @click="handleSearch" :loading="loading">
              <SearchOutlined />
              搜索
            </a-button>
          </a-col>
        </a-row>
      </a-card>

      <!-- 用户列表 -->
      <a-card>
        <a-table
          :columns="columns"
          :data-source="users"
          :loading="loading"
          :pagination="pagination"
          @change="handleTableChange"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'role'">
              <a-tag :color="record.role === 'admin' ? 'red' : 'blue'">
                {{ record.role === 'admin' ? '管理员' : '普通用户' }}
              </a-tag>
            </template>

            <template v-if="column.key === 'status'">
              <a-tag :color="record.isActive ? 'green' : 'red'">
                {{ record.isActive ? '正常' : '禁用' }}
              </a-tag>
            </template>

            <template v-if="column.key === 'lastLogin'">
              {{ record.lastLogin ? new Date(record.lastLogin).toLocaleString() : '从未登录' }}
            </template>

            <template v-if="column.key === 'createdAt'">
              {{ new Date(record.createdAt).toLocaleString() }}
            </template>

            <template v-if="column.key === 'novelCount'">
              {{ record._count?.novels || 0 }}
            </template>

            <template v-if="column.key === 'actions'">
              <a-space>
                <a-dropdown>
                  <template #overlay>
                    <a-menu @click="({ key }) => handleRoleChange(record, key)">
                      <a-menu-item key="admin" :disabled="record.role === 'admin'">
                        设为管理员
                      </a-menu-item>
                      <a-menu-item key="user" :disabled="record.role === 'user'">
                        设为普通用户
                      </a-menu-item>
                    </a-menu>
                  </template>
                  <a-button size="small">
                    角色 <DownOutlined />
                  </a-button>
                </a-dropdown>

                <a-button
                  size="small"
                  :type="record.isActive ? 'default' : 'primary'"
                  @click="handleStatusChange(record)"
                  :disabled="record.id === currentUserId && record.isActive"
                >
                  {{ record.isActive ? '禁用' : '启用' }}
                </a-button>

                <a-popconfirm
                  title="确定删除此用户吗？"
                  @confirm="handleDelete(record)"
                  :disabled="record.id === currentUserId"
                >
                  <a-button
                    size="small"
                    danger
                    :disabled="record.id === currentUserId"
                  >
                    删除
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import {
  SearchOutlined,
  DownOutlined
} from '@ant-design/icons-vue'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/auth'

interface User {
  id: string
  username: string
  email: string
  nickname?: string
  role: string
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

const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number, range: [number, number]) =>
    `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
})

const columns = [
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
    sorter: true
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email'
  },
  {
    title: '昵称',
    dataIndex: 'nickname',
    key: 'nickname'
  },
  {
    title: '角色',
    key: 'role',
    filters: [
      { text: '管理员', value: 'admin' },
      { text: '普通用户', value: 'user' }
    ]
  },
  {
    title: '状态',
    key: 'status'
  },
  {
    title: '小说数量',
    key: 'novelCount'
  },
  {
    title: '最后登录',
    key: 'lastLogin',
    sorter: true
  },
  {
    title: '注册时间',
    key: 'createdAt',
    sorter: true
  },
  {
    title: '操作',
    key: 'actions',
    width: 200
  }
]

const loadUsers = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.value.current,
      limit: pagination.value.pageSize,
      search: searchQuery.value,
      role: roleFilter.value
    }

    const response = await api.get('/admin/users', { params })
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

const handleRoleChange = async (user: User, newRole: string) => {
  try {
    await api.patch(`/admin/users/${user.id}/role`, { role: newRole })
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
    await api.patch(`/admin/users/${user.id}/status`, { isActive: newStatus })
    message.success(`用户${newStatus ? '启用' : '禁用'}成功`)
    loadUsers()
  } catch (error) {
    console.error('状态更新失败:', error)
    message.error('状态更新失败')
  }
}

const handleDelete = async (user: User) => {
  try {
    await api.delete(`/admin/users/${user.id}`)
    message.success('用户删除成功')
    loadUsers()
  } catch (error) {
    console.error('删除用户失败:', error)
    message.error('删除用户失败')
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.user-management {
  height: 100%;
  background: #f5f5f5;
}

.management-content {
  background: #f5f5f5;
}
</style>