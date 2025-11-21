<template>
  <div class="admin-dashboard">
    <a-page-header
      :title="t('admin.dashboard.title')"
      :sub-title="t('admin.dashboard.subtitle')"
    />

    <div class="dashboard-content p-6">
      <!-- 统计卡片 -->
      <a-row :gutter="16" class="mb-6">
        <a-col :span="6">
          <a-card>
            <a-statistic
              :title="t('admin.dashboard.users.total')"
              :value="stats.users.total"
              :loading="loading"
            >
              <template #prefix>
                <UserOutlined style="color: #1488CC" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              :title="t('admin.dashboard.users.active')"
              :value="stats.users.active"
              :loading="loading"
            >
              <template #prefix>
                <CheckCircleOutlined style="color: #52c41a" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              :title="t('admin.dashboard.users.admins')"
              :value="stats.users.admins"
              :loading="loading"
            >
              <template #prefix>
                <CrownOutlined style="color: #faad14" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              :title="t('admin.dashboard.users.recent')"
              :value="stats.users.recent"
              :loading="loading"
            >
              <template #prefix>
                <PlusOutlined style="color: #2B32B2" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>

      <!-- 内容统计 -->
      <a-row :gutter="16" class="mb-6">
        <a-col :span="12">
          <a-card :title="t('admin.dashboard.content.title')">
            <a-statistic
              :title="t('admin.dashboard.content.novels')"
              :value="stats.content.novels"
              :loading="loading"
            />
            <a-divider />
            <a-statistic
              :title="t('admin.dashboard.content.chapters')"
              :value="stats.content.chapters"
              :loading="loading"
            />
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card :title="t('admin.dashboard.actions.title')">
            <a-space direction="vertical" style="width: 100%">
              <a-button type="primary" block @click="navigateToUserManagement">
                <UserOutlined />
                {{ t('admin.dashboard.actions.manageUsers') }}
              </a-button>
              <a-button block @click="navigateToInviteManagement">
                <GiftOutlined />
                {{ t('admin.dashboard.actions.manageInvites') }}
              </a-button>
            </a-space>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  UserOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  PlusOutlined,
  GiftOutlined
} from '@ant-design/icons-vue'
import { api } from '@/utils/api'
import { useI18n } from 'vue-i18n'

interface Stats {
  users: {
    total: number
    active: number
    admins: number
    recent: number
  }
  content: {
    novels: number
    chapters: number
  }
}

const router = useRouter()
const { t } = useI18n()
const loading = ref(false)
const stats = ref<Stats>({
  users: {
    total: 0,
    active: 0,
    admins: 0,
    recent: 0
  },
  content: {
    novels: 0,
    chapters: 0
  }
})

const loadStats = async () => {
  try {
    loading.value = true
    const response = await api.get('/api/admin/stats')
    stats.value = response.data
  } catch (error) {
    console.error('加载统计信息失败:', error)
    message.error(t('admin.dashboard.messages.loadFailed'))
  } finally {
    loading.value = false
  }
}

const navigateToUserManagement = () => {
  router.push({ name: 'userManagement' })
}

const navigateToInviteManagement = () => {
  router.push({ name: 'inviteManagement' })
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.admin-dashboard {
  height: 100%;
}
</style>
