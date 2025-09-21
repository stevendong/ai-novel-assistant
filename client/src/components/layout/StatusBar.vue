<template>
  <a-layout-footer class="status-bar">
    <div class="status-left">
      <a-space size="large">
        <!-- 项目信息 -->
        <div class="status-item project-info">
          <BookOutlined class="status-icon" />
          <span class="status-label">项目：</span>
          <span class="status-value">{{ projectInfo.title }}</span>
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
          <span class="status-label">字数：</span>
          <span class="status-value highlight">{{ wordCount.total }}</span>
          <span v-if="wordCount.target" class="status-detail">
            / {{ wordCount.target }} ({{ wordCount.progress }}%)
          </span>
        </div>

        <!-- 章节统计 -->
        <div class="status-item chapter-stats">
          <FileTextOutlined class="status-icon" />
          <span class="status-label">章节：</span>
          <span class="status-value">{{ chapterStats.completed }}</span>
          <span class="status-detail">/ {{ chapterStats.total }}</span>
        </div>

        <!-- 写作进度 -->
        <div class="status-item progress-info" v-if="todayProgress.words > 0">
          <ClockCircleOutlined class="status-icon" />
          <span class="status-label">今日：</span>
          <span class="status-value highlight">{{ todayProgress.words }}</span>
          <span class="status-detail">字</span>
        </div>
      </a-space>
    </div>

    <div class="status-right">
      <a-space size="large">
        <!-- 保存状态 -->
        <div class="status-item save-status" v-if="saveStatus.lastSaved">
          <SaveOutlined class="status-icon" :class="{ 'saving': saveStatus.saving }" />
          <span class="status-label">{{ saveStatus.saving ? '保存中...' : '已保存' }}</span>
          <span class="status-detail">{{ saveStatus.lastSaved }}</span>
        </div>

        <!-- AI连接状态 -->
        <div class="status-item ai-status">
          <RobotOutlined class="status-icon" />
          <span class="status-label">AI：</span>
          <a-badge
            :status="aiConnection.status === 'connected' ? 'success' : 'error'"
            :text="aiConnection.text"
          />
          <span v-if="aiConnection.model" class="status-detail">{{ aiConnection.model }}</span>
        </div>

        <!-- 系统状态 -->
        <div class="status-item system-status">
          <WifiOutlined
            class="status-icon"
            :class="{ 'connected': systemStatus.online, 'disconnected': !systemStatus.online }"
          />
          <span class="status-label">{{ systemStatus.online ? '在线' : '离线' }}</span>
          <span v-if="systemStatus.latency" class="status-detail">{{ systemStatus.latency }}ms</span>
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
  text: string
  model?: string
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

// 响应式数据
const projectInfo = ref<ProjectInfo>({ title: '未选择项目' })
const wordCount = ref<WordCount>({ total: '0' })
const chapterStats = ref<ChapterStats>({ total: 0, completed: 0, writing: 0, planning: 0 })
const todayProgress = ref<TodayProgress>({ words: 0, time: 0 })
const saveStatus = ref<SaveStatus>({ saving: false, lastSaved: '', autoSave: true })
const aiConnection = ref<AIConnection>({ status: 'disconnected', text: '未连接' })
const systemStatus = ref<SystemStatus>({ online: navigator.onLine, performance: 'good' })
const currentTime = ref('')

// 定时器
let timeTimer: number | null = null
let statusTimer: number | null = null
let pingTimer: number | null = null

// 计算属性
const getStatusText = computed(() => getNovelStatusText)
const getStatusColor = computed(() => getNovelStatusColor)

// 使用服务中的格式化方法
const formatWordCount = statusService.formatWordCount.bind(statusService)

