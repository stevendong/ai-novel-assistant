<template>
  <div :class="['chapter-nav-sidebar', { collapsed: isCollapsed }]">
    <!-- 头部 -->
    <div class="sidebar-header">
      <div class="header-title" v-if="!isCollapsed">
        <BookOutlined />
        <span>章节导航</span>
      </div>
      <a-button
        type="text"
        size="small"
        class="collapse-btn"
        @click="toggleCollapse"
      >
        <template #icon>
          <MenuUnfoldOutlined v-if="isCollapsed" />
          <MenuFoldOutlined v-else />
        </template>
      </a-button>
    </div>

    <!-- 工具栏 -->
    <div class="sidebar-toolbar" v-if="!isCollapsed">
      <a-space direction="vertical" :size="8" style="width: 100%">
        <!-- 搜索框 -->
        <a-input
          v-model:value="searchText"
          placeholder="搜索章节..."
          size="small"
          allow-clear
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input>

        <!-- 筛选器 -->
        <a-select
          v-model:value="statusFilter"
          placeholder="筛选状态"
          size="small"
          style="width: 100%"
          allow-clear
        >
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option value="planning">规划中</a-select-option>
          <a-select-option value="writing">写作中</a-select-option>
          <a-select-option value="reviewing">审核中</a-select-option>
          <a-select-option value="completed">已完成</a-select-option>
        </a-select>
      </a-space>
    </div>

    <!-- 章节列表 -->
    <div class="chapter-list" v-if="!isCollapsed">
      <div
        v-for="chapter in filteredChapters"
        :key="chapter.id"
        :class="[
          'chapter-item',
          { active: chapter.id === currentChapterId }
        ]"
        @click="handleSelectChapter(chapter)"
      >
        <div class="chapter-main">
          <div class="chapter-number">
            第{{ chapter.chapterNumber }}章
          </div>
          <div class="chapter-title">
            {{ chapter.title }}
          </div>
        </div>

        <div class="chapter-meta">
          <a-tag
            :color="getStatusColor(chapter.status)"
            size="small"
          >
            {{ getStatusText(chapter.status) }}
          </a-tag>
          <span class="word-count">
            {{ getWordCount(chapter.content) }}字
          </span>
        </div>

        <!-- 进度条（如果有目标字数） -->
        <div
          v-if="chapter.targetWordCount"
          class="chapter-progress"
        >
          <a-progress
            :percent="getProgress(chapter)"
            :show-info="false"
            :stroke-color="{
              '0%': '#667eea',
              '100%': '#764ba2'
            }"
            size="small"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredChapters.length === 0" class="empty-state">
        <a-empty
          :image="emptyImage"
          description="暂无章节"
        />
      </div>
    </div>

    <!-- 折叠状态下的缩略列表 -->
    <div class="chapter-mini-list" v-else>
      <a-tooltip
        v-for="chapter in filteredChapters"
        :key="chapter.id"
        :title="`第${chapter.chapterNumber}章：${chapter.title}`"
        placement="right"
      >
        <div
          :class="[
            'chapter-mini-item',
            { active: chapter.id === currentChapterId }
          ]"
          @click="handleSelectChapter(chapter)"
        >
          {{ chapter.chapterNumber }}
        </div>
      </a-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Empty } from 'ant-design-vue'
import {
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  PlusOutlined
} from '@ant-design/icons-vue'
import type { Chapter } from '@/types'

interface Props {
  chapters: Chapter[]
  currentChapterId?: string
  loading?: boolean
}

interface Emits {
  (e: 'select', chapter: Chapter): void
  (e: 'create'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// localStorage key
const STORAGE_KEY = 'chapter-nav-sidebar-collapsed'

// 从 localStorage 读取初始状态
const getInitialCollapsedState = (): boolean => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved !== null ? JSON.parse(saved) : false
  } catch (error) {
    console.error('Failed to read sidebar state from localStorage:', error)
    return false
  }
}

// 状态
const isCollapsed = ref(getInitialCollapsedState())
const searchText = ref('')
const statusFilter = ref('')
const emptyImage = Empty.PRESENTED_IMAGE_SIMPLE

