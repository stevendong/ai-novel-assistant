<template>
  <a-layout-footer class="status-bar">
    <div class="status-left">
      <a-space size="large">
        <!-- 项目信息 -->
        <div class="status-item project-info">
          <BookOutlined class="status-icon" />
          <span class="status-label">{{ t('footer.projectLabel') }}</span>
          <span class="status-value">{{ projectInfo.title || t('footer.noProjectSelected') }}</span>
          <a-tag
            v-if="projectInfo.status"
            size="small"
            :color="getStatusColor(projectInfo.status)"
            class="project-status-tag"
          >
            {{ getStatusText(projectInfo.status) }}
          </a-tag>
        </div>

        <!-- 字数统计 -->
        <div class="status-item word-count">
          <EditOutlined class="status-icon" />
          <span class="status-label">{{ t('footer.wordCountLabel') }}</span>
          <span class="status-value highlight">{{ wordCount.total }}</span>
          <span v-if="wordCount.target" class="status-detail">
            {{ t('footer.wordCountTarget', { target: wordCount.target, progress: wordCount.progress }) }}
          </span>
        </div>

        <!-- 章节统计 -->
        <div class="status-item chapter-stats">
          <FileTextOutlined class="status-icon" />
          <span class="status-label">{{ t('footer.chapterLabel') }}</span>
          <span class="status-value">{{ chapterStats.completed }}</span>
          <span class="status-detail">{{ t('footer.chapterDetail', { total: chapterStats.total }) }}</span>
        </div>

        <!-- 写作进度 -->
        <div class="status-item progress-info" v-if="todayProgress.words > 0">
          <ClockCircleOutlined class="status-icon" />
          <span class="status-label">{{ t('footer.todayLabel') }}</span>
          <span class="status-value highlight">{{ todayProgress.words }}</span>
          <span class="status-detail">{{ t('footer.wordUnit') }}</span>
        </div>
      </a-space>
    </div>

    <div class="status-right">
      <a-space size="large">
        <!-- 保存状态 -->
        <div class="status-item save-status" v-if="saveStatus.lastSaved">
          <SaveOutlined class="status-icon" :class="{ 'saving': saveStatus.saving }" />
          <span class="status-label">{{ saveStatus.saving ? t('footer.saving') : t('footer.saved') }}</span>
          <span class="status-detail">{{ saveStatus.lastSaved }}</span>
        </div>

        <!-- AI连接状态 -->
        <div class="status-item ai-status">
          <RobotOutlined class="status-icon" />
          <span class="status-label">{{ t('footer.aiLabel') }}</span>
          <a-badge
            :status="aiConnection.status === 'connected' ? 'success' : 'error'"
            :text="t(aiConnection.statusTextKey)"
          />
          <span v-if="aiConnection.provider" class="status-detail">{{ aiConnection.provider }}</span>
        </div>

        <!-- 系统状态 -->
        <div class="status-item system-status">
          <WifiOutlined
            class="status-icon"
            :class="{ 'connected': systemStatus.online, 'disconnected': !systemStatus.online }"
          />
          <span class="status-label">{{ systemStatus.online ? t('footer.online') : t('footer.offline') }}</span>
          <span v-if="systemStatus.latency" class="status-detail">
            {{ t('footer.latency', { latency: systemStatus.latency }) }}
          </span>
        </div>

        <!-- 当前时间 -->
        <div class="status-item current-time">
          <span class="status-value time">{{ currentTime }}</span>
        </div>
      </a-space>
    </div>
  </a-layout-footer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  BookOutlined,
  EditOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  RobotOutlined,
  WifiOutlined
} from '@ant-design/icons-vue'
import { useProjectStore } from '@/stores/project'
import { useAIChatStore } from '@/stores/aiChat'
import { getNovelStatusText, getNovelStatusColor } from '@/constants/status'
import { statusService } from '@/services/statusService'
import type { ProjectStats, TodayStats, AIStatus, SystemHealth } from '@/services/statusService'
import { useI18n } from 'vue-i18n'

// 接口定义
interface ProjectInfo {
  title: string
  status?: string
}

interface WordCount {
  total: string
  target?: string
  progress?: number
}

interface ChapterStats {
  total: number
  completed: number
  writing: number
  planning: number
}

interface TodayProgress {
  words: number
  time: number
}

interface SaveStatus {
  saving: boolean
  lastSaved: string
  autoSave: boolean
}

