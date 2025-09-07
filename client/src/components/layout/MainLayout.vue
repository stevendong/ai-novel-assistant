<template>
  <div class="h-screen flex flex-col">
    <!-- Top Header -->
    <header class="bg-gray-50 border-b border-gray-300 h-14 flex items-center justify-between shadow-sm flex-shrink-0 px-6">
      <div class="flex items-center space-x-3">
        <!-- Logo/Icon -->
        <div class="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
          <span class="text-white text-sm font-bold drop-shadow-sm">AI</span>
        </div>
        <!-- Title -->
        <div class="flex flex-col">
          <h1 class="text-xl font-bold text-white leading-tight">AI小说创作助手</h1>
          <span class="text-xs text-gray-600 leading-tight">智能协作，创意无限</span>
        </div>
      </div>

      <!-- User Info & Actions -->
      <div class="flex items-center space-x-3">
        <!-- Current Project Info -->
        <div v-if="currentProject" class="hidden md:flex items-center space-x-2 px-3 py-1 bg-white rounded-lg border border-gray-200 shadow-sm">
          <BookOutlined class="text-gray-600 text-sm" />
          <span class="text-sm text-gray-800 font-medium">{{ currentProject.title }}</span>
          <a-tag size="small" :color="getStatusColor(currentProject.status)">
            {{ getStatusText(currentProject.status) }}
          </a-tag>
        </div>

        <!-- Action Buttons -->
        <a-space>
          <!-- AI Assistant Toggle -->
          <a-button 
            type="text" 
            size="small" 
            :class="[
              'flex items-center text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-sm',
              { 'bg-blue-50 text-blue-600': !aiPanelCollapsed }
            ]"
            @click="aiPanelCollapsed = !aiPanelCollapsed"
          >
            <template #icon>
              <RobotOutlined :class="{ 'text-blue-600': !aiPanelCollapsed, 'text-gray-600': aiPanelCollapsed }" />
            </template>
            <span class="hidden sm:inline">AI助手</span>
          </a-button>
          
          <a-button type="text" size="small" class="flex items-center text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-sm">
            <template #icon>
              <SettingOutlined class="text-gray-600" />
            </template>
            <span class="hidden sm:inline text-gray-700">设置</span>
          </a-button>
          <a-button type="text" size="small" class="flex items-center text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-sm">
            <template #icon>
              <QuestionCircleOutlined class="text-gray-600" />
            </template>
            <span class="hidden sm:inline text-gray-700">帮助</span>
          </a-button>

          <!-- User Avatar -->
          <a-dropdown placement="bottomRight">
            <a-avatar size="small" class="bg-blue-600 cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
              <template #icon>
                <UserOutlined class="text-white" />
              </template>
            </a-avatar>
            <template #overlay>
              <a-menu class="min-w-32">
                <a-menu-item key="profile" class="flex items-center space-x-2">
                  <UserOutlined class="text-gray-600" />
                  <span class="text-gray-800">个人资料</span>
                </a-menu-item>
                <a-menu-item key="preferences" class="flex items-center space-x-2">
                  <SettingOutlined class="text-gray-600" />
                  <span class="text-gray-800">偏好设置</span>
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" class="flex items-center space-x-2">
                  <LogoutOutlined class="text-red-500" />
                  <span class="text-red-600">退出登录</span>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </div>
    </header>

    <!-- Main Layout Container -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar -->
      <div 
        class="bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 sidebar"
        :style="{ width: collapsed ? '60px' : '280px', minWidth: collapsed ? '60px' : '280px' }"
      >
        <NavigationMenu
          :collapsed="collapsed"
          :chapters="chapters"
          @chapter-selected="handleChapterSelected"
          @add-chapter="addNewChapter"
        />

        <div class="p-2 mt-auto">
          <a-button
            type="text"
            @click="collapsed = !collapsed"
            class="w-full flex items-center justify-center mb-2"
          >
            <MenuFoldOutlined v-if="!collapsed" />
            <MenuUnfoldOutlined v-else />
          </a-button>
        </div>
      </div>

      <!-- Center Content -->
      <div class="flex-1 bg-white overflow-hidden main-content">
        <router-view />
      </div>

      <!-- Right AI Panel -->
      <div 
        v-if="!aiPanelCollapsed"
        class="bg-gray-50 border-l border-gray-200 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 ai-panel"
        :style="{ width: '384px', minWidth: '384px', maxWidth: '384px' }"
      >
        <!-- Panel Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div class="flex items-center space-x-2">
            <RobotOutlined class="text-blue-600" />
            <span class="font-semibold text-gray-800">AI助手</span>
          </div>
          <a-button
            type="text"
            size="small"
            @click="aiPanelCollapsed = true"
            class="text-gray-500 hover:text-gray-700"
          >
            ×
          </a-button>
        </div>
        
        <!-- Panel Content -->
        <div class="flex-1 overflow-hidden">
          <AIAssistantPanel />
        </div>
      </div>
    </div>

    <!-- Bottom Status Bar -->
    <footer class="bg-gray-100 border-t border-gray-200 h-8 flex items-center justify-between px-4 flex-shrink-0">
      <div class="flex items-center space-x-4 text-sm text-gray-600">
        <span>项目：{{ currentProject?.title || '未选择' }}</span>
        <span>状态：{{ projectStatus }}</span>
        <span>字数：{{ wordCount }}</span>
      </div>
      <div class="flex items-center space-x-2 text-sm text-gray-600">
        <span>AI连接：</span>
        <a-badge :status="aiStatus === 'connected' ? 'success' : 'error'" />
        <span>{{ aiStatus === 'connected' ? '已连接' : '未连接' }}</span>
      </div>
    </footer>
  </div>
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
  RobotOutlined
} from '@ant-design/icons-vue'
import type { Novel, Chapter } from '@/types'
import NavigationMenu from './NavigationMenu.vue'
import AIAssistantPanel from '@/components/ai/AIAssistantPanel.vue'

const collapsed = ref(false)
const aiPanelCollapsed = ref(false)
const selectedChapter = ref<Chapter | null>(null)

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
/* Button hover states for better contrast on light background */
:deep(.ant-btn-text:hover) {
  background-color: rgba(255, 255, 255, 0.8) !important;
  color: #1f2937 !important;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important;
}

:deep(.ant-btn-text) {
  color: #4b5563 !important;
  border: none !important;
  transition: all 0.2s ease-in-out;
}

/* Avatar hover effect */
:deep(.ant-avatar) {
  transition: all 0.2s ease-in-out;
}

/* Menu item styles for better readability */
:deep(.ant-dropdown-menu-item) {
  padding: 8px 12px;
  color: #374151 !important;
}

:deep(.ant-dropdown-menu-item:hover) {
  background-color: #f3f4f6 !important;
  color: #1f2937 !important;
}

/* Ensure status tags have good contrast */
:deep(.ant-tag) {
  border: 1px solid;
  font-weight: 500;
}

/* Responsive design for mobile */
@media (max-width: 1024px) {
  /* On tablets and smaller, hide AI panel by default */
  .ai-panel {
    display: none;
  }
}

@media (max-width: 768px) {
  /* On mobile, force sidebar to be collapsed */
  .sidebar {
    width: 60px !important;
    min-width: 60px !important;
  }
  
  /* Ensure main content area gets remaining space */
  .main-content {
    flex: 1;
    min-width: 0;
  }
}

@media (max-width: 640px) {
  header h1 {
    font-size: 1rem;
  }

  header .text-xs {
    display: none;
  }
}
</style>