// 过滤后的章节列表
const filteredChapters = computed(() => {
  let result = [...props.chapters]

  // 按章节号排序
  result.sort((a, b) => a.chapterNumber - b.chapterNumber)

  // 搜索过滤
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(
      chapter =>
        chapter.title.toLowerCase().includes(search) ||
        chapter.chapterNumber.toString().includes(search)
    )
  }

  // 状态过滤
  if (statusFilter.value) {
    result = result.filter(chapter => chapter.status === statusFilter.value)
  }

  return result
})

// 保存状态到 localStorage
const saveCollapsedState = (collapsed: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed))
    console.log('[章节导航] 状态已保存:', collapsed ? '收起' : '展开')
  } catch (error) {
    console.error('[章节导航] Failed to save sidebar state to localStorage:', error)
  }
}

// 方法
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 监听状态变化并自动保存
watch(isCollapsed, (newValue) => {
  saveCollapsedState(newValue)
})

// 生命周期
onMounted(() => {
  console.log('[章节导航] 侧边栏初始状态:', isCollapsed.value ? '收起' : '展开')
})

const handleSelectChapter = (chapter: Chapter) => {
  emit('select', chapter)
}

const handleCreateChapter = () => {
  emit('create')
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    planning: 'blue',
    writing: 'orange',
    reviewing: 'purple',
    completed: 'green'
  }
  return colors[status] || 'default'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    planning: '规划中',
    writing: '写作中',
    reviewing: '审核中',
    completed: '已完成'
  }
  return texts[status] || status
}

const getWordCount = (content?: string) => {
  if (!content) return 0
  // 移除HTML标签
  const text = content.replace(/<[^>]*>/g, '')
  return text.length
}

const getProgress = (chapter: Chapter) => {
  if (!chapter.targetWordCount) return 0
  const current = getWordCount(chapter.content)
  return Math.min(100, Math.round((current / chapter.targetWordCount) * 100))
}
</script>

<style scoped>
/* ============================================
   章节导航侧边栏 - 使用全局主题变量
   适配亮色和暗色模式
   ============================================ */

/* ============================================
   品牌色和交互状态变量定义
   ============================================ */
.chapter-nav-sidebar {
  /* 品牌色 - 亮色模式 */
  --brand-primary: #1890ff;
  --brand-primary-hover: #40a9ff;
  --brand-primary-active: #096dd9;

  /* 交互状态 - 亮色模式 */
  --hover-bg: rgba(24, 144, 255, 0.04);
  --hover-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
  --active-bg: var(--theme-selected-bg);
  --active-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);

  /* 滚动条 - 亮色模式 */
  --scrollbar-track: #f0f0f0;
  --scrollbar-thumb: #d1d5db;
  --scrollbar-thumb-hover: #9ca3af;

  /* 布局 */
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg-elevated);
  border-right: 1px solid var(--theme-border);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              background-color 0.3s ease,
              border-color 0.3s ease;
  width: 280px;
  overflow: hidden;
}

.chapter-nav-sidebar.collapsed {
  width: 60px;
}

/* ============================================
   暗色模式变量覆盖
   ============================================ */
@media (prefers-color-scheme: dark) {
  .chapter-nav-sidebar {
    /* 品牌色 - 暗色模式 */
    --brand-primary: #4096ff;
    --brand-primary-hover: #69b1ff;
    --brand-primary-active: #1677ff;

    /* 交互状态 - 暗色模式 */
    --hover-bg: rgba(64, 150, 255, 0.08);
    --hover-shadow: 0 2px 8px rgba(64, 150, 255, 0.15);
    --active-bg: var(--theme-selected-bg);
    --active-shadow: 0 2px 8px rgba(64, 150, 255, 0.2);

    /* 滚动条 - 暗色模式 */
    --scrollbar-track: #2a2a2a;
    --scrollbar-thumb: #404040;
    --scrollbar-thumb-hover: #505050;
  }
}

/* ============================================
   头部区域
   ============================================ */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--theme-bg-container);
  border-bottom: 1px solid var(--theme-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--theme-text);
  transition: color 0.3s ease;
}

