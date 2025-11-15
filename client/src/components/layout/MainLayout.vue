<template>
  <a-layout class="main-layout">
    <!-- Top Header -->
    <a-layout-header class="header">
      <div class="header-content">
        <!-- Left Side -->
        <div class="header-left">
          <!-- Menu Toggle -->
          <a-button
            type="text"
            class="menu-toggle-btn"
            @click="toggleSidebar"
          >
            <template #icon>
              <MenuUnfoldOutlined v-if="collapsed" />
              <MenuFoldOutlined v-else />
            </template>
          </a-button>

          <!-- Logo and Title -->
          <div class="logo-section">
            <div class="logo">
              <img class="logo-image" :src="logoSvg" alt="AI Novel Assistant logo" />
            </div>
            <div class="title-section">
              <h1 class="app-title">{{ $t('app.title') }}</h1>
              <span class="app-subtitle">{{ $t('app.subtitle') }}</span>
            </div>
          </div>
        </div>

        <!-- Right Side -->
        <div class="header-right">
          <a-space size="middle">
            <!-- Project Selector -->
            <div v-if="projectStore.projects.length > 0" class="project-selector">
              <a-select
                v-model:value="currentProjectId"
                @change="handleProjectChange"
                :placeholder="$t('project.selectProject')"
                :loading="projectStore.loading"
                class="project-select"
                show-search
                :filter-option="filterProject"
                style="width: 300px"
              >
                <template #suffixIcon>
                  <DownOutlined />
                </template>

                <a-select-option
                  v-for="project in projectStore.projects"
                  :key="project.id"
                  :value="project.id"
                  :title="`${project.title} - ${project.description || $t('common.noDescription')}`"
                >
                  <div class="project-option">
                    <a-avatar
                      :size="24"
                      :style="{
                        backgroundColor: getProjectColor(project.id),
                        fontSize: '12px'
                      }"
                      class="project-avatar"
                    >
                      {{ project.title.charAt(0).toUpperCase() }}
                    </a-avatar>
                    <div class="project-info">
                      <span class="project-name">{{ project.title }}</span>
                      <a-tag
                        :color="getStatusColor(project.status)"
                        size="small"
                        class="project-status"
                      >
                        {{ getStatusText(project.status) }}
                      </a-tag>
                    </div>
                  </div>
                </a-select-option>
              </a-select>
            </div>

            <!-- Action Buttons -->
            <a-space size="small">
              <!-- AI Assistant Toggle -->
              <a-tooltip :title="$t('ai.assistant')">
                <a-button
                  type="text"
                  class="header-action-btn ai-assistant-btn"
                  :class="{ 'active': !aiPanelCollapsed }"
                  @click="toggleAIPanel"
                  data-button-type="ai-assistant"
                >
                  <template #icon>
                    <AIStarIcon />
                  </template>
                </a-button>
              </a-tooltip>

              <div style="display: flex;justify-content: center;">
                <ThemeToggle />
              </div>

              <!-- Language Toggle -->
              <LanguageToggle class="language-toggle-btn" />
              <a-tooltip :title="$t('common.githubRepo')">
                <a-button
                  type="text"
                  class="header-action-btn github-btn"
                  data-button-type="github"
                  @click="openGitHubRepo"
                >
                  <template #icon>
                    <GithubOutlined />
                  </template>
                </a-button>
              </a-tooltip>

            </a-space>

            <!-- User Menu -->
            <UserMenu />
          </a-space>
        </div>
      </div>
    </a-layout-header>

    <!-- Main Layout Container -->
    <a-layout class="main-content">
      <!-- Left Sidebar -->
      <a-layout-sider
        v-model:collapsed="collapsed"
        :width="280"
        :collapsed-width="60"
        class="sidebar"
        theme="light"
      >
        <NavigationMenu />
      </a-layout-sider>

      <!-- Main Content Area -->
      <a-layout-content class="content-area">
        <div class="content-wrapper">
          <router-view />
        </div>

        <!-- Right Panel (AI Assistant) -->
        <div
          class="ai-panel"
          :class="{
            'collapsed': aiPanelCollapsed,
            'floating-mode': aiPanelFloating
          }"
        >
          <div class="ai-panel-content">
            <AIAssistantPanel
              @floating-mode-change="handleFloatingModeChange"
              @close-panel="handleCloseAIPanel"
            />
          </div>
        </div>
      </a-layout-content>
    </a-layout>

    <!-- Add Chapter Dialog -->
    <a-modal
      v-model:open="addChapterVisible"
      :title="$t('chapter.addNew')"
      width="600px"
      @ok="handleAddChapter"
      :confirm-loading="chaptersLoading"
    >
      <a-form layout="vertical" :model="addChapterForm">
        <a-form-item
          :label="$t('chapter.chapterTitle')"
          name="title"
          :rules="[{ required: true, message: t('chapter.enterTitleRequired') }]"
        >
          <a-input
            v-model:value="addChapterForm.title"
            :placeholder="$t('chapter.enterTitle')"
            maxlength="100"
            show-count
          />
        </a-form-item>

        <a-form-item
          :label="$t('chapter.chapterOutline')"
          name="outline"
        >
          <a-textarea
            v-model:value="addChapterForm.outline"
            :placeholder="$t('chapter.outlinePlaceholder')"
            :rows="4"
            maxlength="500"
            show-count
          />
        </a-form-item>

        <div class="chapter-info">
          <a-descriptions :column="2" size="small">
            <a-descriptions-item :label="$t('chapter.number')">
              {{ $t('chapter.chapterPrefix') }} {{ chapters.length + 1 }} 章
            </a-descriptions-item>
            <a-descriptions-item :label="$t('common.status')">
              {{ $t('chapter.status.planning') }}
            </a-descriptions-item>
          </a-descriptions>
        </div>
      </a-form>
    </a-modal>

    <!-- Bottom Status Bar -->
    <StatusBar ref="statusBarRef" />
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DownOutlined,
  GithubOutlined,
} from '@ant-design/icons-vue'
import type { Chapter } from '@/types'
import { useI18n } from 'vue-i18n'
import NavigationMenu from './NavigationMenu.vue'
import ThemeToggle from './ThemeToggle.vue'
import LanguageToggle from './LanguageToggle.vue'
import UserMenu from '@/components/user/UserMenu.vue'
import AIAssistantPanel from '@/components/ai/AIAssistantPanel.vue'
import AIStarIcon from '@/components/icons/AIStarIcon.vue'
import { useProjectStore } from '@/stores/project'
import { useThemeStore } from '@/stores/theme'
import StatusBar from './StatusBar.vue'
// 移除不再需要的文本工具导入
import { useChapterList } from '@/composables/useChapterList'
import logoSvg from '@/assets/logo.svg'