interface AIConnection {
  status: 'connected' | 'disconnected' | 'connecting'
  statusTextKey: string
  provider?: string
  usage?: {
    requests: number
    tokens: number
  }
}

interface SystemStatus {
  online: boolean
  latency?: number
  performance: 'good' | 'moderate' | 'poor'
}

// Stores
const projectStore = useProjectStore()
const chatStore = useAIChatStore()
const { t, locale } = useI18n()

// 响应式数据
const projectInfo = ref<ProjectInfo>({ title: '' })
const wordCount = ref<WordCount>({ total: '0' })
const chapterStats = ref<ChapterStats>({ total: 0, completed: 0, writing: 0, planning: 0 })
const todayProgress = ref<TodayProgress>({ words: 0, time: 0 })
const saveStatus = ref<SaveStatus>({ saving: false, lastSaved: '', autoSave: true })
const aiConnection = ref<AIConnection>({
  status: 'disconnected',
  statusTextKey: 'footer.aiStatus.disconnected'
})
const systemStatus = ref<SystemStatus>({ online: navigator.onLine, performance: 'good' })
const currentTime = ref('')

// 定时器
let timeTimer: number | null = null
let statusTimer: number | null = null

// 计算属性
const getStatusText = computed(() => getNovelStatusText)
const getStatusColor = computed(() => getNovelStatusColor)

// 使用服务中的格式化方法
const formatWordCount = statusService.formatWordCount.bind(statusService)
const localeTag = computed(() => {
  if (locale.value === 'zh') {
    return 'zh-CN'
  }
  if (locale.value === 'en') {
    return 'en-US'
  }
  return locale.value
})