// 更新当前时间
const updateCurrentTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 加载项目信息
const loadProjectInfo = async () => {
  const project = projectStore.currentProject
  if (!project) {
    projectInfo.value = { title: '未选择项目' }
    wordCount.value = { total: '0' }
    return
  }

  try {
    // 从后台获取最新的项目统计
    const stats = await statusService.getProjectStats(project.id)

    projectInfo.value = {
      title: stats.novel.title,
      status: stats.novel.status
    }

    wordCount.value = {
      total: formatWordCount(stats.novel.wordCount),
      target: stats.novel.targetWordCount ? formatWordCount(stats.novel.targetWordCount) : undefined,
      progress: stats.novel.targetWordCount ? Math.round((stats.novel.wordCount / stats.novel.targetWordCount) * 100) : undefined
    }
  } catch (error) {
    console.error('Failed to load project info:', error)
    // 降级到使用本地数据
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
  }
}

// 加载章节统计
const loadChapterStats = async () => {
  const project = projectStore.currentProject
  if (!project) {
    chapterStats.value = { total: 0, completed: 0, writing: 0, planning: 0 }
    return
  }

  try {
    // 从项目统计中获取章节信息
    const stats = await statusService.getProjectStats(project.id)
    chapterStats.value = stats.chapters
  } catch (error) {
    console.error('Failed to load chapter stats:', error)
    chapterStats.value = { total: 0, completed: 0, writing: 0, planning: 0 }
  }
}

// 加载今日进度
const loadTodayProgress = async () => {
  const project = projectStore.currentProject
  if (!project) {
    todayProgress.value = { words: 0, time: 0 }
    return
  }

  try {
    const stats = await statusService.getTodayStats(project.id)
    todayProgress.value = {
      words: stats.wordCount || 0,
      time: stats.timeSpent || 0
    }
  } catch (error) {
    console.error('Failed to load today progress:', error)
    todayProgress.value = { words: 0, time: 0 }
  }
}

// 更新保存状态
const updateSaveStatus = (saving: boolean, timestamp?: Date) => {
  saveStatus.value.saving = saving
  if (timestamp) {
    saveStatus.value.lastSaved = timestamp.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

// 检查AI连接状态
const checkAIStatus = async () => {
  try {
    const data = await statusService.getAIStatus()

    aiConnection.value = {
      status: data.connected ? 'connected' : 'disconnected',
      text: data.connected ? '已连接' : '未连接',
      model: data.model || undefined,
      usage: data.usage
    }
  } catch (error) {
    aiConnection.value = {
      status: 'disconnected',
      text: '连接失败'
    }
  }
}

// 检查系统状态
const checkSystemStatus = async () => {
  const startTime = Date.now()

  try {
    const data = await statusService.getSystemHealth()
    const latency = Date.now() - startTime

    systemStatus.value = {
      online: data.status === 'healthy',
      latency,
      performance: statusService.getLatencyLevel(latency)
    }
  } catch (error) {
    systemStatus.value = {
      online: false,
      performance: 'poor'
    }
  }
}

// 监听网络状态
const handleOnline = () => {
  systemStatus.value.online = true
  checkSystemStatus()
}

const handleOffline = () => {
  systemStatus.value.online = false
}

// 刷新所有状态
const refreshAllStatus = async () => {
  await Promise.all([
    loadProjectInfo(),
    loadChapterStats(),
    loadTodayProgress(),
    checkAIStatus(),
    checkSystemStatus()
  ])
}

// 监听项目变化
const unwatchProject = projectStore.$subscribe(() => {
  loadProjectInfo()
  loadChapterStats()
  loadTodayProgress()
})

// 生命周期
onMounted(() => {
  // 初始化
  updateCurrentTime()
  refreshAllStatus()

  // 设置定时器
  timeTimer = window.setInterval(updateCurrentTime, 1000)
  statusTimer = window.setInterval(refreshAllStatus, 30000) // 30秒刷新一次
  pingTimer = window.setInterval(checkSystemStatus, 60000) // 1分钟检查一次网络

  // 监听网络状态
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})

onUnmounted(() => {
  // 清理定时器
  if (timeTimer) clearInterval(timeTimer)
  if (statusTimer) clearInterval(statusTimer)
  if (pingTimer) clearInterval(pingTimer)

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
  color: #1890ff;
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