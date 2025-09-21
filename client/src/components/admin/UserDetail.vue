<template>
  <a-drawer
    :visible="visible"
    :title="`用户详情 - ${userData?.username || ''}`"
    :width="600"
    @close="handleClose"
  >
    <div v-if="loading" class="text-center py-8">
      <a-spin size="large" />
    </div>

    <div v-else-if="userData" class="user-detail">
      <!-- 基本信息 -->
      <a-card title="基本信息" class="mb-4">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="用户ID">
            <a-typography-text copyable>{{ userData.id }}</a-typography-text>
          </a-descriptions-item>
          <a-descriptions-item label="用户名">
            {{ userData.username }}
          </a-descriptions-item>
          <a-descriptions-item label="邮箱">
            {{ userData.email }}
          </a-descriptions-item>
          <a-descriptions-item label="昵称">
            {{ userData.nickname || '未设置' }}
          </a-descriptions-item>
          <a-descriptions-item label="角色">
            <a-tag :color="userData.role === 'admin' ? 'red' : 'blue'">
              {{ userData.role === 'admin' ? '管理员' : '普通用户' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="userData.isActive ? 'green' : 'red'">
              {{ userData.isActive ? '活跃' : '已禁用' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="邀请码验证">
            <a-tag :color="userData.inviteVerified ? 'green' : 'orange'">
              {{ userData.inviteVerified ? '已验证' : '未验证' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="使用的邀请码">
            {{ userData.inviteCodeUsed || '无' }}
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 邀请关系 -->
      <a-card title="邀请关系" class="mb-4" v-if="userData.inviter">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="邀请人">
            {{ userData.inviter.nickname || userData.inviter.username }}
            <a-tag size="small" class="ml-2">{{ userData.inviter.username }}</a-tag>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 统计信息 -->
      <a-card title="统计信息" class="mb-4">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-statistic title="小说数量" :value="userData._count.novels" />
          </a-col>
          <a-col :span="12">
            <a-statistic title="活跃会话" :value="userData._count.sessions" />
          </a-col>
        </a-row>
        <a-row :gutter="16" class="mt-4">
          <a-col :span="12">
            <a-statistic title="AI对话" :value="userData._count.conversations" />
          </a-col>
          <a-col :span="12">
            <a-statistic title="邀请用户" :value="userData._count.invitees" />
          </a-col>
        </a-row>
      </a-card>

      <!-- 时间信息 -->
      <a-card title="时间信息" class="mb-4">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="注册时间">
            {{ formatDateTime(userData.createdAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="最后登录">
            {{ userData.lastLogin ? formatDateTime(userData.lastLogin) : '从未登录' }}
          </a-descriptions-item>
          <a-descriptions-item label="最后更新">
            {{ formatDateTime(userData.updatedAt) }}
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 操作按钮 -->
      <a-card title="快速操作" class="mb-4">
        <a-space wrap>
          <a-button type="primary" @click="handleEdit">
            <EditOutlined />
            编辑用户
          </a-button>
          <a-button 
            :type="userData.isActive ? 'default' : 'primary'"
            @click="handleToggleStatus"
            :loading="actionLoading.status"
            :disabled="userData.id === currentUserId && userData.isActive"
          >
            {{ userData.isActive ? '禁用用户' : '启用用户' }}
          </a-button>
          <a-dropdown>
            <template #overlay>
              <a-menu @click="({ key }) => handleRoleChange(key as string)">
                <a-menu-item key="admin" :disabled="userData.role === 'admin'">
                  设为管理员
                </a-menu-item>
                <a-menu-item key="user" :disabled="userData.role === 'user'">
                  设为普通用户
                </a-menu-item>
              </a-menu>
            </template>
            <a-button>
              角色管理 <DownOutlined />
            </a-button>
          </a-dropdown>
          <a-popconfirm
            title="确定重置此用户的密码吗？重置后将强制用户重新登录。"
            @confirm="handleResetPassword"
            :disabled="actionLoading.password"
          >
            <a-button :loading="actionLoading.password">
              <KeyOutlined />
              重置密码
            </a-button>
          </a-popconfirm>
          <a-popconfirm
            title="确定删除此用户吗？此操作将禁用用户账户。"
            @confirm="handleDelete"
            :disabled="userData.id === currentUserId || actionLoading.delete"
          >
            <a-button 
              danger 
              :loading="actionLoading.delete"
              :disabled="userData.id === currentUserId"
            >
              <DeleteOutlined />
              删除用户
            </a-button>
          </a-popconfirm>
        </a-space>
      </a-card>
    </div>

    <div v-else class="text-center py-8">
      <a-empty description="用户信息加载失败" />
    </div>
  </a-drawer>

  <!-- 重置密码模态框 -->
  <a-modal
    v-model:visible="resetPasswordVisible"
    title="重置用户密码"
    :confirmLoading="actionLoading.password"
    @ok="confirmResetPassword"
  >
    <a-form :model="resetPasswordForm" ref="resetPasswordFormRef">
      <a-form-item
        label="新密码"
        name="newPassword"
        :rules="[
          { required: true, message: '请输入新密码' },
          { min: 6, message: '密码至少6个字符' }
        ]"
      >
        <a-input-password
          v-model:value="resetPasswordForm.newPassword"
          placeholder="请输入新密码"
          autocomplete="new-password"
        />
      </a-form-item>
      <a-form-item
        label="确认密码"
        name="confirmPassword"
        :rules="[
          { required: true, message: '请确认密码' },
          {
            validator: async (_, value) => {
              if (value !== resetPasswordForm.newPassword) {
                return Promise.reject(new Error('两次输入的密码不一致'))
              }
            }
          }
        ]"
      >
        <a-input-password
          v-model:value="resetPasswordForm.confirmPassword"
          placeholder="请再次输入新密码"
          autocomplete="new-password"
        />
      </a-form-item>
    </a-form>
    <a-alert
      message="重置密码后，用户的所有登录会话将被强制注销"
      type="warning"
      show-icon
      class="mt-4"
    />
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue/es/form'
import {
  EditOutlined,
  DownOutlined,
  KeyOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/auth'

interface UserDetail {
  id: string
  username: string
  email: string
  nickname?: string
  avatar?: string
  role: 'admin' | 'user'
  isActive: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
  inviteCodeUsed?: string
  inviteVerified: boolean
  invitedBy?: string
  _count: {
    novels: number
    sessions: number
    conversations: number
    invitees: number
  }
  inviter?: {
    id: string
    username: string
    nickname?: string
  }
}

interface Props {
  visible: boolean
  userId?: string
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'edit', user: UserDetail): void
  (e: 'refresh'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.id)

const loading = ref(false)
const userData = ref<UserDetail | null>(null)
const resetPasswordVisible = ref(false)
const resetPasswordFormRef = ref<FormInstance>()

const actionLoading = reactive({
  status: false,
  role: false,
  password: false,
  delete: false
})

const resetPasswordForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

// 格式化日期时间
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 加载用户详情
const loadUserDetail = async () => {
  if (!props.userId) return

  try {
    loading.value = true
    const response = await api.get(`/admin/users/${props.userId}`)
    userData.value = response.data
  } catch (error) {
    console.error('加载用户详情失败:', error)
    message.error('加载用户详情失败')
    userData.value = null
  } finally {
    loading.value = false
  }
}

// 监听用户ID变化
watch(() => [props.visible, props.userId], ([visible, userId]) => {
  if (visible && userId) {
    loadUserDetail()
  }
}, { immediate: true })

// 处理关闭
const handleClose = () => {
  emit('update:visible', false)
}

// 处理编辑
const handleEdit = () => {
  if (userData.value) {
    emit('edit', userData.value)
  }
}

// 处理状态切换
const handleToggleStatus = async () => {
  if (!userData.value) return

  try {
    actionLoading.status = true
    const newStatus = !userData.value.isActive
    await api.patch(`/admin/users/${userData.value.id}/status`, {
      isActive: newStatus
    })
    message.success(`用户${newStatus ? '启用' : '禁用'}成功`)
    userData.value.isActive = newStatus
    emit('refresh')
  } catch (error) {
    console.error('状态更新失败:', error)
    message.error('状态更新失败')
  } finally {
    actionLoading.status = false
  }
}

// 处理角色变更
const handleRoleChange = async (newRole: string) => {
  if (!userData.value) return

  try {
    actionLoading.role = true
    await api.patch(`/admin/users/${userData.value.id}/role`, { role: newRole })
    message.success('角色更新成功')
    userData.value.role = newRole as 'admin' | 'user'
    emit('refresh')
  } catch (error) {
    console.error('角色更新失败:', error)
    message.error('角色更新失败')
  } finally {
    actionLoading.role = false
  }
}

// 处理重置密码
const handleResetPassword = () => {
  resetPasswordForm.newPassword = ''
  resetPasswordForm.confirmPassword = ''
  resetPasswordVisible.value = true
}

// 确认重置密码
const confirmResetPassword = async () => {
  try {
    await resetPasswordFormRef.value?.validate()
    actionLoading.password = true

    await api.patch(`/admin/users/${userData.value?.id}/password`, {
      newPassword: resetPasswordForm.newPassword
    })

    message.success('密码重置成功，用户会话已终止')
    resetPasswordVisible.value = false
    emit('refresh')
  } catch (error) {
    console.error('密码重置失败:', error)
    message.error('密码重置失败')
  } finally {
    actionLoading.password = false
  }
}

// 处理删除
const handleDelete = async () => {
  if (!userData.value) return

  try {
    actionLoading.delete = true
    await api.delete(`/admin/users/${userData.value.id}`)
    message.success('用户删除成功')
    emit('update:visible', false)
    emit('refresh')
  } catch (error) {
    console.error('删除用户失败:', error)
    message.error('删除用户失败')
  } finally {
    actionLoading.delete = false
  }
}
</script>

<style scoped>
.user-detail {
  height: 100%;
}

.ant-descriptions-item-label {
  width: 120px;
}

.mt-4 {
  margin-top: 16px;
}

.mb-4 {
  margin-bottom: 16px;
}

.ml-2 {
  margin-left: 8px;
}
</style>

