<template>
  <a-layout class="h-screen">
    <!-- Top Menu Bar -->
    <a-layout-header class="bg-gray-50 border-b border-gray-300 p-0 h-14 flex items-center justify-between shadow-sm">
      <div class="flex items-center px-6">
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
      </div>

      <!-- User Info & Actions -->
      <div class="flex items-center px-6 space-x-3">
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
    </a-layout-header>

    <a-layout>
      <!-- Left Navigation Panel -->
      <a-layout-sider
        v-model:collapsed="collapsed"
        :width="280"
        :collapsed-width="60"
        theme="light"
        class="border-r border-gray-200"
      >
        <a-menu
          v-model:selectedKeys="selectedKeys"
          mode="inline"
          :inline-collapsed="collapsed"
          class="border-0"
        >
          <a-menu-item key="project" @click="activeTab = 'project'">
            <template #icon>
              <BookOutlined />
            </template>
            <span>项目信息</span>
          </a-menu-item>

          <a-menu-item key="characters" @click="activeTab = 'characters'">
            <template #icon>
              <TeamOutlined />
            </template>
            <span>角色库</span>
          </a-menu-item>

          <a-menu-item key="worldsettings" @click="activeTab = 'worldsettings'">
            <template #icon>
              <GlobalOutlined />
            </template>
            <span>世界设定</span>
          </a-menu-item>

          <a-sub-menu key="chapters">
            <template #icon>
              <FileTextOutlined />
            </template>
            <template #title>章节列表</template>
            <a-menu-item
              v-for="chapter in chapters"
              :key="`chapter-${chapter.id}`"
              @click="selectChapter(chapter)"
            >
              第{{ chapter.chapterNumber }}章：{{ chapter.title }}
            </a-menu-item>
            <a-menu-item key="add-chapter" @click="addNewChapter">
              <template #icon>
                <PlusOutlined />
              </template>
              添加章节
            </a-menu-item>
          </a-sub-menu>

          <a-menu-item key="progress" @click="activeTab = 'progress'">
            <template #icon>
              <BarChartOutlined />
            </template>
            <span>进度统计</span>
          </a-menu-item>
        </a-menu>

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
      </a-layout-sider>

      <a-layout>
        <!-- Main Content Area -->
        <a-layout-content class="flex">
          <!-- Central Content Area (70%) -->
          <div class="flex-1 bg-white">
            <ProjectManagement v-if="activeTab === 'project'" />
            <CharacterManagement v-else-if="activeTab === 'characters'" />
            <WorldSettingManagement v-else-if="activeTab === 'worldsettings'" />
            <ChapterEditor
              v-else-if="activeTab === 'chapter' && selectedChapter"
              :chapter="selectedChapter"
            />
            <ProgressStats v-else-if="activeTab === 'progress'" />
            <div v-else class="flex items-center justify-center h-full text-gray-500">
              选择左侧菜单项开始使用
            </div>
          </div>

          <!-- Right AI Assistant Panel (30%) -->
          <div
            v-show="!aiPanelCollapsed"
            class="w-96 bg-gray-50 border-l border-gray-200 flex flex-col"
          >
            <AIAssistantPanel />
          </div>

          <!-- AI Panel Toggle Button -->
          <div class="fixed right-0 top-1/2 transform -translate-y-1/2 z-10">
            <a-button
              type="primary"
              @click="aiPanelCollapsed = !aiPanelCollapsed"
              class="rounded-l-lg rounded-r-none"
            >
              <DoubleLeftOutlined v-if="!aiPanelCollapsed" />
              <DoubleRightOutlined v-else />
            </a-button>
          </div>
        </a-layout-content>

        <!-- Bottom Status Bar -->
        <a-layout-footer class="bg-gray-100 border-t border-gray-200 p-2 h-8 flex items-center justify-between">
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
        </a-layout-footer>
      </a-layout>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BookOutlined,
  TeamOutlined,
  GlobalOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons-vue'
import type { Novel, Chapter } from '@/types'
import ProjectManagement from '@/components/novel/ProjectManagement.vue'
import CharacterManagement from '@/components/character/CharacterManagement.vue'
import WorldSettingManagement from '@/components/worldsetting/WorldSettingManagement.vue'
import ChapterEditor from '@/components/chapter/ChapterEditor.vue'
import ProgressStats from '@/components/novel/ProgressStats.vue'
import AIAssistantPanel from '@/components/ai/AIAssistantPanel.vue'

const collapsed = ref(false)
const aiPanelCollapsed = ref(false)
const selectedKeys = ref(['project'])
const activeTab = ref('project')
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

const selectChapter = (chapter: Chapter) => {
  selectedChapter.value = chapter
  activeTab.value = 'chapter'
  selectedKeys.value = [`chapter-${chapter.id}`]
}

const addNewChapter = () => {
  // Logic to add new chapter
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
.ant-layout-header {
  line-height: 56px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.ant-layout-footer {
  line-height: 24px;
}

.ant-menu {
  border-right: 0;
}

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

/* Responsive design for header */
@media (max-width: 768px) {
  .ant-layout-header {
    padding-left: 12px;
    padding-right: 12px;
  }

  .ant-layout-header h1 {
    font-size: 1.125rem;
  }
}

@media (max-width: 640px) {
  .ant-layout-header {
    height: 3rem !important;
    line-height: 3rem;
  }

  .ant-layout-header h1 {
    font-size: 1rem;
  }

  .ant-layout-header .text-xs {
    display: none;
  }
}
</style>