const { t } = useI18n()

const projectStore = useProjectStore()
const themeStore = useThemeStore()
const { chapters, loading: chaptersLoading, loadChapters, createChapter } = useChapterList()
const collapsed = ref(false)
const aiPanelCollapsed = ref(true)  // 默认关闭 AI 助手面板
const aiPanelFloating = ref(false)
const statusBarRef = ref()  // AI 助手面板浮动模式状态
const selectedChapter = ref<Chapter | null>(null)

// 从localStorage加载AI面板状态
const loadAIPanelState = () => {
  try {
    const saved = localStorage.getItem('ai_panel_collapsed')
    if (saved !== null) {
      aiPanelCollapsed.value = JSON.parse(saved)
    }
  } catch (error) {
    console.warn('Failed to load AI panel state:', error)
  }
}

// 保存AI面板状态到localStorage
const saveAIPanelState = () => {
  try {
    localStorage.setItem('ai_panel_collapsed', JSON.stringify(aiPanelCollapsed.value))
  } catch (error) {
    console.warn('Failed to save AI panel state:', error)
  }
}

// 从localStorage加载侧边栏状态
const loadSidebarState = () => {
  try {
    const saved = localStorage.getItem('sidebar_collapsed')
    if (saved !== null) {
      collapsed.value = JSON.parse(saved)
    }
  } catch (error) {
    console.warn('Failed to load sidebar state:', error)
  }
}

// 保存侧边栏状态到localStorage
const saveSidebarState = () => {
  try {
    localStorage.setItem('sidebar_collapsed', JSON.stringify(collapsed.value))
  } catch (error) {
    console.warn('Failed to save sidebar state:', error)
  }
}

// 添加章节对话框状态
const addChapterVisible = ref(false)
const addChapterForm = ref({
  title: '',
  outline: ''
})


// 计算属性
const currentProjectId = computed(() => projectStore.currentProjectId)

// 响应式触发方式：桌面端hover，移动端click
const hoverTrigger = computed(() => {
  // 检测是否为移动设备或小屏幕
  if (typeof window !== 'undefined') {
    const isMobile = window.innerWidth <= 768 ||
                    ('ontouchstart' in window) ||
                    (navigator.maxTouchPoints > 0)
    return isMobile ? ['click'] : ['hover']
  }
  return ['hover'] // 默认使用hover
})

// 移除状态栏相关代码，现在由 StatusBar 组件处理

