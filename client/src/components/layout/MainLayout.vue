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
              <span class="logo-text">AI</span>
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
            <div class="project-selector">
              <a-select
                v-model:value="currentProjectId"
                @change="handleProjectChange"
                :placeholder="$t('project.selectProject')"
                size="middle"
                :loading="projectStore.loading"
                class="project-select"
                :disabled="projectStore.projects.length === 0"
                :not-found-content="projectStore.projects.length === 0 ? $t('project.noProject') : $t('common.search')"
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
                  :title="`${project.title} - ${project.description || '暂无描述'}`"
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
              <a-tooltip title="AI助手">
                <a-button
                  type="text"
                  class="header-action-btn"
                  :class="{ 'active': !aiPanelCollapsed }"
                  @click="toggleAIPanel"
                >
                  <template #icon>
                    <RobotOutlined />
                  </template>
                </a-button>
              </a-tooltip>

              <!-- Notifications -->
              <a-tooltip title="通知">
                <a-badge count="3" size="small">
                  <a-button type="text" class="header-action-btn">
                    <template #icon>
                      <BellOutlined />
                    </template>
                  </a-button>
                </a-badge>
              </a-tooltip>

              <!-- Theme Toggle -->
              <ThemeToggle />

              <!-- Language Toggle -->
              <LanguageToggle />

              <!-- Help -->
              <a-tooltip title="帮助">
                <a-button type="text" class="header-action-btn">
                  <template #icon>
                    <QuestionCircleOutlined />
                  </template>
                </a-button>
              </a-tooltip>
            </a-space>

            <!-- User Menu -->
            <a-dropdown placement="bottomRight" :trigger="['click']">
              <a-space class="user-menu" style="cursor: pointer;">
                <a-avatar size="default" class="user-avatar">
                  <template #icon>
                    <UserOutlined />
                  </template>
                </a-avatar>
                <span class="username">用户名</span>
                <DownOutlined class="dropdown-icon" />
              </a-space>
              <template #overlay>
                <a-menu class="user-dropdown-menu">
                  <a-menu-item key="profile">
                    <UserOutlined />
                    <span>个人资料</span>
                  </a-menu-item>
                  <a-menu-item key="preferences">
                    <SettingOutlined />
                    <span>偏好设置</span>
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="logout" class="logout-item">
                    <LogoutOutlined />
                    <span>退出登录</span>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
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
        <NavigationMenu
          :collapsed="collapsed"
        />
      </a-layout-sider>

      <!-- Main Content Area -->
      <a-layout-content class="content-area">
        <div class="content-wrapper">
          <router-view />
        </div>

        <!-- Right Panel (AI Assistant) -->
        <div
          class="ai-panel"
          :class="{ 'collapsed': aiPanelCollapsed }"
        >
          <div class="ai-panel-content">
            <AIAssistantPanel />
          </div>
        </div>
      </a-layout-content>
    </a-layout>

    <!-- Add Chapter Dialog -->
    <a-modal
      v-model:open="addChapterVisible"
      title="添加新章节"
      width="600px"
      @ok="handleAddChapter"
      :confirm-loading="chaptersLoading"
    >
      <a-form layout="vertical" :model="addChapterForm">
        <a-form-item
          label="章节标题"
          name="title"
          :rules="[{ required: true, message: '请输入章节标题' }]"
        >
          <a-input
            v-model:value="addChapterForm.title"
            placeholder="请输入章节标题"
            maxlength="100"
            show-count
          />
        </a-form-item>

        <a-form-item
          label="章节大纲"
          name="outline"
        >
          <a-textarea
            v-model:value="addChapterForm.outline"
            placeholder="请输入章节大纲（可选）"
            :rows="4"
            maxlength="500"
            show-count
          />
        </a-form-item>

        <div class="chapter-info">
          <a-descriptions :column="2" size="small">
            <a-descriptions-item label="章节号">
              第 {{ chapters.length + 1 }} 章
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              规划中
            </a-descriptions-item>
          </a-descriptions>
        </div>
      </a-form>
    </a-modal>

    <!-- Bottom Status Bar -->
    <a-layout-footer class="status-bar">
      <div class="status-left">
        <a-space size="large">
          <span>项目：{{ projectStore.currentProject?.title || '未选择' }}</span>
          <span>状态：{{ projectStatus }}</span>
          <span>字数：{{ wordCount }}</span>
        </a-space>
      </div>
      <div class="status-right">
        <a-space size="small">
          <span>AI连接：</span>
          <a-badge :status="aiStatus === 'connected' ? 'success' : 'error'" />
          <span>{{ aiStatus === 'connected' ? '已连接' : '未连接' }}</span>
        </a-space>
      </div>
    </a-layout-footer>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BookOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  LogoutOutlined,
  RobotOutlined,
  BellOutlined,
  DownOutlined,
  CloseOutlined,
  CalendarOutlined,
  TagsOutlined
} from '@ant-design/icons-vue'
import type { Chapter } from '@/types'
import NavigationMenu from './NavigationMenu.vue'
import ThemeToggle from './ThemeToggle.vue'
import LanguageToggle from './LanguageToggle.vue'
import AIAssistantPanel from '@/components/ai/AIAssistantPanel.vue'
import { useProjectStore } from '@/stores/project'
import { useThemeStore } from '@/stores/theme'
import { countValidWords, formatWordCount } from '@/utils/textUtils'
import { useChapterList } from '@/composables/useChapterList'

