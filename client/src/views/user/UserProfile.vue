<template>
  <div class="user-profile">
    <a-page-header
      title="个人资料"
      sub-title="管理您的个人信息和账户设置"
    />

    <div class="profile-content p-6">
      <a-row :gutter="24">
        <!-- 左侧：基本信息和统计 -->
        <a-col :span="16">
          <!-- 基本信息 -->
          <a-card title="基本信息" class="mb-4">
            <a-form
              :model="profileForm"
              :rules="profileRules"
              ref="profileFormRef"
              :label-col="{ span: 6 }"
              :wrapper-col="{ span: 18 }"
              @finish="handleUpdateProfile"
            >
              <a-form-item label="用户名">
                <a-input
                  :value="userStore.user?.username"
                  disabled
                  suffix="用户名不可修改"
                />
              </a-form-item>

              <a-form-item label="邮箱">
                <a-input
                  :value="userStore.user?.email"
                  disabled
                  suffix="邮箱不可修改"
                />
              </a-form-item>

              <a-form-item label="昵称" name="nickname">
                <a-input
                  v-model:value="profileForm.nickname"
                  placeholder="请输入昵称"
                  :loading="profileLoading"
                />
              </a-form-item>

              <a-form-item label="头像" name="avatar">
                <AvatarUpload
                  :current-avatar="userStore.user?.avatar"
                  :size="80"
                  @upload-success="handleAvatarUploadSuccess"
                  @delete-success="handleAvatarDeleteSuccess"
                />
              </a-form-item>

              <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
                <a-button type="primary" html-type="submit" :loading="profileLoading">
                  更新个人信息
                </a-button>
              </a-form-item>
            </a-form>
          </a-card>

          <!-- 密码修改 -->
          <a-card title="修改密码" class="mb-4">
            <a-form
              :model="passwordForm"
              :rules="passwordRules"
              ref="passwordFormRef"
              :label-col="{ span: 6 }"
              :wrapper-col="{ span: 18 }"
              @finish="handleChangePassword"
            >
              <a-form-item label="当前密码" name="currentPassword">
                <a-input-password
                  v-model:value="passwordForm.currentPassword"
                  placeholder="请输入当前密码"
                  autocomplete="current-password"
                />
              </a-form-item>

              <a-form-item label="新密码" name="newPassword">
                <a-input-password
                  v-model:value="passwordForm.newPassword"
                  placeholder="请输入新密码"
                  autocomplete="new-password"
                />
                <div class="password-strength mt-2">
                  <div class="strength-bar">
                    <div
                      class="strength-fill"
                      :class="`strength-${passwordStrength.level}`"
                      :style="{ width: passwordStrength.percentage + '%' }"
                    ></div>
                  </div>
                  <span class="strength-text">{{ passwordStrength.text }}</span>
                </div>
              </a-form-item>

              <a-form-item label="确认密码" name="confirmPassword">
                <a-input-password
                  v-model:value="passwordForm.confirmPassword"
                  placeholder="请再次输入新密码"
                  autocomplete="new-password"
                />
              </a-form-item>

              <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
                <a-button type="primary" html-type="submit" :loading="passwordLoading">
                  修改密码
                </a-button>
                <a-button class="ml-2" @click="resetPasswordForm">
                  重置
                </a-button>
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>

        <!-- 右侧：统计信息和活动记录 -->
        <a-col :span="8">
          <!-- 统计信息 -->
          <a-card title="统计信息" class="mb-4" :loading="statsLoading">
            <a-row :gutter="16" v-if="userStats">
              <a-col :span="12">
                <a-statistic title="小说数量" :value="userStats.novels" />
              </a-col>
              <a-col :span="12">
                <a-statistic title="章节数量" :value="userStats.chapters" />
              </a-col>
            </a-row>
            <a-row :gutter="16" class="mt-3" v-if="userStats">
              <a-col :span="12">
                <a-statistic title="总字数" :value="userStats.totalWords" />
              </a-col>
              <a-col :span="12">
                <a-statistic title="活跃会话" :value="userStats.activeSessions" />
              </a-col>
            </a-row>
            <a-row class="mt-3" v-if="userStats">
              <a-col :span="24">
                <a-statistic title="最近活动" :value="userStats.recentActivity" suffix="项" />
              </a-col>
            </a-row>
          </a-card>

          <!-- 会话管理 -->
          <a-card title="登录会话" class="mb-4">
            <template #extra>
              <a-button size="small" @click="loadSessions">
                <ReloadOutlined />
                刷新
              </a-button>
            </template>

            <div v-if="sessionsLoading" class="text-center py-4">
              <a-spin />
            </div>

            <div v-else>
              <div v-for="session in sessions" :key="session.id" class="session-item mb-3">
                <div class="session-info">
                  <div class="session-device">
                    <DesktopOutlined />
                    {{ getDeviceInfo(session.userAgent) }}
                    <a-tag v-if="session.isCurrent" size="small" color="green" class="ml-2">
                      当前会话
                    </a-tag>
                  </div>
                  <div class="session-details text-gray-500 text-sm">
                    <div>IP: {{ session.ipAddress || '未知' }}</div>
                    <div>最后活动: {{ formatTime(session.lastUsed) }}</div>
                  </div>
                </div>
                <a-button
                  v-if="!session.isCurrent"
                  size="small"
                  danger
                  @click="handleDeleteSession(session.id)"
                  :loading="sessionDeleting === session.id"
                >
                  注销
                </a-button>
              </div>

              <a-button block @click="handleLogoutAll" :loading="logoutAllLoading">
                注销所有其他会话
              </a-button>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import {
  ReloadOutlined,
  DesktopOutlined
} from '@ant-design/icons-vue'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/auth'
import AvatarUpload from '@/components/user/AvatarUpload.vue'