// 组件挂载时加载项目数据
onMounted(async () => {
  // 加载布局状态
  loadAIPanelState()
  loadSidebarState()

  await projectStore.loadProjects()

  window.addEventListener('open-ai-panel', handleOpenAIPanelEvent)
})

onUnmounted(() => {
  window.removeEventListener('open-ai-panel', handleOpenAIPanelEvent)
})

// 项目切换处理
const handleProjectChange = async (projectId: string) => {
  await projectStore.switchProject(projectId)
  // 加载新项目的章节
  await loadChapters(projectId)
}

// 项目搜索过滤
const filterProject = (input: string, option: any) => {
  const project = projectStore.projects.find(p => p.id === option.value)
  if (!project) return false

  const searchText = input.toLowerCase()
  return (
    project.title.toLowerCase().includes(searchText) ||
    project.description?.toLowerCase().includes(searchText) ||
    project.genre?.toLowerCase().includes(searchText)
  )
}

// 获取项目颜色
const getProjectColor = (id: string) => {
  const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068']
  const hash = id.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  return colors[Math.abs(hash) % colors.length]
}

// Methods
const toggleSidebar = () => {
  collapsed.value = !collapsed.value
  saveSidebarState()
}

const toggleAIPanel = () => {
  aiPanelCollapsed.value = !aiPanelCollapsed.value
  saveAIPanelState()
}

const openGitHubRepo = () => {
  if (typeof window !== 'undefined') {
    window.open('https://github.com/stevendong/ai-novel-assistant', '_blank', 'noopener')
  }
}

// 处理浮动模式切换
const handleFloatingModeChange = (isFloating: boolean) => {
  aiPanelFloating.value = isFloating

  // 当切换到浮动模式时，隐藏固定面板
  if (isFloating) {
    aiPanelCollapsed.value = true
  } else {
    // 从浮动模式切换回固定模式时，显示面板
    aiPanelCollapsed.value = false
  }

  saveAIPanelState()
}

// 处理关闭AI助手面板
const handleCloseAIPanel = () => {
  // 关闭AI助手面板
  aiPanelCollapsed.value = true
  // 重置浮动模式状态
  aiPanelFloating.value = false

  // 保存状态
  saveAIPanelState()

  console.log('AI助手面板已关闭')
}

const handleOpenAIPanelEvent = () => {
  aiPanelCollapsed.value = false
  saveAIPanelState()
  console.log('AI助手面板已打开（通过角色聊天）')
}


// 添加章节相关方法
const showAddChapterDialog = () => {
  addChapterVisible.value = true
  // 重置表单
  addChapterForm.value = {
    title: '',
    outline: ''
  }
}

const handleAddChapter = async () => {
  if (!addChapterForm.value.title.trim()) {
    message.error('请输入章节标题')
    return
  }

  const newChapter = await createChapter({
    title: addChapterForm.value.title.trim(),
    outline: addChapterForm.value.outline.trim()
  })

  if (newChapter) {
    addChapterVisible.value = false
    // 重置表单
    addChapterForm.value = {
      title: '',
      outline: ''
    }
  }
}

const addNewChapter = () => {
  showAddChapterDialog()
}

// Status helper functions
const getStatusColor = (status: string) => {
  const colors = {
    'draft': 'default',
    'writing': 'processing',
    'completed': 'success'
  }
  return colors[status as keyof typeof colors] || 'default'
}

const getStatusText = (status: string) => {
  const texts = {
    'draft': t('chapter.status.draft'),
    'writing': t('chapter.status.writing'),
    'completed': t('chapter.status.completed')
  }
  return texts[status as keyof typeof texts] || status
}

// Date formatting helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) {
    return t('date.justNow')
  } else if (diffInHours < 24) {
    return `${diffInHours}${t('date.hoursAgo')}`
  } else if (diffInHours < 24 * 7) {
    const days = Math.floor(diffInHours / 24)
    return `${days}${t('date.daysAgo')}`
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }
}
</script>

<style scoped>
/* Main Layout Styles */
.main-layout {
  height: 100vh;
  overflow: hidden;
}

/* Header Styles */
.header {
  background: var(--theme-bg-container);
  border-bottom: 1px solid var(--theme-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0;
  height: 64px;
  line-height: 64px;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: all 0.3s ease;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
}

/* Menu Toggle Button */
.menu-toggle-btn {
  color: var(--theme-text-secondary);
  font-size: 18px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
}

.menu-toggle-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,
    rgba(24, 144, 255, 0.05) 0%,
    rgba(24, 144, 255, 0.12) 50%,
    rgba(24, 144, 255, 0.05) 100%);
  border-radius: 8px;
  opacity: 0;
  transform: scale(0.8) rotate(-5deg);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
}

