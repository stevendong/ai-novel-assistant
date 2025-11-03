<template>
  <div class="user-profile">
    <a-page-header
      :title="t('user.profile.header.title')"
      :sub-title="t('user.profile.header.subtitle')"
    />

    <div class="profile-content p-6">
      <a-row :gutter="24">
        <!-- 左侧：基本信息和统计 -->
        <a-col :span="16">
          <!-- 基本信息 -->
          <a-card :title="t('user.profile.basicInfo.title')" class="mb-4">
            <a-form
              :model="profileForm"
              :rules="profileRules"
              ref="profileFormRef"
              :label-col="{ span: 6 }"
              :wrapper-col="{ span: 18 }"
              @finish="handleUpdateProfile"
            >
              <a-form-item :label="t('user.profile.basicInfo.username')">
                <a-input
                  :value="userStore.user?.username"
                  disabled
                  :suffix="t('user.profile.basicInfo.usernameHint')"
                  :placeholder="t('user.profile.basicInfo.username')"
                />
              </a-form-item>

              <a-form-item :label="t('user.profile.basicInfo.email')">
                <a-input
                  :value="userStore.user?.email"
                  disabled
                  :suffix="t('user.profile.basicInfo.emailHint')"
                  :placeholder="t('user.profile.basicInfo.email')"
                />
              </a-form-item>

              <a-form-item :label="t('user.profile.basicInfo.nickname')" name="nickname">
                <a-input
                  v-model:value="profileForm.nickname"
                  :placeholder="t('user.profile.basicInfo.nicknamePlaceholder')"
                  :loading="profileLoading"
                />
              </a-form-item>

              <a-form-item :label="t('user.profile.basicInfo.avatar')" name="avatar">
                <AvatarUpload
                  :current-avatar="userStore.user?.avatar"
                  :size="80"
                  @upload-success="handleAvatarUploadSuccess"
                  @delete-success="handleAvatarDeleteSuccess"
                />
              </a-form-item>

              <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
                <a-button type="primary" html-type="submit" :loading="profileLoading">
                  {{ t('user.profile.basicInfo.submit') }}
                </a-button>
              </a-form-item>
            </a-form>
          </a-card>

          <!-- 密码修改 -->
          <a-card :title="t('user.profile.password.title')" class="mb-4">
            <a-form
              :model="passwordForm"
              :rules="passwordRules"
              ref="passwordFormRef"
              :label-col="{ span: 6 }"
              :wrapper-col="{ span: 18 }"
              @finish="handleChangePassword"
            >
              <a-form-item :label="t('user.profile.password.current')" name="currentPassword">
                <a-input-password
                  v-model:value="passwordForm.currentPassword"
                  :placeholder="t('user.profile.password.currentPlaceholder')"
                  autocomplete="current-password"
                />
              </a-form-item>

              <a-form-item :label="t('user.profile.password.new')" name="newPassword">
                <a-input-password
                  v-model:value="passwordForm.newPassword"
                  :placeholder="t('user.profile.password.newPlaceholder')"
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
                  <span class="strength-text">{{ passwordStrength.key ? t(passwordStrength.key) : '' }}</span>
                </div>
              </a-form-item>

              <a-form-item :label="t('user.profile.password.confirm')" name="confirmPassword">
                <a-input-password
                  v-model:value="passwordForm.confirmPassword"
                  :placeholder="t('user.profile.password.confirmPlaceholder')"
                  autocomplete="new-password"
                />
              </a-form-item>

              <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
                <a-button type="primary" html-type="submit" :loading="passwordLoading">
                  {{ t('user.profile.password.submit') }}
                </a-button>
                <a-button class="ml-2" @click="resetPasswordForm">
                  {{ t('user.profile.password.reset') }}
                </a-button>
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>

        <!-- 右侧：统计信息和活动记录 -->
        <a-col :span="8">
          <!-- 统计信息 -->
          <a-card :title="t('user.profile.stats.title')" class="mb-4" :loading="statsLoading">
            <a-row :gutter="16" v-if="userStats">
              <a-col :span="12">
                <a-statistic :title="t('user.profile.stats.novels')" :value="userStats.novels" />
              </a-col>
              <a-col :span="12">
                <a-statistic :title="t('user.profile.stats.chapters')" :value="userStats.chapters" />
              </a-col>
            </a-row>
            <a-row :gutter="16" class="mt-3" v-if="userStats">
              <a-col :span="12">
                <a-statistic :title="t('user.profile.stats.totalWords')" :value="userStats.totalWords" />
              </a-col>
              <a-col :span="12">
                <a-statistic :title="t('user.profile.stats.activeSessions')" :value="userStats.activeSessions" />
              </a-col>
            </a-row>
            <a-row class="mt-3" v-if="userStats">
              <a-col :span="24">
                <a-statistic :title="t('user.profile.stats.recentActivity')" :value="userStats.recentActivity" :suffix="t('user.profile.stats.activitySuffix')" />
              </a-col>
            </a-row>
          </a-card>

          <!-- 会话管理 -->
          <a-card :title="t('user.profile.sessions.title')" class="mb-4">
            <template #extra>
              <a-button size="small" @click="loadSessions">
                <ReloadOutlined />
                {{ t('user.profile.sessions.refresh') }}
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
                      {{ t('user.profile.sessions.currentSession') }}
                    </a-tag>
                  </div>
                  <div class="session-details text-gray-500 text-sm">
                    <div>{{ t('user.profile.sessions.ipLabel') }}: {{ session.ipAddress || t('user.profile.sessions.unknown') }}</div>
                    <div>{{ t('user.profile.sessions.lastActive') }}: {{ formatTime(session.lastUsed) }}</div>
                  </div>
                </div>
                <a-button
                  v-if="!session.isCurrent"
                  size="small"
                  danger
                  @click="handleDeleteSession(session.id)"
                  :loading="sessionDeleting === session.id"
                >
                  {{ t('user.profile.sessions.logout') }}
                </a-button>
              </div>

              <a-button block @click="handleLogoutAll" :loading="logoutAllLoading">
                {{ t('user.profile.sessions.logoutAll') }}
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
import { useI18n } from 'vue-i18n'