.collapse-btn {
  flex-shrink: 0;
  color: var(--theme-text-secondary);
  transition: color 0.3s ease;
}

.collapse-btn:hover {
  color: var(--brand-primary);
}

/* ============================================
   工具栏区域
   ============================================ */
.sidebar-toolbar {
  padding: 12px;
  background: var(--theme-bg-container);
  border-bottom: 1px solid var(--theme-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

/* 新建章节按钮样式 */
.sidebar-toolbar :deep(.create-chapter-btn) {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-active) 100%);
  border-color: transparent;
  color: #ffffff;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-toolbar :deep(.create-chapter-btn:hover) {
  background: linear-gradient(135deg, var(--brand-primary-hover) 0%, var(--brand-primary) 100%);
  box-shadow: 0 4px 8px rgba(24, 144, 255, 0.3);
  transform: translateY(-1px);
  border-color: transparent;
}

.sidebar-toolbar :deep(.create-chapter-btn:active) {
  background: linear-gradient(135deg, var(--brand-primary-active) 0%, var(--brand-primary) 100%);
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.25);
  transform: translateY(0);
  border-color: transparent;
}

.sidebar-toolbar :deep(.create-chapter-btn .anticon) {
  font-size: 14px;
  transition: transform 0.3s ease;
}

.sidebar-toolbar :deep(.create-chapter-btn:hover .anticon) {
  transform: rotate(90deg);
}

/* ============================================
   章节列表区域
   ============================================ */
.chapter-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background: var(--theme-bg-elevated);
  transition: background-color 0.3s ease;
}

/* 章节项容器 */
.chapter-item {
  padding: 12px;
  margin-bottom: 8px;
  background: var(--theme-bg-container);
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.chapter-item:hover {
  border-color: var(--brand-primary);
  background: var(--hover-bg);
  box-shadow: var(--hover-shadow);
  transform: translateY(-1px);
}

.chapter-item.active {
  border-color: var(--theme-selected-border);
  background: var(--active-bg);
  box-shadow: var(--active-shadow);
}

/* 章节主体信息 */
.chapter-main {
  margin-bottom: 8px;
}

.chapter-number {
  font-size: 11px;
  font-weight: 500;
  color: var(--theme-text-secondary);
  opacity: 0.7;
  margin-bottom: 4px;
  letter-spacing: 0.02em;
  transition: color 0.3s ease;
}

.chapter-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--theme-text);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  transition: color 0.3s ease;
}

.chapter-item:hover .chapter-title {
  color: var(--brand-primary);
}

.chapter-item.active .chapter-title {
  color: var(--brand-primary-active);
  font-weight: 600;
}

/* 章节元信息 */
.chapter-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.word-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--theme-text-secondary);
  transition: color 0.3s ease;
}

/* 进度条 */
.chapter-progress {
  margin-top: 8px;
}

/* 空状态 */
.empty-state {
  padding: 32px 16px;
  text-align: center;
}

/* ============================================
   折叠状态 - 缩略视图
   ============================================ */
.chapter-mini-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background: var(--theme-bg-elevated);
  transition: background-color 0.3s ease;
}

.chapter-mini-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  background: var(--theme-bg-container);
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 12px;
  font-weight: 600;
  color: var(--theme-text-secondary);
}

.chapter-mini-item:hover {
  border-color: var(--brand-primary);
  color: var(--brand-primary-hover);
  background: var(--hover-bg);
  transform: scale(1.05);
}

.chapter-mini-item.active {
  border-color: var(--brand-primary);
  background: var(--brand-primary);
  color: #ffffff;
  box-shadow: var(--active-shadow);
}

/* ============================================
   滚动条样式
   ============================================ */
.chapter-list::-webkit-scrollbar,
.chapter-mini-list::-webkit-scrollbar {
  width: 6px;
}

.chapter-list::-webkit-scrollbar-track,
.chapter-mini-list::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 3px;
}

.chapter-list::-webkit-scrollbar-thumb,
.chapter-mini-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
  transition: background 0.2s ease;
}

.chapter-list::-webkit-scrollbar-thumb:hover,
.chapter-mini-list::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
</style>