.menu-toggle-btn:hover {
  color: #1890ff;
  background-color: rgba(24, 144, 255, 0.1);
  border-color: rgba(24, 144, 255, 0.2);
  transform: translateY(-1px) rotate(2deg);
  box-shadow:
    0 4px 12px rgba(24, 144, 255, 0.18),
    0 2px 4px rgba(24, 144, 255, 0.12);
}

.menu-toggle-btn:hover::before {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

.menu-toggle-btn:active {
  transform: translateY(0px) scale(0.95);
  transition-duration: 0.1s;
}

.menu-toggle-btn:focus-visible {
  outline: 2px solid rgba(24, 144, 255, 0.4);
  outline-offset: 2px;
}

/* 汉堡菜单图标动画 */
.menu-toggle-btn :deep(.anticon) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
}

.menu-toggle-btn:hover :deep(.anticon) {
  transform: scale(1.15) rotate(10deg);
  filter: drop-shadow(0 2px 4px rgba(24, 144, 255, 0.25));
}

/* 暗黑模式适配 */
.dark .menu-toggle-btn:hover {
  background-color: rgba(64, 150, 255, 0.12);
  border-color: rgba(64, 150, 255, 0.25);
  box-shadow:
    0 4px 12px rgba(64, 150, 255, 0.2),
    0 2px 4px rgba(64, 150, 255, 0.15);
}

/* Logo Section */
.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  background: var(--theme-bg-container);
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.title-section {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--theme-text);
  margin: 0;
  transition: color 0.3s;
}

.app-subtitle {
  font-size: 12px;
  color: var(--theme-text-secondary);
  margin-top: -2px;
  transition: color 0.3s;
}

/* Project Selector */
.project-selector {
  display: flex;
  align-items: center;
}

.project-select {
  border-radius: 6px;
}

.project-select :deep(.ant-select-selector) {
  background-color: var(--theme-bg-container);
  border-color: var(--theme-border);
  transition: all 0.3s ease;
}

.project-select :deep(.ant-select-selector):hover {
  border-color: #1890ff;
}

.project-select :deep(.ant-select-arrow) {
  color: var(--theme-text-secondary);
}

.project-select :deep(.ant-select-selection-placeholder) {
  color: var(--theme-text-secondary);
}

.project-select :deep(.ant-select-selection-item) {
  color: var(--theme-text);
}