const userStore = useAuthStore()

const profileFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()

// 状态管理
const profileLoading = ref(false)
const passwordLoading = ref(false)
const statsLoading = ref(false)
const sessionsLoading = ref(false)
const logoutAllLoading = ref(false)
const sessionDeleting = ref<string | null>(null)

// 表单数据
const profileForm = reactive({
  nickname: '',
  avatar: ''
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 用户统计
const userStats = ref<any>(null)
const sessions = ref<any[]>([])

// 初始化个人信息表单
const initProfileForm = () => {
  if (userStore.user) {
    profileForm.nickname = userStore.user.nickname || ''
    profileForm.avatar = userStore.user.avatar || ''
  }
}

// 密码强度计算
const passwordStrength = computed(() => {
  const password = passwordForm.newPassword
  if (!password) return { level: 0, percentage: 0, text: '' }

  let score = 0
  const checks = [
    /[a-z]/.test(password), // 小写字母
    /[A-Z]/.test(password), // 大写字母
    /\d/.test(password),    // 数字
    /[!@#$%^&*(),.?":{}|<>]/.test(password), // 特殊字符
    password.length >= 8    // 长度
  ]

  score = checks.filter(Boolean).length

  if (score <= 2) return { level: 1, percentage: 25, text: '弱' }
  if (score <= 3) return { level: 2, percentage: 50, text: '中等' }
  if (score <= 4) return { level: 3, percentage: 75, text: '强' }
  return { level: 4, percentage: 100, text: '很强' }
})

// 表单验证规则
const profileRules: Record<string, Rule[]> = {
  nickname: [
    { max: 50, message: '昵称不能超过50个字符', trigger: 'blur' },
    { pattern: /^[^<>'"&]*$/, message: '昵称不能包含特殊字符', trigger: 'blur' }
  ]
}

const passwordRules: Record<string, Rule[]> = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: async (_rule: any, value: string) => {
        if (value !== passwordForm.newPassword) {
          return Promise.reject(new Error('两次输入的密码不一致'))
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ]
}

// 获取设备信息
const getDeviceInfo = (userAgent: string) => {
  if (!userAgent) return '未知设备'

  if (userAgent.includes('Windows')) return 'Windows 设备'
  if (userAgent.includes('Mac')) return 'Mac 设备'
  if (userAgent.includes('Linux')) return 'Linux 设备'
  if (userAgent.includes('Android')) return 'Android 设备'
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS 设备'

  return '未知设备'
}

// 格式化时间
const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 更新个人信息
const handleUpdateProfile = async () => {
  try {
    profileLoading.value = true

    const response = await api.put('/api/auth/profile', {
      nickname: profileForm.nickname,
      avatar: profileForm.avatar
    })

    await userStore.refreshUser()
    message.success('个人信息更新成功')
  } catch (error: any) {
    console.error('更新个人信息失败:', error)
    message.error(error.response?.data?.message || '更新失败')
  } finally {
    profileLoading.value = false
  }
}

// 修改密码
const handleChangePassword = async () => {
  try {
    passwordLoading.value = true

    await api.put('/api/auth/password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })

    message.success('密码修改成功，其他会话已注销')
    resetPasswordForm()
    loadSessions() // 刷新会话列表
  } catch (error: any) {
    console.error('修改密码失败:', error)
    message.error(error.response?.data?.message || '修改密码失败')
  } finally {
    passwordLoading.value = false
  }
}

// 重置密码表单
const resetPasswordForm = () => {
  Object.assign(passwordForm, {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  passwordFormRef.value?.resetFields()
}

// 处理头像上传成功
const handleAvatarUploadSuccess = (url: string) => {
  profileForm.avatar = url
  message.success('头像上传成功')
}

// 处理头像删除成功
const handleAvatarDeleteSuccess = () => {
  profileForm.avatar = ''
  message.success('头像删除成功')
}

// 加载用户统计
const loadUserStats = async () => {
  try {
    statsLoading.value = true
    const response = await api.get('/api/auth/stats')
    userStats.value = response.data.stats
  } catch (error) {
    console.error('加载统计信息失败:', error)
  } finally {
    statsLoading.value = false
  }
}

// 加载会话列表
const loadSessions = async () => {
  try {
    sessionsLoading.value = true
    const response = await api.get('/api/auth/sessions')
    sessions.value = response.data.sessions
  } catch (error) {
    console.error('加载会话列表失败:', error)
    message.error('加载会话列表失败')
  } finally {
    sessionsLoading.value = false
  }
}

// 删除特定会话
const handleDeleteSession = async (sessionId: string) => {
  try {
    sessionDeleting.value = sessionId
    await api.delete(`/api/auth/sessions/${sessionId}`)
    message.success('会话注销成功')
    loadSessions()
  } catch (error: any) {
    console.error('注销会话失败:', error)
    message.error(error.response?.data?.message || '注销会话失败')
  } finally {
    sessionDeleting.value = null
  }
}

// 注销所有其他会话
const handleLogoutAll = async () => {
  try {
    logoutAllLoading.value = true
    await api.post('/api/auth/logout-all')
    message.success('所有其他会话已注销')
    loadSessions()
  } catch (error: any) {
    console.error('注销所有会话失败:', error)
    message.error(error.response?.data?.message || '注销失败')
  } finally {
    logoutAllLoading.value = false
  }
}

// 监听用户信息变化
watch(() => userStore.user, () => {
  initProfileForm()
}, { immediate: true })

onMounted(() => {
  initProfileForm()
  loadUserStats()
  loadSessions()
})
</script>

<style scoped>
.user-profile {
  height: 100%;
}

.avatar-upload {
  display: flex;
  align-items: center;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.session-device {
  font-weight: 500;
}

.password-strength {
  margin-top: 8px;
}

.strength-bar {
  width: 100%;
  height: 4px;
  background-color: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: all 0.3s;
}

.strength-1 { background-color: #ff4d4f; }
.strength-2 { background-color: #faad14; }
.strength-3 { background-color: #1890ff; }
.strength-4 { background-color: #52c41a; }

.strength-text {
  font-size: 12px;
  color: #666;
  margin-left: 8px;
}

.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.ml-2 { margin-left: 8px; }
.ml-4 { margin-left: 16px; }
.text-center { text-align: center; }
.py-4 { padding: 16px 0; }
.text-gray-500 { color: #8c8c8c; }
.text-sm { font-size: 12px; }
</style>