const userStore = useAuthStore()
const { t, locale } = useI18n()

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

const localeTag = computed(() => {
  if (locale.value === 'zh') {
    return 'zh-CN'
  }
  if (locale.value === 'en') {
    return 'en-US'
  }
  return locale.value
})

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
  if (!password) return { level: 0, percentage: 0, key: '' }

  const checks = [
    /[a-z]/.test(password), // 小写字母
    /[A-Z]/.test(password), // 大写字母
    /\d/.test(password), // 数字
    /[!@#$%^&*(),.?":{}|<>]/.test(password), // 特殊字符
    password.length >= 8 // 长度
  ]

  const score = checks.filter(Boolean).length

  if (score <= 2) return { level: 1, percentage: 25, key: 'user.profile.passwordStrength.weak' }
  if (score <= 3) return { level: 2, percentage: 50, key: 'user.profile.passwordStrength.medium' }
  if (score <= 4) return { level: 3, percentage: 75, key: 'user.profile.passwordStrength.strong' }
  return { level: 4, percentage: 100, key: 'user.profile.passwordStrength.veryStrong' }
})

// 表单验证规则
const profileRules = computed<Record<string, Rule[]>>(() => ({
  nickname: [
    { max: 50, message: t('user.profile.rules.nicknameMax'), trigger: 'blur' },
    { pattern: /^[^<>'"&]*$/, message: t('user.profile.rules.nicknameInvalid'), trigger: 'blur' }
  ]
}))

const passwordRules = computed<Record<string, Rule[]>>(() => ({
  currentPassword: [
    { required: true, message: t('user.profile.rules.currentPasswordRequired'), trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: t('user.profile.rules.newPasswordRequired'), trigger: 'blur' },
    { min: 6, message: t('user.profile.rules.newPasswordMin'), trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: t('user.profile.rules.confirmPasswordRequired'), trigger: 'blur' },
    {
      validator: async (_rule: any, value: string) => {
        if (value !== passwordForm.newPassword) {
          return Promise.reject(new Error(t('user.profile.rules.confirmPasswordMismatch')))
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ]
}))

// 获取设备信息
const getDeviceInfo = (userAgent: string) => {
  if (!userAgent) return t('user.profile.sessions.devices.unknown')

  const ua = userAgent.toLowerCase()
  if (ua.includes('windows')) return t('user.profile.sessions.devices.windows')
  if (ua.includes('mac')) return t('user.profile.sessions.devices.mac')
  if (ua.includes('linux')) return t('user.profile.sessions.devices.linux')
  if (ua.includes('android')) return t('user.profile.sessions.devices.android')
  if (ua.includes('iphone') || ua.includes('ipad')) return t('user.profile.sessions.devices.ios')

  return t('user.profile.sessions.devices.unknown')
}

// 格式化时间
const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleString(localeTag.value)
}

// 更新个人信息
const handleUpdateProfile = async () => {
  try {
    profileLoading.value = true

    await api.put('/api/auth/profile', {
      nickname: profileForm.nickname,
      avatar: profileForm.avatar
    })

    await userStore.refreshUser()
    message.success(t('user.profile.messages.updateSuccess'))
  } catch (error: any) {
    console.error('更新个人信息失败:', error)
    message.error(error.response?.data?.message || t('user.profile.messages.updateFailed'))
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

    message.success(t('user.profile.messages.passwordSuccess'))
    resetPasswordForm()
    loadSessions() // 刷新会话列表
  } catch (error: any) {
    console.error('修改密码失败:', error)
    message.error(error.response?.data?.message || t('user.profile.messages.passwordFailed'))
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
  message.success(t('user.profile.messages.avatarUploadSuccess'))
}

// 处理头像删除成功
const handleAvatarDeleteSuccess = () => {
  profileForm.avatar = ''
  message.success(t('user.profile.messages.avatarDeleteSuccess'))
}

// 加载用户统计
const loadUserStats = async () => {
  try {
    statsLoading.value = true
    const response = await api.get('/api/auth/stats')
    userStats.value = response.data.stats
  } catch (error) {
    console.error('加载统计信息失败:', error)
    message.error(t('user.profile.messages.statsLoadFailed'))
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
    message.error(t('user.profile.messages.sessionsLoadFailed'))
  } finally {
    sessionsLoading.value = false
  }
}

// 删除特定会话
const handleDeleteSession = async (sessionId: string) => {
  try {
    sessionDeleting.value = sessionId
    await api.delete(`/api/auth/sessions/${sessionId}`)
    message.success(t('user.profile.messages.sessionLogoutSuccess'))
    loadSessions()
  } catch (error: any) {
    console.error('注销会话失败:', error)
    message.error(error.response?.data?.message || t('user.profile.messages.sessionLogoutFailed'))
  } finally {
    sessionDeleting.value = null
  }
}

// 注销所有其他会话
const handleLogoutAll = async () => {
  try {
    logoutAllLoading.value = true
    await api.post('/api/auth/logout-all')
    message.success(t('user.profile.messages.logoutAllSuccess'))
    loadSessions()
  } catch (error: any) {
    console.error('注销所有会话失败:', error)
    message.error(error.response?.data?.message || t('user.profile.messages.logoutAllFailed'))
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