.project-option {
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.project-option:hover .project-name {
  color: #1890ff;
}

.project-avatar {
  flex-shrink: 0;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.project-name {
  font-weight: 500;
  color: var(--theme-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-status {
  flex-shrink: 0;
}

/* Header Action Buttons */
.header-action-btn {
  color: var(--theme-text-secondary);
  font-size: 16px;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  border: 1px solid transparent;
  overflow: hidden;
  background: transparent;
}

/* 增加按钮的视觉层次感 */
.header-action-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,
    rgba(24, 144, 255, 0.05) 0%,
    rgba(24, 144, 255, 0.1) 50%,
    rgba(24, 144, 255, 0.05) 100%);
  border-radius: 8px;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
}

.header-action-btn:hover {
  color: #1890ff;
  background-color: rgba(24, 144, 255, 0.08);
  border-color: rgba(24, 144, 255, 0.2);
  transform: translateY(-1px);
  box-shadow:
    0 4px 12px rgba(24, 144, 255, 0.15),
    0 2px 4px rgba(24, 144, 255, 0.1);
}

.header-action-btn:hover::before {
  opacity: 1;
  transform: scale(1);
}

.header-action-btn:active {
  transform: translateY(0px) scale(0.98);
  transition-duration: 0.1s;
}

.header-action-btn:focus-visible {
  outline: 2px solid rgba(24, 144, 255, 0.4);
  outline-offset: 2px;
}

.header-action-btn.active {
  color: #1890ff;
  background-color: rgba(24, 144, 255, 0.12);
  border-color: rgba(24, 144, 255, 0.3);
  box-shadow:
    inset 0 2px 4px rgba(24, 144, 255, 0.1),
    0 2px 8px rgba(24, 144, 255, 0.12);
}

.header-action-btn.active::before {
  opacity: 0.7;
  transform: scale(1);
}

/* 图标动画增强 */
.header-action-btn :deep(.anticon) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
}

.header-action-btn:hover :deep(.anticon) {
  transform: scale(1.1) rotate(5deg);
  filter: drop-shadow(0 2px 4px rgba(24, 144, 255, 0.2));
}

.header-action-btn.active :deep(.anticon) {
  transform: scale(1.05);
}

/* AI助手按钮特殊样式 */
.ai-assistant-btn,
.header-action-btn[data-button-type="ai-assistant"] {
  background: linear-gradient(135deg,
    rgba(138, 43, 226, 0.05) 0%,
    rgba(106, 13, 173, 0.08) 100%);
  border: 1px solid rgba(138, 43, 226, 0.1);
}

.ai-assistant-btn:hover,
.header-action-btn[data-button-type="ai-assistant"]:hover {
  color: #8a2be2;
  background: linear-gradient(135deg,
    rgba(138, 43, 226, 0.12) 0%,
    rgba(106, 13, 173, 0.15) 100%);
  border-color: rgba(138, 43, 226, 0.25);
  box-shadow:
    0 4px 12px rgba(138, 43, 226, 0.2),
    0 2px 4px rgba(138, 43, 226, 0.15);
}

.ai-assistant-btn.active,
.header-action-btn[data-button-type="ai-assistant"].active {
  color: #8a2be2;
  background: linear-gradient(135deg,
    rgba(138, 43, 226, 0.15) 0%,
    rgba(106, 13, 173, 0.2) 100%);
  border-color: rgba(138, 43, 226, 0.35);
  box-shadow:
    inset 0 2px 4px rgba(138, 43, 226, 0.15),
    0 2px 8px rgba(138, 43, 226, 0.2);
}

.ai-assistant-btn :deep(.anticon),
.header-action-btn[data-button-type="ai-assistant"] :deep(.anticon) {
  filter: drop-shadow(0 0 2px rgba(138, 43, 226, 0.3));
}

/* 通知按钮特殊样式 */
.notification-btn,
.header-action-btn[data-button-type="notification"] {
  position: relative;
  background: linear-gradient(135deg,
    rgba(255, 107, 107, 0.05) 0%,
    rgba(255, 77, 79, 0.08) 100%);
  border: 1px solid rgba(255, 107, 107, 0.1);
}

.notification-btn:hover,
.header-action-btn[data-button-type="notification"]:hover {
  color: #ff6b6b;
  background: linear-gradient(135deg,
    rgba(255, 107, 107, 0.12) 0%,
    rgba(255, 77, 79, 0.15) 100%);
  border-color: rgba(255, 107, 107, 0.25);
  box-shadow:
    0 4px 12px rgba(255, 107, 107, 0.2),
    0 2px 4px rgba(255, 107, 107, 0.15);
}

.notification-btn :deep(.anticon),
.header-action-btn[data-button-type="notification"] :deep(.anticon) {
  animation: bellRing 2s ease-in-out infinite;
  transform-origin: 50% 10%;
}

@keyframes bellRing {
  0%, 50%, 100% {
    transform: rotate(0deg);
  }
  10%, 30% {
    transform: rotate(10deg);
  }
  20% {
    transform: rotate(-10deg);
  }
}

.notification-btn:hover :deep(.anticon),
.header-action-btn[data-button-type="notification"]:hover :deep(.anticon) {
  animation-duration: 0.5s;
  filter: drop-shadow(0 0 4px rgba(255, 107, 107, 0.4));
}

/* 帮助按钮特殊样式 */
.help-btn,
.header-action-btn[data-button-type="help"] {
  background: linear-gradient(135deg,
    rgba(52, 211, 153, 0.05) 0%,
    rgba(16, 185, 129, 0.08) 100%);
  border: 1px solid rgba(52, 211, 153, 0.1);
}

.help-btn:hover,
.header-action-btn[data-button-type="help"]:hover {
  color: #10b981;
  background: linear-gradient(135deg,
    rgba(52, 211, 153, 0.12) 0%,
    rgba(16, 185, 129, 0.15) 100%);
  border-color: rgba(52, 211, 153, 0.25);
  box-shadow:
    0 4px 12px rgba(52, 211, 153, 0.2),
    0 2px 4px rgba(52, 211, 153, 0.15);
}

.help-btn :deep(.anticon),
.header-action-btn[data-button-type="help"] :deep(.anticon) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.help-btn:hover :deep(.anticon),
.header-action-btn[data-button-type="help"]:hover :deep(.anticon) {
  transform: scale(1.1) rotate(10deg);
  filter: drop-shadow(0 0 4px rgba(52, 211, 153, 0.4));
}

/* GitHub 仓库按钮 */
.header-action-btn[data-button-type="github"] {
  color: #111827;
  background: linear-gradient(135deg,
    rgba(15, 23, 42, 0.04) 0%,
    rgba(15, 23, 42, 0.08) 100%);
  border: 1px solid rgba(15, 23, 42, 0.1);
}

.header-action-btn[data-button-type="github"]:hover {
  color: #24292f;
  background: linear-gradient(135deg,
    rgba(15, 23, 42, 0.12) 0%,
    rgba(15, 23, 42, 0.16) 100%);
  border-color: rgba(15, 23, 42, 0.25);
}

/* 细节优化 */
.header {
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(24, 144, 255, 0.3) 50%,
    transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.header:hover::before {
  opacity: 1;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .header-action-btn {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .header-action-btn:hover {
    transform: none;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.12);
  }

  .menu-toggle-btn {
    padding: 6px;
    font-size: 16px;
  }

  .user-menu {
    padding: 6px 12px;
  }

  .status-bar {
    padding: 0 16px;
    font-size: 11px;
  }

  .status-left,
  .status-right {
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 0 12px;
  }

  .header-action-btn {
    width: 30px;
    height: 30px;
    font-size: 13px;
  }

  .status-bar {
    height: 44px;
    padding: 0 12px;
  }

  .status-left,
  .status-right {
    gap: 8px;
  }

  .status-left span,
  .status-right span {
    font-size: 11px;
  }
}

/* 暗黑模式适配 */
.dark .header-action-btn {
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .header-action-btn:hover {
  background-color: rgba(64, 150, 255, 0.12);
  border-color: rgba(64, 150, 255, 0.25);
  box-shadow:
    0 4px 12px rgba(64, 150, 255, 0.2),
    0 2px 4px rgba(64, 150, 255, 0.15);
}

.dark .header-action-btn.active {
  background-color: rgba(64, 150, 255, 0.18);
  border-color: rgba(64, 150, 255, 0.35);
}

/* 暗黑模式下特殊按钮样式 */
.dark .ai-assistant-btn,
.dark .header-action-btn[data-button-type="ai-assistant"] {
  background: linear-gradient(135deg,
    rgba(168, 85, 247, 0.08) 0%,
    rgba(147, 51, 234, 0.12) 100%);
  border-color: rgba(168, 85, 247, 0.15);
}

.dark .ai-assistant-btn:hover,
.dark .header-action-btn[data-button-type="ai-assistant"]:hover {
  color: #a855f7;
  background: linear-gradient(135deg,
    rgba(168, 85, 247, 0.15) 0%,
    rgba(147, 51, 234, 0.2) 100%);
  border-color: rgba(168, 85, 247, 0.3);
  box-shadow:
    0 4px 12px rgba(168, 85, 247, 0.25),
    0 2px 4px rgba(168, 85, 247, 0.2);
}

.dark .ai-assistant-btn.active,
.dark .header-action-btn[data-button-type="ai-assistant"].active {
  color: #a855f7;
  background: linear-gradient(135deg,
    rgba(168, 85, 247, 0.2) 0%,
    rgba(147, 51, 234, 0.25) 100%);
  border-color: rgba(168, 85, 247, 0.4);
}

.dark .notification-btn,
.dark .header-action-btn[data-button-type="notification"] {
  background: linear-gradient(135deg,
    rgba(239, 68, 68, 0.08) 0%,
    rgba(220, 38, 38, 0.12) 100%);
  border-color: rgba(239, 68, 68, 0.15);
}

.dark .notification-btn:hover,
.dark .header-action-btn[data-button-type="notification"]:hover {
  color: #ef4444;
  background: linear-gradient(135deg,
    rgba(239, 68, 68, 0.15) 0%,
    rgba(220, 38, 38, 0.2) 100%);
  border-color: rgba(239, 68, 68, 0.3);
  box-shadow:
    0 4px 12px rgba(239, 68, 68, 0.25),
    0 2px 4px rgba(239, 68, 68, 0.2);
}

.dark .help-btn,
.dark .header-action-btn[data-button-type="help"] {
  background: linear-gradient(135deg,
    rgba(34, 197, 94, 0.08) 0%,
    rgba(22, 163, 74, 0.12) 100%);
  border-color: rgba(34, 197, 94, 0.15);
}

.dark .help-btn:hover,
.dark .header-action-btn[data-button-type="help"]:hover {
  color: #22c55e;
  background: linear-gradient(135deg,
    rgba(34, 197, 94, 0.15) 0%,
    rgba(22, 163, 74, 0.2) 100%);
  border-color: rgba(34, 197, 94, 0.3);
  box-shadow:
    0 4px 12px rgba(34, 197, 94, 0.25),
    0 2px 4px rgba(34, 197, 94, 0.2);
}

.dark .header-action-btn[data-button-type="github"] {
  color: #e4e4e7;
  background: linear-gradient(135deg,
    rgba(148, 163, 184, 0.08) 0%,
    rgba(71, 85, 105, 0.12) 100%);
  border-color: rgba(148, 163, 184, 0.2);
}

.dark .header-action-btn[data-button-type="github"]:hover {
  color: #f8fafc;
  background: linear-gradient(135deg,
    rgba(148, 163, 184, 0.15) 0%,
    rgba(71, 85, 105, 0.2) 100%);
  border-color: rgba(148, 163, 184, 0.35);
}

/* 高对比度模式适配 */
@media (prefers-contrast: high) {
  .header-action-btn {
    border: 2px solid currentColor;
  }

  .menu-toggle-btn {
    border: 2px solid currentColor;
  }

  .user-menu {
    border: 2px solid var(--theme-border);
  }
}

/* 减少动画偏好适配 */
@media (prefers-reduced-motion: reduce) {
  .header-action-btn,
  .header-action-btn::before,
  .header-action-btn :deep(.anticon),
  .menu-toggle-btn,
  .menu-toggle-btn::before,
  .menu-toggle-btn :deep(.anticon),
  .user-menu,
  .user-menu::before,
  .user-avatar,
  .dropdown-icon,
  .project-select,
  .project-option,
  .user-dropdown-menu :deep(.ant-dropdown-menu-item) {
    transition: none !important;
    animation: none !important;
  }

  .header-action-btn:hover,
  .menu-toggle-btn:hover {
    transform: none;
  }

  .notification-btn :deep(.anticon),
  .header-action-btn[data-button-type="notification"] :deep(.anticon) {
    animation: none !important;
  }
}


/* User Menu */
.user-menu {
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
}

.user-menu::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,
    rgba(24, 144, 255, 0.03) 0%,
    rgba(24, 144, 255, 0.08) 50%,
    rgba(24, 144, 255, 0.03) 100%);
  border-radius: 8px;
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
}

.user-menu:hover {
  background-color: rgba(24, 144, 255, 0.08);
  border-color: rgba(24, 144, 255, 0.2);
  transform: translateY(-1px);
  box-shadow:
    0 6px 16px rgba(24, 144, 255, 0.15),
    0 2px 6px rgba(24, 144, 255, 0.1);
}

/* 悬停状态指示 */
.user-menu:hover .username {
  color: #1890ff;
  transform: translateX(2px);
}

.user-menu:hover .dropdown-icon {
  color: #1890ff;
  transform: rotate(180deg) scale(1.1);
}

.user-menu:hover::before {
  opacity: 1;
  transform: scale(1);
}

.user-menu:active {
  transform: translateY(0px) scale(0.98);
  transition-duration: 0.1s;
}

/* 用户头像动画 */
.user-avatar {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-menu:hover .user-avatar {
  transform: scale(1.05) rotate(-5deg);
  box-shadow: 0 4px 8px rgba(24, 144, 255, 0.2);
}

/* 下拉图标动画 */
.dropdown-icon {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-menu:hover .dropdown-icon {
  transform: rotate(180deg) scale(1.1);
  color: #1890ff;
}

/* 暗黑模式适配 */
.dark .user-menu:hover {
  background-color: rgba(64, 150, 255, 0.08);
  border-color: rgba(64, 150, 255, 0.18);
  box-shadow:
    0 4px 12px rgba(64, 150, 255, 0.12),
    0 2px 4px rgba(64, 150, 255, 0.1);
}

.user-avatar {
  background: #1890ff;
}

.username {
  color: var(--theme-text);
  font-weight: 500;
  margin-left: 8px;
  transition: color 0.3s;
}

.dropdown-icon {
  color: var(--theme-text-secondary);
  font-size: 12px;
  margin-left: 4px;
  transition: color 0.3s;
}

/* User Dropdown Menu */
.user-dropdown-menu {
  min-width: 200px;
  border-radius: 12px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--theme-border);
  background: var(--theme-bg-container);
  backdrop-filter: blur(12px);
  overflow: hidden;
  animation: dropdownSlideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top right;
}

/* 悬停触发的动画优化 */
.user-dropdown-menu::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    rgba(24, 144, 255, 0.6) 0%,
    rgba(114, 46, 209, 0.6) 50%,
    rgba(24, 144, 255, 0.6) 100%);
  border-radius: 12px 12px 0 0;
  opacity: 0.8;
}

