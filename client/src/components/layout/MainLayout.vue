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
              <h1 class="app-title">个人智能创作管理系统</h1>
              <span class="app-subtitle">智能协作，创意无限</span>
            </div>
          </div>
        </div>

        <!-- Right Side -->
        <div class="header-right">
          <a-space size="middle">
            <!-- Project Selector -->
            <a-select
              v-model:value="selectedProject"
              placeholder="选择项目"
              style="width: 200px"
              size="middle"
              :options="projectOptions"
              class="project-selector"
              :dropdown-match-select-width="false"
            >
              <template #suffixIcon>
                <BookOutlined />
              </template>
            </a-select>

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

              <!-- Settings -->
              <a-tooltip title="设置">
                <a-button type="text" class="header-action-btn">
                  <template #icon>
                    <SettingOutlined />
                  </template>
                </a-button>
              </a-tooltip>

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
          :chapters="chapters"
          @chapter-selected="handleChapterSelected"
          @add-chapter="addNewChapter"
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

    <!-- Bottom Status Bar -->
    <a-layout-footer class="status-bar">
      <div class="status-left">
        <a-space size="large">
          <span>项目：{{ currentProject?.title || '未选择' }}</span>
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
import { ref, computed } from 'vue'
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
  CloseOutlined
} from '@ant-design/icons-vue'
import type { Novel, Chapter } from '@/types'
import NavigationMenu from './NavigationMenu.vue'
import AIAssistantPanel from '@/components/ai/AIAssistantPanel.vue'

const collapsed = ref(false)
const aiPanelCollapsed = ref(false)
const selectedChapter = ref<Chapter | null>(null)
const selectedProject = ref<string>('1')

// Mock data - will be replaced with actual store data
const currentProject = ref<Novel | null>({
  id: '1',
  title: '测试小说',
  description: '这是一个测试小说项目',
  genre: '奇幻',
  rating: 'PG-13',
  status: 'writing',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

const projectOptions = ref([
  { label: '测试小说', value: '1' },
  { label: '科幻冒险', value: '2' },
  { label: '都市传说', value: '3' }
])

const chapters = ref<Chapter[]>([
  {
    id: '1',
    novelId: '1',
    chapterNumber: 1,
    title: '神秘的开始',
    outline: '主角发现了一个神秘的线索...',
    content: '',
    plotPoints: {},
    illustrations: {},
    status: 'planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
])

const projectStatus = computed(() => {
  if (!currentProject.value) return '未选择'
  switch (currentProject.value.status) {
    case 'draft': return '草稿'
    case 'writing': return '写作中'
    case 'completed': return '已完成'
    default: return '未知'
  }
})

const wordCount = ref(0)
const aiStatus = ref<'connected' | 'disconnected'>('disconnected')

// Methods
const toggleSidebar = () => {
  collapsed.value = !collapsed.value
}

const toggleAIPanel = () => {
  aiPanelCollapsed.value = !aiPanelCollapsed.value
}

const handleChapterSelected = (chapter: Chapter) => {
  selectedChapter.value = chapter
}

const addNewChapter = () => {
  console.log('Add new chapter')
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
</script>

<style scoped>
/* Main Layout Styles */
.main-layout {
  height: 100vh;
  overflow: hidden;
}

/* Header Styles */
.header {
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0;
  height: 64px;
  line-height: 64px;
  position: sticky;
  top: 0;
  z-index: 100;
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
  color: rgba(0, 0, 0, 0.65);
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
  color: rgba(0, 0, 0, 0.85);
  margin: 0;
}

.app-subtitle {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: -2px;
}

/* Project Selector */
.project-selector {
  border-radius: 6px;
}

.project-selector :deep(.ant-select-selector) {
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

/* Header Action Buttons */
.header-action-btn {
  color: rgba(0, 0, 0, 0.65);
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
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.user-menu:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.user-avatar {
  background: #1890ff;
}

.username {
  color: rgba(0, 0, 0, 0.85);
  font-weight: 500;
  margin-left: 8px;
}

.dropdown-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin-left: 4px;
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
  border-right: 1px solid #f0f0f0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
}

/* Content Area */
.content-area {
  position: relative;
  display: flex;
  height: 100%;
}

.content-wrapper {
  flex: 1;
  background: #f5f5f5;
  overflow: auto;
  min-width: 0;
}

/* AI Panel */
.ai-panel {
  width: 400px;
  background: #fff;
  border-left: 1px solid #f0f0f0;
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
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
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
}

@media (max-width: 992px) {
  .title-section {
    display: none;
  }
  
  .project-selector {
    width: 150px !important;
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
</style>