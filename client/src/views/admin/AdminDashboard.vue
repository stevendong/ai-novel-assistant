<template>
  <div class="admin-dashboard">
    <a-page-header
      title="管理面板"
      sub-title="系统概览与统计信息"
    />

    <div class="dashboard-content p-6">
      <!-- 统计卡片 -->
      <a-row :gutter="16" class="mb-6">
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="总用户数"
              :value="stats.users.total"
              :loading="loading"
            >
              <template #prefix>
                <UserOutlined style="color: #1890ff" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="活跃用户"
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
              title="管理员数量"
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
              title="本周新用户"
              :value="stats.users.recent"
              :loading="loading"
            >
              <template #prefix>
                <PlusOutlined style="color: #722ed1" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>

      <!-- 内容统计 -->
      <a-row :gutter="16" class="mb-6">
        <a-col :span="12">
          <a-card title="内容统计">
            <a-statistic
              title="小说总数"
              :value="stats.content.novels"
              :loading="loading"
            />
            <a-divider />
            <a-statistic
              title="章节总数"
              :value="stats.content.chapters"
              :loading="loading"
            />
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card title="快速操作">
            <a-space direction="vertical" style="width: 100%">
              <a-button type="primary" block @click="navigateToUserManagement">
                <UserOutlined />
                用户管理
              </a-button>
              <a-button block @click="navigateToInviteManagement">
                <GiftOutlined />
                邀请码管理
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
    const response = await api.get('/admin/stats')
    stats.value = response.data
  } catch (error) {
    console.error('加载统计信息失败:', error)
    message.error('加载统计信息失败')
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
  background: #f5f5f5;
}

.dashboard-content {
  background: #f5f5f5;
}
</style>