@keyframes dropdownSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0px) scale(1);
  }
}

/* 暗黑模式下下拉菜单 */
.dark .user-dropdown-menu {
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.4),
    0 10px 10px -5px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .user-dropdown-menu::before {
  background: linear-gradient(90deg,
    rgba(96, 165, 250, 0.6) 0%,
    rgba(168, 85, 247, 0.6) 50%,
    rgba(96, 165, 250, 0.6) 100%);
}

.dark .user-menu:hover {
  background-color: rgba(64, 150, 255, 0.08);
  border-color: rgba(64, 150, 255, 0.2);
  box-shadow:
    0 6px 16px rgba(64, 150, 255, 0.18),
    0 2px 6px rgba(64, 150, 255, 0.12);
}

.dark .user-menu:hover .username {
  color: #60a5fa;
}

.dark .user-menu:hover .dropdown-icon {
  color: #60a5fa;
}

.user-dropdown-menu :deep(.ant-dropdown-menu-item) {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 8px;
  margin: 4px 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
}

.user-dropdown-menu :deep(.ant-dropdown-menu-item):hover {
  background-color: rgba(24, 144, 255, 0.08);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.user-dropdown-menu :deep(.ant-dropdown-menu-item) .anticon {
  font-size: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-dropdown-menu :deep(.ant-dropdown-menu-item):hover .anticon {
  transform: scale(1.1);
  color: #1890ff;
}

.user-dropdown-menu :deep(.ant-menu-item-divider) {
  margin: 8px 0;
  background-color: var(--theme-border);
}

.logout-item {
  color: #ff4d4f !important;
}

.logout-item:hover {
  background-color: rgba(255, 77, 79, 0.1) !important;
  color: #ff4d4f !important;
}

.logout-item:hover .anticon {
  color: #ff4d4f !important;
  transform: scale(1.1) rotate(10deg);
}

/* 暗黑模式下下拉菜单项 */
.dark .user-dropdown-menu :deep(.ant-dropdown-menu-item):hover {
  background-color: rgba(64, 150, 255, 0.1);
  box-shadow: 0 2px 8px rgba(64, 150, 255, 0.12);
}

.dark .user-dropdown-menu :deep(.ant-dropdown-menu-item):hover .anticon {
  color: #4096ff;
}

/* Main Content */
.main-content {
  height: calc(100vh - 64px - 48px);
}

/* Sidebar */
.sidebar {
  border-right: 1px solid var(--theme-border);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

/* Content Area */
.content-area {
  position: relative;
  display: flex;
  height: 100%;
}

.content-wrapper {
  flex: 1;
  background: var(--theme-bg-base);
  overflow: auto;
  min-width: 0;
  transition: background-color 0.3s;
}

/* AI Panel */
.ai-panel {
  width: 400px;
  background: var(--theme-bg-container);
  border-left: 1px solid var(--theme-border);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
}

.ai-panel.collapsed {
  width: 0;
  overflow: hidden;
  border-left: none;
  box-shadow: none;
}

/* 浮动模式下隐藏固定面板 */
.ai-panel.floating-mode {
  width: 0;
  overflow: hidden;
  border-left: none;
  box-shadow: none;
}

.ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.ai-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.ai-panel-title :deep(.anticon) {
  color: #1890ff;
}

.close-btn {
  color: rgba(0, 0, 0, 0.45);
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  color: rgba(0, 0, 0, 0.65);
  background-color: rgba(0, 0, 0, 0.04);
}

.ai-panel-content {
  flex: 1;
  overflow: hidden;
}

/* 状态栏相关样式已移至 StatusBar.vue 组件 */

/* Responsive Design */
@media (max-width: 1200px) {
  .app-subtitle {
    display: none;
  }

  .username {
    display: none;
  }

  .project-select {
    width: 160px !important;
  }

  /* 移动设备上保持点击交互 */
  .user-menu:hover {
    transform: none;
  }

  .user-menu:hover .username,
  .user-menu:hover .dropdown-icon {
    transform: none;
    color: inherit;
  }
}

@media (max-width: 992px) {
  .title-section {
    display: none;
  }

  .ai-panel {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    z-index: 10;
  }
}

@media (max-width: 768px) {
  .header-content {
    padding: 0 16px;
  }

  .project-selector {
    display: none;
  }

  .header-action-btn {
    width: 32px;
    height: 32px;
  }

  .ai-panel {
    width: 100%;
  }
}

/* Chapter Dialog Styles */
.chapter-info {
  margin-top: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.chapter-info :deep(.ant-descriptions-item-label) {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
}

.chapter-info :deep(.ant-descriptions-item-content) {
  color: rgba(0, 0, 0, 0.85);
}
</style>