// 更新当前时间
const updateCurrentTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString(localeTag.value, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 更新保存状态
const updateSaveStatus = (saving: boolean, timestamp?: Date) => {
  saveStatus.value.saving = saving
  if (timestamp) {
    saveStatus.value.lastSaved = timestamp.toLocaleTimeString(localeTag.value, {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

const applyProjectStats = (projectStats: ProjectStats | null, project: any | null) => {
  if (projectStats) {
    projectInfo.value = {
      title: projectStats.novel.title,
      status: projectStats.novel.status
    }

    wordCount.value = {
      total: formatWordCount(projectStats.novel.wordCount),
      target: projectStats.novel.targetWordCount ? formatWordCount(projectStats.novel.targetWordCount) : undefined,
      progress: projectStats.novel.targetWordCount ? Math.round((projectStats.novel.wordCount / projectStats.novel.targetWordCount) * 100) : undefined
    }

    chapterStats.value = projectStats.chapters
    return
  }

  if (project) {
    projectInfo.value = {
      title: project.title,
      status: project.status
    }

    const total = project.wordCount || 0
    const target = project.targetWordCount

    wordCount.value = {
      total: formatWordCount(total),
      target: target ? formatWordCount(target) : undefined,
      progress: target ? Math.round((total / target) * 100) : undefined
    }
  } else {
    projectInfo.value = { title: '', status: undefined }
    wordCount.value = { total: '0' }
  }

  chapterStats.value = { total: 0, completed: 0, writing: 0, planning: 0 }
}

const applyTodayStats = (todayStats: TodayStats | null) => {
  if (todayStats) {
    todayProgress.value = {
      words: todayStats.wordCount || 0,
      time: todayStats.timeSpent || 0
    }
  } else {
    todayProgress.value = { words: 0, time: 0 }
  }
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  claude: 'Anthropic',
  gemini: 'Google Gemini',
  'azure-openai': 'Azure OpenAI',
  moonshot: 'Moonshot AI',
  wenxin: 'Baidu Wenxin',
  qwen: 'Alibaba Qwen'
}

const formatProviderName = (provider?: string) => {
  if (!provider) return undefined
  const normalized = provider.toLowerCase()
  if (PROVIDER_LABELS[normalized]) {
    return PROVIDER_LABELS[normalized]
  }

  return provider
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const applyAIStatus = (status: AIStatus | null) => {
  if (status) {
    const providerKey = status.provider || chatStore.settings.provider
    aiConnection.value = {
      status: status.connected ? 'connected' : 'disconnected',
      statusTextKey: status.connected ? 'footer.aiStatus.connected' : 'footer.aiStatus.disconnected',
      provider: formatProviderName(providerKey),
      usage: status.usage
    }
  } else {
    const fallbackProvider = formatProviderName(chatStore.settings.provider)
    aiConnection.value = {
      status: 'disconnected',
      statusTextKey: 'footer.aiStatus.failed',
      provider: fallbackProvider
    }
  }
}

const applySystemStatus = (health: SystemHealth | null, latency: number) => {
  if (health) {
    systemStatus.value = {
      online: health.status === 'healthy',
      latency,
      performance: statusService.getLatencyLevel(latency)
    }
  } else {
    systemStatus.value = {
      online: false,
      performance: 'poor'
    }
  }
}

// 刷新所有状态（单次请求）
const refreshAllStatus = async () => {
  const project = projectStore.currentProject
  const startTime = Date.now()

  try {
    const data = await statusService.getDashboardStatus(project?.id)
    const latency = Date.now() - startTime

    applyProjectStats(project ? data.projectStats : null, project)
    applyTodayStats(project ? data.todayStats : null)
    applyAIStatus(data.aiStatus)
    applySystemStatus(data.systemHealth, latency)
  } catch (error) {
    console.error('Failed to load dashboard status:', error)
    applyProjectStats(null, project)
    applyTodayStats(null)
    applyAIStatus(null)
    systemStatus.value = {
      online: false,
      performance: 'poor'
    }
  }
}

// 监听网络状态
const handleOnline = () => {
  systemStatus.value.online = true
  refreshAllStatus()
}

const handleOffline = () => {
  systemStatus.value.online = false
  systemStatus.value.latency = undefined
}

// 监听项目变化
const unwatchProject = projectStore.$subscribe(() => {
  refreshAllStatus()
})

// 生命周期
onMounted(() => {
  // 初始化
  updateCurrentTime()
  refreshAllStatus()

  // 设置定时器
  timeTimer = window.setInterval(updateCurrentTime, 1000)
  statusTimer = window.setInterval(refreshAllStatus, 60000) // 1分钟刷新一次

  // 监听网络状态
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})

onUnmounted(() => {
  // 清理定时器
  if (timeTimer) clearInterval(timeTimer)
  if (statusTimer) clearInterval(statusTimer)

  // 移除事件监听
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)

  // 取消项目监听
  unwatchProject()
})

// 暴露方法给父组件
defineExpose({
  refreshAllStatus,
  updateSaveStatus
})
</script>

<style scoped>
.status-bar {
  height: 48px;
  background: var(--theme-bg-elevated);
  border-top: 1px solid var(--theme-border);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--theme-text-secondary);
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.02);
  user-select: none;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s ease;
  cursor: default;
}

.status-item:hover {
  background: var(--theme-bg-container);
  color: var(--theme-text);
}

.status-icon {
  font-size: 12px;
  opacity: 0.7;
  transition: all 0.3s ease;
}

.status-item:hover .status-icon {
  opacity: 1;
}

.status-label {
  font-weight: 500;
  white-space: nowrap;
}

.status-value {
  font-weight: 600;
  color: var(--theme-text);
}

.status-value.highlight {
  color: #1488CC;
}

.status-value.time {
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
  font-size: 11px;
  color: var(--theme-text);
}

.status-detail {
  font-size: 11px;
  opacity: 0.7;
  white-space: nowrap;
}

.project-status-tag {
  margin-left: 4px !important;
  font-size: 10px !important;
  line-height: 16px !important;
  height: 16px !important;
  padding: 0 4px !important;
}

/* 特殊状态样式 */
.saving {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.connected {
  color: #52c41a;
}

.disconnected {
  color: #ff4d4f;
}

/* AI状态指示器 */
.ai-status .ant-badge {
  margin-left: 4px;
}

/* 暗黑模式适配 */
.dark .status-bar {
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.1);
}

.dark .status-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .status-bar {
    padding: 0 16px;
    font-size: 11px;
  }

  .chapter-stats,
  .progress-info {
    display: none;
  }
}

@media (max-width: 768px) {
  .status-bar {
    height: 44px;
    padding: 0 12px;
    font-size: 10px;
  }

  .status-left,
  .status-right {
    gap: 8px;
  }

  .save-status,
  .system-status {
    display: none;
  }

  .status-detail {
    display: none;
  }
}

@media (max-width: 480px) {
  .word-count .status-detail,
  .project-status-tag {
    display: none;
  }

  .status-item {
    padding: 2px 4px;
    gap: 2px;
  }
}

/* 减少动画偏好适配 */
@media (prefers-reduced-motion: reduce) {
  .status-bar,
  .status-item,
  .status-icon {
    transition: none !important;
  }

  .saving {
    animation: none !important;
  }
}
</style>