const projectStore = useProjectStore()
const themeStore = useThemeStore()
const { chapters, loading: chaptersLoading, loadChapters, createChapter } = useChapterList()
const collapsed = ref(false)
const aiPanelCollapsed = ref(true)  // 默认关闭 AI 助手面板
const selectedChapter = ref<Chapter | null>(null)

// 添加章节对话框状态
const addChapterVisible = ref(false)
const addChapterForm = ref({
  title: '',
  outline: ''
})


// 计算属性
const currentProjectId = computed(() => projectStore.currentProjectId)

const projectStatus = computed(() => {
  if (!projectStore.currentProject) return '未选择'
  switch (projectStore.currentProject.status) {
    case 'draft': return '草稿'
    case 'writing': return '写作中'
    case 'completed': return '已完成'
    default: return '未知'
  }
})

// 计算总字数
const wordCount = computed(() => {
  if (!chapters.value || chapters.value.length === 0) return 0
  
  const totalWords = chapters.value.reduce((total, chapter) => {
    if (chapter.content) {
      return total + countValidWords(chapter.content, {
        removeMarkdown: true,
        removeHtml: true
      })
    }
    return total
  }, 0)
  
  return formatWordCount(totalWords)
})
const aiStatus = ref<'connected' | 'disconnected'>('disconnected')

// 组件挂载时加载项目数据
onMounted(async () => {
  await projectStore.loadProjects()
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
}

const toggleAIPanel = () => {
  aiPanelCollapsed.value = !aiPanelCollapsed.value
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
    'draft': '草稿',
    'writing': '写作中',
    'completed': '已完成'
  }
  return texts[status as keyof typeof texts] || status
}

// Date formatting helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) {
    return '刚刚'
  } else if (diffInHours < 24) {
    return `${diffInHours}小时前`
  } else if (diffInHours < 24 * 7) {
    const days = Math.floor(diffInHours / 24)
    return `${days}天前`
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
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
}

.menu-toggle-btn:hover {
  color: #1890ff;
  background-color: rgba(24, 144, 255, 0.1);
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
  background: linear-gradient(135deg, #1890ff, #722ed1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
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
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.header-action-btn:hover {
  color: #1890ff;
  background-color: rgba(24, 144, 255, 0.1);
}

.header-action-btn.active {
  color: #1890ff;
  background-color: rgba(24, 144, 255, 0.1);
}


/* User Menu */
.user-menu {
  padding: 0 12px;
  transition: all 0.2s;
}

.user-menu:hover {
  background-color: rgba(0, 0, 0, 0.04);
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
  min-width: 160px;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.user-dropdown-menu :deep(.ant-dropdown-menu-item) {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logout-item {
  color: #ff4d4f !important;
}

.logout-item:hover {
  background-color: rgba(255, 77, 79, 0.1) !important;
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

/* Status Bar */
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
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
}

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
